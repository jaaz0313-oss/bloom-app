import Link from "next/link";
import {
  CITA_ESTADO_LABELS,
  CITA_ESTADO_STYLES,
  CITA_TIPO_LABELS,
  CITA_TIPO_STYLES,
  type CitaRow,
} from "@/app/data/citas";
import { formatCitaHorario, getCitaRelacionLabel } from "@/lib/citas";
import { formatShortDateStable } from "@/lib/format";

type CitaListItemProps = {
  cita: CitaRow;
  bodasById: Record<string, { nombre_pareja: string }>;
  leadsById: Record<string, { nombre_pareja: string }>;
  showDate?: boolean;
  compact?: boolean;
};

export function CitaListItem({
  cita,
  bodasById,
  leadsById,
  showDate = false,
  compact = false,
}: CitaListItemProps) {
  const relacion = getCitaRelacionLabel(cita, bodasById, leadsById);
  const cancelada = cita.estado === "cancelada";
  const href = cita.boda_id
    ? `/bodas/${cita.boda_id}`
    : cita.lead_id
      ? `/leads/${cita.lead_id}`
      : null;

  return (
    <div
      className={`rounded-xl border border-bloom-border bg-bloom-surface ${compact ? "px-3 py-2" : "px-4 py-3"} ${cancelada ? "opacity-70" : ""}`}
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide ${CITA_TIPO_STYLES[cita.tipo]}`}
            >
              {CITA_TIPO_LABELS[cita.tipo]}
            </span>
            <span
              className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-medium ${CITA_ESTADO_STYLES[cita.estado]}`}
            >
              {CITA_ESTADO_LABELS[cita.estado]}
            </span>
          </div>
          <p
            className={`mt-1 font-medium text-bloom-ink ${compact ? "text-sm" : ""} ${cancelada ? "line-through" : ""}`}
          >
            {cita.titulo}
          </p>
          <p className="text-xs text-bloom-muted">
            {showDate && (
              <>
                {formatShortDateStable(cita.fecha)} ·{" "}
              </>
            )}
            {formatCitaHorario(cita)}
            {cita.lugar ? ` · ${cita.lugar}` : ""}
          </p>
          {relacion && (
            <p className="mt-1 text-xs text-bloom-accent">
              {href ? (
                <Link href={href} className="hover:underline">
                  {relacion}
                </Link>
              ) : (
                relacion
              )}
            </p>
          )}
          {cita.asignado_nombre && (
            <p className="mt-0.5 text-xs text-bloom-muted">
              Asignado: {cita.asignado_nombre}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
