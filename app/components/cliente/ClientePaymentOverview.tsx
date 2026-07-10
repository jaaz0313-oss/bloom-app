"use client";

import { useClienteLocale } from "@/app/components/cliente/ClienteLocaleProvider";
import { computeClientePorcentajePagado } from "@/lib/cliente-pagos";
import { formatCurrency } from "@/lib/format";

type ClientePaymentOverviewProps = {
  totalContratado: number;
  totalPagado: number;
  saldoPendiente: number;
};

export function ClientePaymentOverview({
  totalContratado,
  totalPagado,
  saldoPendiente,
}: ClientePaymentOverviewProps) {
  const { t } = useClienteLocale();
  const percent = computeClientePorcentajePagado(
    totalContratado,
    totalPagado,
  );

  return (
    <section className="overflow-hidden rounded-2xl border border-bloom-border bg-bloom-surface shadow-sm">
      <div className="border-b border-bloom-border/80 bg-gradient-to-br from-bloom-canvas to-bloom-surface px-5 py-6 sm:px-8 sm:py-7">
        <h2 className="font-display text-2xl text-bloom-ink sm:text-3xl">
          {t.paymentOverviewTitle}
        </h2>
        <p className="mt-1 text-sm text-bloom-muted sm:text-base">
          {t.paymentOverviewSubtitle}
        </p>

        <div className="mt-6">
          <div className="flex items-end justify-between gap-3">
            <p className="font-display text-3xl text-bloom-success sm:text-4xl">
              {percent}%
            </p>
            <p className="pb-1 text-sm font-medium text-bloom-muted">
              {t.paymentCompleted}
            </p>
          </div>
          <div
            className="mt-3 h-3 overflow-hidden rounded-full bg-bloom-border/80"
            role="progressbar"
            aria-valuenow={percent}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={t.paymentProgressAria(percent)}
          >
            <div
              className="h-full rounded-full bg-gradient-to-r from-bloom-success to-emerald-600 transition-all duration-500"
              style={{ width: `${percent}%` }}
            />
          </div>
        </div>
      </div>

      <dl className="grid gap-px bg-bloom-border/60 sm:grid-cols-3">
        <SummaryCard
          label={t.totalContracted}
          value={formatCurrency(totalContratado)}
          tone="neutral"
        />
        <SummaryCard
          label={t.totalPaid}
          value={formatCurrency(totalPagado)}
          tone="success"
        />
        <SummaryCard
          label={t.balanceDue}
          value={formatCurrency(saldoPendiente)}
          tone="pending"
        />
      </dl>
    </section>
  );
}

function SummaryCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: "neutral" | "success" | "pending";
}) {
  const valueClass =
    tone === "success"
      ? "text-bloom-success"
      : tone === "pending"
        ? "text-bloom-accent"
        : "text-bloom-ink";

  return (
    <div className="bg-bloom-surface px-5 py-5 sm:px-6 sm:py-6">
      <dt className="text-xs font-medium uppercase tracking-[0.12em] text-bloom-muted">
        {label}
      </dt>
      <dd className={`mt-2 font-display text-xl sm:text-2xl ${valueClass}`}>
        {value}
      </dd>
    </div>
  );
}
