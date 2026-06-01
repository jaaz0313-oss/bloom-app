"use client";

import { CITA_TIPO_STYLES, type CitaRow } from "@/app/data/citas";

type CitaPillProps = {
  cita: CitaRow;
  onClick: () => void;
};

export function CitaPill({ cita, onClick }: CitaPillProps) {
  const cancelada = cita.estado === "cancelada";

  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      className={`block w-full shrink-0 truncate rounded-full border px-2 py-0.5 text-left text-[10px] font-medium leading-tight ${CITA_TIPO_STYLES[cita.tipo]} ${cancelada ? "line-through opacity-60" : ""} hover:opacity-90`}
      title={cita.titulo}
    >
      <span className="block truncate">{cita.titulo}</span>
    </button>
  );
}
