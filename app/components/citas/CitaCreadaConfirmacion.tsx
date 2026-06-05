"use client";

import { useEffect, useMemo, useState } from "react";
import { WhatsAppLocaleToggle } from "@/app/components/ui/WhatsAppLocaleToggle";
import type { CitaRow } from "@/app/data/citas";
import type { CitaInvolvedEmail } from "@/lib/cita-emails";
import {
  buildCitaGrupoConfirmacionWhatsAppMessageFromCita,
  buildCitaModificacionWhatsAppMessageFromCita,
  buildCitaProveedorConfirmacionWhatsAppMessageFromCita,
  CITA_WHATSAPP_LOCALE_SESSION_KEY,
  formatCitaHorario,
  getCitaClienteWhatsAppTarget,
  getCitaWhatsAppUrl,
  getProveedorTelefonoForCita,
  normalizeCitaFecha,
  type CitaWhatsAppLocale,
} from "@/lib/citas";
import { formatLongDateStable } from "@/lib/format";
import type { CitaLookupBoda, CitaLookupLead } from "./cita-lookup";

export type CitaCreadaConfirmacionVariant = "created" | "modified" | "updated";

type CitaCreadaConfirmacionProps = {
  cita: CitaRow;
  involvedEmails: CitaInvolvedEmail[];
  bodasById: Record<string, CitaLookupBoda>;
  leadsById: Record<string, CitaLookupLead>;
  onClose: () => void;
  variant?: CitaCreadaConfirmacionVariant;
  proveedorTelefono?: string | null;
  calendarWarning?: string | null;
};

function readStoredLocale(): CitaWhatsAppLocale {
  if (typeof window === "undefined") return "es";
  return sessionStorage.getItem(CITA_WHATSAPP_LOCALE_SESSION_KEY) === "en" ? "en" : "es";
}

function copiarMensaje(texto: string): boolean {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(texto);
      return true;
    }
    const textArea = document.createElement("textarea");
    textArea.value = texto;
    textArea.style.position = "fixed";
    textArea.style.left = "-999999px";
    textArea.style.top = "-999999px";
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    const result = document.execCommand("copy");
    document.body.removeChild(textArea);
    return result;
  } catch (e) {
    console.log("Error al copiar:", e);
    return false;
  }
}

export function CitaCreadaConfirmacion({
  cita,
  involvedEmails,
  bodasById,
  leadsById,
  onClose,
  variant = "created",
  proveedorTelefono = null,
  calendarWarning = null,
}: CitaCreadaConfirmacionProps) {
  const [locale, setLocale] = useState<CitaWhatsAppLocale>("es");
  const [copiedGrupo, setCopiedGrupo] = useState(false);
  const [copiedProveedor, setCopiedProveedor] = useState(false);
  const [copiedModificacion, setCopiedModificacion] = useState(false);
  const [copiedEmails, setCopiedEmails] = useState(false);

  useEffect(() => {
    setLocale(readStoredLocale());
  }, []);

  function handleLocaleChange(next: CitaWhatsAppLocale) {
    setLocale(next);
    sessionStorage.setItem(CITA_WHATSAPP_LOCALE_SESSION_KEY, next);
  }

  const context = useMemo(
    () => ({ bodasById, leadsById }),
    [bodasById, leadsById],
  );

  const fechaLabel = formatLongDateStable(normalizeCitaFecha(cita.fecha));
  const horarioLabel = formatCitaHorario(cita);
  const meetLink =
    cita.google_meet_link?.trim() || cita.link_meet?.trim() || null;
  const esReunionProveedor = cita.tipo === "reunion_proveedor";
  const showWhatsAppSections = variant === "created" || variant === "modified";

  const grupoMessage = useMemo(() => {
    if (variant !== "created") return null;
    return buildCitaGrupoConfirmacionWhatsAppMessageFromCita(cita, context, locale);
  }, [variant, cita, context, locale]);

  const proveedorMessage = useMemo(() => {
    if (variant !== "created" || !esReunionProveedor) return null;
    return buildCitaProveedorConfirmacionWhatsAppMessageFromCita(cita, context, locale);
  }, [variant, cita, context, esReunionProveedor, locale]);

  const modificacionMessage = useMemo(() => {
    if (variant !== "modified") return null;
    return buildCitaModificacionWhatsAppMessageFromCita(cita, context, locale);
  }, [variant, cita, context, locale]);

  const grupoWhatsappTarget = useMemo(() => {
    if (!grupoMessage) return null;
    return getCitaClienteWhatsAppTarget(cita, grupoMessage, bodasById);
  }, [cita, grupoMessage, bodasById]);

  const proveedorWhatsappTarget = useMemo(() => {
    if (!proveedorMessage) return null;
    const telefono =
      proveedorTelefono?.trim() ||
      getProveedorTelefonoForCita(cita, undefined);
    const url = getCitaWhatsAppUrl(telefono, proveedorMessage);
    if (!url) return null;
    return { url, copyMessageBeforeOpen: false };
  }, [cita, proveedorMessage, proveedorTelefono]);

  const modificacionWhatsappTarget = useMemo(() => {
    if (!modificacionMessage) return null;
    return getCitaClienteWhatsAppTarget(cita, modificacionMessage, bodasById);
  }, [cita, modificacionMessage, bodasById]);

  function handleCopy(text: string, target: "grupo" | "proveedor" | "modificacion") {
    if (!copiarMensaje(text)) return;

    if (target === "grupo") {
      setCopiedGrupo(true);
      window.setTimeout(() => setCopiedGrupo(false), 2000);
    } else if (target === "proveedor") {
      setCopiedProveedor(true);
      window.setTimeout(() => setCopiedProveedor(false), 2000);
    } else {
      setCopiedModificacion(true);
      window.setTimeout(() => setCopiedModificacion(false), 2000);
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
      {calendarWarning && (
        <p
          className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900"
          role="status"
        >
          {calendarWarning} La cita se guardó correctamente en Bloom.
        </p>
      )}

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

      {showWhatsAppSections && (
        <section className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium text-bloom-muted">
            Idioma del mensaje
          </span>
          <WhatsAppLocaleToggle locale={locale} onChange={handleLocaleChange} />
        </section>
      )}

      {/* 2. Grupo WhatsApp (creación) */}
      {variant === "created" && grupoMessage && (
        <WhatsAppMessageSection
          title="Mensaje para el grupo de WhatsApp de la boda"
          message={grupoMessage}
          copied={copiedGrupo}
          onCopy={() => handleCopy(grupoMessage, "grupo")}
          whatsappTarget={grupoWhatsappTarget}
          openButtonLabel="Abrir grupo WhatsApp"
          missingContactHint="Sin grupo de WhatsApp ni teléfono de la novia registrado en la boda"
        />
      )}

      {/* 3. Proveedor (creación + reunion_proveedor) */}
      {variant === "created" && proveedorMessage && (
        <WhatsAppMessageSection
          title="Mensaje para el proveedor"
          message={proveedorMessage}
          copied={copiedProveedor}
          onCopy={() => handleCopy(proveedorMessage, "proveedor")}
          whatsappTarget={proveedorWhatsappTarget}
          openButtonLabel="Abrir WhatsApp proveedor"
          missingContactHint="Sin teléfono del proveedor registrado"
        />
      )}

      {/* Modificación (edición con cambios de agenda) */}
      {variant === "modified" && (
        <WhatsAppMessageSection
          title="Aviso de cambios al cliente (WhatsApp)"
          message={modificacionMessage}
          copied={copiedModificacion}
          onCopy={() =>
            modificacionMessage && handleCopy(modificacionMessage, "modificacion")
          }
          whatsappTarget={modificacionWhatsappTarget}
          openButtonLabel="Abrir WhatsApp"
          missingContactHint="Sin grupo de WhatsApp ni teléfono de la novia registrado"
          emptyHint="Vincula la cita a una boda para generar el aviso de cambios."
        />
      )}

      {/* 4. Emails Meet */}
      {variant !== "updated" && (
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

      {/* 5–6. Meet + Listo */}
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

type WhatsAppTarget = {
  url: string;
  copyMessageBeforeOpen: boolean;
};

function WhatsAppMessageSection({
  title,
  message,
  copied,
  onCopy,
  whatsappTarget,
  openButtonLabel,
  missingContactHint,
  emptyHint = "No hay mensaje disponible.",
}: {
  title: string;
  message: string | null;
  copied: boolean;
  onCopy: () => void;
  whatsappTarget: WhatsAppTarget | null;
  openButtonLabel: string;
  missingContactHint: string;
  emptyHint?: string;
}) {
  const [copiado, setCopiado] = useState(false);

  function handleAbrirGrupo() {
    if (!whatsappTarget) return;

    const mensajeTexto = message;
    console.log("Intentando copiar:", mensajeTexto);

    if (!mensajeTexto?.trim()) {
      console.log("Error: mensajeTexto está vacío o undefined");
    } else {
      try {
        if (copiarMensaje(mensajeTexto)) {
          console.log("Copiado exitosamente");
          setCopiado(true);
          setTimeout(() => setCopiado(false), 2000);
        }
      } catch (e) {
        console.log("Error al copiar:", e);
      }
    }

    setTimeout(() => {
      window.open(whatsappTarget.url, "_blank");
    }, 500);
  }

  function handleOpenWhatsApp() {
    if (!whatsappTarget || !message) return;

    if (whatsappTarget.copyMessageBeforeOpen) {
      handleAbrirGrupo();
      return;
    }

    window.open(whatsappTarget.url, "_blank", "noopener,noreferrer");
  }

  return (
    <section>
      <h4 className="text-sm font-semibold text-bloom-ink">{title}</h4>
      {message ? (
        <>
          <pre className="mt-2 whitespace-pre-wrap rounded-xl border border-bloom-border bg-bloom-canvas/80 p-3 text-sm text-bloom-ink">
            {message}
          </pre>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={onCopy}
              className="rounded-full border border-bloom-border px-4 py-2 text-sm font-medium text-bloom-ink hover:bg-bloom-canvas"
            >
              {copied ? "Copiado" : "Copiar mensaje"}
            </button>
            {whatsappTarget ? (
              <button
                type="button"
                onClick={handleOpenWhatsApp}
                className="inline-flex rounded-full bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700"
              >
                {copiado && whatsappTarget.copyMessageBeforeOpen
                  ? "✓ Copiado - abriendo grupo..."
                  : openButtonLabel}
              </button>
            ) : (
              <p className="self-center text-xs text-bloom-muted">{missingContactHint}</p>
            )}
          </div>
          {whatsappTarget?.copyMessageBeforeOpen && (
            <p className="mt-2 text-xs text-bloom-muted">
              Al abrir el grupo, el mensaje se copia al portapapeles para que lo pegues en el chat.
            </p>
          )}
        </>
      ) : (
        <p className="mt-2 text-sm text-bloom-muted">{emptyHint}</p>
      )}
    </section>
  );
}
