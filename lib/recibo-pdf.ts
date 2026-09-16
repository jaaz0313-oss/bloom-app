import "server-only";

import fs from "node:fs";
import path from "node:path";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import {
  RECIBO_EMPRESA,
  buildReciboPdfFilename,
  displayOrBlank,
  formatReciboFechaDisplay,
  formatReciboMoney,
  type ReciboDocumentData,
} from "@/lib/recibo-celestia-template";

const PAGE_WIDTH = 210;
const MARGIN = 16;
const GRAY: [number, number, number] = [230, 230, 230];
const INK: [number, number, number] = [40, 40, 40];
const MUTED: [number, number, number] = [90, 90, 90];
const BORDER: [number, number, number] = [180, 180, 180];
const LOGO_WIDTH_MM = 28;
const LOGO_NATURAL_WIDTH_PX = 4500;
const LOGO_NATURAL_HEIGHT_PX = 4421;
const LOGO_HEIGHT_MM =
  LOGO_WIDTH_MM * (LOGO_NATURAL_HEIGHT_PX / LOGO_NATURAL_WIDTH_PX);

function loadLogoBase64(): string | null {
  try {
    const logoPath = path.join(process.cwd(), "public", "logo.png");
    return fs.readFileSync(logoPath).toString("base64");
  } catch {
    return null;
  }
}

function drawHeader(doc: jsPDF, logoBase64: string | null): number {
  const leftX = MARGIN;
  let y = MARGIN;

  if (logoBase64) {
    doc.addImage(
      `data:image/png;base64,${logoBase64}`,
      "PNG",
      leftX,
      y,
      LOGO_WIDTH_MM,
      LOGO_HEIGHT_MM,
    );
  } else {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(...INK);
    doc.text("CELESTIA", leftX, y + 10);
  }

  const rightX = PAGE_WIDTH - MARGIN;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(...INK);
  doc.text(RECIBO_EMPRESA.nombre, rightX, y + 4, { align: "right" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(...MUTED);
  const lines = [
    `NIT ${RECIBO_EMPRESA.nit}`,
    RECIBO_EMPRESA.direccion,
    RECIBO_EMPRESA.telefono,
    RECIBO_EMPRESA.email,
  ];
  let infoY = y + 9;
  for (const line of lines) {
    doc.text(line, rightX, infoY, { align: "right" });
    infoY += 4;
  }

  return Math.max(y + LOGO_HEIGHT_MM, infoY) + 8;
}

export function generateReciboPdf(data: ReciboDocumentData): {
  bytes: Uint8Array;
  filename: string;
} {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const logoBase64 = loadLogoBase64();
  let y = drawHeader(doc, logoBase64);

  const contentWidth = PAGE_WIDTH - MARGIN * 2;
  const leftWidth = contentWidth * 0.62;
  const rightWidth = contentWidth * 0.35;
  const gap = contentWidth - leftWidth - rightWidth;

  const clienteRows: [string, string][] = [
    ["SEÑOR(ES)", displayOrBlank(data.cliente.nombre)],
    ["DIRECCION", displayOrBlank(data.cliente.direccion)],
    ["CIUDAD", displayOrBlank(data.cliente.ciudad)],
    ["TELÉFONO", displayOrBlank(data.cliente.telefono)],
    ["DOCUMENTO", displayOrBlank(data.cliente.documento)],
    ["METODO DE PAGO", displayOrBlank(data.metodoPago)],
    ["CUENTA", displayOrBlank(data.cuenta)],
  ];

  autoTable(doc, {
    startY: y,
    margin: { left: MARGIN, right: MARGIN + rightWidth + gap },
    tableWidth: leftWidth,
    theme: "grid",
    styles: {
      font: "helvetica",
      fontSize: 8,
      textColor: INK,
      lineColor: BORDER,
      lineWidth: 0.2,
      cellPadding: { top: 2.2, right: 3, bottom: 2.2, left: 3 },
      valign: "middle",
    },
    body: clienteRows,
    columnStyles: {
      0: {
        cellWidth: leftWidth * 0.38,
        fillColor: GRAY,
        fontStyle: "bold",
        fontSize: 7,
      },
      1: { cellWidth: leftWidth * 0.62 },
    },
    didParseCell: (hook) => {
      if (hook.section === "body" && hook.column.index === 0) {
        hook.cell.styles.fillColor = GRAY;
        hook.cell.styles.fontStyle = "bold";
      }
    },
  });

  const clienteTableEndY =
    (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable
      ?.finalY ?? y + 40;

  // FECHA box
  autoTable(doc, {
    startY: y,
    margin: { left: MARGIN + leftWidth + gap, right: MARGIN },
    tableWidth: rightWidth,
    theme: "grid",
    styles: {
      font: "helvetica",
      fontSize: 9,
      textColor: INK,
      lineColor: BORDER,
      lineWidth: 0.2,
      cellPadding: 3,
      halign: "center",
    },
    body: [
      [
        {
          content: "FECHA",
          styles: { fillColor: GRAY, fontStyle: "bold", fontSize: 8 },
        },
      ],
      [formatReciboFechaDisplay(data.fecha)],
    ],
  });

  const fechaEndY =
    (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable
      ?.finalY ?? y + 18;

  // Total box
  autoTable(doc, {
    startY: fechaEndY + 4,
    margin: { left: MARGIN + leftWidth + gap, right: MARGIN },
    tableWidth: rightWidth,
    theme: "grid",
    styles: {
      font: "helvetica",
      fontSize: 10,
      textColor: INK,
      lineColor: BORDER,
      lineWidth: 0.2,
      cellPadding: 3,
      halign: "center",
    },
    body: [
      [
        {
          content: "Total",
          styles: { fillColor: GRAY, fontStyle: "bold", fontSize: 8 },
        },
      ],
      [
        {
          content: formatReciboMoney(data.total),
          styles: { fontStyle: "bold", fontSize: 11 },
        },
      ],
    ],
  });

  const rightEndY =
    (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable
      ?.finalY ?? fechaEndY + 24;

  y = Math.max(clienteTableEndY, rightEndY) + 10;

  // Concepto / Valor
  autoTable(doc, {
    startY: y,
    margin: { left: MARGIN, right: MARGIN },
    theme: "grid",
    styles: {
      font: "helvetica",
      fontSize: 9,
      textColor: INK,
      lineColor: BORDER,
      lineWidth: 0.2,
      cellPadding: { top: 3, right: 4, bottom: 3, left: 4 },
    },
    head: [["CONCEPTO", "VALOR"]],
    headStyles: {
      fillColor: GRAY,
      textColor: INK,
      fontStyle: "bold",
      fontSize: 8,
      halign: "left",
    },
    body: [
      [displayOrBlank(data.concepto), formatReciboMoney(data.valor)],
      [
        { content: "Subtotal", styles: { fontStyle: "bold", fillColor: GRAY } },
        {
          content: formatReciboMoney(data.total),
          styles: { fontStyle: "bold", fillColor: GRAY, halign: "right" },
        },
      ],
    ],
    columnStyles: {
      0: { cellWidth: contentWidth * 0.68 },
      1: { cellWidth: contentWidth * 0.32, halign: "right" },
    },
  });

  y =
    ((doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable
      ?.finalY ?? y) + 22;

  // Firmas
  const colW = (contentWidth - 10) / 2;
  const leftSigX = MARGIN;
  const rightSigX = MARGIN + colW + 10;
  const lineY = y + 28;

  doc.setDrawColor(...BORDER);
  doc.setLineWidth(0.4);
  doc.line(leftSigX, lineY, leftSigX + colW, lineY);
  doc.line(rightSigX, lineY, rightSigX + colW, lineY);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(...INK);
  doc.text("ELABORADO POR", leftSigX, lineY + 5);
  doc.text("ACEPTADA, FIRMA Y/O SELLO Y FECHA", rightSigX, lineY + 5);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  const elaborado = displayOrBlank(data.elaboradoPor);
  if (elaborado) {
    doc.text(elaborado, leftSigX, lineY - 4);
  }

  const arrayBuffer = doc.output("arraybuffer");
  return {
    bytes: new Uint8Array(arrayBuffer),
    filename: buildReciboPdfFilename(data),
  };
}
