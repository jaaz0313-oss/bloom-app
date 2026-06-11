import { NextResponse } from "next/server";
import { getClienteProyeccionContext } from "@/lib/cliente-proyeccion";
import {
  buildClienteProyeccionPdfFilename,
  generateClienteProyeccionPdf,
} from "@/lib/cliente-proyeccion-pdf";
import { createPublicSupabaseClient } from "@/lib/supabase-public";

type RouteContext = {
  params: Promise<{ id: string }>;
};

/** PDF público del portal cliente. Sin sesión ni cookies. */
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

    const pdfBytes = generateClienteProyeccionPdf(context);
    const filename = buildClienteProyeccionPdfFilename(context.boda.nombre_pareja);

    return new NextResponse(Buffer.from(pdfBytes), {
      headers: {
        "Content-Type": "application/pdf",
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
            : "No se pudo generar la proyección en PDF.",
      },
      { status: 500 },
    );
  }
}
