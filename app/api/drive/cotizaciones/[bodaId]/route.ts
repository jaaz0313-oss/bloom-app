import { NextResponse } from "next/server";
import { getCurrentAuthUser } from "@/lib/auth/user-profiles";
import { getCotizacionesFolderUrl } from "@/lib/google-drive";

type RouteContext = {
  params: Promise<{ bodaId: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const user = await getCurrentAuthUser();

  if (!user) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const { bodaId } = await context.params;
  const id = bodaId?.trim();

  if (!id) {
    return NextResponse.json({ error: "Falta bodaId" }, { status: 400 });
  }

  try {
    const folderUrl = await getCotizacionesFolderUrl(id);

    if (!folderUrl) {
      return NextResponse.json(
        { error: "NO_DRIVE_FOLDER" },
        { status: 404 },
      );
    }

    return NextResponse.json({ folder_url: folderUrl });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "No se pudo obtener la carpeta de cotizaciones.",
      },
      { status: 500 },
    );
  }
}
