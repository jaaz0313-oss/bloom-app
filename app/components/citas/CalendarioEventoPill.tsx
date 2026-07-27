"use client";

import { CITA_TIPO_STYLES, type CitaRow } from "@/app/data/citas";
import {
  getCalendarioEventoTitulo,
  getTastingCalendarioStyle,
  type CalendarioEvento,
} from "@/lib/calendario-eventos";

type CalendarioEventoPillProps = {
  evento: CalendarioEvento;
  onClick: () => void;
};

export function CalendarioEventoPill({ evento, onClick }: CalendarioEventoPillProps) {
  const titulo = getCalendarioEventoTitulo(evento);
  const cancelada = evento.kind === "cita" && evento.cita.estado === "cancelada";
  const style =
    evento.kind === "cita"
      ? CITA_TIPO_STYLES[evento.cita.tipo]
      : getTastingCalendarioStyle(evento.tasting.tipo_cita);

  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      className={`block w-full shrink-0 truncate rounded-full border px-2 py-0.5 text-left text-[10px] font-medium leading-tight ${style} ${cancelada ? "line-through opacity-60" : ""} hover:opacity-90`}
      title={titulo}
    >
      <span className="block truncate">{titulo}</span>
    </button>
  );
}

export function isCalendarioCitaEvento(
  evento: CalendarioEvento,
): evento is { kind: "cita"; cita: CitaRow } {
  return evento.kind === "cita";
}
