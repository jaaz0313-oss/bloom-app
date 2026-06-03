import { NextResponse } from "next/server";
import { getLeadCotizacionPdfContext } from "@/lib/lead-cotizacion";
import {
  buildLeadCotizacionPdfFilename,
  generateLeadCotizacionPdf,
} from "@/lib/lead-cotizacion-pdf";
import { createPublicSupabaseClient } from "@/lib/supabase-public";

type RouteContext = {
  params: Promise<{ id: string }>;
};

/** PDF público por link (WhatsApp). Sin sesión ni cookies. */
export async function GET(_request: Request, { params }: RouteContext) {
  try {
    const { id } = await params;
    const supabase = createPublicSupabaseClient();
    const context = await getLeadCotizacionPdfContext(supabase, id);

    if (!context) {
      return NextResponse.json(
        { error: "No hay cotización activa para generar el PDF." },
        { status: 404 },
      );
    }

    const pdfBytes = generateLeadCotizacionPdf(context);
    const filename = buildLeadCotizacionPdfFilename(context.lead.nombre_pareja);

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
