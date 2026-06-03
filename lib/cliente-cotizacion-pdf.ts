import "server-only";

import fs from "node:fs";
import path from "node:path";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import type { CotizacionItemRow } from "@/app/data/cotizaciones";
import type { ClienteCotizacionContext } from "@/lib/cliente-cotizacion";
import { computeCotizacionTotal, getItemDisplayName } from "@/lib/cotizacion-lead";
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

function formatPrecioItem(item: CotizacionItemRow): string {
  if (item.precio_estimado == null || item.precio_estimado <= 0) {
    return "Por definir";
  }
  return formatCurrency(item.precio_estimado);
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

export function buildClienteCotizacionPdfFilename(nombrePareja: string): string {
  const slug = sanitizeFilename(nombrePareja) || "boda";
  return `Cotizacion-${slug}.pdf`;
}

export function generateClienteCotizacionPdf(
  context: ClienteCotizacionContext,
): Uint8Array {
  const { boda, items } = context;
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const totalEstimado = computeCotizacionTotal(items);

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
  doc.text("Proyección estimada de inversión", pageWidth / 2, 38, {
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

  const tableBody = items.map((item) => [
    getItemDisplayName(item.categoria),
    formatPrecioItem(item),
  ]);

  autoTable(doc, {
    startY: 60,
    head: [["Categoría", "Precio estimado"]],
    body: tableBody,
    foot: [["Total estimado", formatCurrency(totalEstimado)]],
    theme: "plain",
    styles: {
      font: "helvetica",
      fontSize: 10,
      textColor: COLORS.ink,
      cellPadding: { top: 4, right: 5, bottom: 4, left: 5 },
      lineColor: COLORS.border,
      lineWidth: 0.2,
    },
    headStyles: {
      fillColor: COLORS.accent,
      textColor: COLORS.white,
      fontStyle: "bold",
      halign: "left",
    },
    footStyles: {
      fillColor: COLORS.canvas,
      textColor: COLORS.ink,
      fontStyle: "bold",
    },
    columnStyles: {
      0: { cellWidth: 110 },
      1: { halign: "right", cellWidth: 60 },
    },
    margin: { left: 20, right: 20, bottom: 22 },
    didDrawPage: () => {
      drawFooter(doc);
    },
  });

  const disclaimerY =
    (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable
      ?.finalY ?? 60;
  doc.setFont("helvetica", "italic");
  doc.setFontSize(8);
  doc.setTextColor(...COLORS.muted);
  doc.text(
    "Proyección aproximada. Los valores finales pueden variar según proveedores seleccionados.",
    20,
    disclaimerY + 10,
    { maxWidth: pageWidth - 40 },
  );

  drawFooter(doc);

  return new Uint8Array(doc.output("arraybuffer"));
}
