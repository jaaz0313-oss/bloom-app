"use client";

import { CITA_TIPO_STYLES, type CitaRow } from "@/app/data/citas";
import { ResponsiveModal } from "@/app/components/ui/ResponsiveModal";
import { formatCitaHorario } from "@/lib/citas";
import { formatShortDateStable } from "@/lib/format";

type CitaDiaOverflowModalProps = {
  fecha: string | null;
  citas: CitaRow[];
  onClose: () => void;
  onSelectCita: (cita: CitaRow) => void;
};

export function CitaDiaOverflowModal({
  fecha,
  citas,
  onClose,
  onSelectCita,
}: CitaDiaOverflowModalProps) {
  if (!fecha) return null;

  return (
    <ResponsiveModal
      open
      onClose={onClose}
      title={`Citas del ${formatShortDateStable(fecha)}`}
      subtitle={`${citas.length} citas`}
      size="md"
    >
      <ul className="space-y-2">
        {citas.map((cita) => {
          const cancelada = cita.estado === "cancelada";
          return (
            <li key={cita.id}>
              <button
                type="button"
                onClick={() => onSelectCita(cita)}
                className={`w-full rounded-xl border px-4 py-3 text-left transition-colors hover:bg-bloom-canvas/80 ${CITA_TIPO_STYLES[cita.tipo]} ${cancelada ? "line-through opacity-60" : ""}`}
              >
                <p className="truncate text-sm font-medium">{cita.titulo}</p>
                <p className="mt-0.5 text-xs opacity-80">
                  {formatCitaHorario(cita)}
                </p>
              </button>
            </li>
          );
        })}
      </ul>
    </ResponsiveModal>
  );
}
