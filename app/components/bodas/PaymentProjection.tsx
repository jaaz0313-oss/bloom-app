import { formatCurrency } from "@/lib/format";
import type { DepositoReembolsableLine } from "@/app/data/providers";

type PaymentProjectionProps = {
  totalContratado: number;
  totalPagado: number;
  saldoPendiente: number;
  depositos?: DepositoReembolsableLine[];
  embedded?: boolean;
};

export function PaymentProjection({
  totalContratado,
  totalPagado,
  saldoPendiente,
  depositos = [],
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

      {depositos.length > 0 && (
        <div className="mt-5 space-y-2 border-t border-bloom-border/70 pt-4">
          <p className="text-xs font-medium uppercase tracking-wider text-bloom-muted">
            Depósitos reembolsables
          </p>
          <p className="text-xs text-bloom-muted">
            No se suman al total contratado
          </p>
          <ul className="space-y-2">
            {depositos.map((deposito) => (
              <li
                key={deposito.proveedorId}
                className="flex flex-wrap items-baseline justify-between gap-2 rounded-xl border border-sky-200/80 bg-sky-50/60 px-4 py-3 text-sm"
              >
                <p className="min-w-0 font-medium text-bloom-ink">
                  Depósito reembolsable · {deposito.proveedorNombre}
                </p>
                <p className="shrink-0 font-semibold text-sky-800">
                  {formatCurrency(deposito.monto)}
                </p>
              </li>
            ))}
          </ul>
        </div>
      )}
    </Shell>
  );
}
