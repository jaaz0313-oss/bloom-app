import { NextResponse } from "next/server";
import type { ContratoDocumentData } from "@/lib/contrato-celestia-template";
import { generateContratoPdf } from "@/lib/contrato-pdf";

export async function POST(request: Request) {
  try {
    const data = (await request.json()) as ContratoDocumentData;
    const { bytes, filename } = generateContratoPdf(data);

    return new NextResponse(Buffer.from(bytes), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "X-Filename": filename,
      },
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "No se pudo generar el contrato en PDF.",
      },
      { status: 500 },
    );
  }
}
