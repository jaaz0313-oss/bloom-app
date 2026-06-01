"use client";

import { useMemo, useState } from "react";
import type { CotizacionItemRow, CotizacionRow } from "@/app/data/cotizaciones";
import type { LeadRow } from "@/app/data/leads";
import {
  buildCotizacionLeadWhatsAppMessage,
  openCotizacionLeadWhatsApp,
} from "@/lib/cotizacion-lead";
import { COTIZACION_ESTADO_LABELS } from "@/app/data/cotizaciones";

type LeadCotizacionShareActionsProps = {
  lead: LeadRow;
  cotizacion: CotizacionRow;
  items: CotizacionItemRow[];
};

export function LeadCotizacionShareActions({
  lead,
  cotizacion,
  items,
}: LeadCotizacionShareActionsProps) {
  const [whatsappWarning, setWhatsappWarning] = useState<string | null>(null);

  const displayItems = useMemo(
    () => items.filter((item) => item.incluido),
    [items],
  );

  const whatsappMessage = useMemo(
    () =>
      buildCotizacionLeadWhatsAppMessage({
        nombreLead: lead.nombre_pareja,
        numeroInvitados:
          cotizacion.numero_invitados ?? lead.cantidad_invitados ?? null,
        fechaEstimada: cotizacion.fecha_estimada ?? lead.fecha_tentativa,
        ciudad: cotizacion.ciudad?.trim() || lead.ciudad,
        items: displayItems,
      }),
    [lead, cotizacion, displayItems],
  );

  function handleWhatsApp() {
    setWhatsappWarning(null);
    const telefono = lead.telefono?.trim();
    if (!telefono) {
      setWhatsappWarning(
        "Este lead no tiene teléfono registrado. Agrégalo en el formulario de edición.",
      );
      return;
    }
    const opened = openCotizacionLeadWhatsApp(telefono, whatsappMessage);
    if (!opened) {
      setWhatsappWarning(
        "No se pudo abrir WhatsApp. Verifica que el teléfono sea válido.",
      );
    }
  }

  if (displayItems.length === 0) return null;

  return (
    <section className="mt-6 rounded-2xl border border-bloom-border bg-bloom-surface p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="font-display text-lg text-bloom-ink">
            Compartir proyección
          </h2>
          <p className="mt-1 text-sm text-bloom-muted">
            Cotización activa · {COTIZACION_ESTADO_LABELS[cotizacion.estado]}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={handleWhatsApp}
            className="inline-flex items-center gap-1.5 rounded-full border border-green-200 bg-green-50 px-4 py-2 text-sm font-medium text-green-800 transition-colors hover:bg-green-100"
          >
            <WhatsAppIcon />
            Enviar por WhatsApp
          </button>
          <a
            href={`/api/leads/${lead.id}/cotizacion-pdf`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-full border border-bloom-border bg-bloom-canvas px-4 py-2 text-sm font-medium text-bloom-ink transition-colors hover:bg-bloom-border"
          >
            <PdfIcon />
            Descargar PDF
          </a>
        </div>
      </div>
      {whatsappWarning && (
        <p
          className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-900"
          role="alert"
        >
          {whatsappWarning}
        </p>
      )}
    </section>
  );
}

function WhatsAppIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="currentColor"
      className="h-4 w-4"
      aria-hidden
    >
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.435 9.884-9.884 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  );
}

function PdfIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 20 20"
      fill="currentColor"
      className="h-4 w-4"
      aria-hidden
    >
      <path
        fillRule="evenodd"
        d="M4 2a1 1 0 0 0-1 1v14a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V7.414a1 1 0 0 0-.293-.707l-4.414-4.414A1 1 0 0 0 11.586 2H4Zm2 5a1 1 0 0 1 1-1h6a1 1 0 1 1 0 2H7a1 1 0 0 1-1-1Zm0 4a1 1 0 0 1 1-1h3a1 1 0 1 1 0 2H7a1 1 0 0 1-1-1Zm0 4a1 1 0 0 1 1-1h2a1 1 0 1 1 0 2H7a1 1 0 0 1-1-1Z"
        clipRule="evenodd"
      />
    </svg>
  );
}
