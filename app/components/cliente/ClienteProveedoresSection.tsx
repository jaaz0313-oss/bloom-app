"use client";

import { ClienteAccordionSection } from "@/app/components/cliente/ClienteAccordionSection";
import { useClienteLocale } from "@/app/components/cliente/ClienteLocaleProvider";
import type { PagoRow } from "@/app/data/pagos";
import { buildPagosConAnticipo } from "@/app/data/pagos";
import {
  getProviderSaldoPendienteConPagos,
  type ProveedorRow,
} from "@/app/data/providers";
import {
  formatClienteCurrency,
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
  const { locale, t } = useClienteLocale();

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
        <ul className="space-y-6">
          {contratados.map((provider) => {
            const pagos = pagosByProveedor[provider.id] ?? [];
            const saldo = getProviderSaldoPendienteConPagos(provider, pagos);
            const pagosHistorial = [
              ...buildPagosConAnticipo(provider, pagos),
            ].sort(
              (a, b) =>
                new Date(a.fecha_pago).getTime() -
                new Date(b.fecha_pago).getTime(),
            );
            const titular =
              provider.titular_cuenta?.trim() || provider.nombre;

            return (
              <li
                key={provider.id}
                className="overflow-hidden rounded-xl border border-bloom-border/80 bg-bloom-canvas/30"
              >
                <div className="border-b border-bloom-border/60 bg-bloom-surface/80 px-5 py-4 sm:px-6">
                  <h3 className="font-display text-xl text-bloom-ink">
                    {provider.nombre}
                  </h3>
                  <p className="mt-0.5 text-sm text-bloom-muted">
                    {provider.categoria}
                  </p>
                </div>

                <div className="grid gap-5 px-5 py-5 sm:grid-cols-2 sm:px-6">
                  <dl className="space-y-3 text-sm">
                    <div>
                      <dt className="text-bloom-muted">{t.totalValue}</dt>
                      <dd className="font-medium text-bloom-ink">
                        {formatClienteCurrency(provider.valor_total, locale)}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-bloom-muted">{t.pendingBalance}</dt>
                      <dd className="font-semibold text-bloom-ink">
                        {formatClienteCurrency(saldo, locale)}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-bloom-muted">{t.balanceDueDate}</dt>
                      <dd className="font-medium text-bloom-ink">
                        {provider.fecha_saldo
                          ? formatShortDateStable(provider.fecha_saldo)
                          : t.toBeConfirmed}
                      </dd>
                    </div>
                  </dl>

                  <div className="rounded-xl border border-bloom-border/70 bg-bloom-surface/90 p-4">
                    <p className="text-xs font-medium uppercase tracking-[0.12em] text-bloom-muted">
                      {t.transferDetails}
                    </p>
                    <dl className="mt-3 space-y-2 text-sm">
                      <div>
                        <dt className="text-bloom-muted">{t.bank}</dt>
                        <dd className="font-medium text-bloom-ink">
                          {provider.banco || "—"}
                        </dd>
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
                        <dd className="font-medium text-bloom-ink">
                          {titular}
                        </dd>
                      </div>
                    </dl>
                  </div>
                </div>

                <div className="border-t border-bloom-border/60 px-5 py-4 sm:px-6">
                  <h4 className="font-display text-lg text-bloom-ink">
                    {t.paymentHistory}
                  </h4>
                  {pagosHistorial.length === 0 ? (
                    <p className="mt-2 text-sm text-bloom-muted">
                      {t.noPaymentsRecorded}
                    </p>
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
              </li>
            );
          })}
        </ul>
      )}
    </ClienteAccordionSection>
  );
}
