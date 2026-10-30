"use client";

import { useEffect, useRef, useState } from "react";
import { ClienteAccordionSection } from "@/app/components/cliente/ClienteAccordionSection";
import { useClienteLocale } from "@/app/components/cliente/ClienteLocaleProvider";
import { PROVIDER_STATUS_STYLES } from "@/app/data/providers";
import type { ClienteProveedorTablaFila } from "@/lib/cliente-proveedor-publico";
import {
  getClienteCronogramaCategoriaLabel,
  getClienteProveedorEstadoLabel,
} from "@/lib/cliente-i18n";
import { formatCurrency } from "@/lib/format";
import { formatUsdApprox } from "@/lib/tasa-cambio";

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
  const { t } = useClienteLocale();

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
          <div className="-mx-5 space-y-3 sm:-mx-8 lg:hidden">
            {filas.map((fila) => (
              <ProveedorCard key={fila.id} fila={fila} />
            ))}
          </div>

          <div className="-mx-5 hidden sm:-mx-8 lg:block">
            <table className="w-full table-fixed border-collapse text-left text-sm">
              <colgroup>
                <col className="w-[8.5rem]" />
                <col />
                <col />
                <col className="w-[9.5rem]" />
                <col className="w-[9rem]" />
                <col className="w-[9rem]" />
                <col className="w-[9rem]" />
              </colgroup>
              <thead>
                <tr className="border-b border-bloom-border bg-bloom-canvas/80 text-xs font-medium uppercase tracking-wide text-bloom-muted">
                  <th className="px-3 py-2.5 font-medium">{t.providersColCategory}</th>
                  <th className="px-3 py-2.5 font-medium">{t.providersColName}</th>
                  <th className="px-3 py-2.5 font-medium">{t.providersColDescription}</th>
                  <th className="px-3 py-2.5 font-medium">{t.providersColStatus}</th>
                  <th className="px-2 py-2.5 text-right font-medium">
                    {t.providersColValue}
                  </th>
                  <th className="px-2 py-2.5 text-right font-medium">
                    {t.providersColPaid}
                  </th>
                  <th className="px-2 py-2.5 text-right font-medium">
                    {t.providersColBalance}
                  </th>
                </tr>
              </thead>
              <tbody>
                {filas.map((fila) => (
                  <ProveedorRow key={fila.id} fila={fila} />
                ))}
              </tbody>
            </table>
          </div>

          <dl className="mt-4 grid grid-cols-1 gap-3 border-t border-bloom-border/70 pt-4 text-sm sm:grid-cols-3 sm:gap-3">
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

function ProveedorRow({ fila }: { fila: ClienteProveedorTablaFila }) {
  const { locale } = useClienteLocale();

  return (
    <tr className="border-b border-bloom-border/70 align-top last:border-b-0">
      <td className="px-3 py-2.5 break-words text-bloom-ink">
        {getClienteCronogramaCategoriaLabel(fila.categoria, locale)}
      </td>
      <td className="px-3 py-2.5 break-words font-medium text-bloom-ink">
        {fila.nombre}
      </td>
      <td className="px-3 py-2.5 text-bloom-ink">
        <DescripcionDesktop text={fila.descripcion} />
      </td>
      <td className="px-3 py-2.5">
        <Estado fila={fila} />
      </td>
      <td className="whitespace-nowrap px-2 py-2.5 text-right tabular-nums text-bloom-ink">
        <Money value={fila.valor} />
      </td>
      <td className="whitespace-nowrap px-2 py-2.5 text-right tabular-nums text-bloom-ink">
        <Money value={fila.abonado} />
      </td>
      <td className="whitespace-nowrap px-2 py-2.5 text-right tabular-nums text-bloom-ink">
        <Money value={fila.saldo} />
      </td>
    </tr>
  );
}

function ProveedorCard({ fila }: { fila: ClienteProveedorTablaFila }) {
  const { locale, t } = useClienteLocale();
  const [open, setOpen] = useState(false);
  const descripcion = fila.descripcion?.trim() ?? "";

  return (
    <article className="rounded-xl border border-bloom-border/80 bg-bloom-canvas/40 px-2.5 py-3 sm:px-3">
      <div className="flex items-start justify-between gap-3">
        <p className="min-w-0 text-xs text-bloom-muted">
          {getClienteCronogramaCategoriaLabel(fila.categoria, locale)}
        </p>
        <Estado fila={fila} />
      </div>
      <h3 className="mt-1 font-display text-xl text-bloom-ink">{fila.nombre}</h3>
      <dl className="mt-3 grid grid-cols-3 gap-x-1.5 gap-y-2">
        <CardMoney label={t.providersColValue} value={fila.valor} />
        <CardMoney label={t.providersColPaid} value={fila.abonado} />
        <CardMoney label={t.providersColBalance} value={fila.saldo} />
      </dl>
      {descripcion ? (
        <div className="mt-3 border-t border-bloom-border/60 pt-2">
          <button
            type="button"
            aria-expanded={open}
            onClick={() => setOpen((value) => !value)}
            className="text-xs font-medium text-bloom-accent hover:text-bloom-accent-hover"
          >
            {open ? t.providersVerMenos : t.providersVerDetalle}
          </button>
          {open ? <DescripcionTexto text={descripcion} /> : null}
        </div>
      ) : null}
    </article>
  );
}

function DescripcionDesktop({ text }: { text: string | null }) {
  const { t } = useClienteLocale();
  const trimmed = text?.trim() ?? "";
  const [expanded, setExpanded] = useState(false);
  const [overflows, setOverflows] = useState(false);
  const ref = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || !trimmed || expanded) return;
    const measure = () => {
      if (el.clientWidth === 0) return;
      const full = el.cloneNode(true) as HTMLElement;
      full.style.position = "absolute";
      full.style.visibility = "hidden";
      full.style.pointerEvents = "none";
      full.style.display = "block";
      full.style.width = `${el.clientWidth}px`;
      full.style.height = "auto";
      full.style.maxHeight = "none";
      full.style.overflow = "visible";
      full.style.webkitLineClamp = "unset";
      full.style.webkitBoxOrient = "unset";
      el.parentElement?.appendChild(full);
      const overflowsNow = full.scrollHeight > el.clientHeight + 1;
      full.remove();
      setOverflows(overflowsNow);
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, [trimmed, expanded]);

  if (!trimmed) return <span className="text-bloom-muted">—</span>;

  return (
    <div>
      {expanded ? (
        <DescripcionTexto text={trimmed} />
      ) : (
        <p ref={ref} className="line-clamp-2 whitespace-pre-line break-words">
          {trimmed}
        </p>
      )}
      {overflows ? (
        <button
          type="button"
          aria-expanded={expanded}
          onClick={() => setExpanded((value) => !value)}
          className="mt-1 text-xs font-medium text-bloom-accent hover:text-bloom-accent-hover"
        >
          {expanded ? t.providersVerMenos : t.providersVerMas}
        </button>
      ) : null}
    </div>
  );
}

function DescripcionTexto({ text }: { text: string }) {
  return (
    <p className="mt-1 whitespace-pre-line break-words text-sm leading-relaxed text-bloom-ink">
      {text}
    </p>
  );
}

function Estado({ fila }: { fila: ClienteProveedorTablaFila }) {
  const { t } = useClienteLocale();

  return (
    <span className="flex max-w-[68%] shrink flex-wrap items-center justify-end gap-1.5 lg:max-w-none lg:shrink-0 lg:justify-start">
      <span
        className={`inline-flex max-w-full rounded-full px-2 py-0.5 text-center text-xs font-medium leading-tight whitespace-normal ${PROVIDER_STATUS_STYLES[fila.estado]}`}
      >
        {getClienteProveedorEstadoLabel(fila.estado, t)}
      </span>
      {fila.pagoDirecto ? (
        <span className="text-xs text-bloom-muted">{t.providersPagoDirecto}</span>
      ) : null}
    </span>
  );
}

function Money({ value }: { value: number | null }) {
  if (value == null) return <span className="text-bloom-muted">—</span>;
  return <>{formatCurrency(value)}</>;
}

function CardMoney({ label, value }: { label: string; value: number | null }) {
  return (
    <div className="min-w-0">
      <dt className="text-[11px] text-bloom-muted">{label}</dt>
      <dd className="mt-0.5 whitespace-nowrap text-[clamp(10px,3.1vw,14px)] font-medium leading-tight tracking-tight tabular-nums text-bloom-ink">
        <Money value={value} />
      </dd>
    </div>
  );
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
  const usd = formatUsdApprox(value, copPorUsd);

  return (
    <div className="min-w-0">
      <dt className="text-xs text-bloom-muted sm:text-sm">{label}</dt>
      <dd
        className={
          emphasized
            ? "mt-0.5 text-sm font-medium leading-snug text-bloom-success sm:text-base"
            : "mt-0.5 text-sm font-medium leading-snug text-bloom-ink sm:text-base"
        }
      >
        <span className="block tabular-nums">{formatCurrency(value)}</span>
        {usd ? (
          <span className="mt-0.5 block text-[11px] font-normal leading-tight text-bloom-muted sm:text-xs">
            {usd}
          </span>
        ) : null}
      </dd>
    </div>
  );
}
