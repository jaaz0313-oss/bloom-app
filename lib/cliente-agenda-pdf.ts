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

console.log("[cliente-agenda-pdf] module loaded", {
  jsPDFType: typeof jsPDF,
  jsPDFName: jsPDF?.name ?? "(no name)",
});

const CELESTIA_EMAIL = "celestiaandevents@gmail.com";
const CELESTIA_PHONE = "+57 319 553 8654";

function logAgendaError(step: string, error: unknown) {
  console.error(`[cliente-agenda-pdf] ERROR at "${step}"`, error);
  if (error instanceof Error) {
    console.error("[cliente-agenda-pdf] error.message:", error.message);
    console.error("[cliente-agenda-pdf] error.stack:", error.stack);
    console.error("[cliente-agenda-pdf] error.name:", error.name);
  } else {
    console.error("[cliente-agenda-pdf] non-Error value:", error);
  }
}

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
  console.log("[cliente-agenda-pdf] loadLogoDataUrl: fetching /logo.png …");
  try {
    const response = await fetch("/logo.png");
    console.log("[cliente-agenda-pdf] loadLogoDataUrl: response", {
      ok: response.ok,
      status: response.status,
      statusText: response.statusText,
      contentType: response.headers.get("content-type"),
      url: response.url,
    });
    if (!response.ok) {
      console.warn(
        "[cliente-agenda-pdf] loadLogoDataUrl: non-OK response, skipping logo",
      );
      return null;
    }
    const blob = await response.blob();
    console.log("[cliente-agenda-pdf] loadLogoDataUrl: blob", {
      size: blob.size,
      type: blob.type,
    });
    return await new Promise<string | null>((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result =
          typeof reader.result === "string" ? reader.result : null;
        console.log("[cliente-agenda-pdf] loadLogoDataUrl: FileReader done", {
          hasResult: Boolean(result),
          resultLength: result?.length ?? 0,
          prefix: result?.slice(0, 40) ?? null,
        });
        resolve(result);
      };
      reader.onerror = () => {
        logAgendaError("loadLogoDataUrl FileReader", reader.error);
        resolve(null);
      };
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    logAgendaError("loadLogoDataUrl fetch/read", error);
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
  index: number,
): number {
  console.log(`[cliente-agenda-pdf] drawTastingCard #${index} start`, {
    id: tasting.id,
    tipo_cita: tasting.tipo_cita,
    nombre_proveedor: tasting.nombre_proveedor,
    fecha: tasting.fecha,
    hora_inicio: tasting.hora_inicio,
    hora_fin: tasting.hora_fin,
    direccion: tasting.direccion,
    google_meet_link: tasting.google_meet_link,
    costo: tasting.costo,
    hasNotas: Boolean(tasting.notas?.trim()),
    y,
  });

  try {
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

    console.log(`[cliente-agenda-pdf] drawTastingCard #${index} normalized`, {
      tipo,
      tipoLabel,
      provider,
      fecha,
      horario,
    });

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

    console.log(`[cliente-agenda-pdf] drawTastingCard #${index} done`, {
      nextY: finalBottom + 4,
    });
    return finalBottom + 4;
  } catch (error) {
    logAgendaError(`drawTastingCard #${index} id=${tasting.id}`, error);
    throw error;
  }
}

export async function generateClienteAgendaPdf(
  input: ClienteAgendaPdfInput,
): Promise<jsPDF> {
  console.log("[cliente-agenda-pdf] generateClienteAgendaPdf START", {
    jsPDFType: typeof jsPDF,
    nombrePareja: input.nombrePareja,
    fechaBoda: input.fechaBoda,
    locale: input.locale,
    tastingsCount: input.tastings?.length ?? 0,
    copyKeys: input.copy ? Object.keys(input.copy) : null,
    copy: input.copy,
  });

  try {
    if (typeof jsPDF !== "function") {
      throw new Error(
        `jsPDF import invalid: expected function, got ${typeof jsPDF}`,
      );
    }

    const { nombrePareja, fechaBoda, tastings, locale, copy } = input;
    console.log("[cliente-agenda-pdf] creating jsPDF document …");
    const doc = new jsPDF({ unit: "mm", format: "a4" });
    console.log("[cliente-agenda-pdf] jsPDF document created", {
      pageWidth: doc.internal.pageSize.getWidth(),
      pageHeight: doc.internal.pageSize.getHeight(),
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    const sorted = sortTastingsBySchedule(tastings);
    console.log("[cliente-agenda-pdf] tastings sorted", {
      count: sorted.length,
      ids: sorted.map((t) => t.id),
    });

    doc.setFillColor(...COLORS.canvas);
    doc.rect(0, 0, pageWidth, 52, "F");

    console.log("[cliente-agenda-pdf] BEFORE loadLogoDataUrl");
    const logoDataUrl = await loadLogoDataUrl();
    console.log("[cliente-agenda-pdf] AFTER loadLogoDataUrl", {
      hasLogo: Boolean(logoDataUrl),
      logoLength: logoDataUrl?.length ?? 0,
    });

    if (logoDataUrl) {
      try {
        const logoWidth = 36;
        const logoHeight = 18;
        console.log("[cliente-agenda-pdf] adding logo image to PDF …");
        doc.addImage(
          logoDataUrl,
          "PNG",
          (pageWidth - logoWidth) / 2,
          10,
          logoWidth,
          logoHeight,
        );
        console.log("[cliente-agenda-pdf] logo image added OK");
      } catch (logoError) {
        logAgendaError("doc.addImage(logo)", logoError);
        console.warn(
          "[cliente-agenda-pdf] falling back to text header after logo failure",
        );
        doc.setFont("times", "bold");
        doc.setFontSize(18);
        doc.setTextColor(...COLORS.accent);
        doc.text("Celestia Events", pageWidth / 2, 22, { align: "center" });
      }
    } else {
      console.log("[cliente-agenda-pdf] no logo, using text header");
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

    console.log("[cliente-agenda-pdf] header subtitle", { subtitulo });

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(...COLORS.muted);
    doc.text(subtitulo, pageWidth / 2, 46, { align: "center" });

    let y = 60;
    for (let index = 0; index < sorted.length; index += 1) {
      const tasting = sorted[index];
      console.log(
        `[cliente-agenda-pdf] processing tasting ${index + 1}/${sorted.length}`,
        { id: tasting.id, y },
      );
      y = drawTastingCard(doc, tasting, y, locale, copy, index);
    }

    const totalPages = doc.getNumberOfPages();
    console.log("[cliente-agenda-pdf] drawing footers", { totalPages });
    for (let page = 1; page <= totalPages; page += 1) {
      doc.setPage(page);
      drawFooter(doc);
    }

    console.log("[cliente-agenda-pdf] generateClienteAgendaPdf DONE");
    return doc;
  } catch (error) {
    logAgendaError("generateClienteAgendaPdf", error);
    throw error;
  }
}

export async function downloadClienteAgendaPdf(
  input: ClienteAgendaPdfInput,
): Promise<void> {
  console.log("[cliente-agenda-pdf] downloadClienteAgendaPdf START");
  try {
    const doc = await generateClienteAgendaPdf(input);
    const filename = buildClienteAgendaPdfFilename(
      input.nombrePareja,
      input.locale,
    );
    console.log("[cliente-agenda-pdf] saving PDF", { filename });
    doc.save(filename);
    console.log("[cliente-agenda-pdf] downloadClienteAgendaPdf DONE");
  } catch (error) {
    logAgendaError("downloadClienteAgendaPdf", error);
    throw error;
  }
}
