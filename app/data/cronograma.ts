import { normalizeProviderCategory } from "@/lib/provider-categories";

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
  | "en_negociacion"
  | "urgente"
  | "vencido"
  | "pendiente";

export type CronogramaStatusProvider = {
  categoria: string;
  estado: string;
};

export const CRONOGRAMA_STATUS_STYLES: Record<CronogramaItemStatus, string> = {
  completado: "border-green-200 bg-green-50",
  en_negociacion: "border-violet-200 bg-violet-50",
  urgente: "border-orange-200 bg-orange-50",
  vencido: "border-red-200 bg-red-50",
  pendiente: "border-bloom-border bg-bloom-canvas/50",
};

export const CRONOGRAMA_STATUS_LABELS: Record<CronogramaItemStatus, string> = {
  completado: "Completado",
  en_negociacion: "En negociación",
  urgente: "Urgente",
  vencido: "Vencido",
  pendiente: "Pendiente",
};

export const CRONOGRAMA_STATUS_BADGE_STYLES: Record<
  CronogramaItemStatus,
  string
> = {
  completado: "bg-green-100 text-green-800",
  en_negociacion: "bg-violet-100 text-violet-800",
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

function hitoTieneProveedorEnNegociacion(
  item: Pick<CronogramaItemRow, "categoria" | "descripcion">,
  providers: CronogramaStatusProvider[],
): boolean {
  if (providers.length === 0) return false;

  const itemDesc = normalizeProviderCategory(item.descripcion);
  const itemCat = normalizeProviderCategory(item.categoria);

  return providers.some((provider) => {
    if (provider.estado !== "en_negociacion") return false;
    const providerCat = normalizeProviderCategory(provider.categoria);
    return providerCat === itemDesc || providerCat === itemCat;
  });
}

export function getCronogramaItemStatus(
  item: Pick<
    CronogramaItemRow,
    "fecha_limite" | "completado" | "categoria" | "descripcion"
  >,
  fromDate = new Date(),
  providers: CronogramaStatusProvider[] = [],
): CronogramaItemStatus {
  if (item.completado) return "completado";

  if (hitoTieneProveedorEnNegociacion(item, providers)) {
    return "en_negociacion";
  }

  const today = new Date(fromDate);
  today.setHours(0, 0, 0, 0);
  const limit = new Date(item.fecha_limite + "T12:00:00");

  if (limit < today) return "vencido";

  const diffMs = limit.getTime() - today.getTime();
  const daysUntil = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  if (daysUntil <= 30) return "urgente";

  return "pendiente";
}
