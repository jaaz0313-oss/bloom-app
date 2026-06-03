export const PROVIDER_CATEGORIES = [
  "Wedding Planner",
  "Lugar del evento",
  "Lugar de ceremonia",
  "Save the date",
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
] as const;

export type ProviderCategory = (typeof PROVIDER_CATEGORIES)[number];

/** Etiqueta legacy → categoría actual del catálogo. */
export function normalizeProviderCategory(categoria: string): string {
  return categoria.replace(/^Coordinadora/, "Wedding Planner");
}

/** Categoría base sin sufijo numérico ("Fotografía y video 2" → "Fotografía y video"). */
export function getBaseCategoria(categoria: string): string {
  const match = categoria.match(/^(.+?)\s+\d+$/);
  return match ? match[1].trim() : categoria.trim();
}
