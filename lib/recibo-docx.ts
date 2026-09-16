import "server-only";

import fs from "node:fs";
import path from "node:path";
import {
  AlignmentType,
  BorderStyle,
  Document,
  ImageRun,
  Packer,
  Paragraph,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
} from "docx";
import {
  RECIBO_EMPRESA,
  buildReciboFilename,
  displayOrBlank,
  formatReciboFechaDisplay,
  formatReciboMoney,
  type ReciboDocumentData,
} from "@/lib/recibo-celestia-template";

const FONT = "Arial";
const GRAY = "E6E6E6";
const BORDER = {
  style: BorderStyle.SINGLE,
  size: 8,
  color: "B4B4B4",
};
const BORDERS = {
  top: BORDER,
  bottom: BORDER,
  left: BORDER,
  right: BORDER,
};
const NO_BORDER = {
  style: BorderStyle.NONE,
  size: 0,
  color: "FFFFFF",
};
const NO_BORDERS = {
  top: NO_BORDER,
  bottom: NO_BORDER,
  left: NO_BORDER,
  right: NO_BORDER,
};

const LOGO_WIDTH = 90;

type LogoImage = {
  data: Uint8Array;
  width: number;
  height: number;
};

function readPngDimensions(buffer: Buffer): { width: number; height: number } {
  return {
    width: buffer.readUInt32BE(16),
    height: buffer.readUInt32BE(20),
  };
}

function loadLogoImage(): LogoImage | null {
  try {
    const logoPath = path.join(process.cwd(), "public", "logo.png");
    const file = fs.readFileSync(logoPath);
    const dimensions = readPngDimensions(file);
    if (!dimensions.width || !dimensions.height) return null;
    const height = Math.round(
      (dimensions.height / dimensions.width) * LOGO_WIDTH,
    );
    return {
      data: new Uint8Array(file),
      width: LOGO_WIDTH,
      height: height > 0 ? height : LOGO_WIDTH,
    };
  } catch {
    return null;
  }
}

function cell(
  text: string,
  options?: {
    bold?: boolean;
    fill?: string;
    width: number;
    align?: (typeof AlignmentType)[keyof typeof AlignmentType];
    size?: number;
  },
) {
  return new TableCell({
    borders: BORDERS,
    width: { size: options?.width ?? 2000, type: WidthType.DXA },
    shading: options?.fill ? { fill: options.fill } : undefined,
    children: [
      new Paragraph({
        alignment: options?.align ?? AlignmentType.LEFT,
        children: [
          new TextRun({
            text,
            bold: options?.bold,
            font: FONT,
            size: options?.size ?? 16,
          }),
        ],
      }),
    ],
  });
}

function labelValueRow(label: string, value: string, labelW: number, valueW: number) {
  return new TableRow({
    children: [
      cell(label, { bold: true, fill: GRAY, width: labelW, size: 14 }),
      cell(value, { width: valueW, size: 16 }),
    ],
  });
}

export async function generateReciboDocx(data: ReciboDocumentData): Promise<{
  blob: Blob;
  filename: string;
}> {
  const logo = loadLogoImage();
  const contentWidth = 9026;

  const headerTable = new Table({
    width: { size: contentWidth, type: WidthType.DXA },
    columnWidths: [2800, 6226],
    rows: [
      new TableRow({
        children: [
          new TableCell({
            borders: NO_BORDERS,
            width: { size: 2800, type: WidthType.DXA },
            children: [
              logo
                ? new Paragraph({
                    children: [
                      new ImageRun({
                        type: "png",
                        data: logo.data,
                        transformation: {
                          width: logo.width,
                          height: logo.height,
                        },
                      }),
                    ],
                  })
                : new Paragraph({
                    children: [
                      new TextRun({
                        text: "CELESTIA",
                        bold: true,
                        font: FONT,
                        size: 22,
                      }),
                    ],
                  }),
            ],
          }),
          new TableCell({
            borders: NO_BORDERS,
            width: { size: 6226, type: WidthType.DXA },
            children: [
              new Paragraph({
                alignment: AlignmentType.RIGHT,
                children: [
                  new TextRun({
                    text: RECIBO_EMPRESA.nombre,
                    bold: true,
                    font: FONT,
                    size: 20,
                  }),
                ],
              }),
              new Paragraph({
                alignment: AlignmentType.RIGHT,
                children: [
                  new TextRun({
                    text: `NIT ${RECIBO_EMPRESA.nit}`,
                    font: FONT,
                    size: 14,
                  }),
                ],
              }),
              new Paragraph({
                alignment: AlignmentType.RIGHT,
                children: [
                  new TextRun({
                    text: RECIBO_EMPRESA.direccion,
                    font: FONT,
                    size: 14,
                  }),
                ],
              }),
              new Paragraph({
                alignment: AlignmentType.RIGHT,
                children: [
                  new TextRun({
                    text: RECIBO_EMPRESA.telefono,
                    font: FONT,
                    size: 14,
                  }),
                ],
              }),
              new Paragraph({
                alignment: AlignmentType.RIGHT,
                children: [
                  new TextRun({
                    text: RECIBO_EMPRESA.email,
                    font: FONT,
                    size: 14,
                  }),
                ],
              }),
            ],
          }),
        ],
      }),
    ],
  });

  const labelW = 2200;
  const valueW = 3400;
  const clienteTable = new Table({
    width: { size: labelW + valueW, type: WidthType.DXA },
    columnWidths: [labelW, valueW],
    rows: [
      labelValueRow("SEÑOR(ES)", displayOrBlank(data.cliente.nombre), labelW, valueW),
      labelValueRow("DIRECCION", displayOrBlank(data.cliente.direccion), labelW, valueW),
      labelValueRow("CIUDAD", displayOrBlank(data.cliente.ciudad), labelW, valueW),
      labelValueRow("TELÉFONO", displayOrBlank(data.cliente.telefono), labelW, valueW),
      labelValueRow("DOCUMENTO", displayOrBlank(data.cliente.documento), labelW, valueW),
      labelValueRow("METODO DE PAGO", displayOrBlank(data.metodoPago), labelW, valueW),
      labelValueRow("CUENTA", displayOrBlank(data.cuenta), labelW, valueW),
    ],
  });

  const sideBoxW = 2800;
  const fechaTotalTable = new Table({
    width: { size: sideBoxW, type: WidthType.DXA },
    columnWidths: [sideBoxW],
    rows: [
      new TableRow({
        children: [
          cell("FECHA", {
            bold: true,
            fill: GRAY,
            width: sideBoxW,
            align: AlignmentType.CENTER,
            size: 14,
          }),
        ],
      }),
      new TableRow({
        children: [
          cell(formatReciboFechaDisplay(data.fecha), {
            width: sideBoxW,
            align: AlignmentType.CENTER,
            size: 18,
          }),
        ],
      }),
      new TableRow({
        children: [
          cell("Total", {
            bold: true,
            fill: GRAY,
            width: sideBoxW,
            align: AlignmentType.CENTER,
            size: 14,
          }),
        ],
      }),
      new TableRow({
        children: [
          cell(formatReciboMoney(data.total), {
            bold: true,
            width: sideBoxW,
            align: AlignmentType.CENTER,
            size: 20,
          }),
        ],
      }),
    ],
  });

  const topBody = new Table({
    width: { size: contentWidth, type: WidthType.DXA },
    columnWidths: [labelW + valueW, 626, sideBoxW],
    rows: [
      new TableRow({
        children: [
          new TableCell({
            borders: NO_BORDERS,
            width: { size: labelW + valueW, type: WidthType.DXA },
            children: [clienteTable],
          }),
          new TableCell({
            borders: NO_BORDERS,
            width: { size: 626, type: WidthType.DXA },
            children: [new Paragraph({ children: [] })],
          }),
          new TableCell({
            borders: NO_BORDERS,
            width: { size: sideBoxW, type: WidthType.DXA },
            children: [fechaTotalTable],
          }),
        ],
      }),
    ],
  });

  const conceptoW = 6200;
  const valorW = 2826;
  const conceptoTable = new Table({
    width: { size: contentWidth, type: WidthType.DXA },
    columnWidths: [conceptoW, valorW],
    rows: [
      new TableRow({
        children: [
          cell("CONCEPTO", {
            bold: true,
            fill: GRAY,
            width: conceptoW,
            size: 14,
          }),
          cell("VALOR", {
            bold: true,
            fill: GRAY,
            width: valorW,
            align: AlignmentType.RIGHT,
            size: 14,
          }),
        ],
      }),
      new TableRow({
        children: [
          cell(displayOrBlank(data.concepto), { width: conceptoW, size: 18 }),
          cell(formatReciboMoney(data.valor), {
            width: valorW,
            align: AlignmentType.RIGHT,
            size: 18,
          }),
        ],
      }),
      new TableRow({
        children: [
          cell("Subtotal", {
            bold: true,
            fill: GRAY,
            width: conceptoW,
            size: 16,
          }),
          cell(formatReciboMoney(data.total), {
            bold: true,
            fill: GRAY,
            width: valorW,
            align: AlignmentType.RIGHT,
            size: 16,
          }),
        ],
      }),
    ],
  });

  const sigColW = 4300;
  const signatures = new Table({
    width: { size: contentWidth, type: WidthType.DXA },
    columnWidths: [sigColW, 426, sigColW],
    rows: [
      new TableRow({
        children: [
          new TableCell({
            borders: NO_BORDERS,
            width: { size: sigColW, type: WidthType.DXA },
            children: [
              new Paragraph({ children: [] }),
              new Paragraph({ children: [] }),
              new Paragraph({
                children: [
                  new TextRun({
                    text: displayOrBlank(data.elaboradoPor),
                    font: FONT,
                    size: 18,
                  }),
                ],
              }),
              new Paragraph({
                border: {
                  bottom: {
                    style: BorderStyle.SINGLE,
                    size: 8,
                    color: "B4B4B4",
                    space: 1,
                  },
                },
                children: [new TextRun({ text: " ", font: FONT, size: 18 })],
              }),
              new Paragraph({
                spacing: { before: 80 },
                children: [
                  new TextRun({
                    text: "ELABORADO POR",
                    bold: true,
                    font: FONT,
                    size: 14,
                  }),
                ],
              }),
            ],
          }),
          new TableCell({
            borders: NO_BORDERS,
            width: { size: 426, type: WidthType.DXA },
            children: [new Paragraph({ children: [] })],
          }),
          new TableCell({
            borders: NO_BORDERS,
            width: { size: sigColW, type: WidthType.DXA },
            children: [
              new Paragraph({ children: [] }),
              new Paragraph({ children: [] }),
              new Paragraph({ children: [] }),
              new Paragraph({
                border: {
                  bottom: {
                    style: BorderStyle.SINGLE,
                    size: 8,
                    color: "B4B4B4",
                    space: 1,
                  },
                },
                children: [new TextRun({ text: " ", font: FONT, size: 18 })],
              }),
              new Paragraph({
                spacing: { before: 80 },
                children: [
                  new TextRun({
                    text: "ACEPTADA, FIRMA Y/O SELLO Y FECHA",
                    bold: true,
                    font: FONT,
                    size: 14,
                  }),
                ],
              }),
            ],
          }),
        ],
      }),
    ],
  });

  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: 720,
              bottom: 720,
              left: 720,
              right: 720,
            },
          },
        },
        children: [
          headerTable,
          new Paragraph({ spacing: { after: 280 }, children: [] }),
          topBody,
          new Paragraph({ spacing: { after: 280 }, children: [] }),
          conceptoTable,
          new Paragraph({ spacing: { after: 400 }, children: [] }),
          signatures,
        ],
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  return { blob, filename: buildReciboFilename(data) };
}
