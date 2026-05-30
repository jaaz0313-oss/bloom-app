"use client";

import { useMemo, useState } from "react";
import type { CitaRow } from "@/app/data/citas";
import type { CitaInvolvedEmail } from "@/lib/cita-emails";
import {
  buildCitaConfirmacionWhatsAppMessageFromCita,
  formatCitaHorario,
  getCitaWhatsAppUrl,
  getClienteInfoForCita,
  normalizeCitaFecha,
} from "@/lib/citas";
import { formatLongDateStable } from "@/lib/format";
import type { CitaLookupBoda, CitaLookupLead } from "./cita-lookup";

type CitaCreadaConfirmacionProps = {
  cita: CitaRow;
  involvedEmails: CitaInvolvedEmail[];
  bodasById: Record<string, CitaLookupBoda>;
  leadsById: Record<string, CitaLookupLead>;
  onClose: () => void;
  resumenTitle?: string;
  whatsappSectionTitle?: string;
  whatsappMessageOverride?: string | null;
  showEmailsSection?: boolean;
};

export function CitaCreadaConfirmacion({
  cita,
  involvedEmails,
  bodasById,
  leadsById,
  onClose,
  resumenTitle = "Resumen de la cita",
  whatsappSectionTitle = "Mensaje para el cliente (WhatsApp)",
  whatsappMessageOverride,
  showEmailsSection = true,
}: CitaCreadaConfirmacionProps) {
  const [copiedMessage, setCopiedMessage] = useState(false);
  const [copiedEmails, setCopiedEmails] = useState(false);

  const fechaLabel = formatLongDateStable(normalizeCitaFecha(cita.fecha));
  const horarioLabel = formatCitaHorario(cita);

  const whatsappMessage = useMemo(() => {
    if (whatsappMessageOverride !== undefined) {
      return whatsappMessageOverride;
    }
    if (!cita.boda_id && !cita.lead_id) return null;
    return buildCitaConfirmacionWhatsAppMessageFromCita(cita, {
      bodasById,
      leadsById,
    });
  }, [cita, bodasById, leadsById, whatsappMessageOverride]);

  const whatsappUrl = useMemo(() => {
    if (!whatsappMessage) return null;
    const cliente = getClienteInfoForCita(cita, bodasById, leadsById);
    return getCitaWhatsAppUrl(cliente?.telefono, whatsappMessage);
  }, [cita, whatsappMessage, bodasById, leadsById]);

  const meetLink = cita.link_meet?.trim() || null;

  async function handleCopyMessage() {
    if (!whatsappMessage) return;
    try {
      await navigator.clipboard.writeText(whatsappMessage);
      setCopiedMessage(true);
      window.setTimeout(() => setCopiedMessage(false), 2000);
    } catch {
      /* clipboard no disponible */
    }
  }

  async function handleCopyEmails() {
    if (involvedEmails.length === 0) return;
    try {
      await navigator.clipboard.writeText(
        involvedEmails.map((e) => e.email).join(", "),
      );
      setCopiedEmails(true);
      window.setTimeout(() => setCopiedEmails(false), 2000);
    } catch {
      /* clipboard no disponible */
    }
  }

  return (
    <div className="mt-5 space-y-6">
      {/* 1. Resumen */}
      <section className="rounded-xl border border-bloom-border bg-bloom-canvas/60 p-4">
        <h4 className="text-sm font-semibold text-bloom-ink">Resumen de la cita</h4>
        <dl className="mt-3 space-y-2 text-sm">
          <div>
            <dt className="text-bloom-muted">Título</dt>
            <dd className="font-medium text-bloom-ink">{cita.titulo}</dd>
          </div>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <div>
              <dt className="text-bloom-muted">Fecha</dt>
              <dd className="font-medium text-bloom-ink">{fechaLabel}</dd>
            </div>
            <div>
              <dt className="text-bloom-muted">Hora</dt>
              <dd className="font-medium text-bloom-ink">{horarioLabel}</dd>
            </div>
          </div>
          {cita.lugar?.trim() && (
            <div>
              <dt className="text-bloom-muted">Lugar</dt>
              <dd className="font-medium text-bloom-ink">{cita.lugar.trim()}</dd>
            </div>
          )}
          {meetLink && (
            <div>
              <dt className="text-bloom-muted">Link de Meet</dt>
              <dd className="break-all font-medium text-bloom-accent">
                <a
                  href={meetLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:underline"
                >
                  {meetLink}
                </a>
              </dd>
            </div>
          )}
        </dl>
      </section>

      {/* 2. WhatsApp */}
      <section>
        <h4 className="text-sm font-semibold text-bloom-ink">
          {whatsappSectionTitle}
        </h4>
        {whatsappMessage ? (
          <>
            <pre className="mt-2 whitespace-pre-wrap rounded-xl border border-bloom-border bg-bloom-canvas/80 p-3 text-sm text-bloom-ink">
              {whatsappMessage}
            </pre>
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={handleCopyMessage}
                className="rounded-full border border-bloom-border px-4 py-2 text-sm font-medium text-bloom-ink hover:bg-bloom-canvas"
              >
                {copiedMessage ? "Copiado" : "Copiar mensaje"}
              </button>
              {whatsappUrl ? (
                <a
                  href={whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex rounded-full bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700"
                >
                  Abrir WhatsApp
                </a>
              ) : (
                <p className="self-center text-xs text-bloom-muted">
                  Sin teléfono del cliente registrado en la boda
                </p>
              )}
            </div>
          </>
        ) : (
          <p className="mt-2 text-sm text-bloom-muted">
            Vincula la cita a una boda o lead para generar el mensaje al cliente.
          </p>
        )}
      </section>

      {showEmailsSection && (
      <section>
        <h4 className="text-sm font-semibold text-bloom-ink">
          Emails para el invite de Meet
        </h4>
        <p className="mt-1 text-xs text-bloom-muted">
          Equipo, novios y proveedor (si aplica). Cópialos al crear la reunión en
          Google Meet o Calendar.
        </p>
        {involvedEmails.length > 0 ? (
          <>
            <ul className="mt-3 space-y-2 rounded-xl border border-bloom-border bg-bloom-canvas/80 p-3">
              {involvedEmails.map((entry) => (
                <li
                  key={`${entry.label}-${entry.email}`}
                  className="flex flex-col gap-0.5 text-sm sm:flex-row sm:items-center sm:justify-between"
                >
                  <span className="text-bloom-muted">{entry.label}</span>
                  <span className="font-medium text-bloom-ink">{entry.email}</span>
                </li>
              ))}
            </ul>
            <button
              type="button"
              onClick={handleCopyEmails}
              className="mt-3 rounded-full border border-bloom-border px-4 py-2 text-sm font-medium text-bloom-ink hover:bg-bloom-canvas"
            >
              {copiedEmails ? "Correos copiados" : "Copiar todos los correos"}
            </button>
          </>
        ) : (
          <p className="mt-2 text-sm text-bloom-muted">
            No hay correos registrados para esta cita.
          </p>
        )}
      </section>
      )}

      {/* Acciones finales */}
      <div className="flex flex-wrap gap-2 border-t border-bloom-border pt-4">
        {meetLink && (
          <a
            href={meetLink}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex rounded-full border border-bloom-accent bg-bloom-accent/10 px-4 py-2 text-sm font-medium text-bloom-accent hover:bg-bloom-accent/20"
          >
            Abrir Meet
          </a>
        )}
        <button
          type="button"
          onClick={onClose}
          className="rounded-full bg-bloom-accent px-5 py-2 text-sm font-medium text-white hover:bg-bloom-accent-hover"
        >
          Listo
        </button>
      </div>
    </div>
  );
}
