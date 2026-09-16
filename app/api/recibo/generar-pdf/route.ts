import { NextResponse } from "next/server";
import type { ReciboDocumentData } from "@/lib/recibo-celestia-template";
import { generateReciboPdf } from "@/lib/recibo-pdf";

export async function POST(request: Request) {
  try {
    const data = (await request.json()) as ReciboDocumentData;
    const { bytes, filename } = generateReciboPdf(data);

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
            : "No se pudo generar el recibo en PDF.",
      },
      { status: 500 },
    );
  }
}
