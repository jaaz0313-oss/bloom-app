import { getDaysUntil } from "@/app/data/payment-alerts";

export type TareaPrioridad = "alta" | "media" | "baja";

export type TareaRow = {
  id: string;
  titulo: string;
  descripcion: string | null;
  boda_id: string | null;
  asignado_a: string;
  creado_por: string;
  prioridad: TareaPrioridad;
  fecha_limite: string | null;
  completada: boolean;
  created_at: string;
  updated_at: string;
};

export type TareaUrgency = "vencida" | "pronto";

export const TAREA_PRIORIDAD_LABELS: Record<TareaPrioridad, string> = {
  alta: "Alta",
  media: "Media",
  baja: "Baja",
};

export const TAREA_PRIORIDAD_STYLES: Record<TareaPrioridad, string> = {
  alta: "bg-red-100 text-red-800",
  media: "bg-amber-100 text-amber-900",
  baja: "bg-sky-100 text-sky-800",
};

export const TAREA_URGENCY_LABELS: Record<TareaUrgency, string> = {
  vencida: "Vencida",
  pronto: "Vence pronto",
};

export const TAREA_URGENCY_STYLES: Record<TareaUrgency, string> = {
  vencida: "bg-red-100 text-red-800",
  pronto: "bg-amber-100 text-amber-900",
};

export function normalizeTareaPrioridad(
  value: string | null | undefined,
): TareaPrioridad {
  if (value === "alta" || value === "baja" || value === "media") return value;
  return "media";
}

export function getTareaUrgency(
  fechaLimite: string | null | undefined,
  completada = false,
  fromDate = new Date(),
): TareaUrgency | null {
  if (completada || !fechaLimite) return null;
  const days = getDaysUntil(fechaLimite, fromDate);
  if (days < 0) return "vencida";
  if (days <= 3) return "pronto";
  return null;
}

export function isTareaVisibleForUser(
  tarea: Pick<TareaRow, "asignado_a" | "creado_por">,
  username: string,
): boolean {
  return tarea.asignado_a === username || tarea.creado_por === username;
}

export function compareTareasByFechaLimite(a: TareaRow, b: TareaRow): number {
  if (!a.fecha_limite && !b.fecha_limite) {
    return a.created_at.localeCompare(b.created_at);
  }
  if (!a.fecha_limite) return 1;
  if (!b.fecha_limite) return -1;
  const byDate = a.fecha_limite.localeCompare(b.fecha_limite);
  if (byDate !== 0) return byDate;
  return a.created_at.localeCompare(b.created_at);
}

export function filterMisTareasPendientes(
  tareas: TareaRow[],
  username: string,
  limit = 5,
): TareaRow[] {
  return tareas
    .filter(
      (tarea) =>
        !tarea.completada &&
        tarea.asignado_a === username,
    )
    .sort(compareTareasByFechaLimite)
    .slice(0, limit);
}
