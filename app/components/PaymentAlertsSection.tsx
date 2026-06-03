"use client";

import type { KeyboardEvent, MouseEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { DashboardAccordionSection } from "@/app/components/DashboardAccordionSection";
import {
  PAYMENT_ALERT_URGENCY_LABELS,
  PAYMENT_ALERT_URGENCY_STYLES,
  type PaymentAlert,
} from "@/app/data/payment-alerts";
import { bodaProveedoresHref } from "@/lib/boda-url";
import { formatCurrency, formatShortDateStable } from "@/lib/format";
import {
  buildPaymentReminderDashboardMessage,
  openPaymentReminderWhatsApp,
} from "@/lib/whatsapp";

type PaymentAlertsSectionProps = {
  alerts: PaymentAlert[];
  canSendWhatsApp?: boolean;
};

export function PaymentAlertsSection({
  alerts,
  canSendWhatsApp = false,
}: PaymentAlertsSectionProps) {
  if (alerts.length === 0) return null;

  return (
    <DashboardAccordionSection
      title="Alertas de pagos"
      count={alerts.length}
      subtitle="Saldos con fecha de vencimiento en los próximos 30 días"
    >
      <ul className="space-y-3">
        {alerts.map((alert) => (
          <PaymentAlertItem
            key={alert.proveedorId}
            alert={alert}
            canSendWhatsApp={canSendWhatsApp}
          />
        ))}
      </ul>
    </DashboardAccordionSection>
  );
}

function PaymentAlertItem({
  alert,
  canSendWhatsApp,
}: {
  alert: PaymentAlert;
  canSendWhatsApp: boolean;
}) {
  const router = useRouter();
  const bodaHref = bodaProveedoresHref(alert.bodaId, alert.proveedorId);

  const hasWhatsAppTarget =
    Boolean(alert.whatsappGrupoLink?.trim()) ||
    Boolean(alert.telefonoNovia?.trim());

  function handleRowClick() {
    router.push(bodaHref);
  }

  function handleSendReminder(e: React.MouseEvent) {
    e.stopPropagation();
    const message = buildPaymentReminderDashboardMessage({
      nombrePareja: alert.nombrePareja,
      nombreProveedor: alert.nombreProveedor,
      saldoPendiente: alert.saldoPendiente,
      fechaSaldo: alert.fechaSaldo,
      banco: alert.banco,
      numeroCuenta: alert.numeroCuenta,
      titularCuenta: alert.titularCuenta,
    });
    openPaymentReminderWhatsApp({
      message,
      whatsappGrupoLink: alert.whatsappGrupoLink,
      telefonoNovia: alert.telefonoNovia,
    });
  }

  return (
    <li>
      <div
        role="button"
        tabIndex={0}
        onClick={handleRowClick}
        onKeyDown={(e: KeyboardEvent) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            handleRowClick();
          }
        }}
        className="block cursor-pointer rounded-xl border border-bloom-border bg-bloom-canvas/50 px-4 py-3 transition-colors hover:bg-bloom-canvas"
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <Link
                href={bodaHref}
                onClick={(e) => e.stopPropagation()}
                className="font-medium text-bloom-ink underline-offset-2 hover:text-bloom-accent hover:underline"
              >
                {alert.nombrePareja}
              </Link>
              <span
                className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${PAYMENT_ALERT_URGENCY_STYLES[alert.urgency]}`}
              >
                {PAYMENT_ALERT_URGENCY_LABELS[alert.urgency]}
              </span>
            </div>
            <p className="mt-1 text-sm text-bloom-muted">
              {alert.nombreProveedor}
            </p>
          </div>

          <dl className="grid grid-cols-2 gap-3 text-sm sm:flex sm:shrink-0 sm:gap-6 sm:text-right">
            <div>
              <dt className="text-bloom-muted">Saldo pendiente</dt>
              <dd className="font-semibold text-bloom-ink">
                {formatCurrency(alert.saldoPendiente)}
              </dd>
            </div>
            <div>
              <dt className="text-bloom-muted">Vence</dt>
              <dd className="font-medium text-bloom-ink">
                {formatShortDateStable(alert.fechaSaldo)}
              </dd>
            </div>
          </dl>
        </div>

        {canSendWhatsApp && (
          <div className="mt-3 flex justify-end border-t border-bloom-border/60 pt-3">
            <button
              type="button"
              onClick={handleSendReminder}
              disabled={!hasWhatsAppTarget}
              title={
                hasWhatsAppTarget
                  ? undefined
                  : "Agrega el grupo de WhatsApp o el teléfono de la novia en la boda"
              }
              className="inline-flex items-center gap-1.5 rounded-full border border-bloom-border bg-bloom-surface px-3 py-1.5 text-xs font-medium text-bloom-ink transition-colors hover:bg-bloom-canvas disabled:cursor-not-allowed disabled:opacity-50"
            >
              <WhatsAppIcon />
              Enviar recordatorio
            </button>
          </div>
        )}
      </div>
    </li>
  );
}

function WhatsAppIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="currentColor"
      className="h-3.5 w-3.5 text-green-700"
      aria-hidden
    >
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.435 9.884-9.884 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  );
}
