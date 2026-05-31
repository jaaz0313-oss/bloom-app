import { formatCurrency } from "@/lib/format";

type PaymentProjectionProps = {
  totalContratado: number;
  totalPagado: number;
  saldoPendiente: number;
  embedded?: boolean;
};

export function PaymentProjection({
  totalContratado,
  totalPagado,
  saldoPendiente,
  embedded = false,
}: PaymentProjectionProps) {
  const shellClass = embedded
    ? ""
    : "rounded-2xl border border-bloom-border bg-bloom-surface p-6 shadow-sm";
  const Shell = embedded ? "div" : "section";

  return (
    <Shell className={shellClass}>
      {!embedded && (
        <>
          <h2 className="font-display text-xl text-bloom-ink">
            Proyección de pagos
          </h2>
          <p className="mt-1 text-sm text-bloom-muted">
            Resumen de proveedores con estado contratado
          </p>
        </>
      )}
      {embedded && (
        <p className="mb-4 text-sm text-bloom-muted">
          Resumen de proveedores con estado contratado
        </p>
      )}

      <dl className={`grid gap-4 sm:grid-cols-3 ${embedded ? "" : "mt-5"}`}>
        <div className="rounded-xl bg-bloom-canvas px-4 py-3">
          <dt className="text-xs font-medium uppercase tracking-wider text-bloom-muted">
            Total contratado
          </dt>
          <dd className="mt-1 text-lg font-semibold text-bloom-ink">
            {formatCurrency(totalContratado)}
          </dd>
        </div>
        <div className="rounded-xl bg-bloom-canvas px-4 py-3">
          <dt className="text-xs font-medium uppercase tracking-wider text-bloom-muted">
            Total pagado
          </dt>
          <dd className="mt-1 text-lg font-semibold text-bloom-success">
            {formatCurrency(totalPagado)}
          </dd>
        </div>
        <div className="rounded-xl bg-bloom-canvas px-4 py-3">
          <dt className="text-xs font-medium uppercase tracking-wider text-bloom-muted">
            Saldo pendiente
          </dt>
          <dd className="mt-1 text-lg font-semibold text-bloom-ink">
            {formatCurrency(saldoPendiente)}
          </dd>
        </div>
      </dl>
    </Shell>
  );
}
