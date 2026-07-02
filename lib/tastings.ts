import type { UserRole } from "@/lib/auth/roles";
import { compareCitaTimeSlots, citaTimeFromDb } from "@/lib/cita-time-slots";

const DEFAULT_DURATION_MINUTES = 60;

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
