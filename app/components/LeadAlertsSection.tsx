import Link from "next/link";
import { DashboardAccordionSection } from "@/app/components/DashboardAccordionSection";
import {
  LEAD_INACTIVITY_URGENCY_LABELS,
  LEAD_INACTIVITY_URGENCY_STYLES,
  type LeadInactivityAlert,
} from "@/app/data/lead-alerts";

type LeadAlertsSectionProps = {
  alerts: LeadInactivityAlert[];
};

export function LeadAlertsSection({ alerts }: LeadAlertsSectionProps) {
  if (alerts.length === 0) return null;

  return (
    <DashboardAccordionSection
      title="Leads sin respuesta"
      count={alerts.length}
      subtitle="Leads activos sin convertir a boda ni descartar"
    >
      <ul className="space-y-3">
        {alerts.map((alert) => (
          <li key={alert.leadId}>
            <div className="flex flex-col gap-3 rounded-xl border border-bloom-border bg-bloom-canvas/50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-medium text-bloom-ink">
                    {alert.nombrePareja}
                  </p>
                  <span
                    className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${LEAD_INACTIVITY_URGENCY_STYLES[alert.urgency]}`}
                  >
                    {LEAD_INACTIVITY_URGENCY_LABELS[alert.urgency]}
                  </span>
                </div>
                <p className="mt-1 text-sm text-bloom-muted">
                  {alert.diasSinAvanzar === 1
                    ? "1 día sin avanzar"
                    : `${alert.diasSinAvanzar} días sin avanzar`}
                </p>
              </div>

              <Link
                href={`/leads/${alert.leadId}`}
                className="inline-flex shrink-0 items-center justify-center rounded-full border border-bloom-border bg-bloom-surface px-4 py-2 text-xs font-medium text-bloom-ink transition-colors hover:bg-bloom-canvas"
              >
                Ver lead
              </Link>
            </div>
          </li>
        ))}
      </ul>
    </DashboardAccordionSection>
  );
}
