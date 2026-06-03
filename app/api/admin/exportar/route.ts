import { NextResponse } from "next/server";
import {
  buildAdminExportFilename,
  buildAdminExportWorkbook,
} from "@/lib/admin-export-excel";
import { getCurrentAuthUser } from "@/lib/auth/user-profiles";

export async function GET() {
  const user = await getCurrentAuthUser();

  if (!user) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  if (user.rol !== "admin") {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  try {
    const buffer = await buildAdminExportWorkbook();
    const filename = buildAdminExportFilename();

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "No se pudo generar el archivo de exportación.",
      },
      { status: 500 },
    );
  }
}
