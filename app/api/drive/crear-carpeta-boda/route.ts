import { NextResponse } from "next/server";
import { getCurrentAuthUser } from "@/lib/auth/user-profiles";
import { createDriveFolderForBoda } from "@/lib/google-drive";
import { createServerSupabaseClient } from "@/lib/supabase-server";

export async function POST(request: Request) {
  const user = await getCurrentAuthUser();

  if (!user) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  if (user.rol !== "admin" && user.rol !== "lider") {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  let bodaId: string | undefined;
  try {
    const body = (await request.json()) as { bodaId?: string };
    bodaId = body.bodaId?.trim();
  } catch {
    return NextResponse.json({ error: "Cuerpo inválido" }, { status: 400 });
  }

  if (!bodaId) {
    return NextResponse.json({ error: "Falta bodaId" }, { status: 400 });
  }

  try {
    const supabase = await createServerSupabaseClient();
    const { data: boda, error: bodaError } = await supabase
      .from("bodas")
      .select("id, nombre_pareja")
      .eq("id", bodaId)
      .maybeSingle();

    if (bodaError) {
      throw new Error(bodaError.message);
    }

    if (!boda) {
      return NextResponse.json({ error: "Boda no encontrada" }, { status: 404 });
    }

    const folder = await createDriveFolderForBoda(
      bodaId,
      (boda as { nombre_pareja: string }).nombre_pareja,
      user.id,
    );

    if (!folder.folder_url) {
      return NextResponse.json(
        { error: "La carpeta se creó pero Google no devolvió un enlace." },
        { status: 500 },
      );
    }

    return NextResponse.json({ folder_url: folder.folder_url });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "No se pudo crear la carpeta en Drive.",
      },
      { status: 500 },
    );
  }
}
