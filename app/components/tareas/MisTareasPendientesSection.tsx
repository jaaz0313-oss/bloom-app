import Link from "next/link";
import { DashboardAccordionSection } from "@/app/components/DashboardAccordionSection";
import {
  filterMisTareasPendientes,
  getTareaUrgency,
  TAREA_PRIORIDAD_LABELS,
  TAREA_PRIORIDAD_STYLES,
  TAREA_URGENCY_LABELS,
  TAREA_URGENCY_STYLES,
  type TareaRow,
} from "@/app/data/tareas";
import { formatShortDateStable } from "@/lib/format";

type MisTareasPendientesSectionProps = {
  tareas: TareaRow[];
  username: string;
  bodaNombresById: Record<string, string>;
};

export function MisTareasPendientesSection({
  tareas,
  username,
  bodaNombresById,
}: MisTareasPendientesSectionProps) {
  const pendientes = filterMisTareasPendientes(tareas, username, 5);

  if (pendientes.length === 0) return null;

  return (
    <DashboardAccordionSection
      title="Mis tareas pendientes"
      count={pendientes.length}
      subtitle={
        pendientes.length === 1
          ? "1 tarea por completar"
          : `${pendientes.length} tareas por completar`
      }
    >
      <div className="mb-4 flex justify-end">
        <Link
          href="/tareas"
          className="text-sm font-medium text-bloom-accent hover:text-bloom-accent-hover"
        >
          Ver todas →
        </Link>
      </div>
      <ul className="space-y-3">
        {pendientes.map((tarea) => {
          const urgency = getTareaUrgency(tarea.fecha_limite, tarea.completada);
          const bodaNombre = tarea.boda_id
            ? bodaNombresById[tarea.boda_id]
            : null;

          return (
            <li
              key={tarea.id}
              className="rounded-xl border border-bloom-border bg-bloom-canvas/50 px-4 py-3"
            >
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-medium text-bloom-ink">{tarea.titulo}</p>
                <span
                  className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${
                    TAREA_PRIORIDAD_STYLES[tarea.prioridad]
                  }`}
                >
                  {TAREA_PRIORIDAD_LABELS[tarea.prioridad]}
                </span>
                {urgency ? (
                  <span
                    className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${
                      TAREA_URGENCY_STYLES[urgency]
                    }`}
                  >
                    {TAREA_URGENCY_LABELS[urgency]}
                  </span>
                ) : null}
              </div>
              <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-bloom-muted">
                {bodaNombre ? <span>{bodaNombre}</span> : null}
                {tarea.fecha_limite ? (
                  <span>
                    Límite: {formatShortDateStable(tarea.fecha_limite)}
                  </span>
                ) : (
                  <span>Sin fecha límite</span>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </DashboardAccordionSection>
  );
}
