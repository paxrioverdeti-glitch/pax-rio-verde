import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { getAcceptancesForAdmin } from "@/lib/supabase-admin";

export async function GET() {
  const headerStore = await headers();
  const adminToken = headerStore.get("x-admin-token") ?? "";

  if (!process.env.ADMIN_TOKEN || adminToken !== process.env.ADMIN_TOKEN) {
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
