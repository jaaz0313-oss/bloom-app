export function formatWeddingDate(isoDate: string): string {
  const date = new Date(isoDate + "T12:00:00");
  return new Intl.DateTimeFormat("es-CO", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Formato de miles colombiano para inputs (puntos): "1500000" → "1.500.000".
 * Solo conserva dígitos; el punto se inserta automáticamente.
 */
export function formatInputCurrency(value: string): string {
  const digits = value.replace(/\D/g, "");
  if (!digits) return "";
  const normalized = digits.replace(/^0+(?=\d)/, "");
  return normalized.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

/** Convierte un string con formato de miles ("1.500.000") a número entero. */
export function parseInputCurrency(value: string): number {
  const digits = value.replace(/\D/g, "");
  if (!digits) return 0;
  const amount = Number(digits);
  return Number.isFinite(amount) ? amount : 0;
}

/** Formatea un número existente para mostrarlo en un input monetario. */
export function formatInputCurrencyFromNumber(
  value: number | null | undefined,
): string {
  if (value == null || !Number.isFinite(Number(value))) return "";
  return formatInputCurrency(String(Math.round(Number(value))));
}

export function formatValorProveedorPendiente(): string {
  return "Pendiente de definir";
}

export function formatProveedorValorTotal(
  valorTotal: number | null | undefined,
): string {
  const valor = Number(valorTotal ?? 0);
  if (!Number.isFinite(valor) || valor <= 0) {
    return formatValorProveedorPendiente();
  }
  return formatCurrency(valor);
}

export function formatShortDate(isoDate: string): string {
  const date = new Date(isoDate + "T12:00:00");
  return new Intl.DateTimeFormat("es-CO", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}

/** Fecha de firma: "Ciudad, 28 de mayo de 2026" */
export function formatFechaFirmaEs(isoDate: string, ciudad: string): string {
  const datePart = isoDate.includes("T") ? isoDate.split("T")[0] : isoDate;
  const [year, month, day] = datePart.split("-").map(Number);
  const monthLabels = [
    "enero",
    "febrero",
    "marzo",
    "abril",
    "mayo",
    "junio",
    "julio",
    "agosto",
    "septiembre",
    "octubre",
    "noviembre",
    "diciembre",
  ];
  const monthLabel = monthLabels[(month ?? 1) - 1] ?? "";
  return `${ciudad}, ${day} de ${monthLabel} de ${year}`;
}

/** Fecha de firma: "Medellín, May 28, 2026" */
export function formatFechaFirmaEn(isoDate: string, ciudad: string): string {
  const datePart = isoDate.includes("T") ? isoDate.split("T")[0] : isoDate;
  const date = new Date(`${datePart}T12:00:00`);
  const formatted = new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(date);
  return `${ciudad}, ${formatted}`;
}

/** Fecha larga en español, estable (evita hydration mismatch). */
export function formatLongDateStable(isoDate: string): string {
  const datePart = isoDate.includes("T") ? isoDate.split("T")[0] : isoDate;
  const [year, month, day] = datePart.split("-").map(Number);
  const monthLabels = [
    "enero",
    "febrero",
    "marzo",
    "abril",
    "mayo",
    "junio",
    "julio",
    "agosto",
    "septiembre",
    "octubre",
    "noviembre",
    "diciembre",
  ];
  const monthLabel = monthLabels[(month ?? 1) - 1] ?? "";
  return `${day} de ${monthLabel} de ${year}`;
}

/** Fecha larga en inglés, estable (evita hydration mismatch). */
export function formatLongDateEnglishStable(isoDate: string): string {
  const datePart = isoDate.includes("T") ? isoDate.split("T")[0] : isoDate;
  const [year, month, day] = datePart.split("-").map(Number);
  const monthLabels = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];
  const monthLabel = monthLabels[(month ?? 1) - 1] ?? "";
  return `${monthLabel} ${day}, ${year}`;
}

/** Hora en formato 12 h en inglés, estable (evita hydration mismatch). */
export function formatTimeEnglishStable(time: string): string {
  const match = time.match(/^(\d{1,2}):(\d{2})/);
  if (!match) return time;
  const hours = Number(match[1]);
  const minutes = match[2];
  const period = hours >= 12 ? "PM" : "AM";
  const hour12 = hours % 12 === 0 ? 12 : hours % 12;
  return `${hour12}:${minutes} ${period}`;
}

/** Fecha corta con abreviaturas fijas (evita hydration mismatch entre servidor y cliente). */
export function formatShortDateStable(isoDate: string): string {
  const [year, month, day] = isoDate.split("-").map(Number);
  const monthLabels = [
    "ene.",
    "feb.",
    "mar.",
    "abr.",
    "may.",
    "jun.",
    "jul.",
    "ago.",
    "sep.",
    "oct.",
    "nov.",
    "dic.",
  ];
  const monthLabel = monthLabels[(month ?? 1) - 1] ?? "";
  return `${day} de ${monthLabel} de ${year}`;
}

const COLOMBIA_TIME_ZONE = "America/Bogota";

const SHORT_MONTH_LABELS_ES = [
  "ene.",
  "feb.",
  "mar.",
  "abr.",
  "may.",
  "jun.",
  "jul.",
  "ago.",
  "sep.",
  "oct.",
  "nov.",
  "dic.",
] as const;

/**
 * Fecha y hora en zona Colombia (America/Bogota).
 * Formato manual con partes fijas (evita hydration mismatch por ICU
 * distinto entre servidor y cliente: "ago." vs "ago", "p.m." vs "p. m.").
 */
export function formatDateTimeStable(isoDateTime: string): string {
  const normalized = isoDateTime.includes("T")
    ? isoDateTime
    : `${isoDateTime}T00:00:00Z`;
  const date = new Date(normalized);
  if (Number.isNaN(date.getTime())) return isoDateTime;

  const parts = new Intl.DateTimeFormat("es-CO", {
    timeZone: COLOMBIA_TIME_ZONE,
    day: "numeric",
    month: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);

  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((p) => p.type === type)?.value ?? "";

  const day = get("day");
  const monthIndex = Number(get("month"));
  const year = get("year");
  const hour24 = Number(get("hour"));
  const minute = get("minute").padStart(2, "0");
  const monthLabel = SHORT_MONTH_LABELS_ES[monthIndex - 1] ?? "";

  const period = hour24 >= 12 ? "p. m." : "a. m.";
  const hour12 = hour24 % 12 === 0 ? 12 : hour24 % 12;
  const hourLabel = String(hour12).padStart(2, "0");

  return `${day} de ${monthLabel} de ${year}, ${hourLabel}:${minute} ${period}`;
}

const MESSAGE_LOWERCASE_WORDS = new Set([
  "y",
  "de",
  "del",
  "la",
  "el",
  "en",
  "a",
]);

/** Convierte texto en MAYÚSCULAS a formato legible para mensajes de WhatsApp. */
export function formatMessageLabel(text: string): string {
  const trimmed = text.trim();
  if (!trimmed) return trimmed;

  const letters = trimmed.replace(/[^A-Za-zÁÉÍÓÚáéíóúÑñ]/g, "");
  const isAllCaps =
    letters.length > 0 &&
    letters === letters.toUpperCase() &&
    letters !== letters.toLowerCase();

  if (!isAllCaps) return trimmed;

  return trimmed
    .toLowerCase()
    .split(/\s+/)
    .map((word, index) => {
      if (index > 0 && MESSAGE_LOWERCASE_WORDS.has(word)) return word;
      if (!word) return word;
      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join(" ");
}
