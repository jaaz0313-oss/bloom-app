import Link from "next/link";
import {
  PAYMENT_ALERT_URGENCY_LABELS,
  PAYMENT_ALERT_URGENCY_STYLES,
  type PaymentAlert,
} from "@/app/data/payment-alerts";
import { formatCurrency, formatShortDate } from "@/lib/format";

type PaymentAlertsSectionProps = {
  alerts: PaymentAlert[];
};

export function PaymentAlertsSection({ alerts }: PaymentAlertsSectionProps) {
  if (alerts.length === 0) return null;

  return (
    <section className="mb-8 rounded-2xl border border-bloom-border bg-bloom-surface p-6 shadow-sm">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="font-display text-xl text-bloom-ink">
            Alertas de pagos
          </h2>
          <p className="mt-1 text-sm text-bloom-muted">
            Saldos con fecha de vencimiento en los próximos 30 días
          </p>
        </div>
        <p className="text-sm font-medium text-bloom-ink">
          {alerts.length} {alerts.length === 1 ? "alerta" : "alertas"}
        </p>
      </div>

      <ul className="mt-5 space-y-3">
        {alerts.map((alert) => (
          <li key={alert.proveedorId}>
            <Link
              href={`/bodas/${alert.bodaId}`}
              className="block rounded-xl border border-bloom-border bg-bloom-canvas/50 px-4 py-3 transition-colors hover:bg-bloom-canvas"
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium text-bloom-ink">
                      {alert.nombrePareja}
                    </p>
                    <span
                      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${PAYMENT_ALERT_URGENCY_STYLES[alert.urgency]}`}
                    >
                      {PAYMENT_ALERT_URGENCY_LABELS[alert.urgency]}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-bloom-muted">
                    {alert.nombreProveedor}
                  </p>
                </div>

                <dl className="flex shrink-0 gap-6 text-sm sm:text-right">
                  <div>
                    <dt className="text-bloom-muted">Saldo pendiente</dt>
                    <dd className="font-semibold text-bloom-ink">
                      {formatCurrency(alert.saldoPendiente)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-bloom-muted">Vence</dt>
                    <dd className="font-medium text-bloom-ink">
                      {formatShortDate(alert.fechaSaldo)}
                    </dd>
                  </div>
                </dl>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
