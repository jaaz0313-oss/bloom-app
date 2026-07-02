"use client";

import { CITA_TIPO_STYLES } from "@/app/data/citas";
import { ResponsiveModal } from "@/app/components/ui/ResponsiveModal";
import {
  getCalendarioEventoId,
  getCalendarioEventoTitulo,
  TASTING_CALENDARIO_STYLE,
  type CalendarioEvento,
} from "@/lib/calendario-eventos";
import { formatCitaHorario } from "@/lib/citas";
import { formatShortDateStable } from "@/lib/format";
import { formatTastingHorarioRange } from "@/lib/tastings";

type CalendarioDiaOverflowModalProps = {
  fecha: string | null;
  eventos: CalendarioEvento[];
  onClose: () => void;
  onSelectEvento: (evento: CalendarioEvento) => void;
};

export function CalendarioDiaOverflowModal({
  fecha,
  eventos,
  onClose,
  onSelectEvento,
}: CalendarioDiaOverflowModalProps) {
  if (!fecha) return null;

  return (
    <ResponsiveModal
      open
      onClose={onClose}
      title={`Eventos del ${formatShortDateStable(fecha)}`}
      subtitle={`${eventos.length} eventos`}
      size="md"
    >
      <ul className="space-y-2">
        {eventos.map((evento) => {
          const cancelada =
            evento.kind === "cita" && evento.cita.estado === "cancelada";
          const style =
            evento.kind === "cita"
              ? CITA_TIPO_STYLES[evento.cita.tipo]
              : TASTING_CALENDARIO_STYLE;
          const horario =
            evento.kind === "cita"
              ? formatCitaHorario(evento.cita)
              : formatTastingHorarioRange(
                  evento.tasting.hora_inicio,
                  evento.tasting.hora_fin,
                );

          return (
            <li key={getCalendarioEventoId(evento)}>
              <button
                type="button"
                onClick={() => onSelectEvento(evento)}
                className={`w-full rounded-xl border px-4 py-3 text-left transition-colors hover:bg-bloom-canvas/80 ${style} ${cancelada ? "line-through opacity-60" : ""}`}
              >
                <p className="truncate text-sm font-medium">
                  {getCalendarioEventoTitulo(evento)}
                </p>
                <p className="mt-0.5 text-xs opacity-80">{horario}</p>
              </button>
            </li>
          );
        })}
      </ul>
    </ResponsiveModal>
  );
}
