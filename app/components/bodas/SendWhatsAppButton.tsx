"use client";

import { useEffect, useMemo, useState } from "react";
import type { BodaRow } from "@/app/data/weddings";
import type { ProveedorRow } from "@/app/data/providers";
import { loadPlannerSettings } from "@/lib/planner-settings";
import {
  WHATSAPP_TEMPLATES,
  buildWhatsAppMessage,
  buildWhatsAppUrl,
  type WhatsAppRecipient,
  type WhatsAppTemplateId,
} from "@/lib/whatsapp";

type SendWhatsAppButtonProps = {
  boda: BodaRow;
  providers?: ProveedorRow[];
};

const inputClass =
  "w-full rounded-xl border border-bloom-border bg-bloom-canvas px-3 py-2 text-sm text-bloom-ink outline-none ring-0 focus:border-bloom-accent focus:ring-2 focus:ring-bloom-accent/30";

const textareaClass =
  "w-full resize-y rounded-xl border border-bloom-border bg-bloom-canvas px-3 py-2 text-sm text-bloom-ink outline-none ring-0 focus:border-bloom-accent focus:ring-2 focus:ring-bloom-accent/30";

export function SendWhatsAppButton({
  boda,
  providers = [],
}: SendWhatsAppButtonProps) {
  const [open, setOpen] = useState(false);
  const [recipient, setRecipient] = useState<WhatsAppRecipient>("novia");
  const [templateId, setTemplateId] =
    useState<WhatsAppTemplateId>("bienvenida");
  const [customMessage, setCustomMessage] = useState("");
  const [proveedorId, setProveedorId] = useState("");
  const [manualProveedor, setManualProveedor] = useState("");
  const [plannerName, setPlannerName] = useState("");

  const providerOptions = useMemo(() => {
    const contratados = providers.filter((p) => p.estado === "contratado");
    return contratados.length > 0 ? contratados : providers;
  }, [providers]);

  useEffect(() => {
    if (!open) return;
    setPlannerName(loadPlannerSettings().name);
  }, [open]);

  useEffect(() => {
    if (providerOptions.length > 0) {
      setProveedorId((current) =>
        providerOptions.some((p) => p.id === current)
          ? current
          : providerOptions[0].id,
      );
    }
  }, [providerOptions]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open]);

  const telefonoNovia = boda.telefono_novia?.trim() ?? "";
  const telefonoNovio = boda.telefono_novio?.trim() ?? "";

  const selectedPhone =
    recipient === "novia" ? telefonoNovia : telefonoNovio;

  const proveedorNombre = useMemo(() => {
    if (manualProveedor.trim()) return manualProveedor.trim();
    const p = providerOptions.find((row) => row.id === proveedorId);
    return p?.nombre ?? "";
  }, [providerOptions, proveedorId, manualProveedor]);

  const previewMessage = useMemo(
    () =>
      buildWhatsAppMessage(templateId, {
        recipient,
        nombreNovia: boda.nombre_novia,
        nombreNovio: boda.nombre_novio,
        fechaBoda: boda.fecha_boda,
        ciudad: boda.ciudad,
        proveedorNombre,
        customMessage,
        plannerName,
      }),
    [
      templateId,
      recipient,
      boda,
      proveedorNombre,
      customMessage,
      plannerName,
    ],
  );

  const whatsappUrl = buildWhatsAppUrl(selectedPhone, previewMessage);

  function handleOpenWhatsApp() {
    if (!whatsappUrl) return;
    window.open(whatsappUrl, "_blank", "noopener,noreferrer");
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center justify-center gap-2 rounded-full border border-[#25D366] bg-[#25D366]/10 px-5 py-2.5 text-sm font-medium text-[#128C7E] shadow-sm transition-colors hover:bg-[#25D366]/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#25D366]"
      >
        <WhatsAppIcon />
        Enviar WhatsApp
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="whatsapp-modal-title"
          onClick={(e) => {
            if (e.target === e.currentTarget) setOpen(false);
          }}
        >
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-bloom-border bg-bloom-surface p-6 shadow-lg">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2
                  id="whatsapp-modal-title"
                  className="font-display text-xl text-bloom-ink"
                >
                  Enviar WhatsApp
                </h2>
                <p className="mt-1 text-sm text-bloom-muted">
                  Elige destinatario, plantilla y revisa el mensaje antes de
                  enviar.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-full p-2 text-bloom-muted transition-colors hover:bg-bloom-border hover:text-bloom-ink"
                aria-label="Cerrar"
              >
                <XIcon />
              </button>
            </div>

            <div className="mt-5 space-y-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-bloom-ink">
                  Destinatario
                </label>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <RecipientOption
                    label="Novia"
                    phone={telefonoNovia}
                    selected={recipient === "novia"}
                    onSelect={() => setRecipient("novia")}
                  />
                  <RecipientOption
                    label="Novio"
                    phone={telefonoNovio}
                    selected={recipient === "novio"}
                    onSelect={() => setRecipient("novio")}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label
                  htmlFor="whatsapp-template"
                  className="text-sm font-medium text-bloom-ink"
                >
                  Plantilla de mensaje
                </label>
                <select
                  id="whatsapp-template"
                  className={inputClass}
                  value={templateId}
                  onChange={(e) =>
                    setTemplateId(e.target.value as WhatsAppTemplateId)
                  }
                >
                  {WHATSAPP_TEMPLATES.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </div>

              {templateId === "confirmacion_proveedor" && (
                <div className="space-y-1.5">
                  <label
                    htmlFor="whatsapp-proveedor"
                    className="text-sm font-medium text-bloom-ink"
                  >
                    Proveedor
                  </label>
                  {providerOptions.length > 0 ? (
                    <select
                      id="whatsapp-proveedor"
                      className={inputClass}
                      value={proveedorId}
                      onChange={(e) => setProveedorId(e.target.value)}
                    >
                      {providerOptions.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.nombre}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      id="whatsapp-proveedor"
                      className={inputClass}
                      placeholder="Nombre del proveedor"
                      value={manualProveedor}
                      onChange={(e) => setManualProveedor(e.target.value)}
                    />
                  )}
                </div>
              )}

              {templateId === "personalizado" && (
                <div className="space-y-1.5">
                  <label
                    htmlFor="whatsapp-custom"
                    className="text-sm font-medium text-bloom-ink"
                  >
                    Mensaje personalizado
                  </label>
                  <textarea
                    id="whatsapp-custom"
                    rows={4}
                    className={textareaClass}
                    value={customMessage}
                    onChange={(e) => setCustomMessage(e.target.value)}
                    placeholder="Escribe tu mensaje…"
                  />
                </div>
              )}

              <div className="space-y-1.5">
                <p className="text-sm font-medium text-bloom-ink">
                  Vista previa
                </p>
                <div className="rounded-xl border border-bloom-border bg-bloom-canvas px-4 py-3 text-sm whitespace-pre-wrap text-bloom-ink">
                  {previewMessage.trim() || (
                    <span className="text-bloom-muted">
                      El mensaje aparecerá aquí…
                    </span>
                  )}
                </div>
              </div>

              {!selectedPhone && (
                <p className="text-sm text-red-700" role="alert">
                  Agrega el teléfono del destinatario en la información de
                  clientes para poder enviar el mensaje.
                </p>
              )}
            </div>

            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-full border border-bloom-border bg-bloom-surface px-5 py-2.5 text-sm font-medium text-bloom-ink transition-colors hover:bg-bloom-border"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleOpenWhatsApp}
                disabled={!whatsappUrl}
                className="inline-flex items-center justify-center gap-2 rounded-full bg-[#25D366] px-5 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-[#20bd5a] disabled:opacity-60"
              >
                <WhatsAppIcon className="text-white" />
                Abrir WhatsApp
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function RecipientOption({
  label,
  phone,
  selected,
  onSelect,
}: {
  label: string;
  phone: string;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`rounded-xl border px-3 py-2.5 text-left text-sm transition-colors ${
        selected
          ? "border-bloom-accent bg-bloom-accent/10 text-bloom-ink"
          : "border-bloom-border bg-bloom-canvas text-bloom-ink hover:bg-bloom-border/50"
      }`}
    >
      <span className="font-medium">{label}</span>
      <span className="mt-0.5 block text-xs text-bloom-muted">
        {phone || "Sin teléfono registrado"}
      </span>
    </button>
  );
}

function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="currentColor"
      className={`h-5 w-5 ${className ?? ""}`}
      aria-hidden
    >
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.435 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z" />
    </svg>
  );
}

function XIcon() {
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
        d="M4.293 4.293a1 1 0 0 1 1.414 0L10 8.586l4.293-4.293a1 1 0 1 1 1.414 1.414L11.414 10l4.293 4.293a1 1 0 0 1-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 0 1-1.414-1.414L8.586 10 4.293 5.707a1 1 0 0 1 0-1.414z"
        clipRule="evenodd"
      />
    </svg>
  );
}
