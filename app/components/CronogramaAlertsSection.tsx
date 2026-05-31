import Link from "next/link";
import { DashboardAccordionSection } from "@/app/components/DashboardAccordionSection";
import type { CronogramaAlert } from "@/app/data/cronograma-alerts";
import { formatShortDate } from "@/lib/format";

type CronogramaAlertsSectionProps = {
  alerts: CronogramaAlert[];
};

export function CronogramaAlertsSection({ alerts }: CronogramaAlertsSectionProps) {
  if (alerts.length === 0) return null;

  return (
    <DashboardAccordionSection
      title="Alertas de cronograma"
      count={alerts.length}
      subtitle="Hitos vencidos o próximos a vencer (30 días)"
    >
      <ul className="space-y-3">
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
    </DashboardAccordionSection>
  );
}
