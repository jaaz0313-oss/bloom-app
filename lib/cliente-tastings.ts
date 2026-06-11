import type { TastingRow } from "@/app/data/tastings";
import { sortTastingsBySchedule } from "@/app/data/tastings";

export type ClienteTastingDia = {
  fecha: string;
  tastings: TastingRow[];
};

export function groupClienteTastingsByDay(
  tastings: TastingRow[],
): ClienteTastingDia[] {
  const sorted = sortTastingsBySchedule(tastings);
  const map = new Map<string, TastingRow[]>();

  for (const tasting of sorted) {
    const list = map.get(tasting.fecha) ?? [];
    list.push(tasting);
    map.set(tasting.fecha, list);
  }

  return Array.from(map.entries()).map(([fecha, dayTastings]) => ({
    fecha,
    tastings: dayTastings,
  }));
}

export function formatClienteTastingTimeRange(
  horaInicio: string,
  horaFin: string | null,
): string {
  const format = (value: string) => {
    const match = value.match(/^(\d{1,2}):(\d{2})/);
    if (!match) return value;
    const hour = Number(match[1]);
    const minute = Number(match[2]);
    const period = hour >= 12 ? "PM" : "AM";
    const hour12 = hour % 12 === 0 ? 12 : hour % 12;
    return `${hour12}:${String(minute).padStart(2, "0")} ${period}`;
  };

  const start = format(horaInicio);
  if (!horaFin) return start;
  return `${start} – ${format(horaFin)}`;
}
