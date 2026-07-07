export type CronogramaItemRow = {
  id: string;
  boda_id: string;
  categoria: string;
  descripcion: string;
  meses_antes: number;
  fecha_limite: string;
  completado: boolean;
  created_at: string;
};

export type CronogramaItemStatus =
  | "completado"
  | "urgente"
  | "vencido"
  | "pendiente";

export const CRONOGRAMA_STATUS_STYLES: Record<CronogramaItemStatus, string> = {
  completado: "border-green-200 bg-green-50",
  urgente: "border-orange-200 bg-orange-50",
  vencido: "border-red-200 bg-red-50",
  pendiente: "border-bloom-border bg-bloom-canvas/50",
};

export const CRONOGRAMA_STATUS_LABELS: Record<CronogramaItemStatus, string> = {
  completado: "Completado",
  urgente: "Urgente",
  vencido: "Vencido",
  pendiente: "Pendiente",
};

export const CRONOGRAMA_STATUS_BADGE_STYLES: Record<
  CronogramaItemStatus,
  string
> = {
  completado: "bg-green-100 text-green-800",
  urgente: "bg-orange-100 text-orange-800",
  vencido: "bg-red-100 text-red-800",
  pendiente: "bg-gray-100 text-gray-700",
};

export function isCronogramaGroupComplete(
  mesesAntes: number,
  items: Pick<CronogramaItemRow, "meses_antes" | "completado">[],
): boolean {
  const groupItems = items.filter((i) => i.meses_antes === mesesAntes);
  if (groupItems.length === 0) return true;
  return groupItems.every((i) => i.completado);
}

export function getCronogramaItemStatus(
  item: Pick<CronogramaItemRow, "fecha_limite" | "completado">,
  fromDate = new Date(),
): CronogramaItemStatus {
  if (item.completado) return "completado";

  const today = new Date(fromDate);
  today.setHours(0, 0, 0, 0);
  const limit = new Date(item.fecha_limite + "T12:00:00");

  if (limit < today) return "vencido";

  const diffMs = limit.getTime() - today.getTime();
  const daysUntil = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  if (daysUntil <= 30) return "urgente";

  return "pendiente";
}
