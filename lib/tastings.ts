import type { UserRole } from "@/lib/auth/roles";
import { compareCitaTimeSlots, citaTimeFromDb } from "@/lib/cita-time-slots";

const DEFAULT_DURATION_MINUTES = 60;

export const TASTING_MIN_GAP_MINUTES = 30;

function normalizeTastingRole(role: UserRole | string): string {
  return role?.trim().toLowerCase() ?? "";
}

export function canViewTastings(role: UserRole | string): boolean {
  const normalized = normalizeTastingRole(role);
  return (
    normalized === "admin" ||
    normalized === "lider" ||
    normalized === "coordinadora"
  );
}

export function canManageTastings(role: UserRole | string): boolean {
  return canViewTastings(role);
}

function timeToMinutes(value: string): number {
  const match = citaTimeFromDb(value).match(/^(\d{1,2}):(\d{2})/);
  if (!match) return 0;
  return Number(match[1]) * 60 + Number(match[2]);
}

function addMinutesToTime(hhmm: string, minutes: number): string {
  const total = timeToMinutes(hhmm) + minutes;
  const hours = Math.floor(total / 60) % 24;
  const mins = total % 60;
  return `${String(hours).padStart(2, "0")}:${String(mins).padStart(2, "0")}`;
}

export function getTastingEndTime(horaInicio: string, horaFin: string | null): string {
  if (horaFin?.trim()) return citaTimeFromDb(horaFin);
  return addMinutesToTime(citaTimeFromDb(horaInicio), DEFAULT_DURATION_MINUTES);
}

export function tastingTimesOverlap(
  startA: string,
  endA: string | null,
  startB: string,
  endB: string | null,
): boolean {
  const aStart = timeToMinutes(startA);
  const aEnd = timeToMinutes(getTastingEndTime(startA, endA));
  const bStart = timeToMinutes(startB);
  const bEnd = timeToMinutes(getTastingEndTime(startB, endB));
  return aStart < bEnd && bStart < aEnd;
}

export function validateTastingSchedule(
  horaInicio: string,
  horaFin: string | null,
): string | null {
  if (!horaInicio.trim()) return "Indica la hora de inicio.";
  if (horaFin?.trim() && compareCitaTimeSlots(horaFin, horaInicio) <= 0) {
    return "La hora fin debe ser posterior a la hora de inicio.";
  }
  return null;
}

export function buildGoogleMapsUrl(direccion: string): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(direccion.trim())}`;
}

type TastingDisplaySource = {
  proveedor_id?: string | null;
  nombre_proveedor?: string | null;
};

export function getTastingDisplayTitle(
  tasting: TastingDisplaySource,
  options?: { noProviderLabel?: string },
): string {
  if (tasting.nombre_proveedor?.trim()) {
    return tasting.nombre_proveedor.trim();
  }
  return options?.noProviderLabel ?? "Sin proveedor";
}

export function formatTastingTimeLabel(value: string): string {
  const match = citaTimeFromDb(value).match(/^(\d{1,2}):(\d{2})/);
  if (!match) return value;
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  const period = hour >= 12 ? "PM" : "AM";
  const hour12 = hour % 12 === 0 ? 12 : hour % 12;
  return `${hour12}:${String(minute).padStart(2, "0")} ${period}`;
}

export function formatTastingHorarioRange(
  horaInicio: string,
  horaFin: string | null,
): string {
  const start = formatTastingTimeLabel(horaInicio);
  const end = formatTastingTimeLabel(getTastingEndTime(horaInicio, horaFin));
  return `${start} a ${end}`;
}

export type TastingScheduleEntry = {
  id: string;
  bodaNombre: string;
  hora_inicio: string;
  hora_fin: string | null;
};

export type TastingScheduleWarning = {
  type: "crossover" | "gap_before" | "gap_after";
  message: string;
};

function minutesToTimeLabel(totalMinutes: number): string {
  const hours = Math.floor(totalMinutes / 60) % 24;
  const mins = totalMinutes % 60;
  return formatTastingTimeLabel(
    `${String(hours).padStart(2, "0")}:${String(mins).padStart(2, "0")}`,
  );
}

export function computeTastingScheduleWarnings(
  tastings: TastingScheduleEntry[],
  horaInicio: string,
  horaFin: string | null,
  excludeTastingId?: string | null,
): TastingScheduleWarning[] {
  if (!horaInicio.trim()) return [];

  const warnings: TastingScheduleWarning[] = [];
  const proposedStart = timeToMinutes(horaInicio);
  const proposedEnd = timeToMinutes(getTastingEndTime(horaInicio, horaFin));

  const others = tastings.filter(
    (tasting) => !excludeTastingId || tasting.id !== excludeTastingId,
  );

  for (const tasting of others) {
    if (
      tastingTimesOverlap(
        horaInicio,
        horaFin,
        tasting.hora_inicio,
        tasting.hora_fin,
      )
    ) {
      warnings.push({
        type: "crossover",
        message: `⚠️ Este tasting se cruza con ${tasting.bodaNombre} agendado de ${formatTastingHorarioRange(tasting.hora_inicio, tasting.hora_fin)}`,
      });
    }
  }

  if (warnings.some((warning) => warning.type === "crossover")) {
    return warnings;
  }

  let previousEnd: number | null = null;
  let nextStart: number | null = null;

  for (const tasting of others) {
    const start = timeToMinutes(tasting.hora_inicio);
    const end = timeToMinutes(
      getTastingEndTime(tasting.hora_inicio, tasting.hora_fin),
    );

    if (end <= proposedStart) {
      if (previousEnd == null || end > previousEnd) {
        previousEnd = end;
      }
    }

    if (start >= proposedEnd) {
      if (nextStart == null || start < nextStart) {
        nextStart = start;
      }
    }
  }

  if (previousEnd != null && proposedStart - previousEnd < TASTING_MIN_GAP_MINUTES) {
    warnings.push({
      type: "gap_before",
      message: `⚠️ Debe haber al menos ${TASTING_MIN_GAP_MINUTES} minutos entre tastings. El tasting anterior termina a las ${minutesToTimeLabel(previousEnd)}.`,
    });
  }

  if (nextStart != null && nextStart - proposedEnd < TASTING_MIN_GAP_MINUTES) {
    warnings.push({
      type: "gap_after",
      message: `⚠️ Debe haber al menos ${TASTING_MIN_GAP_MINUTES} minutos entre tastings. El tasting siguiente empieza a las ${minutesToTimeLabel(nextStart)}.`,
    });
  }

  return warnings;
}

export type TastingScheduleConflict = {
  parejaNombre: string;
  tipo: "tasting" | "cita";
};

export function formatTastingConflictMessage(
  asignadoNombre: string,
  conflict: TastingScheduleConflict,
): string {
  return `⚠️ ${asignadoNombre} ya tiene una cita con ${conflict.parejaNombre} a esta hora`;
}
