"use client";

import { useMemo, useState } from "react";
import type { CitaRow } from "@/app/data/citas";
import {
  buildCitaRecordatorioClienteWhatsAppMessageFromCita,
  buildCitaRecordatorioProveedorWhatsAppMessageFromCita,
  getCitaClienteWhatsAppUrl,
  getCitaWhatsAppUrl,
  getProveedorTelefonoForCita,
  isCitaActiva,
  type CitaWhatsAppLookupContext,
} from "@/lib/citas";
import { CitaListItem } from "./CitaListItem";

type CitaHoyItemProps = {
  cita: CitaRow;
  context: CitaWhatsAppLookupContext;
};

export function CitaHoyItem({ cita, context }: CitaHoyItemProps) {
  const [copiedTarget, setCopiedTarget] = useState<"cliente" | "proveedor" | null>(
    null,
  );

  const activa = isCitaActiva(cita.estado);
  const esReunionProveedor = cita.tipo === "reunion_proveedor";

  const clienteMessage = useMemo(() => {
    if (!activa) return null;
    return buildCitaRecordatorioClienteWhatsAppMessageFromCita(cita, context);
  }, [activa, cita, context]);

  const proveedorMessage = useMemo(() => {
    if (!activa || !esReunionProveedor) return null;
    return buildCitaRecordatorioProveedorWhatsAppMessageFromCita(cita, context);
  }, [activa, cita, context, esReunionProveedor]);

  const clienteWhatsappUrl = useMemo(() => {
    if (!clienteMessage) return null;
    return getCitaClienteWhatsAppUrl(cita, clienteMessage, context.bodasById);
  }, [cita, clienteMessage, context.bodasById]);

  const proveedorWhatsappUrl = useMemo(() => {
    if (!proveedorMessage) return null;
    const telefono = getProveedorTelefonoForCita(cita, context.proveedoresById);
    return getCitaWhatsAppUrl(telefono, proveedorMessage);
  }, [cita, proveedorMessage, context.proveedoresById]);

  async function handleCopy(
    message: string,
    target: "cliente" | "proveedor",
  ) {
    try {
      await navigator.clipboard.writeText(message);
      setCopiedTarget(target);
      window.setTimeout(() => setCopiedTarget(null), 2000);
    } catch {
      /* clipboard no disponible */
    }
  }

  return (
    <div className="space-y-2">
      <CitaListItem
        cita={cita}
        bodasById={context.bodasById}
        leadsById={context.leadsById}
        compact
      />

      {activa && (clienteMessage || proveedorMessage) && (
        <div className="flex flex-wrap gap-2 pl-1">
          {clienteMessage && (
            <RecordatorioActions
              label="Recordatorio cliente"
              whatsappUrl={clienteWhatsappUrl}
              copied={copiedTarget === "cliente"}
              onCopy={() => handleCopy(clienteMessage, "cliente")}
            />
          )}
          {proveedorMessage && (
            <RecordatorioActions
              label="Recordatorio proveedor"
              whatsappUrl={proveedorWhatsappUrl}
              copied={copiedTarget === "proveedor"}
              onCopy={() => handleCopy(proveedorMessage, "proveedor")}
            />
          )}
        </div>
      )}
    </div>
  );
}

function RecordatorioActions({
  label,
  whatsappUrl,
  copied,
  onCopy,
}: {
  label: string;
  whatsappUrl: string | null;
  copied: boolean;
  onCopy: () => void;
}) {
  return (
    <div className="inline-flex flex-wrap items-center gap-1.5 rounded-full border border-bloom-border bg-bloom-surface px-2 py-1">
      <span className="px-1 text-[11px] font-medium text-bloom-muted">{label}</span>
      <button
        type="button"
        onClick={onCopy}
        className="rounded-full px-2 py-0.5 text-[11px] font-medium text-bloom-ink hover:bg-bloom-canvas"
      >
        {copied ? "Copiado" : "Copiar"}
      </button>
      {whatsappUrl ? (
        <a
          href={whatsappUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-full bg-green-600 px-2 py-0.5 text-[11px] font-medium text-white hover:bg-green-700"
        >
          WhatsApp
        </a>
      ) : (
        <span className="px-1 text-[10px] text-bloom-muted">Sin grupo ni teléfono</span>
      )}
    </div>
  );
}
