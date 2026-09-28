import { NextResponse } from "next/server";
import { getAcceptancesForAdmin } from "@/lib/supabase-admin";
import { getAuthenticatedAdmin } from "@/lib/supabase-server";

export async function GET() {
  // Exige uma sessão válida do Supabase Auth.
  const admin = await getAuthenticatedAdmin();

  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const data = await getAcceptancesForAdmin();
    return NextResponse.json(data);
  } catch (error) {
    console.error("admin-acceptances:", error instanceof Error ? error.message : "unknown error");
    return NextResponse.json(
      { error: "Falha ao buscar aceites." },
      { status: 500 },
    );
  }
}
