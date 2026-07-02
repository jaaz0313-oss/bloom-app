"use client";

import { useMemo, useState } from "react";
import { WhatsAppLocaleToggle } from "@/app/components/ui/WhatsAppLocaleToggle";
import {
  buildProveedorContratadoGrupoMessage,
  buildProveedorContratadoProveedorMessage,
} from "@/lib/proveedor-contratacion-whatsapp";
import type { CotizacionBodaContext } from "@/lib/proveedor-cotizacion";
import { buildGrupoWhatsAppUrl, buildWhatsAppUrl } from "@/lib/whatsapp";
import type { WhatsAppLocale } from "@/lib/whatsapp-locale";

type ProviderContratadoConfirmacionModalProps = {
  boda: CotizacionBodaContext;
  nombreProveedor: string;
  categoria: string;
  descripcionServicio?: string | null;
  valorTotal?: number | null;
  telefonoProveedor: string | null;
  onClose: () => void;
};

export function ProviderContratadoConfirmacionModal({
  boda,
  nombreProveedor,
  categoria,
  descripcionServicio,
  valorTotal,
  telefonoProveedor,
  onClose,
}: ProviderContratadoConfirmacionModalProps) {
  const [copiedNovios, setCopiedNovios] = useState(false);
  const [copiedProveedor, setCopiedProveedor] = useState(false);
  const [locale, setLocale] = useState<WhatsAppLocale>("es");

  const mensajeNovios = useMemo(
    () =>
      buildProveedorContratadoGrupoMessage(
        boda,
        nombreProveedor,
        categoria,
        locale,
        descripcionServicio,
        valorTotal,
      ),
    [boda, nombreProveedor, categoria, locale, descripcionServicio, valorTotal],
  );

  const mensajeProveedor = useMemo(
    () =>
      buildProveedorContratadoProveedorMessage(
        boda,
        nombreProveedor,
        locale,
        descripcionServicio,
        valorTotal,
      ),
    [boda, nombreProveedor, locale, descripcionServicio, valorTotal],
  );

  const grupoWhatsappUrl = useMemo(() => {
    const link = boda.whatsappGrupoLink?.trim();
    if (!link) return null;
    return buildGrupoWhatsAppUrl(link, mensajeNovios);
  }, [boda.whatsappGrupoLink, mensajeNovios]);

  const proveedorWhatsappUrl = useMemo(() => {
    const telefono = telefonoProveedor?.trim();
    if (!telefono) return null;
    return buildWhatsAppUrl(telefono, mensajeProveedor);
  }, [telefonoProveedor, mensajeProveedor]);

  async function handleCopy(text: string, target: "novios" | "proveedor") {
    try {
      await navigator.clipboard.writeText(text);
      if (target === "novios") {
        setCopiedNovios(true);
        window.setTimeout(() => setCopiedNovios(false), 2000);
      } else {
        setCopiedProveedor(true);
        window.setTimeout(() => setCopiedProveedor(false), 2000);
      }
    } catch {
      /* clipboard no disponible */
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Proveedor contratado"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-bloom-border bg-bloom-surface p-6 shadow-lg">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="font-display text-xl text-bloom-ink">
              Proveedor contratado
            </h2>
            <p className="mt-1 text-sm text-bloom-muted">
              {nombreProveedor} · {categoria}
            </p>
          </div>
          <button
            type="button"
            className="rounded-full p-2 text-bloom-muted transition-colors hover:bg-bloom-border hover:text-bloom-ink"
            onClick={onClose}
            aria-label="Cerrar"
          >
            <XIcon />
          </button>
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-bloom-muted">
            Comparte estos mensajes con los novios y el proveedor.
          </p>
          <WhatsAppLocaleToggle locale={locale} onChange={setLocale} />
        </div>

        <div className="mt-5 space-y-6">
          <WhatsAppMessageSection
            title="Mensaje a los novios"
            message={mensajeNovios}
            copied={copiedNovios}
            onCopy={() => handleCopy(mensajeNovios, "novios")}
            whatsappUrl={grupoWhatsappUrl}
            openButtonLabel="Abrir grupo WhatsApp"
            missingContactHint="Agrega el link del grupo de WhatsApp en la información de clientes."
          />

          <WhatsAppMessageSection
            title="Mensaje al proveedor"
            message={mensajeProveedor}
            copied={copiedProveedor}
            onCopy={() => handleCopy(mensajeProveedor, "proveedor")}
            whatsappUrl={proveedorWhatsappUrl}
            openButtonLabel="Abrir WhatsApp proveedor"
            missingContactHint="Registra el teléfono del proveedor en su ficha."
          />
        </div>

        <div className="mt-6 flex justify-end border-t border-bloom-border pt-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-full bg-bloom-accent px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-bloom-accent-hover"
          >
            Listo
          </button>
        </div>
      </div>
    </div>
  );
}

function WhatsAppMessageSection({
  title,
  message,
  copied,
  onCopy,
  whatsappUrl,
  openButtonLabel,
  missingContactHint,
}: {
  title: string;
  message: string;
  copied: boolean;
  onCopy: () => void;
  whatsappUrl: string | null;
  openButtonLabel: string;
  missingContactHint: string;
}) {
  return (
    <section>
      <h3 className="text-sm font-semibold text-bloom-ink">{title}</h3>
      <pre className="mt-2 whitespace-pre-wrap rounded-xl border border-bloom-border bg-bloom-canvas/80 p-3 text-sm text-bloom-ink">
        {message}
      </pre>
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={onCopy}
          className="rounded-full border border-bloom-border px-4 py-2 text-sm font-medium text-bloom-ink transition-colors hover:bg-bloom-canvas"
        >
          {copied ? "Copiado" : "Copiar"}
        </button>
        {whatsappUrl ? (
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex rounded-full bg-green-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-green-700"
          >
            {openButtonLabel}
          </a>
        ) : (
          <p className="self-center text-xs text-bloom-muted">{missingContactHint}</p>
        )}
      </div>
    </section>
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
