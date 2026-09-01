import { NextRequest, NextResponse } from "next/server";
import { createHmac } from "node:crypto";

export function createSessionValue(username: string) {
  const secret = process.env.ADMIN_SESSION_SECRET;

  if (!secret) {
    return "authenticated";
  }

  return createHmac("sha256", secret).update(username).digest("hex");
}

export async function POST(request: NextRequest) {
  try {
    const { user, password } = await request.json();
    const adminUser = process.env.ADMIN_USERNAME;
    const adminPass = process.env.ADMIN_PASSWORD;

    if (!adminUser || !adminPass || !process.env.ADMIN_SESSION_SECRET) {
      console.error("Missing admin auth env vars.");
      return NextResponse.json(
        { error: "Servidor não configurado." },
        { status: 500 },
      );
    }

    if (String(user ?? "").trim() !== adminUser || String(password ?? "") !== adminPass) {
      return NextResponse.json(
        { error: "Credenciais inválidas." },
        { status: 401 },
      );
    }

    const response = NextResponse.json({ ok: true });
    response.cookies.set({
      name: "admin_session",
      value: createSessionValue(adminUser),
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 8,
    });

    return response;
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Erro ao autenticar o administrador." },
      { status: 500 },
    );
  }
}
