import { NextResponse } from "next/server";
import { getCurrentAuthUser } from "@/lib/auth/user-profiles";
import { shareAllRegisteredFoldersWithWriter } from "@/lib/google-drive";

const TARGET_EMAIL = "infocelestiaevents@gmail.com";

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

  try {
    const summary = await shareAllRegisteredFoldersWithWriter(TARGET_EMAIL);
    return NextResponse.json(summary);
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "No se pudieron compartir las carpetas de Drive.",
      },
      { status: 500 },
    );
  }
}
