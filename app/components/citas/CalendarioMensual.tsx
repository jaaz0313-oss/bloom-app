"use client";

import { CITA_TIPO_STYLES, type CitaRow } from "@/app/data/citas";
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

const CELL_BORDER = "1px solid #e5e7eb";

type CalendarioMensualProps = {
  year: number;
  month: number;
  citasByDate: Map<string, CitaRow[]>;
  onDayClick: (fechaKey: string) => void;
};

export function CalendarioMensual({
  year,
  month,
  citasByDate,
  onDayClick,
}: CalendarioMensualProps) {
  const cells = getMonthGrid(year, month).flat();

  return (
    <div
      className="w-full overflow-hidden rounded-lg shadow-sm"
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(7, 1fr)",
      }}
    >
      {WEEKDAY_HEADERS.map((label) => (
        <div
          key={label}
          className="text-center text-xs font-semibold tracking-wide text-gray-600"
          style={{
            border: CELL_BORDER,
            padding: "8px",
            background: "#f9fafb",
          }}
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
              style={{
                minHeight: 100,
                border: CELL_BORDER,
                padding: 8,
                background: "#f9fafb",
              }}
            />
          );
        }

        const fechaKey = normalizeCitaFecha(iso);
        const dayCitasList = citasByDate.get(fechaKey) ?? [];
        const inMonth = isSameMonth(fechaKey, year, month);
        const today = isToday(fechaKey);

        return (
          <button
            key={`${fechaKey}-${index}`}
            type="button"
            onClick={() => onDayClick(fechaKey)}
            className="w-full cursor-pointer text-left transition-colors hover:bg-gray-50"
            style={{
              minHeight: 100,
              border: CELL_BORDER,
              padding: 8,
              background: today ? "#dbeafe" : inMonth ? "white" : "#f9fafb",
            }}
          >
            <div className="flex justify-end">
              <span
                className={`text-sm font-semibold leading-none ${
                  today ? "text-blue-700" : inMonth ? "text-gray-900" : "text-gray-400"
                }`}
              >
                {parseIsoDate(fechaKey).getDate()}
              </span>
            </div>

            <div className="mt-1 flex flex-col gap-1">
              {dayCitasList.map((c) => (
                <CitaPill key={c.id} cita={c} />
              ))}
            </div>
          </button>
        );
      })}
    </div>
  );
}

function CitaPill({ cita }: { cita: CitaRow }) {
  const cancelada = cita.estado === "cancelada";
  return (
    <span
      className={`block truncate rounded-full border px-2 py-0.5 text-[10px] font-medium leading-tight ${CITA_TIPO_STYLES[cita.tipo]} ${cancelada ? "line-through opacity-60" : ""}`}
      title={cita.titulo}
    >
      {cita.titulo}
    </span>
  );
}
