import type { CotizacionItemRow } from "@/app/data/cotizaciones";
import {
  getBaseCategoria,
  normalizeProviderCategory,
  PROVIDER_CATEGORIES,
} from "@/lib/provider-categories";
import { formatCurrency, formatWeddingDate } from "@/lib/format";
import { buildWhatsAppUrl } from "@/lib/whatsapp";

const CATEGORIA_BASE_DELIMITER = "::";

export const COTIZACION_ITEM_DISPLAY_PLACEHOLDER =
  "Escribe el nombre del servicio...";

function splitCategoriaDisplay(categoria: string): {
  base: string;
  display: string;
  hasCustomDisplay: boolean;
} {
  const idx = categoria.indexOf(CATEGORIA_BASE_DELIMITER);
  if (idx >= 0) {
    const base = categoria.slice(0, idx).trim();
    const display = categoria
      .slice(idx + CATEGORIA_BASE_DELIMITER.length)
      .trim();
    return {
      base: base || display,
      display,
      hasCustomDisplay: true,
    };
  }

  const trimmed = categoria.trim();
  return {
    base: trimmed,
    display: trimmed,
    hasCustomDisplay: false,
  };
}

export type ParsedItemCategoria = {
  base: string;
  display: string;
  hasCustomDisplay: boolean;
};

export function parseItemCategoria(categoria: string): ParsedItemCategoria {
  return splitCategoriaDisplay(categoria);
}

export function getItemBaseCategoria(categoria: string): string {
  const { base } = parseItemCategoria(categoria);
  return getBaseCategoria(normalizeProviderCategory(base));
}

/** Nombre editable en el editor: solo la parte después de "::" si aplica. */
export function getItemDisplayLabel(categoria: string): string {
  return splitCategoriaDisplay(categoria).display;
}

/** Nombre mostrado al cliente (WhatsApp, PDF, email). */
export function getItemDisplayName(categoria: string): string {
  const { display, hasCustomDisplay } = splitCategoriaDisplay(categoria);
  if (hasCustomDisplay) {
    return display || getItemBaseCategoria(categoria);
  }
  return display;
}

/** Mismo orden que el editor de cotización (catálogo + ítems extra al final). */
export function sortCotizacionItemsForDisplay(
  items: CotizacionItemRow[],
): CotizacionItemRow[] {
  const usedIds = new Set<string>();
  const sorted: CotizacionItemRow[] = [];

  for (const categoria of PROVIDER_CATEGORIES) {
    const matching = items.filter(
      (item) => getItemBaseCategoria(item.categoria) === categoria,
    );
    for (const item of matching) {
      sorted.push(item);
      usedIds.add(item.id);
    }
  }

  for (const item of items) {
    if (!usedIds.has(item.id)) {
      sorted.push(item);
    }
  }

  return sorted;
}

export function formatItemCategoria(base: string, display: string): string {
  const normalizedBase = getBaseCategoria(normalizeProviderCategory(base.trim()));
  const trimmedDisplay = display.trim();

  if (!trimmedDisplay || trimmedDisplay === normalizedBase) {
    return normalizedBase;
  }

  return `${normalizedBase}${CATEGORIA_BASE_DELIMITER}${trimmedDisplay}`;
}

export function createPendingDuplicateCategoria(base: string): string {
  return createEmptyExtraItemCategoria(base);
}

/** Ítem extra con nombre vacío; conserva la categoría base solo para sugerencias internas. */
export function createEmptyExtraItemCategoria(parentBase: string): string {
  const normalizedBase = getBaseCategoria(
    normalizeProviderCategory(parentBase.trim()),
  );
  return `${normalizedBase}${CATEGORIA_BASE_DELIMITER}`;
}

const NUMERIC_SUFFIX_PATTERN = /^(.+?)\s+\d+$/;

export function hasNumericCategoriaSuffix(categoria: string): boolean {
  return NUMERIC_SUFFIX_PATTERN.test(categoria.trim());
}

/** Primer ítem de cada categoría del catálogo; no se puede eliminar. */
export function getProtectedCatalogItemIds(
  items: CotizacionItemRow[],
): Set<string> {
  const protectedIds = new Set<string>();
  for (const catalog of PROVIDER_CATEGORIES) {
    const first = items.find(
      (item) => getItemBaseCategoria(item.categoria) === catalog,
    );
    if (first) protectedIds.add(first.id);
  }
  return protectedIds;
}

export function canRemoveCotizacionItem(
  item: CotizacionItemRow,
  items: CotizacionItemRow[],
): boolean {
  if (getProtectedCatalogItemIds(items).has(item.id)) return false;
  return (
    hasNumericCategoriaSuffix(item.categoria) ||
    parseItemCategoria(item.categoria).hasCustomDisplay
  );
}

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
  const baseCategoria = getItemBaseCategoria(categoria);
  let pool = historico.filter(
    (h) => getItemBaseCategoria(h.categoria) === baseCategoria && h.valor > 0,
  );

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

  return `• ${getItemDisplayName(item.categoria)}: ${formatCurrency(precio)}`;
}

const BLOOM_PUBLIC_APP_URL =
  process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ??
  "https://bloom-app-omega.vercel.app";

export function buildLeadCotizacionPdfPublicUrl(leadId: string): string {
  return `${BLOOM_PUBLIC_APP_URL}/api/leads/${leadId}/cotizacion-pdf`;
}

export function buildCotizacionLeadWhatsAppMessage(params: {
  leadId: string;
  nombreLead: string;
  numeroInvitados: number | null;
  fechaEstimada: string | null;
  ciudad: string | null;
  items: CotizacionItemRow[];
}): string {
  const { leadId, nombreLead, numeroInvitados, fechaEstimada, ciudad, items } =
    params;
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
- Equipo Celestia

🔗 Descarga tu cotización aquí: ${buildLeadCotizacionPdfPublicUrl(leadId)}`;
}

export function buildCotizacionLeadEmail(params: {
  leadId: string;
  nombreLead: string;
  numeroInvitados: number | null;
  fechaEstimada: string | null;
  ciudad: string | null;
  items: CotizacionItemRow[];
}): { subject: string; body: string } {
  const body = buildCotizacionLeadWhatsAppMessage(params);
  return {
    subject: `Proyección estimada - Boda ${params.nombreLead}`,
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
