"use client";

import type { CitaRow } from "@/app/data/citas";
import { CitaPill } from "./CitaPill";
import { normalizeCitaFecha } from "@/lib/citas";
import {
  getMonthGrid,
  isSameMonth,
  isToday,
  parseIsoDate,
} from "@/lib/citas-calendar";

const WEEKDAY_HEADERS = [
  "LUN",
  "MAR",
  "MIÉ",
  "JUE",
  "VIE",
  "SÁB",
  "DOM",
] as const;

const MAX_CITAS_VISIBLE = 2;
const CELL_HEIGHT_CLASS = "h-[120px] min-h-[120px]";

type CalendarioMensualProps = {
  year: number;
  month: number;
  citasByDate: Map<string, CitaRow[]>;
  onDayClick: (fechaKey: string) => void;
  onCitaClick: (cita: CitaRow) => void;
  onVerMasClick: (fechaKey: string, citas: CitaRow[]) => void;
};

export function CalendarioMensual({
  year,
  month,
  citasByDate,
  onDayClick,
  onCitaClick,
  onVerMasClick,
}: CalendarioMensualProps) {
  const cells = getMonthGrid(year, month).flat();

  return (
    <div className="w-full overflow-hidden rounded-lg border border-bloom-border shadow-sm">
      <div className="grid grid-cols-7">
        {WEEKDAY_HEADERS.map((label) => (
          <div
            key={label}
            className="border border-bloom-border bg-bloom-canvas px-2 py-2 text-center text-xs font-semibold tracking-wide text-bloom-muted"
          >
            {label}
          </div>
        ))}

        {cells.map((iso, index) => {
          if (!iso) {
            return (
              <div
                key={`empty-${index}`}
                aria-hidden
                className={`${CELL_HEIGHT_CLASS} border border-bloom-border bg-bloom-canvas/60`}
              />
            );
          }

          const fechaKey = normalizeCitaFecha(iso);
          const dayCitasList = citasByDate.get(fechaKey) ?? [];
          const inMonth = isSameMonth(fechaKey, year, month);
          const today = isToday(fechaKey);
          const visibleCitas = dayCitasList.slice(0, MAX_CITAS_VISIBLE);
          const hiddenCount = dayCitasList.length - MAX_CITAS_VISIBLE;

          return (
            <div
              key={`${fechaKey}-${index}`}
              className={`${CELL_HEIGHT_CLASS} flex flex-col border border-bloom-border p-2 ${
                today
                  ? "bg-blue-50"
                  : inMonth
                    ? "bg-bloom-surface"
                    : "bg-bloom-canvas/60"
              }`}
            >
              <div className="flex shrink-0 justify-end">
                <button
                  type="button"
                  onClick={() => onDayClick(fechaKey)}
                  className={`text-sm font-semibold leading-none transition-colors hover:text-bloom-accent ${
                    today
                      ? "text-blue-700"
                      : inMonth
                        ? "text-bloom-ink"
                        : "text-bloom-muted"
                  }`}
                  aria-label={`Ver día ${parseIsoDate(fechaKey).getDate()}`}
                >
                  {parseIsoDate(fechaKey).getDate()}
                </button>
              </div>

              <div className="relative z-10 mt-1 flex min-h-0 flex-1 flex-col gap-1 overflow-hidden">
                {visibleCitas.map((cita) => (
                  <CitaPill
                    key={cita.id}
                    cita={cita}
                    onClick={() => {
                      console.log("[CalendarioMensual] pill click", cita.id);
                      onCitaClick(cita);
                    }}
                  />
                ))}
                {hiddenCount > 0 && (
                  <button
                    type="button"
                    onClick={() => onVerMasClick(fechaKey, dayCitasList)}
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
    </div>
  );
}
