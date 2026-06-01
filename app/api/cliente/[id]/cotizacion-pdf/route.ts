import { NextResponse } from "next/server";
import {
  getClienteCotizacionContext,
  hasClienteCotizacionDisponible,
} from "@/lib/cliente-cotizacion";
import {
  buildClienteCotizacionPdfFilename,
  generateClienteCotizacionPdf,
} from "@/lib/cliente-cotizacion-pdf";
import { createServerSupabaseClient } from "@/lib/supabase-server";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: Request, { params }: RouteContext) {
  try {
    const { id } = await params;
    const supabase = await createServerSupabaseClient();
    const context = await getClienteCotizacionContext(supabase, id);

    if (!hasClienteCotizacionDisponible(context)) {
      return NextResponse.json(
        { error: "No hay cotización disponible para esta boda." },
        { status: 404 },
      );
    }

    const pdfBytes = generateClienteCotizacionPdf(context!);
    const filename = buildClienteCotizacionPdfFilename(
      context!.boda.nombre_pareja,
    );

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
            : "No se pudo generar la cotización en PDF.",
      },
      { status: 500 },
    );
  }
}
