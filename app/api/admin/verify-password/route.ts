import { NextResponse } from "next/server";
import { getCurrentAuthUser } from "@/lib/auth/user-profiles";

export async function POST(request: Request) {
  const user = await getCurrentAuthUser();

  if (!user) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  if (user.rol !== "admin") {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const expectedPassword = process.env.ADMIN_PANEL_PASSWORD;
  if (!expectedPassword) {
    console.error("ADMIN_PANEL_PASSWORD is not configured");
    return NextResponse.json(
      { error: "Panel de admin no configurado" },
      { status: 500 },
    );
  }

  let password = "";
  try {
    const body = (await request.json()) as { password?: unknown };
    password = typeof body.password === "string" ? body.password : "";
  } catch {
    return NextResponse.json(
      { error: "Contraseña incorrecta" },
      { status: 400 },
    );
  }

  if (password !== expectedPassword) {
    return NextResponse.json(
      { error: "Contraseña incorrecta" },
      { status: 401 },
    );
  }

  return NextResponse.json({ ok: true });
}
