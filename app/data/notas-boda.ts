export type NotaBodaOrigen = "manual" | "proveedor";

export type NotaBodaRow = {
  id: string;
  boda_id: string;
  contenido: string;
  created_by: string | null;
  created_by_nombre: string | null;
  created_at: string;
  updated_at: string;
  origen?: NotaBodaOrigen | null;
};

export function wasNotaBodaEdited(
  nota: Pick<NotaBodaRow, "created_at" | "updated_at">,
): boolean {
  if (!nota.updated_at) return false;
  const created = Date.parse(nota.created_at);
  const updated = Date.parse(nota.updated_at);
  if (!Number.isFinite(created) || !Number.isFinite(updated)) return false;
  return updated - created > 1000;
}
