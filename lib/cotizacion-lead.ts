import { formatCurrency, formatShortDate, formatWeddingDate } from "@/lib/format";
import type { CotizacionItemRow } from "@/app/data/cotizaciones";
import { buildWhatsAppUrl } from "@/lib/whatsapp";

export type HistoricoPrecioCategoria = {
  categoria: string;
  valor: number;
  numero_invitados: number | null;
};

export type PrecioSugerido = {
  precio: number;
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

export function suggestPrecioFromHistory(
  categoria: string,
  numeroInvitados: number | null,
  historico: HistoricoPrecioCategoria[],
): PrecioSugerido | null {
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

  const values = pool.map((p) => p.valor);
  const promedio = Math.round(
    values.reduce((sum, v) => sum + v, 0) / values.length,
  );

  return {
    precio: promedio,
    muestras: values.length,
  };
}

export function getItemPrecioEstimado(item: CotizacionItemRow): number | null {
  if (!item.incluido) return null;
  if (item.precio_estimado == null || item.precio_estimado <= 0) return null;
  return item.precio_estimado;
}

export function computeCotizacionTotal(items: CotizacionItemRow[]): number {
  let total = 0;
  for (const item of items) {
    const precio = getItemPrecioEstimado(item);
    if (precio != null) total += precio;
  }
  return total;
}

function formatItemLine(item: CotizacionItemRow): string {
  const precio = getItemPrecioEstimado(item);
  if (precio == null) return "";

  return `• ${item.categoria}: ${formatCurrency(precio)}`;
}

export function buildCotizacionLeadWhatsAppMessage(params: {
  nombreLead: string;
  numeroInvitados: number | null;
  fechaEstimada: string | null;
  ciudad: string | null;
  items: CotizacionItemRow[];
}): string {
  const { nombreLead, numeroInvitados, fechaEstimada, ciudad, items } = params;
  const incluidos = items.filter((i) => i.incluido);
  const totalEstimado = computeCotizacionTotal(incluidos);

  const lineas = incluidos
    .map(formatItemLine)
    .filter(Boolean)
    .join("\n");

  const invitadosTexto =
    numeroInvitados != null ? String(numeroInvitados) : "Por definir";
  const fechaTexto = fechaEstimada
    ? formatWeddingDate(fechaEstimada)
    : "Por definir";
  const ciudadTexto = ciudad?.trim() || "Por definir";

  return `Hola ${nombreLead}, aquí está nuestra proyección estimada para su boda:

📋 PROYECCIÓN ESTIMADA
👥 Invitados: ${invitadosTexto}
📅 Fecha estimada: ${fechaTexto}
📍 Ciudad: ${ciudadTexto}

${lineas}

💰 TOTAL ESTIMADO: ${formatCurrency(totalEstimado)}

Esta es una proyección aproximada. Los precios finales dependen de los proveedores seleccionados. ¡Quedamos atentos para resolver sus dudas! 🌸
- Equipo Celestia`;
}

export function buildCotizacionLeadEmail(params: {
  nombreLead: string;
  numeroInvitados: number | null;
  fechaEstimada: string | null;
  ciudad: string | null;
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
