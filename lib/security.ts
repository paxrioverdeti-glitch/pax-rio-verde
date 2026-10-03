import { createHmac, timingSafeEqual } from "node:crypto";
import type { NextRequest } from "next/server";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

/**
 * Utilitários de segurança compartilhados pelas rotas de API.
 * - Comparação de segredos resistente a timing.
 * - Sessão admin assinada COM expiração (o valor deixa de ser sempre o mesmo).
 * - Rate limiting via Upstash Redis (compartilhado entre instâncias serverless),
 *   com fallback automático para memória quando o Upstash não está configurado.
 * - Validação de dígito verificador de CPF.
 */

/** Comparação de strings resistente a timing attack. */
export function safeEqual(a: string, b: string): boolean {
  const bufferA = Buffer.from(a, "utf8");
  const bufferB = Buffer.from(b, "utf8");
  if (bufferA.length !== bufferB.length) {
    // Compara contra si mesmo para manter tempo constante e evitar vazar o tamanho.
    timingSafeEqual(bufferA, bufferA);
    return false;
  }
  return timingSafeEqual(bufferA, bufferB);
}

/**
 * Cria um valor de sessão assinado que EXPIRA e muda a cada login.
 * Formato: "<expiraEm>.<nonce>.<assinaturaHMAC>"
 */
export function createSignedSession(secret: string, ttlSeconds = 60 * 60 * 8): string {
  const expiresAt = Date.now() + ttlSeconds * 1000;
  const nonce = createHmac("sha256", secret)
    .update(`${expiresAt}.${Math.random()}.${process.hrtime.bigint()}`)
    .digest("hex")
    .slice(0, 24);
  const payload = `${expiresAt}.${nonce}`;
  const signature = createHmac("sha256", secret).update(payload).digest("hex");
  return `${payload}.${signature}`;
}

/** Verifica assinatura E expiração de um valor de sessão. */
export function verifySignedSession(secret: string, value: string | undefined): boolean {
  if (!value) return false;
  const parts = value.split(".");
  if (parts.length !== 3) return false;
  const [expiresRaw, nonce, signature] = parts;
  const payload = `${expiresRaw}.${nonce}`;
  const expected = createHmac("sha256", secret).update(payload).digest("hex");
  if (!safeEqual(signature, expected)) return false;
  const expiresAt = Number(expiresRaw);
  if (!Number.isFinite(expiresAt) || Date.now() > expiresAt) return false;
  return true;
}

/** Extrai um identificador de cliente (IP) da requisição. */
export function getClientIp(request: NextRequest): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return request.headers.get("x-real-ip") || "unknown";
}

type Bucket = { count: number; resetAt: number };
const buckets = new Map<string, Bucket>();

/**
 * Rate limit EM MEMÓRIA (fallback). Retorna { allowed, retryAfterSeconds }.
 */
function rateLimitInMemory(
  key: string,
  limit: number,
  windowMs: number,
): { allowed: boolean; retryAfterSeconds: number } {
  const now = Date.now();
  const bucket = buckets.get(key);

  if (!bucket || now > bucket.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, retryAfterSeconds: 0 };
  }

  if (bucket.count >= limit) {
    return {
      allowed: false,
      retryAfterSeconds: Math.ceil((bucket.resetAt - now) / 1000),
    };
  }

  bucket.count += 1;
  return { allowed: true, retryAfterSeconds: 0 };
}

/**
 * Cliente Upstash Redis, criado só se as env vars existirem.
 * Se não estiverem configuradas, o rate limit cai no fallback em memória.
 */
const redis =
  process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
    ? new Redis({
        url: process.env.UPSTASH_REDIS_REST_URL,
        token: process.env.UPSTASH_REDIS_REST_TOKEN,
      })
    : null;

// Cache de limitadores por (limit, windowMs) para não recriar a cada request.
const limiters = new Map<string, Ratelimit>();

function getLimiter(limit: number, windowMs: number): Ratelimit | null {
  if (!redis) return null;
  const cacheKey = `${limit}:${windowMs}`;
  let limiter = limiters.get(cacheKey);
  if (!limiter) {
    limiter = new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(limit, `${windowMs} ms`),
      prefix: "pax-ratelimit",
    });
    limiters.set(cacheKey, limiter);
  }
  return limiter;
}

/**
 * Rate limit por chave. Usa Upstash Redis (compartilhado entre instâncias
 * serverless) quando configurado; caso contrário, cai no contador em memória.
 * Async porque o Redis é acessado por rede.
 *
 * @param key      identificador (ex.: `login:<ip>`)
 * @param limit    número máximo de tentativas na janela
 * @param windowMs janela em milissegundos
 */
export async function rateLimit(
  key: string,
  limit: number,
  windowMs: number,
): Promise<{ allowed: boolean; retryAfterSeconds: number }> {
  const limiter = getLimiter(limit, windowMs);

  if (!limiter) {
    // Sem Upstash configurado -> fallback em memória (por instância).
    return rateLimitInMemory(key, limit, windowMs);
  }

  try {
    const result = await limiter.limit(key);
    const retryAfterSeconds = result.success
      ? 0
      : Math.max(0, Math.ceil((result.reset - Date.now()) / 1000));
    return { allowed: result.success, retryAfterSeconds };
  } catch (error) {
    // Se o Redis falhar (rede/quota), não bloqueia o usuário legítimo:
    // cai no fallback em memória.
    console.error("ratelimit-redis:", error instanceof Error ? error.message : "unknown");
    return rateLimitInMemory(key, limit, windowMs);
  }
}

/** Limpeza preguiçosa de buckets expirados para não crescer sem limite. */
function sweepBuckets() {
  const now = Date.now();
  for (const [key, bucket] of buckets) {
    if (now > bucket.resetAt) buckets.delete(key);
  }
}

/**
 * Valida CPF por dígito verificador (não só o tamanho).
 * Aceita apenas os 11 dígitos já limpos (sem pontuação).
 */
export function isValidCpf(cpf: string): boolean {
  if (!/^\d{11}$/.test(cpf)) return false;
  // Rejeita sequências repetidas (000..., 111..., etc.).
  if (/^(\d)\1{10}$/.test(cpf)) return false;

  const digits = cpf.split("").map(Number);

  const calcCheck = (length: number) => {
    let sum = 0;
    for (let i = 0; i < length; i += 1) {
      sum += digits[i] * (length + 1 - i);
    }
    const remainder = (sum * 10) % 11;
    return remainder === 10 ? 0 : remainder;
  };

  if (calcCheck(9) !== digits[9]) return false;
  if (calcCheck(10) !== digits[10]) return false;
  return true;
}

// Sweep ocasional (barato): roda no máximo a cada minuto por processo.
let lastSweep = 0;
export function maybeSweep() {
  const now = Date.now();
  if (now - lastSweep > 60_000) {
    lastSweep = now;
    sweepBuckets();
  }
}

/**
 * Verifica um token do Cloudflare Turnstile junto ao servidor da Cloudflare.
 *
 * Fallback seguro: se TURNSTILE_SECRET_KEY não estiver configurada, retorna
 * true (verificação desligada) — assim o site funciona antes de você criar as
 * chaves. Quando a chave existir, um token ausente ou inválido é rejeitado.
 */
export async function verifyTurnstile(
  token: string | undefined,
  remoteIp?: string,
): Promise<boolean> {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) {
    // Em PRODUÇÃO, a ausência da chave é tratada como falha (fail-closed):
    // sem CAPTCHA configurado no ar, bots conseguiriam floodar a base. Em
    // desenvolvimento, continua liberando para facilitar os testes locais.
    if (process.env.NODE_ENV === "production") {
      console.error("TURNSTILE_SECRET_KEY ausente em produção — bloqueando por segurança.");
      return false;
    }
    return true; // dev: CAPTCHA opcional.
  }

  if (!token) return false;

  try {
    const body = new URLSearchParams();
    body.append("secret", secret);
    body.append("response", token);
    if (remoteIp && remoteIp !== "unknown") body.append("remoteip", remoteIp);

    const res = await fetch(
      "https://challenges.cloudflare.com/turnstile/v0/siteverify",
      { method: "POST", body },
    );
    const data = (await res.json()) as { success?: boolean };
    return data.success === true;
  } catch (error) {
    console.error("turnstile-verify:", error instanceof Error ? error.message : "unknown");
    // Em caso de falha de rede na verificação, NÃO deixa passar (fail-closed)
    // quando o CAPTCHA está configurado.
    return false;
  }
}
