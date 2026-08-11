import "server-only";

import fs from "node:fs";
import path from "node:path";
import { jsPDF } from "jspdf";
import autoTable, { type CellHookData } from "jspdf-autotable";
import {
  dedupeProveedoresPorGrupo,
  getProveedorGrupoCategorias,
} from "@/app/data/providers";
import type { ClienteProyeccionContext } from "@/lib/cliente-proyeccion";
import {
  buildProjectionTableBody,
  type ProjectionTableRow,
} from "@/lib/cliente-proyeccion-table";
import { formatCurrency, formatWeddingDate } from "@/lib/format";

const CELESTIA_EMAIL = "celestiaandevents@gmail.com";
const CELESTIA_PHONE = "+57 319 553 8654";

const COLORS = {
  canvas: [247, 244, 239] as [number, number, number],
  ink: [42, 38, 34] as [number, number, number],
  muted: [107, 101, 96] as [number, number, number],
  accent: [125, 107, 90] as [number, number, number],
  border: [232, 226, 217] as [number, number, number],
  white: [255, 255, 255] as [number, number, number],
};

const TABLE_THEME = {
  theme: "plain" as const,
  styles: {
    font: "helvetica",
    fontSize: 9,
    textColor: COLORS.ink,
    cellPadding: { top: 3, right: 4, bottom: 3, left: 4 },
    lineColor: COLORS.border,
    lineWidth: 0.2,
    overflow: "linebreak" as const,
  },
  headStyles: {
    fillColor: COLORS.accent,
    textColor: COLORS.white,
    fontStyle: "bold" as const,
    halign: "left" as const,
    fontSize: 8,
  },
  footStyles: {
    fillColor: COLORS.canvas,
    textColor: COLORS.ink,
    fontStyle: "bold" as const,
    fontSize: 8,
    overflow: "ellipsize" as const,
  },
  columnStyles: {
    0: { cellWidth: 26 },
    1: { cellWidth: 36 },
    2: { cellWidth: 32 },
    3: { halign: "right" as const, cellWidth: 40 },
    4: { halign: "right" as const, cellWidth: 22 },
  },
  margin: { left: 16, right: 16, bottom: 22 },
};

function loadLogoBase64(): string | null {
  try {
    const logoPath = path.join(process.cwd(), "public", "logo.png");
    const file = fs.readFileSync(logoPath);
    return file.toString("base64");
  } catch {
    return null;
  }
}

function sanitizeFilename(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9-_]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);
}

function drawFooter(doc: jsPDF) {
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const footerY = pageHeight - 14;

  doc.setDrawColor(...COLORS.border);
  doc.setLineWidth(0.3);
  doc.line(20, footerY - 4, pageWidth - 20, footerY - 4);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(...COLORS.muted);
  doc.text(
    `${CELESTIA_EMAIL}  |  ${CELESTIA_PHONE}`,
    pageWidth / 2,
    footerY,
    { align: "center" },
  );
}

function styleProjectionTableRow(
  data: CellHookData,
  tableRows: ProjectionTableRow[],
) {
  if (data.section !== "body") return;

  const row = tableRows[data.row.index];
  if (!row) return;

  if (row.rowType === "valor" || row.rowType === "saldo") {
    data.cell.styles.fontStyle = "bold";
  }

  if (row.rowType === "deposito") {
    data.cell.styles.textColor = COLORS.accent;
  }

  if (row.rowType === "sin-pagos") {
    data.cell.styles.textColor = COLORS.muted;
  }

  if (row.rowType === "spacer") {
    data.cell.styles.lineWidth = 0;
    data.cell.styles.cellPadding = { top: 1, right: 0, bottom: 1, left: 0 };
  }
}

export function buildClienteProyeccionPdfFilename(nombrePareja: string): string {
  const slug = sanitizeFilename(nombrePareja) || "boda";
  return `Proyeccion-${slug}.pdf`;
}

export function generateClienteProyeccionPdf(
  context: ClienteProyeccionContext,
): Uint8Array {
  const {
    boda,
    proveedores,
    proveedoresSinCosto,
    pagosByProveedor,
    totalContratado,
    totalPagado,
    saldoPendiente,
  } = context;
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();

  doc.setFillColor(...COLORS.canvas);
  doc.rect(0, 0, pageWidth, 52, "F");

  const logoBase64 = loadLogoBase64();
  if (logoBase64) {
    const logoWidth = 36;
    const logoHeight = 18;
    doc.addImage(
      `data:image/png;base64,${logoBase64}`,
      "PNG",
      (pageWidth - logoWidth) / 2,
      10,
      logoWidth,
      logoHeight,
    );
  } else {
    doc.setFont("times", "bold");
    doc.setFontSize(18);
    doc.setTextColor(...COLORS.accent);
    doc.text("Celestia", pageWidth / 2, 22, { align: "center" });
  }

  doc.setFont("times", "bold");
  doc.setFontSize(20);
  doc.setTextColor(...COLORS.ink);
  doc.text("Proyección de Inversión", pageWidth / 2, 38, {
    align: "center",
  });

  const subtitulo = [
    boda.nombre_pareja,
    formatWeddingDate(boda.fecha_boda),
    boda.ciudad,
  ]
    .filter(Boolean)
    .join("  ·  ");

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(...COLORS.muted);
  doc.text(subtitulo, pageWidth / 2, 46, { align: "center" });

  let nextY = 60;

  if (proveedores.length > 0) {
    const tableRows = buildProjectionTableBody(proveedores, pagosByProveedor);

    autoTable(doc, {
      startY: nextY,
      head: [
        [
          "Categoría",
          "Proveedor",
          "Concepto",
          "Monto",
          "Fecha",
        ],
      ],
      body: tableRows.map((row) => row.cells),
      foot: [
        [
          { content: "Total contratado", colSpan: 3 },
          {
            content: formatCurrency(totalContratado),
            colSpan: 2,
            styles: { halign: "right", fontSize: 8, overflow: "ellipsize" },
          },
        ],
        [
          { content: "Total pagado", colSpan: 3 },
          {
            content: formatCurrency(totalPagado),
            colSpan: 2,
            styles: { halign: "right", fontSize: 8, overflow: "ellipsize" },
          },
        ],
        [
          { content: "Saldo total", colSpan: 3 },
          {
            content: formatCurrency(saldoPendiente),
            colSpan: 2,
            styles: { halign: "right", fontSize: 8, overflow: "ellipsize" },
          },
        ],
      ],
      showFoot: "lastPage",
      ...TABLE_THEME,
      didParseCell: (data) => styleProjectionTableRow(data, tableRows),
      didDrawPage: () => {
        drawFooter(doc);
      },
    });

    nextY =
      (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable
        ?.finalY ?? nextY;
  }

  if (proveedoresSinCosto.length > 0) {
    const sectionStartY = proveedores.length > 0 ? nextY + 10 : nextY;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(...COLORS.ink);
    doc.text("Servicios sin costo / regalos", 16, sectionStartY);

    autoTable(doc, {
      startY: sectionStartY + 4,
      head: [["Categoría", "Proveedor", "Nota"]],
      body: dedupeProveedoresPorGrupo(proveedoresSinCosto).map((provider) => [
        getProveedorGrupoCategorias(proveedoresSinCosto, provider).join(", "),
        provider.nombre,
        "Sin costo",
      ]),
      ...TABLE_THEME,
      columnStyles: {
        0: { cellWidth: 40 },
        1: { cellWidth: 72 },
        2: { cellWidth: 40 },
      },
      didDrawPage: () => {
        drawFooter(doc);
      },
    });
  }

  drawFooter(doc);

  return new Uint8Array(doc.output("arraybuffer"));
}
