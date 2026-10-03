import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase-admin";
import { getClientIp, isValidCpf, maybeSweep, rateLimit, verifyTurnstile } from "@/lib/security";

export async function POST(request: NextRequest) {
  try {
    maybeSweep();

    const ip = getClientIp(request);
    // Trilha de auditoria: guardamos quem/como registrou o aceite, para que ele
    // seja defensável juridicamente (LGPD) e rastreável em caso de contestação.
    const userAgent = (request.headers.get("user-agent") ?? "").slice(0, 500);
    // Máx. 10 aceites por IP a cada 10 minutos (evita flood/envenenamento da base).
    const limit = await rateLimit(`acceptances:${ip}`, 10, 10 * 60 * 1000);
    if (!limit.allowed) {
      return NextResponse.json(
        { error: "Muitas solicitações. Aguarde alguns minutos e tente novamente." },
        { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds) } },
      );
    }

    const body = await request.json();
    const name = String(body?.name ?? "").trim();
    const cpf = String(body?.cpf ?? "").replace(/\D/g, "");
    const phone = String(body?.phone ?? "").replace(/\D/g, "");
    const captchaToken = String(body?.captchaToken ?? "");

    // Verificação de CAPTCHA (Turnstile). Sem chave configurada, é ignorada.
    const humanOk = await verifyTurnstile(captchaToken, ip);
    if (!humanOk) {
      return NextResponse.json(
        { error: "Falha na verificação de segurança. Recarregue a página e tente novamente." },
        { status: 400 },
      );
    }

    if (name.length < 3 || name.length > 120) {
      return NextResponse.json({ error: "Nome inválido." }, { status: 400 });
    }

    if (!isValidCpf(cpf)) {
      return NextResponse.json({ error: "CPF inválido." }, { status: 400 });
    }

    if (phone.length < 10 || phone.length > 13) {
      return NextResponse.json({ error: "Telefone inválido." }, { status: 400 });
    }

    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      console.error("Missing Supabase env vars for acceptances route.");
      return NextResponse.json(
        { error: "Serviço temporariamente indisponível." },
        { status: 500 },
      );
    }

    const supabaseAdmin = createSupabaseAdminClient();
    const { error } = await supabaseAdmin.from("acceptances").insert({
      name,
      cpf,
      phone,
      ip,
      user_agent: userAgent,
    });

    if (error) {
      // Conflito de CPF duplicado: NÃO revelamos que o CPF já existe
      // (evita enumeração de CPF). Respondemos como sucesso silencioso —
      // o aceite já está registrado de qualquer forma.
      if (error.code === "23505") {
        return NextResponse.json({ ok: true });
      }

      console.error("acceptances-insert:", error.code ?? "unknown");
      return NextResponse.json(
        { error: "Não foi possível registrar o aceite." },
        { status: 500 },
      );
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("acceptances:", error instanceof Error ? error.message : "unknown error");
    return NextResponse.json(
      { error: "Erro interno do servidor." },
      { status: 500 },
    );
  }
}
