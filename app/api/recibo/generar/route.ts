import { NextResponse } from "next/server";
import type { ReciboDocumentData } from "@/lib/recibo-celestia-template";
import { generateReciboDocx } from "@/lib/recibo-docx";

export async function POST(request: Request) {
  try {
    const data = (await request.json()) as ReciboDocumentData;
    const { blob, filename } = await generateReciboDocx(data);

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
            : "No se pudo generar el recibo.",
      },
      { status: 500 },
    );
  }
}
