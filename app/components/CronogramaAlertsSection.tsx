import Link from "next/link";
import type { CronogramaAlert } from "@/app/data/cronograma-alerts";
import { formatShortDate } from "@/lib/format";

type CronogramaAlertsSectionProps = {
  alerts: CronogramaAlert[];
};

export function CronogramaAlertsSection({ alerts }: CronogramaAlertsSectionProps) {
  if (alerts.length === 0) return null;

  return (
    <section className="mb-8 rounded-2xl border border-bloom-border bg-bloom-surface p-6 shadow-sm">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="font-display text-xl text-bloom-ink">
            Alertas de cronograma
          </h2>
          <p className="mt-1 text-sm text-bloom-muted">
            Hitos vencidos o próximos a vencer (30 días)
          </p>
        </div>
        <p className="text-sm font-medium text-bloom-ink">
          {alerts.length} {alerts.length === 1 ? "alerta" : "alertas"}
        </p>
      </div>

      <ul className="mt-5 space-y-3">
        {alerts.map((alert) => (
          <li key={alert.id}>
            <Link
              href={`/bodas/${alert.bodaId}`}
              className="block rounded-xl border border-bloom-border bg-bloom-canvas/50 px-4 py-3 transition-colors hover:bg-bloom-canvas"
            >
              <p className="font-medium text-bloom-ink">{alert.nombrePareja}</p>
              <p className="mt-1 text-sm text-bloom-muted">{alert.hito}</p>
              <p className="mt-1 text-sm text-bloom-ink">
                Límite: {formatShortDate(alert.fechaLimite)}
              </p>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
