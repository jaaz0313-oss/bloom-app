"use client";

import { useId, useState } from "react";
import {
  ClienteAccordionChevron,
  ClienteAccordionSection,
} from "@/app/components/cliente/ClienteAccordionSection";
import { useClienteLocale } from "@/app/components/cliente/ClienteLocaleProvider";
import {
  CLIENTE_PAGO_URGENCY_CARD_STYLES,
  CLIENTE_PAGO_URGENCY_STYLES,
  countClientePagosUrgentes,
  type ClientePagoPendiente,
} from "@/lib/cliente-pagos";
import { formatCurrency, formatShortDateStable } from "@/lib/format";
import { getClientePagoUrgencyLabel } from "@/lib/cliente-i18n";

type ClienteProximosPagosProps = {
  pagosPendientes: ClientePagoPendiente[];
};

export function ClienteProximosPagos({
  pagosPendientes,
}: ClienteProximosPagosProps) {
  const { t } = useClienteLocale();

  if (pagosPendientes.length === 0) return null;

  const urgentCount = countClientePagosUrgentes(pagosPendientes);

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
      {urgentCount > 0 && (
        <div
          className="mb-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-900"
          role="alert"
        >
          {t.upcomingPaymentsUrgentBanner(urgentCount)}
        </div>
      )}

      <ul className="space-y-4">
        {pagosPendientes.map((item) => (
          <ProximoPagoAccordionItem key={item.proveedor.id} item={item} />
        ))}
      </ul>
    </ClienteAccordionSection>
  );
}

function ProximoPagoAccordionItem({ item }: { item: ClientePagoPendiente }) {
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const { locale, t } = useClienteLocale();
  const { proveedor, saldoPendiente, fechaLimite, urgency } = item;

  const titular = proveedor.titular_cuenta?.trim() || "";
  const documentoNit = proveedor.documento_nit?.trim() || "";
  const banco = proveedor.banco?.trim() || "";
  const tipoCuenta = proveedor.tipo_cuenta?.trim() || "";
  const numeroCuenta = proveedor.numero_cuenta?.trim() || "";
  const direccion = proveedor.direccion?.trim() || "";
  const telefono = proveedor.telefono?.trim() || "";
  const email = proveedor.email?.trim() || "";
  const showSwift = Boolean(banco || numeroCuenta);

  const transferFields: Array<{ label: string; value: string; mono?: boolean }> =
    [
      titular ? { label: t.accountHolder, value: titular } : null,
      documentoNit ? { label: t.documentNit, value: documentoNit } : null,
      banco ? { label: t.bank, value: banco } : null,
      tipoCuenta ? { label: t.accountType, value: tipoCuenta } : null,
      numeroCuenta
        ? { label: t.accountNumber, value: numeroCuenta, mono: true }
        : null,
      direccion ? { label: t.address, value: direccion } : null,
      telefono ? { label: t.phone, value: telefono } : null,
      showSwift
        ? { label: t.swiftCode, value: "COLOCOBM", mono: true }
        : null,
      email ? { label: t.email, value: email } : null,
    ].filter(
      (field): field is { label: string; value: string; mono?: boolean } =>
        field != null,
    );

  const cardUrgencyClass = urgency
    ? CLIENTE_PAGO_URGENCY_CARD_STYLES[urgency]
    : "border-bloom-border/80";

  return (
    <li
      className={`overflow-hidden rounded-xl border bg-bloom-canvas/30 ${cardUrgencyClass}`}
    >
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
              {proveedor.nombre}
            </span>
          </span>
          <span className="flex shrink-0 items-center gap-2">
            {urgency ? (
              <span
                className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium ${CLIENTE_PAGO_URGENCY_STYLES[urgency]}`}
              >
                {getClientePagoUrgencyLabel(urgency, locale)}
              </span>
            ) : null}
            <ClienteAccordionChevron open={open} />
          </span>
        </span>

        <div className="grid gap-3 text-sm sm:grid-cols-2">
          <SummaryItem
            label={t.pendingAmount}
            value={formatCurrency(saldoPendiente)}
            emphasized
          />
          <SummaryItem
            label={t.paymentDueDate}
            value={
              fechaLimite
                ? formatShortDateStable(fechaLimite)
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
            <p className="text-sm text-bloom-muted">{proveedor.categoria}</p>

            {transferFields.length > 0 ? (
              <div>
                <p className="text-xs font-medium uppercase tracking-[0.12em] text-bloom-muted">
                  {t.transferDetails}
                </p>
                <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
                  {transferFields.map((field) => (
                    <BankField
                      key={field.label}
                      label={field.label}
                      value={field.value}
                      mono={field.mono}
                    />
                  ))}
                </dl>
              </div>
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
    <div className="rounded-xl border border-bloom-border/80 bg-bloom-surface/90 px-4 py-3">
      <dt className="text-xs text-bloom-muted">{label}</dt>
      <dd
        className={`mt-1 font-medium text-bloom-ink ${mono ? "font-mono text-[0.9375rem]" : ""}`}
      >
        {value}
      </dd>
    </div>
  );
}
