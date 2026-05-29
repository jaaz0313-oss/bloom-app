import { formatCurrency, formatShortDate, formatWeddingDate } from "@/lib/format";
import type { CotizacionItemRow } from "@/app/data/cotizaciones";
import { buildWhatsAppUrl } from "@/lib/whatsapp";

export type HistoricoPrecioCategoria = {
  categoria: string;
  valor: number;
  numero_invitados: number | null;
};

export type RangoSugerido = {
  min: number;
  max: number;
  muestras: number;
};

export function parsePrecioFromNotas(notas: string | null): number | null {
  if (!notas?.trim()) return null;
  const match = notas.match(/(?:\$|COP\s*)?([\d.,]+)/i);
  if (!match) return null;
  const digits = match[1].replace(/\./g, "").replace(",", ".");
  const value = Number(digits);
  return Number.isFinite(value) && value > 0 ? value : null;
}

export function suggestPriceRangeFromHistory(
  categoria: string,
  numeroInvitados: number | null,
  historico: HistoricoPrecioCategoria[],
): RangoSugerido | null {
  let pool = historico.filter((h) => h.categoria === categoria && h.valor > 0);

  if (numeroInvitados != null && numeroInvitados > 0) {
    const low = numeroInvitados * 0.8;
    const high = numeroInvitados * 1.2;
    const byGuests = pool.filter(
      (h) =>
        h.numero_invitados != null &&
        h.numero_invitados >= low &&
        h.numero_invitados <= high,
    );
    if (byGuests.length > 0) pool = byGuests;
  }

  if (pool.length === 0) return null;

  const values = pool.map((p) => p.valor).sort((a, b) => a - b);
  return {
    min: values[0],
    max: values[values.length - 1],
    muestras: values.length,
  };
}

export function getItemPrecioRange(item: CotizacionItemRow): {
  min: number;
  max: number;
} | null {
  if (!item.incluido) return null;

  if (item.es_precio_fijo && item.precio_fijo != null && item.precio_fijo > 0) {
    return { min: item.precio_fijo, max: item.precio_fijo };
  }

  const min = item.precio_min ?? 0;
  const max = item.precio_max ?? 0;
  if (min <= 0 && max <= 0) return null;
  return {
    min: min > 0 ? min : max,
    max: max > 0 ? max : min,
  };
}

export function computeCotizacionTotals(items: CotizacionItemRow[]): {
  totalMin: number;
  totalMax: number;
} {
  let totalMin = 0;
  let totalMax = 0;

  for (const item of items) {
    const range = getItemPrecioRange(item);
    if (!range) continue;
    totalMin += range.min;
    totalMax += range.max;
  }

  return { totalMin, totalMax };
}

function formatItemLine(item: CotizacionItemRow): string {
  const range = getItemPrecioRange(item);
  if (!range) return "";

  const precioTexto =
    range.min === range.max
      ? formatCurrency(range.min)
      : `${formatCurrency(range.min)} - ${formatCurrency(range.max)}`;

  const proveedor = item.proveedor_sugerido?.trim();
  const suffix = proveedor ? ` (${proveedor})` : "";

  return `• ${item.categoria}${suffix}: ${precioTexto}`;
}

export function buildCotizacionLeadWhatsAppMessage(params: {
  nombreLead: string;
  numeroInvitados: number | null;
  fechaEstimada: string | null;
  items: CotizacionItemRow[];
}): string {
  const { nombreLead, numeroInvitados, fechaEstimada, items } = params;
  const incluidos = items.filter((i) => i.incluido);
  const { totalMin, totalMax } = computeCotizacionTotals(incluidos);

  const lineas = incluidos
    .map(formatItemLine)
    .filter(Boolean)
    .join("\n");

  const invitadosTexto =
    numeroInvitados != null ? String(numeroInvitados) : "Por definir";
  const fechaTexto = fechaEstimada
    ? formatWeddingDate(fechaEstimada)
    : "Por definir";

  const totalTexto =
    totalMin === totalMax
      ? formatCurrency(totalMin)
      : `${formatCurrency(totalMin)} - ${formatCurrency(totalMax)}`;

  return `Hola ${nombreLead}, aquí está la proyección de costos para su boda:

📋 COTIZACIÓN ESTIMADA
👥 Invitados: ${invitadosTexto}
📅 Fecha estimada: ${fechaTexto}

${lineas}

💰 TOTAL ESTIMADO: ${totalTexto}

Esta es una proyección aproximada. Los precios finales dependen de los proveedores seleccionados. ¡Quedamos atentos para resolver sus dudas! 🌸`;
}

export function buildCotizacionLeadEmail(params: {
  nombreLead: string;
  numeroInvitados: number | null;
  fechaEstimada: string | null;
  items: CotizacionItemRow[];
}): { subject: string; body: string } {
  const body = buildCotizacionLeadWhatsAppMessage(params);
  const fecha = params.fechaEstimada
    ? formatShortDate(params.fechaEstimada)
    : "fecha por definir";
  return {
    subject: `Cotización estimada – ${params.nombreLead} (${fecha})`,
    body,
  };
}

export function openCotizacionLeadWhatsApp(
  telefono: string,
  message: string,
): boolean {
  const url = buildWhatsAppUrl(telefono, message);
  if (!url) return false;
  window.open(url, "_blank", "noopener,noreferrer");
  return true;
}

export function openCotizacionLeadEmail(
  email: string,
  subject: string,
  body: string,
): void {
  const url = `mailto:${encodeURIComponent(email)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  window.location.href = url;
}
