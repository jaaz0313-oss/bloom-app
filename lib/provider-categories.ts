export const PROVIDER_CATEGORIES = [
  "Wedding Planner",
  "Lugar del evento",
  "Lugar de ceremonia",
  "Fotografía y video",
  "DJ / Banda / Entretenimiento",
  "Decoración",
  "Producción",
  "Catering",
  "Repostería",
  "Coctelería",
  "Maquillaje y peinado",
  "Músicos ceremonia",
  "Músicos cóctel",
  "Transporte",
  "Carro de la novia",
  "Welcome party",
  "Licor",
  "Hora loca",
  "Foto cabina",
  "Estación de café",
  "Oficiante",
  "Save the date",
] as const;

export type ProviderCategory = (typeof PROVIDER_CATEGORIES)[number];

/** Etiqueta legacy → categoría actual del catálogo. */
export function normalizeProviderCategory(categoria: string): string {
  const base = getBaseCategoria(categoria);
  if (base === "Coordinadora") {
    return categoria.replace(/^Coordinadora/, "Wedding Planner");
  }
  return categoria;
}

/** Categoría base sin sufijo numérico ("Fotografía y video 2" → "Fotografía y video"). */
export function getBaseCategoria(categoria: string): string {
  const normalized = normalizeProviderCategory(categoria);
  const match = normalized.match(/^(.+?)\s+\d+$/);
  return match ? match[1] : normalized;
}
