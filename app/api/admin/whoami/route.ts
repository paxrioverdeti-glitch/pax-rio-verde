import { NextResponse } from "next/server";
import { getAuthenticatedAdmin } from "@/lib/supabase-server";

/**
 * Diz APENAS se a sessão atual é de um administrador autorizado (allowlist).
 * Resposta uniforme e sem detalhes — não revela se o e-mail existe, se a conta
 * existe, nem por que não é admin. Serve para o painel confirmar o acesso logo
 * após o login e, se não for admin, deslogar com a mesma mensagem genérica
 * (evita enumeração de contas).
 */
export async function GET() {
  const admin = await getAuthenticatedAdmin();
  return NextResponse.json({ admin: Boolean(admin) }, { status: 200 });
}
