"use client";

import { ClienteAccordionSection } from "@/app/components/cliente/ClienteAccordionSection";
import { useClienteLocale } from "@/app/components/cliente/ClienteLocaleProvider";
import {
  CLIENTE_PAGO_URGENCY_STYLES,
  type ClientePagoPendiente,
} from "@/lib/cliente-pagos";
import {
  formatClienteCurrency,
  getClientePagoUrgencyLabel,
} from "@/lib/cliente-i18n";
import { formatShortDateStable } from "@/lib/format";

type ClienteProximosPagosProps = {
  pagosPendientes: ClientePagoPendiente[];
};

export function ClienteProximosPagos({
  pagosPendientes,
}: ClienteProximosPagosProps) {
  const { t } = useClienteLocale();

  if (pagosPendientes.length === 0) return null;

  return (
    <ClienteAccordionSection
      title={t.upcomingPaymentsTitle}
      summary={
        <>
          <span>{t.upcomingPaymentsCount(pagosPendientes.length)}</span>
          <span className="mt-1 block font-normal text-bloom-muted/90">
            {t.upcomingPaymentsSubtitle}
          </span>
        </>
      }
    >
      <ul className="space-y-5">
        {pagosPendientes.map((item) => (
          <li key={item.proveedor.id}>
            <ProximoPagoCard item={item} />
          </li>
        ))}
      </ul>
    </ClienteAccordionSection>
  );
}

function ProximoPagoCard({ item }: { item: ClientePagoPendiente }) {
  const { locale, t } = useClienteLocale();
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
              {getClientePagoUrgencyLabel(urgency, locale)}
            </span>
          )}
        </div>

        <dl className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <dt className="text-xs font-medium uppercase tracking-wider text-bloom-muted">
              {t.pendingAmount}
            </dt>
            <dd className="mt-1 font-display text-2xl text-bloom-ink">
              {formatClienteCurrency(saldoPendiente, locale)}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase tracking-wider text-bloom-muted">
              {t.paymentDueDate}
            </dt>
            <dd className="mt-1 text-lg font-medium text-bloom-ink">
              {fechaLimite
                ? formatShortDateStable(fechaLimite)
                : t.toBeConfirmed}
            </dd>
          </div>
        </dl>
      </div>

      {hasBankInfo && (
        <div className="px-5 py-5 sm:px-6">
          <p className="text-xs font-medium uppercase tracking-[0.12em] text-bloom-muted">
            {t.transferDetails}
          </p>
          <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
            {proveedor.banco && (
              <BankField label={t.bank} value={proveedor.banco} />
            )}
            {proveedor.tipo_cuenta && (
              <BankField label={t.accountType} value={proveedor.tipo_cuenta} />
            )}
            {proveedor.numero_cuenta && (
              <BankField
                label={t.accountNumber}
                value={proveedor.numero_cuenta}
                mono
              />
            )}
            {titular && <BankField label={t.accountHolder} value={titular} />}
            {proveedor.documento_nit && (
              <BankField
                label={t.documentNit}
                value={proveedor.documento_nit}
              />
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
