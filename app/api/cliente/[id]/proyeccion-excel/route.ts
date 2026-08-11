import { NextResponse } from "next/server";
import { getClienteProyeccionContext } from "@/lib/cliente-proyeccion";
import {
  buildClienteProyeccionExcelFilename,
  generateClienteProyeccionExcel,
} from "@/lib/cliente-proyeccion-excel";
import { createPublicSupabaseClient } from "@/lib/supabase-public";
import { getTasaCambioCopPorUsd } from "@/lib/tasa-cambio";

type RouteContext = {
  params: Promise<{ id: string }>;
};

/** Excel público del portal cliente. Sin sesión ni cookies. */
export async function GET(_request: Request, { params }: RouteContext) {
  try {
    const { id } = await params;
    const supabase = createPublicSupabaseClient();

    const { data: bodaFlags, error: flagsError } = await supabase
      .from("bodas")
      .select("permitir_excel_cliente, mostrar_usd_cliente")
      .eq("id", id)
      .maybeSingle();

    if (flagsError) {
      throw flagsError;
    }

    if (!bodaFlags?.permitir_excel_cliente) {
      return NextResponse.json(
        { error: "La descarga de Excel no está habilitada para esta boda." },
        { status: 403 },
      );
    }

    const context = await getClienteProyeccionContext(supabase, id);

    if (!context) {
      return NextResponse.json(
        { error: "No hay proveedores contratados para generar la proyección." },
        { status: 404 },
      );
    }

    const includeUsd = Boolean(bodaFlags.mostrar_usd_cliente);
    const tasa = includeUsd ? await getTasaCambioCopPorUsd() : null;
    const excelBytes = generateClienteProyeccionExcel(context, {
      includeUsd,
      copPorUsd: tasa?.copPorUsd ?? null,
    });
    const filename = buildClienteProyeccionExcelFilename(
      context.boda.nombre_pareja,
    );

    // Uint8Array.from evita el mismatch TS Uint8Array<ArrayBufferLike> vs BodyInit
    return new NextResponse(Uint8Array.from(excelBytes), {
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
