import Link from "next/link";
import { DashboardAccordionSection } from "@/app/components/DashboardAccordionSection";
import type { BodaInactivityAlert } from "@/app/data/boda-alerts";
import { formatShortDateStable, formatWeddingDate } from "@/lib/format";

type BodaInactivityAlertsSectionProps = {
  alerts: BodaInactivityAlert[];
};

export function BodaInactivityAlertsSection({
  alerts,
}: BodaInactivityAlertsSectionProps) {
  if (alerts.length === 0) return null;

  return (
    <DashboardAccordionSection
      title="Bodas sin actividad reciente"
      count={alerts.length}
      subtitle="Sin cambios registrados en los últimos 15 días"
    >
      <ul className="space-y-3">
        {alerts.map((alert) => (
          <li key={alert.bodaId}>
            <div className="flex flex-col gap-3 rounded-xl border border-bloom-border bg-bloom-canvas/50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0 flex-1">
                <p className="font-medium text-bloom-ink">{alert.nombrePareja}</p>
                <dl className="mt-2 grid gap-1 text-sm sm:grid-cols-2 sm:gap-4">
                  <div>
                    <dt className="text-bloom-muted">Fecha de boda</dt>
                    <dd className="font-medium text-bloom-ink">
                      {formatWeddingDate(alert.fechaBoda)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-bloom-muted">Sin actividad</dt>
                    <dd className="font-medium text-amber-900">
                      {alert.diasSinActividad === 1
                        ? "1 día"
                        : `${alert.diasSinActividad} días`}
                    </dd>
                    <dd className="text-xs text-bloom-muted">
                      Última actividad:{" "}
                      {formatShortDateStable(alert.ultimaActividadAt.slice(0, 10))}
                    </dd>
                  </div>
                </dl>
              </div>

              <Link
                href={`/bodas/${alert.bodaId}`}
                className="inline-flex shrink-0 items-center justify-center rounded-full border border-bloom-border bg-bloom-surface px-4 py-2 text-xs font-medium text-bloom-ink transition-colors hover:bg-bloom-canvas"
              >
                Ver boda
              </Link>
            </div>
          </li>
        ))}
      </ul>
    </DashboardAccordionSection>
  );
}
