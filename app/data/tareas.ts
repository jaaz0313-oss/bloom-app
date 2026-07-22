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
  completada_por: string | null;
  completada_at: string | null;
  created_at: string;
  updated_at: string;
};

export type TareaComentarioRow = {
  id: string;
  tarea_id: string;
  autor: string;
  contenido: string;
  created_at: string;
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

export function normalizeTareaRow(tarea: TareaRow): TareaRow {
  return {
    ...tarea,
    prioridad: normalizeTareaPrioridad(tarea.prioridad),
    completada_por: tarea.completada_por ?? null,
    completada_at: tarea.completada_at ?? null,
  };
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

/** Tareas creadas por el usuario, completadas en las últimas 24 horas. */
export function filterTareasCompletadasRecientes(
  tareas: TareaRow[],
  username: string,
  fromDate = new Date(),
): TareaRow[] {
  const cutoff = fromDate.getTime() - 24 * 60 * 60 * 1000;

  return tareas
    .filter((tarea) => {
      if (!tarea.completada) return false;
      if (tarea.creado_por !== username) return false;
      const completedAt = tarea.completada_at ?? tarea.updated_at;
      if (!completedAt) return false;
      return new Date(completedAt).getTime() >= cutoff;
    })
    .sort((a, b) => {
      const aAt = a.completada_at ?? a.updated_at;
      const bAt = b.completada_at ?? b.updated_at;
      return bAt.localeCompare(aAt);
    });
}

export function formatTareaRelativeTime(
  isoDateTime: string,
  fromDate = new Date(),
): string {
  const then = new Date(isoDateTime).getTime();
  if (Number.isNaN(then)) return "";

  const diffMs = Math.max(0, fromDate.getTime() - then);
  const minutes = Math.floor(diffMs / 60_000);

  if (minutes < 1) return "hace menos de un minuto";
  if (minutes === 1) return "hace 1 minuto";
  if (minutes < 60) return `hace ${minutes} minutos`;

  const hours = Math.floor(minutes / 60);
  if (hours === 1) return "hace 1 hora";
  if (hours < 24) return `hace ${hours} horas`;

  return "hace 1 día";
}
