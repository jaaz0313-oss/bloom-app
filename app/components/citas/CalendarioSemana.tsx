"use client";

import type { CalendarioEvento } from "@/lib/calendario-eventos";
import { CalendarioEventoPill } from "./CalendarioEventoPill";
import { normalizeCitaFecha } from "@/lib/citas";
import {
  getWeekdayShort,
  isToday,
  parseIsoDate,
} from "@/lib/citas-calendar";

const MAX_CITAS_VISIBLE = 2;
const CELL_HEIGHT_CLASS = "min-h-[180px] h-[180px]";

type CalendarioSemanaProps = {
  weekDays: string[];
  eventosByDate: Map<string, CalendarioEvento[]>;
  onDayClick: (fechaKey: string) => void;
  onEventoClick: (evento: CalendarioEvento) => void;
  onVerMasClick: (fechaKey: string, eventos: CalendarioEvento[]) => void;
};

export function CalendarioSemana({
  weekDays,
  eventosByDate,
  onDayClick,
  onEventoClick,
  onVerMasClick,
}: CalendarioSemanaProps) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-7">
      {weekDays.map((iso) => {
        const fechaKey = normalizeCitaFecha(iso);
        const dayEventosList = eventosByDate.get(fechaKey) ?? [];
        const today = isToday(fechaKey);
        const visibleEventos = dayEventosList.slice(0, MAX_CITAS_VISIBLE);
        const hiddenCount = dayEventosList.length - MAX_CITAS_VISIBLE;

        return (
          <div
            key={iso}
            className={`${CELL_HEIGHT_CLASS} flex flex-col overflow-hidden rounded-xl border border-bloom-border p-2 ${
              today
                ? "bg-blue-50 ring-2 ring-bloom-accent/30"
                : "bg-bloom-surface"
            }`}
          >
            <div className="shrink-0">
              <button
                type="button"
                onClick={() => onDayClick(fechaKey)}
                className="w-full text-left transition-colors hover:text-bloom-accent"
                aria-label={`Ver día ${parseIsoDate(fechaKey).getDate()}`}
              >
                <p className="text-xs font-medium text-bloom-muted">
                  {getWeekdayShort(
                    (parseIsoDate(fechaKey).getDay() + 6) % 7,
                  )}
                </p>
                <p
                  className={`text-sm font-semibold ${
                    today ? "text-blue-700" : "text-bloom-ink"
                  }`}
                >
                  {parseIsoDate(fechaKey).getDate()}
                </p>
              </button>
            </div>

            <div className="relative z-10 mt-2 flex min-h-0 flex-1 flex-col gap-1 overflow-hidden">
              {visibleEventos.map((evento) => (
                <CalendarioEventoPill
                  key={evento.kind === "cita" ? evento.cita.id : evento.tasting.id}
                  evento={evento}
                  onClick={() => onEventoClick(evento)}
                />
              ))}
              {hiddenCount > 0 && (
                <button
                  type="button"
                  onClick={() => onVerMasClick(fechaKey, dayEventosList)}
                  className="shrink-0 text-left text-[10px] font-medium text-bloom-accent hover:underline"
                >
                  Ver {hiddenCount} más
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
