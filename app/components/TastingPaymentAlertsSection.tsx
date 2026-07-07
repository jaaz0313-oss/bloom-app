import Link from "next/link";
import { DashboardAccordionSection } from "@/app/components/DashboardAccordionSection";
import type { TastingPaymentAlert } from "@/app/data/tasting-payment-alerts";
import { bodaTastingsHref } from "@/lib/boda-url";
import { formatShortDateStable } from "@/lib/format";
import { formatTastingTimeLabel } from "@/lib/tastings";

type TastingPaymentAlertsSectionProps = {
  alerts: TastingPaymentAlert[];
};

export function TastingPaymentAlertsSection({
  alerts,
}: TastingPaymentAlertsSectionProps) {
  if (alerts.length === 0) return null;

  return (
    <DashboardAccordionSection
      title="Pruebas sin pagar"
      count={alerts.length}
      subtitle="Tastings con pago de prueba pendiente"
    >
      <ul className="space-y-3">
        {alerts.map((alert) => (
          <li key={alert.tastingId}>
            <div className="flex flex-col gap-3 rounded-xl border border-bloom-border bg-bloom-canvas/50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0 flex-1">
                <p className="font-medium text-bloom-ink">{alert.nombrePareja}</p>
                <p className="mt-1 text-sm text-bloom-muted">{alert.tastingTitulo}</p>
                <p className="mt-1 text-sm text-bloom-muted">
                  {formatShortDateStable(alert.fecha)} ·{" "}
                  {formatTastingTimeLabel(alert.horaInicio)}
                </p>
              </div>

              <Link
                href={bodaTastingsHref(alert.bodaId)}
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
