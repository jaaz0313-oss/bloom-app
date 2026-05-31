import { NextResponse } from "next/server";
import type { ContratoDocumentData } from "@/lib/contrato-celestia-template";
import { generateContratoDocx } from "@/lib/contrato-docx";

export async function POST(request: Request) {
  try {
    const data = (await request.json()) as ContratoDocumentData;
    const { blob, filename } = await generateContratoDocx(data);

    return new NextResponse(blob, {
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
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
            : "No se pudo generar el contrato.",
      },
      { status: 500 },
    );
  }
}
