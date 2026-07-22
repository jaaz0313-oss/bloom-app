import Link from "next/link";
import { DashboardAccordionSection } from "@/app/components/DashboardAccordionSection";
import {
  filterMisTareasPendientes,
  filterTareasCompletadasRecientes,
  formatTareaRelativeTime,
  getTareaUrgency,
  TAREA_PRIORIDAD_LABELS,
  TAREA_PRIORIDAD_STYLES,
  TAREA_URGENCY_LABELS,
  TAREA_URGENCY_STYLES,
  type TareaRow,
} from "@/app/data/tareas";
import { formatShortDateStable } from "@/lib/format";

type MisTareasPendientesSectionProps = {
  tareasPendientes: TareaRow[];
  tareasCompletadasRecientes: TareaRow[];
  username: string;
  bodaNombresById: Record<string, string>;
  nombresByUsername: Record<string, string>;
};

export function MisTareasPendientesSection({
  tareasPendientes,
  tareasCompletadasRecientes,
  username,
  bodaNombresById,
  nombresByUsername,
}: MisTareasPendientesSectionProps) {
  const pendientes = filterMisTareasPendientes(tareasPendientes, username, 5);
  const completadasRecientes = filterTareasCompletadasRecientes(
    tareasCompletadasRecientes,
    username,
  );

  if (pendientes.length === 0 && completadasRecientes.length === 0) {
    return null;
  }

  const totalCount = pendientes.length + completadasRecientes.length;

  return (
    <DashboardAccordionSection
      title="Mis tareas pendientes"
      count={totalCount}
      subtitle={
        pendientes.length === 0
          ? `${completadasRecientes.length} completada${completadasRecientes.length === 1 ? "" : "s"} recientemente`
          : pendientes.length === 1
            ? "1 tarea por completar"
            : `${pendientes.length} tareas por completar`
      }
      defaultOpen={completadasRecientes.length > 0}
    >
      <div className="mb-4 flex justify-end">
        <Link
          href="/tareas"
          className="text-sm font-medium text-bloom-accent hover:text-bloom-accent-hover"
        >
          Ver todas →
        </Link>
      </div>

      {pendientes.length > 0 ? (
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
      ) : null}

      {completadasRecientes.length > 0 ? (
        <div className={pendientes.length > 0 ? "mt-6" : undefined}>
          <h3 className="text-sm font-semibold text-bloom-ink">
            Tareas completadas recientemente
          </h3>
          <p className="mt-0.5 text-xs text-bloom-muted">
            Completadas en las últimas 24 horas
          </p>
          <ul className="mt-3 space-y-3">
            {completadasRecientes.map((tarea) => {
              const completadaPor =
                tarea.completada_por
                  ? (nombresByUsername[tarea.completada_por] ??
                    tarea.completada_por)
                  : "alguien del equipo";
              const completedAt = tarea.completada_at ?? tarea.updated_at;

              return (
                <li
                  key={tarea.id}
                  className="rounded-xl border border-green-200 bg-green-50/70 px-4 py-3"
                >
                  <p className="font-medium text-bloom-ink">{tarea.titulo}</p>
                  <p className="mt-1 text-xs text-bloom-muted">
                    Completada por {completadaPor}
                    {completedAt
                      ? ` · ${formatTareaRelativeTime(completedAt)}`
                      : null}
                  </p>
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}
    </DashboardAccordionSection>
  );
}
