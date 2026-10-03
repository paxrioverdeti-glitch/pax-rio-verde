import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");

  if (code) {
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
          },
        },
      },
    );

    const { error } = await supabase.auth.exchangeCodeForSession(code);

    // Se a troca do código falhar (link expirado/adulterado/reaproveitado),
    // NÃO cria sessão e manda para o login com um aviso — nunca segue para a
    // tela de troca de senha com uma sessão inválida.
    if (error) {
      return NextResponse.redirect(
        new URL("/admin-pax-secreto?erro=link_invalido", requestUrl.origin),
      );
    }

    // Sucesso: segue para a troca de senha, marcando que viemos de um fluxo
    // de recuperação legítimo. A própria página revalida a sessão.
    return NextResponse.redirect(
      new URL("/reset-password?recovery=1", requestUrl.origin),
    );
  }

  // Sem code na URL: ninguém deveria cair aqui diretamente. Volta ao login.
  return NextResponse.redirect(new URL("/admin-pax-secreto", requestUrl.origin));
}
