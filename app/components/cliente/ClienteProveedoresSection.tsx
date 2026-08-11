"use client";

import { useId, useMemo, useState } from "react";
import {
  ClienteAccordionChevron,
  ClienteAccordionSection,
} from "@/app/components/cliente/ClienteAccordionSection";
import { useClienteLocale } from "@/app/components/cliente/ClienteLocaleProvider";
import type { PagoRow } from "@/app/data/pagos";
import { buildPagosConAnticipo } from "@/app/data/pagos";
import {
  getDepositoReembolsableMonto,
  getProviderSaldoPendienteConPagos,
  getProveedorGrupoCategoriasCompaneras,
  getProveedorGrupoPrimaryId,
  hasDepositoReembolsable,
  hasProveedorValorDefinido,
  isProveedorGrupoPrimario,
  isProveedorSinCosto,
  sortProveedoresContiguosPorGrupo,
  type ProveedorRow,
} from "@/app/data/providers";
import {
  formatClienteProveedorValue,
  getClienteCronogramaCategoriaLabel,
  type ClienteUiCopy,
} from "@/lib/cliente-i18n";
import { formatCurrency, formatShortDateStable } from "@/lib/format";
import { useClienteEffectiveCopPorUsd } from "@/app/components/cliente/ClienteUsdPreferenceProvider";
import { appendUsdApprox } from "@/lib/tasa-cambio";

type ClienteProveedoresSectionProps = {
  contratados: ProveedorRow[];
  pagosByProveedor: Record<string, PagoRow[]>;
  copPorUsd?: number | null;
};

export function ClienteProveedoresSection({
  contratados,
  pagosByProveedor,
  copPorUsd = null,
}: ClienteProveedoresSectionProps) {
  const { t } = useClienteLocale();
  const effectiveCopPorUsd = useClienteEffectiveCopPorUsd(copPorUsd);
  const proveedoresOrdenados = useMemo(
    () => sortProveedoresContiguosPorGrupo(contratados),
    [contratados],
  );

  return (
    <ClienteAccordionSection
      title={t.providersTitle}
      summary={t.providersSubtitle(contratados.length)}
    >
      {proveedoresOrdenados.length === 0 ? (
        <p className="rounded-xl border border-dashed border-bloom-border bg-bloom-canvas/50 px-5 py-12 text-center text-sm text-bloom-muted">
          {t.providersEmpty}
        </p>
      ) : (
        <ul className="space-y-4">
          {proveedoresOrdenados.map((provider) => (
            <ClienteProveedorAccordionItem
              key={provider.id}
              provider={provider}
              allProviders={proveedoresOrdenados}
              pagos={pagosByProveedor[provider.id] ?? []}
              pagosByProveedor={pagosByProveedor}
              copPorUsd={effectiveCopPorUsd}
            />
          ))}
        </ul>
      )}
    </ClienteAccordionSection>
  );
}

type ClienteProveedorAccordionItemProps = {
  provider: ProveedorRow;
  allProviders: ProveedorRow[];
  pagos: PagoRow[];
  pagosByProveedor: Record<string, PagoRow[]>;
  copPorUsd: number | null;
};

function ClienteProveedorAccordionItem({
  provider,
  allProviders,
  pagos,
  pagosByProveedor,
  copPorUsd,
}: ClienteProveedorAccordionItemProps) {
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const { locale, t } = useClienteLocale();

  const esPrimarioGrupo = isProveedorGrupoPrimario(allProviders, provider);
  const esSecundarioGrupo = !esPrimarioGrupo && Boolean(provider.grupo_id);
  const categoriasCompaneras = getProveedorGrupoCategoriasCompaneras(
    allProviders,
    provider,
  );
  const primaryId = provider.grupo_id
    ? getProveedorGrupoPrimaryId(allProviders, provider.grupo_id)
    : provider.id;
  const primaryProvider =
    primaryId != null
      ? (allProviders.find((p) => p.id === primaryId) ?? provider)
      : provider;
  const pagosParaSaldo = esPrimarioGrupo
    ? pagos
    : (pagosByProveedor[primaryProvider.id] ?? []);
  const saldo = getProviderSaldoPendienteConPagos(
    primaryProvider,
    pagosParaSaldo,
  );
  const sinCosto = isProveedorSinCosto(provider);
  const pagosHistorial =
    sinCosto || !esPrimarioGrupo
      ? []
      : [...buildPagosConAnticipo(provider, pagos)].sort(
          (a, b) =>
            new Date(a.fecha_pago).getTime() - new Date(b.fecha_pago).getTime(),
        );
  const titular = provider.titular_cuenta?.trim() || provider.nombre;
  const descripcion = provider.descripcion_servicio?.trim();
  const depositoMonto = esPrimarioGrupo
    ? getDepositoReembolsableMonto(provider)
    : 0;
  const showDeposito = hasDepositoReembolsable(provider) && esPrimarioGrupo;
  const categoriaLabel = getClienteCronogramaCategoriaLabel(
    provider.categoria,
    locale,
  );
  const companerasLabel = categoriasCompaneras
    .map((cat) => getClienteCronogramaCategoriaLabel(cat, locale))
    .join(", ");
  const incluidoEnLabel = esSecundarioGrupo
    ? t.includedInProvider(
        primaryProvider.nombre.trim().toLowerCase() ===
          provider.nombre.trim().toLowerCase()
          ? `${primaryProvider.nombre} (${getClienteCronogramaCategoriaLabel(primaryProvider.categoria, locale)})`
          : primaryProvider.nombre,
      )
    : null;

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
          <span className="min-w-0 flex-1 overflow-hidden">
            <span className="block min-w-0 truncate font-display text-xl text-bloom-ink">
              {provider.nombre}
            </span>
            <span className="mt-0.5 flex flex-wrap items-center gap-2 text-sm text-bloom-muted">
              <span>{categoriaLabel}</span>
              {sinCosto ? (
                <span className="inline-flex rounded-full bg-sky-100 px-2 py-0.5 text-xs font-medium text-sky-800">
                  {t.noCostBadge}
                </span>
              ) : null}
            </span>
            {incluidoEnLabel ? (
              <span
                className="mt-1 block truncate text-xs text-bloom-muted"
                title={incluidoEnLabel}
              >
                {incluidoEnLabel}
              </span>
            ) : categoriasCompaneras.length > 0 ? (
              <span className="mt-1 block text-xs text-bloom-muted/90">
                {t.sharedPriceWith(companerasLabel)}
              </span>
            ) : null}
          </span>
          <ClienteAccordionChevron open={open} />
        </span>

        {sinCosto || esSecundarioGrupo ? null : (
          <div className="space-y-3">
            <div className="grid gap-3 text-sm sm:grid-cols-3">
              <SummaryItem
                label={t.contractedValue}
                value={formatClienteProveedorValue(
                  provider.valor_total,
                  locale,
                  copPorUsd,
                )}
              />
              <SummaryItem
                label={t.pendingBalance}
                value={formatClienteProveedorValue(
                  hasProveedorValorDefinido(provider.valor_total)
                    ? saldo
                    : null,
                  locale,
                  copPorUsd,
                )}
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
            {showDeposito ? (
              <p className="text-sm font-medium text-sky-800">
                {t.refundableDeposit(
                  appendUsdApprox(
                    formatCurrency(depositoMonto),
                    depositoMonto,
                    copPorUsd,
                  ),
                )}
              </p>
            ) : null}
          </div>
        )}
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
            {!sinCosto && esPrimarioGrupo ? (
              <PaymentHistory pagosHistorial={pagosHistorial} t={t} />
            ) : null}
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
  t,
}: {
  pagosHistorial: ReturnType<typeof buildPagosConAnticipo>;
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
                  {formatCurrency(pago.monto)}
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
