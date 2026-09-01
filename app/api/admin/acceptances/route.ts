import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getAcceptancesForAdmin } from "@/lib/supabase-admin";

export async function GET() {
  const cookieStore = await cookies();
  const session = cookieStore.get("admin_session");

  if (!process.env.ADMIN_SESSION_SECRET) {
    console.error("Missing ADMIN_SESSION_SECRET env var.");
    return NextResponse.json({ error: "Servidor não configurado." }, { status: 500 });
  }

  if (!session || session.value !== "authenticated") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const data = await getAcceptancesForAdmin();
    return NextResponse.json(data);
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Falha ao buscar aceites." },
      { status: 500 },
    );
  }
}
