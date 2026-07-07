import type { BodaRow } from "@/app/data/weddings";
import { getDaysSince } from "@/app/data/lead-alerts";
import { isBodaActiva } from "@/lib/boda-estado";

export type BodaInactivityAlert = {
  bodaId: string;
  nombrePareja: string;
  fechaBoda: string;
  ultimaActividadAt: string;
  diasSinActividad: number;
};

const INACTIVITY_THRESHOLD_DAYS = 15;

export { isBodaActiva } from "@/lib/boda-estado";

export function buildBodaInactivityAlerts(
  bodas: BodaRow[],
  fromDate = new Date(),
  thresholdDays = INACTIVITY_THRESHOLD_DAYS,
): BodaInactivityAlert[] {
  const alerts: BodaInactivityAlert[] = [];

  for (const boda of bodas) {
    if (!isBodaActiva(boda.estado)) continue;

    const lastActivityAt = boda.updated_at ?? boda.created_at;
    if (!lastActivityAt) continue;

    const diasSinActividad = getDaysSince(lastActivityAt, fromDate);
    if (diasSinActividad < thresholdDays) continue;

    alerts.push({
      bodaId: boda.id,
      nombrePareja: boda.nombre_pareja,
      fechaBoda: boda.fecha_boda,
      ultimaActividadAt: lastActivityAt,
      diasSinActividad,
    });
  }

  return alerts.sort((a, b) => b.diasSinActividad - a.diasSinActividad);
}
