"use client";

import { ClienteAccordionSection } from "@/app/components/cliente/ClienteAccordionSection";
import { useClienteLocale } from "@/app/components/cliente/ClienteLocaleProvider";
import { PROVIDER_STATUS_STYLES } from "@/app/data/providers";
import type { ClienteProveedorTablaFila } from "@/lib/cliente-proveedor-publico";
import {
  getClienteCronogramaCategoriaLabel,
  getClienteProveedorEstadoLabel,
} from "@/lib/cliente-i18n";
import { formatCurrency } from "@/lib/format";
import { appendUsdApprox } from "@/lib/tasa-cambio";

type ClienteProveedoresSectionProps = {
  filas: ClienteProveedorTablaFila[];
  totalContratado: number;
  totalAbonado: number;
  saldoPendiente: number;
  copPorUsd?: number | null;
};

export function ClienteProveedoresSection({
  filas,
  totalContratado,
  totalAbonado,
  saldoPendiente,
  copPorUsd = null,
}: ClienteProveedoresSectionProps) {
  const { locale, t } = useClienteLocale();

  return (
    <ClienteAccordionSection
      title={t.providersTitle}
      summary={t.providersSubtitle(filas.length)}
      defaultOpen
    >
      {filas.length === 0 ? (
        <p className="rounded-xl border border-dashed border-bloom-border bg-bloom-canvas/50 px-5 py-12 text-center text-sm text-bloom-muted">
          {t.providersEmpty}
        </p>
      ) : (
        <>
          <div className="-mx-5 overflow-x-auto sm:-mx-8">
            <table className="w-full min-w-[52rem] table-fixed border-collapse text-left text-sm">
              <colgroup>
                <col className="w-[16%]" />
                <col className="w-[16%]" />
                <col />
                <col className="w-[18%]" />
                <col className="w-[7rem]" />
                <col className="w-[7rem]" />
                <col className="w-[7rem]" />
              </colgroup>
              <thead>
                <tr className="border-b border-bloom-border bg-bloom-canvas/80 text-xs font-medium uppercase tracking-wide text-bloom-muted">
                  <th className="px-2 py-2.5">{t.providersColCategory}</th>
                  <th className="px-2 py-2.5">{t.providersColName}</th>
                  <th className="px-2 py-2.5">{t.providersColDescription}</th>
                  <th className="px-2 py-2.5">{t.providersColStatus}</th>
                  <th className="w-[7rem] max-w-[7rem] whitespace-nowrap px-1 py-2.5 text-right">
                    {t.providersColValue}
                  </th>
                  <th className="w-[7rem] max-w-[7rem] whitespace-nowrap px-1 py-2.5 text-right">
                    {t.providersColPaid}
                  </th>
                  <th className="w-[7rem] max-w-[7rem] whitespace-nowrap px-1 py-2.5 text-right">
                    {t.providersColBalance}
                  </th>
                </tr>
              </thead>
              <tbody>
                {filas.map((fila) => (
                  <tr
                    key={fila.id}
                    className="border-b border-bloom-border/70 align-top last:border-b-0"
                  >
                    <td className="px-2 py-2.5 text-bloom-ink">
                      {getClienteCronogramaCategoriaLabel(fila.categoria, locale)}
                    </td>
                    <td className="px-2 py-2.5 font-medium text-bloom-ink">
                      {fila.nombre}
                    </td>
                    <td className="px-2 py-2.5 text-bloom-ink">
                      {fila.descripcion?.trim() ? (
                        <span className="whitespace-pre-wrap break-words">
                          {fila.descripcion.trim()}
                        </span>
                      ) : (
                        <span className="text-bloom-muted">—</span>
                      )}
                    </td>
                    <td className="px-2 py-2.5">
                      <span className="flex flex-wrap items-center gap-1.5">
                        <span
                          className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${PROVIDER_STATUS_STYLES[fila.estado]}`}
                        >
                          {getClienteProveedorEstadoLabel(fila.estado, t)}
                        </span>
                        {fila.pagoDirecto ? (
                          <span className="text-xs text-bloom-muted">
                            {t.providersPagoDirecto}
                          </span>
                        ) : null}
                      </span>
                    </td>
                    <td className="w-[7rem] max-w-[7rem] whitespace-nowrap px-1 py-2.5 text-right tabular-nums text-bloom-ink">
                      <Money value={fila.valor} />
                    </td>
                    <td className="w-[7rem] max-w-[7rem] whitespace-nowrap px-1 py-2.5 text-right tabular-nums text-bloom-ink">
                      <Money value={fila.abonado} />
                    </td>
                    <td className="w-[7rem] max-w-[7rem] whitespace-nowrap px-1 py-2.5 text-right tabular-nums text-bloom-ink">
                      <Money value={fila.saldo} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <dl className="mt-4 grid gap-3 border-t border-bloom-border/70 pt-4 text-sm sm:grid-cols-3">
            <SummaryItem
              label={t.totalContracted}
              value={totalContratado}
              copPorUsd={copPorUsd}
            />
            <SummaryItem
              label={t.providersTableTotalAbonado}
              value={totalAbonado}
              copPorUsd={copPorUsd}
              emphasized
            />
            <SummaryItem
              label={t.pendingBalance}
              value={saldoPendiente}
              copPorUsd={copPorUsd}
            />
          </dl>
        </>
      )}
    </ClienteAccordionSection>
  );
}

function Money({ value }: { value: number | null }) {
  if (value == null) return <span className="text-bloom-muted">—</span>;
  return <>{formatCurrency(value)}</>;
}

function SummaryItem({
  label,
  value,
  copPorUsd,
  emphasized = false,
}: {
  label: string;
  value: number;
  copPorUsd: number | null;
  emphasized?: boolean;
}) {
  return (
    <div>
      <dt className="text-bloom-muted">{label}</dt>
      <dd
        className={
          emphasized
            ? "mt-0.5 font-medium text-bloom-success"
            : "mt-0.5 font-medium text-bloom-ink"
        }
      >
        {appendUsdApprox(formatCurrency(value), value, copPorUsd)}
      </dd>
    </div>
  );
}
