import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase-admin";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const name = String(body?.name ?? "").trim();
    const cpf = String(body?.cpf ?? "").replace(/\D/g, "");
    const phone = String(body?.phone ?? "").replace(/\D/g, "");

    if (name.length < 3) {
      return NextResponse.json({ error: "Nome inválido." }, { status: 400 });
    }

    if (cpf.length !== 11) {
      return NextResponse.json({ error: "CPF inválido." }, { status: 400 });
    }

    if (phone.length < 10) {
      return NextResponse.json({ error: "Telefone inválido." }, { status: 400 });
    }

    const supabaseAdmin = createSupabaseAdminClient();
    const { error } = await supabaseAdmin.from("acceptances").insert({
      name,
      cpf,
      phone,
    });

    if (error) {
      if (error.code === "23505") {
        return NextResponse.json(
          { error: "Este CPF já foi registrado." },
          { status: 409 },
        );
      }

      return NextResponse.json(
        { error: "Não foi possível registrar o aceite." },
        { status: 500 },
      );
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Erro interno do servidor." },
      { status: 500 },
    );
  }
}
