import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/**
 * Cliente Supabase para uso em rotas de servidor / route handlers.
 * Lê e escreve a sessão do usuário nos cookies (padrão @supabase/ssr).
 */
export async function createSupabaseServerClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options),
          );
        },
      },
    },
  );
}

/**
 * Lê a allowlist de administradores da variável de ambiente ADMIN_EMAILS
 * (lista separada por vírgula). Normaliza para minúsculas e remove vazios.
 */
function getAdminAllowlist(): string[] {
  return (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}

/**
 * Retorna o usuário SE E SOMENTE SE ele for um administrador autorizado,
 * caso contrário null.
 *
 * Autenticado NÃO é o mesmo que autorizado: antes esta função só checava se
 * existia QUALQUER sessão Supabase válida — o que deixava qualquer conta do
 * projeto (ex.: alguém que se auto-cadastrou) ler a base inteira de aceites.
 * Agora o e-mail do usuário precisa estar na allowlist ADMIN_EMAILS.
 *
 * Usa getUser(), que valida o token junto ao servidor do Supabase —
 * mais seguro que confiar apenas na sessão do cookie.
 */
export async function getAuthenticatedAdmin() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) return null;

  const allowlist = getAdminAllowlist();

  // Fail-closed: sem allowlist configurada, ninguém é admin.
  // Isso evita que um deploy sem ADMIN_EMAILS libere o painel para todos.
  if (allowlist.length === 0) {
    console.error(
      "ADMIN_EMAILS não configurada — painel admin bloqueado por segurança (fail-closed).",
    );
    return null;
  }

  if (!allowlist.includes(user.email.toLowerCase())) return null;

  return user;
}
