import { NextResponse } from "next/server";
import { getClienteProyeccionContext } from "@/lib/cliente-proyeccion";
import {
  buildClienteProyeccionExcelFilename,
  generateClienteProyeccionExcel,
} from "@/lib/cliente-proyeccion-excel";
import { createPublicSupabaseClient } from "@/lib/supabase-public";

type RouteContext = {
  params: Promise<{ id: string }>;
};

/** Excel público del portal cliente. Sin sesión ni cookies. */
export async function GET(_request: Request, { params }: RouteContext) {
  try {
    const { id } = await params;
    const supabase = createPublicSupabaseClient();
    const context = await getClienteProyeccionContext(supabase, id);

    if (!context) {
      return NextResponse.json(
        { error: "No hay proveedores contratados para generar la proyección." },
        { status: 404 },
      );
    }

    const excelBytes = generateClienteProyeccionExcel(context);
    const filename = buildClienteProyeccionExcelFilename(
      context.boda.nombre_pareja,
    );

    return new NextResponse(new Uint8Array(excelBytes), {
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
            : "No se pudo generar la proyección en Excel.",
      },
      { status: 500 },
    );
  }
}
