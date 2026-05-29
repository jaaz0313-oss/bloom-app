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

export function formatShortDate(isoDate: string): string {
  const date = new Date(isoDate + "T12:00:00");
  return new Intl.DateTimeFormat("es-CO", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
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

/** Fecha y hora con formato fijo (evita hydration mismatch). */
export function formatDateTimeStable(isoDateTime: string): string {
  const normalized = isoDateTime.includes("T")
    ? isoDateTime
    : `${isoDateTime}T00:00:00`;
  const [datePart, timePartRaw] = normalized.split("T");
  const timeMatch = timePartRaw?.match(/^(\d{2}):(\d{2})/);
  const hours = timeMatch?.[1] ?? "00";
  const minutes = timeMatch?.[2] ?? "00";
  const dateLabel = formatShortDateStable(datePart ?? normalized.slice(0, 10));
  return `${dateLabel} · ${hours}:${minutes}`;
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
