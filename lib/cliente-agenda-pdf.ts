import { jsPDF } from "jspdf";
import {
  sortTastingsBySchedule,
  type TastingRow,
  type TastingTipoCita,
} from "@/app/data/tastings";
import {
  formatClienteShortDate,
  formatClienteWeddingDate,
  type ClienteLocale,
} from "@/lib/cliente-i18n";
import { formatClienteTastingTimeRange } from "@/lib/cliente-tastings";
import { formatCurrency } from "@/lib/format";
import {
  getTastingDisplayTitle,
  normalizeTastingTipoCita,
} from "@/lib/tastings";

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

const TIPO_BADGE: Record<
  TastingTipoCita,
  {
    bg: [number, number, number];
    text: [number, number, number];
  }
> = {
  tasting: { bg: [250, 232, 255], text: [134, 25, 143] },
  visita: { bg: [219, 234, 254], text: [30, 64, 175] },
  reunion: { bg: [220, 252, 231], text: [22, 101, 52] },
};

const MARGIN_X = 16;
const MARGIN_BOTTOM = 22;

export type ClienteAgendaPdfCopy = {
  title: string;
  noProvider: string;
  address: string;
  meetLink: string;
  notes: string;
  cost: string;
  tipoLabels: Record<TastingTipoCita, string>;
};

export type ClienteAgendaPdfInput = {
  nombrePareja: string;
  fechaBoda: string;
  tastings: TastingRow[];
  locale: ClienteLocale;
  copy: ClienteAgendaPdfCopy;
};

function sanitizeFilename(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9-_]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);
}

export function buildClienteAgendaPdfFilename(
  nombrePareja: string,
  locale: ClienteLocale,
): string {
  const slug = sanitizeFilename(nombrePareja) || "boda";
  const prefix = locale === "en" ? "Schedule" : "Agenda";
  return `${prefix}-${slug}.pdf`;
}

async function loadLogoDataUrl(): Promise<string | null> {
  try {
    const response = await fetch("/logo.png");
    if (!response.ok) return null;
    const blob = await response.blob();
    return await new Promise<string | null>((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        resolve(typeof reader.result === "string" ? reader.result : null);
      };
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
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

function ensureSpace(doc: jsPDF, y: number, needed: number): number {
  const pageHeight = doc.internal.pageSize.getHeight();
  if (y + needed > pageHeight - MARGIN_BOTTOM) {
    drawFooter(doc);
    doc.addPage();
    return 20;
  }
  return y;
}

function drawTipoBadge(
  doc: jsPDF,
  x: number,
  y: number,
  label: string,
  tipo: TastingTipoCita,
): number {
  const colors = TIPO_BADGE[tipo];
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  const textWidth = doc.getTextWidth(label);
  const padX = 2.5;
  const padY = 1.6;
  const width = textWidth + padX * 2;
  const height = 5.2;

  doc.setFillColor(...colors.bg);
  doc.roundedRect(x, y - height + 1.2, width, height, 1.5, 1.5, "F");
  doc.setTextColor(...colors.text);
  doc.text(label, x + padX, y);
  return width;
}

function estimateCardHeight(
  doc: jsPDF,
  tasting: TastingRow,
  copy: ClienteAgendaPdfCopy,
  contentWidth: number,
): number {
  let height = 22;
  const direccion = tasting.direccion?.trim();
  const meet = tasting.google_meet_link?.trim();
  const notas = tasting.notas?.trim();
  const costo = Number(tasting.costo ?? 0);

  if (direccion) {
    const lines = doc.splitTextToSize(
      `${copy.address}: ${direccion}`,
      contentWidth,
    ) as string[];
    height += lines.length * 4.2 + 2;
  }
  if (meet) {
    const lines = doc.splitTextToSize(
      `${copy.meetLink}: ${meet}`,
      contentWidth,
    ) as string[];
    height += lines.length * 4.2 + 2;
  }
  if (notas) {
    const lines = doc.splitTextToSize(
      `${copy.notes}: ${notas}`,
      contentWidth,
    ) as string[];
    height += lines.length * 4.2 + 2;
  }
  if (Number.isFinite(costo) && costo > 0) {
    height += 6;
  }
  return height + 6;
}

function drawTastingCard(
  doc: jsPDF,
  tasting: TastingRow,
  y: number,
  locale: ClienteLocale,
  copy: ClienteAgendaPdfCopy,
): number {
  const pageWidth = doc.internal.pageSize.getWidth();
  const contentWidth = pageWidth - MARGIN_X * 2;
  const tipo = normalizeTastingTipoCita(tasting.tipo_cita);
  const tipoLabel = copy.tipoLabels[tipo];
  const provider = getTastingDisplayTitle(tasting, {
    noProviderLabel: copy.noProvider,
  });
  const fecha = formatClienteShortDate(tasting.fecha, locale);
  const horario = formatClienteTastingTimeRange(
    tasting.hora_inicio,
    tasting.hora_fin,
  );

  const cardHeight = estimateCardHeight(doc, tasting, copy, contentWidth - 8);
  y = ensureSpace(doc, y, cardHeight);

  const cardTop = y;
  let cursorY = y + 8;

  doc.setFillColor(...COLORS.white);
  doc.setDrawColor(...COLORS.border);
  doc.setLineWidth(0.3);

  drawTipoBadge(doc, MARGIN_X + 4, cursorY, tipoLabel, tipo);

  cursorY += 7;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(...COLORS.ink);
  doc.text(provider, MARGIN_X + 4, cursorY);

  cursorY += 6;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...COLORS.accent);
  doc.text(`${fecha}  ·  ${horario}`, MARGIN_X + 4, cursorY);

  cursorY += 3;

  const detail = (
    label: string,
    value: string,
    options?: { link?: boolean },
  ) => {
    const text = `${label}: ${value}`;
    const lines = doc.splitTextToSize(text, contentWidth - 8) as string[];
    cursorY += 5;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(...(options?.link ? COLORS.accent : COLORS.ink));
    doc.text(lines, MARGIN_X + 4, cursorY);
    cursorY += (lines.length - 1) * 4.2;
  };

  const direccion = tasting.direccion?.trim();
  if (direccion) {
    detail(copy.address, direccion, { link: true });
  }

  const meet = tasting.google_meet_link?.trim();
  if (meet) {
    detail(copy.meetLink, meet, { link: true });
  }

  const notas = tasting.notas?.trim();
  if (notas) {
    detail(copy.notes, notas);
  }

  const costo = Number(tasting.costo ?? 0);
  if (Number.isFinite(costo) && costo > 0) {
    detail(copy.cost, formatCurrency(costo));
  }

  const finalBottom = cursorY + 5;
  doc.roundedRect(
    MARGIN_X,
    cardTop,
    contentWidth,
    finalBottom - cardTop,
    2,
    2,
    "S",
  );

  return finalBottom + 4;
}

export async function generateClienteAgendaPdf(
  input: ClienteAgendaPdfInput,
): Promise<jsPDF> {
  const { nombrePareja, fechaBoda, tastings, locale, copy } = input;
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const sorted = sortTastingsBySchedule(tastings);

  doc.setFillColor(...COLORS.canvas);
  doc.rect(0, 0, pageWidth, 52, "F");

  const logoDataUrl = await loadLogoDataUrl();
  if (logoDataUrl) {
    const logoWidth = 36;
    const logoHeight = 18;
    doc.addImage(
      logoDataUrl,
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
    doc.text("Celestia Events", pageWidth / 2, 22, { align: "center" });
  }

  doc.setFont("times", "bold");
  doc.setFontSize(20);
  doc.setTextColor(...COLORS.ink);
  doc.text(copy.title, pageWidth / 2, 38, { align: "center" });

  const subtitulo = [
    nombrePareja,
    formatClienteWeddingDate(fechaBoda, locale),
  ]
    .filter(Boolean)
    .join("  ·  ");

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(...COLORS.muted);
  doc.text(subtitulo, pageWidth / 2, 46, { align: "center" });

  let y = 60;
  for (const tasting of sorted) {
    y = drawTastingCard(doc, tasting, y, locale, copy);
  }

  const totalPages = doc.getNumberOfPages();
  for (let page = 1; page <= totalPages; page += 1) {
    doc.setPage(page);
    drawFooter(doc);
  }

  return doc;
}

export async function downloadClienteAgendaPdf(
  input: ClienteAgendaPdfInput,
): Promise<void> {
  const doc = await generateClienteAgendaPdf(input);
  doc.save(buildClienteAgendaPdfFilename(input.nombrePareja, input.locale));
}
