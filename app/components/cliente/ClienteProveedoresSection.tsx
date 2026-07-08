"use client";

import { useId, useState } from "react";
import {
  ClienteAccordionChevron,
  ClienteAccordionSection,
} from "@/app/components/cliente/ClienteAccordionSection";
import { useClienteLocale } from "@/app/components/cliente/ClienteLocaleProvider";
import type { PagoRow } from "@/app/data/pagos";
import { buildPagosConAnticipo } from "@/app/data/pagos";
import {
  getProviderSaldoPendienteConPagos,
  type ProveedorRow,
} from "@/app/data/providers";
import {
  formatClienteCurrency,
  type ClienteUiCopy,
} from "@/lib/cliente-i18n";
import { formatShortDateStable } from "@/lib/format";

type ClienteProveedoresSectionProps = {
  contratados: ProveedorRow[];
  pagosByProveedor: Record<string, PagoRow[]>;
};

export function ClienteProveedoresSection({
  contratados,
  pagosByProveedor,
}: ClienteProveedoresSectionProps) {
  const { t } = useClienteLocale();

  return (
    <ClienteAccordionSection
      title={t.providersTitle}
      summary={t.providersSubtitle(contratados.length)}
    >
      {contratados.length === 0 ? (
        <p className="rounded-xl border border-dashed border-bloom-border bg-bloom-canvas/50 px-5 py-12 text-center text-sm text-bloom-muted">
          {t.providersEmpty}
        </p>
      ) : (
        <ul className="space-y-4">
          {contratados.map((provider) => (
            <ClienteProveedorAccordionItem
              key={provider.id}
              provider={provider}
              pagos={pagosByProveedor[provider.id] ?? []}
            />
          ))}
        </ul>
      )}
    </ClienteAccordionSection>
  );
}

type ClienteProveedorAccordionItemProps = {
  provider: ProveedorRow;
  pagos: PagoRow[];
};

function ClienteProveedorAccordionItem({
  provider,
  pagos,
}: ClienteProveedorAccordionItemProps) {
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const { locale, t } = useClienteLocale();

  const saldo = getProviderSaldoPendienteConPagos(provider, pagos);
  const pagosHistorial = [...buildPagosConAnticipo(provider, pagos)].sort(
    (a, b) =>
      new Date(a.fecha_pago).getTime() - new Date(b.fecha_pago).getTime(),
  );
  const titular = provider.titular_cuenta?.trim() || provider.nombre;
  const descripcion = provider.descripcion_servicio?.trim();

  return (
    <li className="overflow-hidden rounded-xl border border-bloom-border/80 bg-bloom-canvas/30">
      <button
        type="button"
        id={`${panelId}-trigger`}
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((value) => !value)}
        className="flex w-full touch-manipulation flex-col gap-3 px-5 py-4 text-left transition-colors hover:bg-bloom-surface/60 active:bg-bloom-surface/80 sm:px-6"
      >
        <span className="flex w-full items-start justify-between gap-3">
          <span className="min-w-0 flex-1">
            <span className="font-display text-xl text-bloom-ink">
              {provider.nombre}
            </span>
            <span className="mt-0.5 block text-sm text-bloom-muted">
              {provider.categoria}
            </span>
          </span>
          <ClienteAccordionChevron open={open} />
        </span>

        <div className="grid gap-3 text-sm sm:grid-cols-3">
          <SummaryItem
            label={t.contractedValue}
            value={formatClienteCurrency(provider.valor_total, locale)}
          />
          <SummaryItem
            label={t.pendingBalance}
            value={formatClienteCurrency(saldo, locale)}
            emphasized
          />
          <SummaryItem
            label={t.balanceDueDate}
            value={
              provider.fecha_saldo
                ? formatShortDateStable(provider.fecha_saldo)
                : t.toBeConfirmed
            }
          />
        </div>
      </button>

      <div
        id={panelId}
        role="region"
        aria-labelledby={`${panelId}-trigger`}
        className={`grid transition-[grid-template-rows] duration-300 ease-in-out ${
          open ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
        }`}
      >
        <div className="min-h-0 overflow-hidden">
          <div className="space-y-5 border-t border-bloom-border/60 px-5 py-5 sm:px-6">
            {descripcion ? (
              <ServiceDescription descripcion={descripcion} t={t} />
            ) : null}
            <ContactDetails provider={provider} titular={titular} t={t} />
            <PaymentHistory
              pagosHistorial={pagosHistorial}
              locale={locale}
              t={t}
            />
          </div>
        </div>
      </div>
    </li>
  );
}

function SummaryItem({
  label,
  value,
  emphasized = false,
}: {
  label: string;
  value: string;
  emphasized?: boolean;
}) {
  return (
    <div>
      <p className="text-bloom-muted">{label}</p>
      <p
        className={
          emphasized
            ? "font-semibold text-bloom-ink"
            : "font-medium text-bloom-ink"
        }
      >
        {value}
      </p>
    </div>
  );
}

function ServiceDescription({
  descripcion,
  t,
}: {
  descripcion: string;
  t: ClienteUiCopy;
}) {
  return (
    <div>
      <h4 className="font-display text-lg text-bloom-ink">
        {t.serviceDescription}
      </h4>
      <p className="mt-2 text-sm leading-relaxed text-bloom-ink/90">
        {descripcion}
      </p>
    </div>
  );
}

function ContactDetails({
  provider,
  titular,
  t,
}: {
  provider: ProveedorRow;
  titular: string;
  t: ClienteUiCopy;
}) {
  return (
    <div className="rounded-xl border border-bloom-border/70 bg-bloom-surface/90 p-4">
      <p className="text-xs font-medium uppercase tracking-[0.12em] text-bloom-muted">
        {t.contactDetails}
      </p>
      <dl className="mt-3 space-y-2 text-sm">
        <div>
          <dt className="text-bloom-muted">{t.bank}</dt>
          <dd className="font-medium text-bloom-ink">{provider.banco || "—"}</dd>
        </div>
        <div>
          <dt className="text-bloom-muted">{t.accountType}</dt>
          <dd className="font-medium text-bloom-ink">
            {provider.tipo_cuenta || "—"}
          </dd>
        </div>
        <div>
          <dt className="text-bloom-muted">{t.accountNumber}</dt>
          <dd className="font-medium text-bloom-ink">
            {provider.numero_cuenta || "—"}
          </dd>
        </div>
        <div>
          <dt className="text-bloom-muted">{t.accountHolder}</dt>
          <dd className="font-medium text-bloom-ink">{titular}</dd>
        </div>
      </dl>
    </div>
  );
}

function PaymentHistory({
  pagosHistorial,
  locale,
  t,
}: {
  pagosHistorial: ReturnType<typeof buildPagosConAnticipo>;
  locale: "es" | "en";
  t: ClienteUiCopy;
}) {
  return (
    <div>
      <h4 className="font-display text-lg text-bloom-ink">{t.paymentHistory}</h4>
      {pagosHistorial.length === 0 ? (
        <p className="mt-2 text-sm text-bloom-muted">{t.noPaymentsRecorded}</p>
      ) : (
        <ul className="mt-3 space-y-2">
          {pagosHistorial.map((pago) => (
            <li
              key={pago.id}
              className="rounded-lg border border-bloom-border/70 bg-bloom-surface px-3 py-2.5 text-sm"
            >
              <div className="flex items-center justify-between gap-3">
                <p className="font-medium text-bloom-ink">
                  {formatClienteCurrency(pago.monto, locale)}
                </p>
                <p className="text-bloom-muted">
                  {formatShortDateStable(pago.fecha_pago)}
                </p>
              </div>
              <p className="mt-1 text-bloom-muted">
                {pago.concepto || t.noConcept}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
