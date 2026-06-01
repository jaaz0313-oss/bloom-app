import {
  CLIENTE_PAGO_URGENCY_LABELS,
  CLIENTE_PAGO_URGENCY_STYLES,
  type ClientePagoPendiente,
} from "@/lib/cliente-pagos";
import { formatCurrency, formatShortDate } from "@/lib/format";

type ClienteProximosPagosProps = {
  pagosPendientes: ClientePagoPendiente[];
};

export function ClienteProximosPagos({
  pagosPendientes,
}: ClienteProximosPagosProps) {
  if (pagosPendientes.length === 0) return null;

  return (
    <section className="mt-10">
      <div className="mb-6">
        <h2 className="font-display text-2xl text-bloom-ink sm:text-3xl">
          Próximos pagos
        </h2>
        <p className="mt-1 text-sm text-bloom-muted sm:text-base">
          Pagos pendientes ordenados por fecha más próxima
        </p>
      </div>

      <ul className="space-y-5">
        {pagosPendientes.map((item) => (
          <li key={item.proveedor.id}>
            <ProximoPagoCard item={item} />
          </li>
        ))}
      </ul>
    </section>
  );
}

function ProximoPagoCard({ item }: { item: ClientePagoPendiente }) {
  const { proveedor, saldoPendiente, fechaLimite, urgency } = item;
  const titular = proveedor.titular_cuenta?.trim() || proveedor.nombre;
  const hasBankInfo =
    proveedor.banco ||
    proveedor.tipo_cuenta ||
    proveedor.numero_cuenta ||
    proveedor.titular_cuenta ||
    proveedor.documento_nit;

  return (
    <article className="overflow-hidden rounded-2xl border border-bloom-border bg-bloom-surface shadow-sm">
      <div className="border-b border-bloom-border/70 bg-bloom-canvas/40 px-5 py-5 sm:px-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <h3 className="font-display text-xl text-bloom-ink">
              {proveedor.nombre}
            </h3>
            <p className="mt-0.5 text-sm text-bloom-muted">
              {proveedor.categoria}
            </p>
          </div>
          {urgency && (
            <span
              className={`inline-flex w-fit shrink-0 rounded-full px-3 py-1 text-xs font-medium ${CLIENTE_PAGO_URGENCY_STYLES[urgency]}`}
            >
              {CLIENTE_PAGO_URGENCY_LABELS[urgency]}
            </span>
          )}
        </div>

        <dl className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <dt className="text-xs font-medium uppercase tracking-wider text-bloom-muted">
              Monto pendiente
            </dt>
            <dd className="mt-1 font-display text-2xl text-bloom-ink">
              {formatCurrency(saldoPendiente)}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase tracking-wider text-bloom-muted">
              Fecha límite de pago
            </dt>
            <dd className="mt-1 text-lg font-medium text-bloom-ink">
              {fechaLimite ? formatShortDate(fechaLimite) : "Por confirmar"}
            </dd>
          </div>
        </dl>
      </div>

      {hasBankInfo && (
        <div className="px-5 py-5 sm:px-6">
          <p className="text-xs font-medium uppercase tracking-[0.12em] text-bloom-muted">
            Datos para transferencia
          </p>
          <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
            {proveedor.banco && (
              <BankField label="Banco" value={proveedor.banco} />
            )}
            {proveedor.tipo_cuenta && (
              <BankField label="Tipo de cuenta" value={proveedor.tipo_cuenta} />
            )}
            {proveedor.numero_cuenta && (
              <BankField
                label="Número de cuenta"
                value={proveedor.numero_cuenta}
                mono
              />
            )}
            {titular && <BankField label="Titular" value={titular} />}
            {proveedor.documento_nit && (
              <BankField label="Documento / NIT" value={proveedor.documento_nit} />
            )}
          </dl>
        </div>
      )}
    </article>
  );
}

function BankField({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="rounded-xl border border-bloom-border/80 bg-bloom-canvas/50 px-4 py-3">
      <dt className="text-xs text-bloom-muted">{label}</dt>
      <dd
        className={`mt-1 font-medium text-bloom-ink ${mono ? "font-mono text-[0.9375rem]" : ""}`}
      >
        {value}
      </dd>
    </div>
  );
}
