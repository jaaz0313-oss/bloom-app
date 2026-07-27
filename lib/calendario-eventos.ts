import type { CitaRow } from "@/app/data/citas";
import type { TastingRow } from "@/app/data/tastings";
import { normalizeCitaFecha, sortCitasBySchedule } from "@/lib/citas";
import {
  getTastingEventTitle,
  normalizeTastingTipoCita,
  TASTING_TIPO_CITA_CALENDARIO_STYLE,
  TASTING_TIPO_CITA_DOT,
} from "@/lib/tastings";

export type TastingCalendarioRow = TastingRow & {
  boda_nombre: string;
};

export type CalendarioCitaEvento = {
  kind: "cita";
  cita: CitaRow;
};

export type CalendarioTastingEvento = {
  kind: "tasting";
  tasting: TastingCalendarioRow;
};

export type CalendarioEvento = CalendarioCitaEvento | CalendarioTastingEvento;

/** Prefer getTastingCalendarioStyle(tipo) */
export const TASTING_CALENDARIO_STYLE =
  TASTING_TIPO_CITA_CALENDARIO_STYLE.tasting;

/** Prefer getTastingCalendarioDot(tipo) */
export const TASTING_CALENDARIO_DOT = TASTING_TIPO_CITA_DOT.tasting;

export function getTastingCalendarioStyle(
  tipoCita: string | null | undefined,
): string {
  return TASTING_TIPO_CITA_CALENDARIO_STYLE[normalizeTastingTipoCita(tipoCita)];
}

export function getTastingCalendarioDot(
  tipoCita: string | null | undefined,
): string {
  return TASTING_TIPO_CITA_DOT[normalizeTastingTipoCita(tipoCita)];
}

export function getCalendarioEventoId(evento: CalendarioEvento): string {
  return evento.kind === "cita" ? evento.cita.id : `tasting-${evento.tasting.id}`;
}

export function getCalendarioEventoTitulo(evento: CalendarioEvento): string {
  if (evento.kind === "cita") return evento.cita.titulo;
  return getTastingEventTitle(evento.tasting);
}

export function getCalendarioEventoFecha(evento: CalendarioEvento): string {
  return evento.kind === "cita" ? evento.cita.fecha : evento.tasting.fecha;
}

export function getCalendarioEventoHoraInicio(evento: CalendarioEvento): string {
  return evento.kind === "cita"
    ? evento.cita.hora_inicio
    : evento.tasting.hora_inicio;
}

export function sortCalendarioEventos(eventos: CalendarioEvento[]): CalendarioEvento[] {
  return [...eventos].sort((a, b) => {
    const fechaCompare = getCalendarioEventoFecha(a).localeCompare(
      getCalendarioEventoFecha(b),
    );
    if (fechaCompare !== 0) return fechaCompare;
    return getCalendarioEventoHoraInicio(a).localeCompare(
      getCalendarioEventoHoraInicio(b),
    );
  });
}

export function buildCalendarioEventosByDate(
  citas: CitaRow[],
  tastings: TastingCalendarioRow[],
): Map<string, CalendarioEvento[]> {
  const map = new Map<string, CalendarioEvento[]>();

  for (const cita of sortCitasBySchedule(citas)) {
    const fechaKey = normalizeCitaFecha(cita.fecha);
    if (!fechaKey) continue;
    const list = map.get(fechaKey) ?? [];
    list.push({ kind: "cita", cita: { ...cita, fecha: fechaKey } });
    map.set(fechaKey, list);
  }

  for (const tasting of tastings) {
    const fechaKey = normalizeCitaFecha(tasting.fecha);
    if (!fechaKey) continue;
    const list = map.get(fechaKey) ?? [];
    list.push({
      kind: "tasting",
      tasting: { ...tasting, fecha: fechaKey },
    });
    map.set(fechaKey, list);
  }

  for (const [fechaKey, eventos] of map.entries()) {
    map.set(fechaKey, sortCalendarioEventos(eventos));
  }

  return map;
}
