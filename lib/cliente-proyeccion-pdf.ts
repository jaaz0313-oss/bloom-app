import "server-only";

import fs from "node:fs";
import path from "node:path";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import {
  getProviderSaldoPendienteConPagos,
  hasProveedorValorDefinido,
  type ProveedorRow,
} from "@/app/data/providers";
import type { PagoRow } from "@/app/data/pagos";
import type { ClienteProyeccionContext } from "@/lib/cliente-proyeccion";
import { formatCurrency, formatWeddingDate } from "@/lib/format";

const CLIENTE_VALOR_POR_DEFINIR = "Por definir";

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

function buildProviderRow(
  provider: ProveedorRow,
  pagos: PagoRow[],
): [string, string, string, string, string] {
  const saldo = getProviderSaldoPendienteConPagos(provider, pagos);
  const valorDefinido = hasProveedorValorDefinido(provider.valor_total);
  return [
    provider.categoria,
    provider.nombre,
    valorDefinido
      ? formatCurrency(provider.valor_total)
      : CLIENTE_VALOR_POR_DEFINIR,
    valorDefinido ? formatCurrency(provider.anticipo) : CLIENTE_VALOR_POR_DEFINIR,
    valorDefinido ? formatCurrency(saldo) : CLIENTE_VALOR_POR_DEFINIR,
  ];
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

  const tableBody = proveedores.map((provider) =>
    buildProviderRow(provider, pagosByProveedor[provider.id] ?? []),
  );

  autoTable(doc, {
    startY: 60,
    head: [
      [
        "Categoría",
        "Proveedor",
        "Valor total",
        "Anticipo pagado",
        "Saldo pendiente",
      ],
    ],
    body: tableBody,
    foot: [
      ["Total contratado", "", formatCurrency(totalContratado), "", ""],
      ["Total pagado", "", "", formatCurrency(totalPagado), ""],
      ["Saldo total", "", "", "", formatCurrency(saldoPendiente)],
    ],
    theme: "plain",
    styles: {
      font: "helvetica",
      fontSize: 9,
      textColor: COLORS.ink,
      cellPadding: { top: 3, right: 4, bottom: 3, left: 4 },
      lineColor: COLORS.border,
      lineWidth: 0.2,
      overflow: "linebreak",
    },
    headStyles: {
      fillColor: COLORS.accent,
      textColor: COLORS.white,
      fontStyle: "bold",
      halign: "left",
      fontSize: 8,
    },
    footStyles: {
      fillColor: COLORS.canvas,
      textColor: COLORS.ink,
      fontStyle: "bold",
      fontSize: 9,
    },
    columnStyles: {
      0: { cellWidth: 28 },
      1: { cellWidth: 42 },
      2: { halign: "right", cellWidth: 28 },
      3: { halign: "right", cellWidth: 28 },
      4: { halign: "right", cellWidth: 28 },
    },
    margin: { left: 16, right: 16, bottom: 22 },
    didDrawPage: () => {
      drawFooter(doc);
    },
  });

  drawFooter(doc);

  return new Uint8Array(doc.output("arraybuffer"));
}
