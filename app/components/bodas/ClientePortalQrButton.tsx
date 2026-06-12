"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { ResponsiveModal } from "@/app/components/ui/ResponsiveModal";
import { buildClientePortalUrl } from "@/lib/cliente-portal";

type ClientePortalQrButtonProps = {
  bodaId: string;
};

export function ClientePortalQrButton({ bodaId }: ClientePortalQrButtonProps) {
  const [open, setOpen] = useState(false);
  const [portalUrl, setPortalUrl] = useState("");
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!open) return;

    const url = buildClientePortalUrl(window.location.origin, bodaId);
    setPortalUrl(url);
    setCopied(false);
    setError(null);
    setLoading(true);
    setQrDataUrl(null);

    QRCode.toDataURL(url, {
      width: 280,
      margin: 2,
      color: {
        dark: "#2a2622",
        light: "#ffffff",
      },
    })
      .then((dataUrl) => {
        setQrDataUrl(dataUrl);
      })
      .catch(() => {
        setError("No se pudo generar el código QR.");
      })
      .finally(() => {
        setLoading(false);
      });
  }, [open, bodaId]);

  async function handleCopyLink() {
    if (!portalUrl) return;

    try {
      await navigator.clipboard.writeText(portalUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      setError("No se pudo copiar el enlace.");
    }
  }

  function handleDownloadQr() {
    if (!qrDataUrl) return;

    const link = document.createElement("a");
    link.href = qrDataUrl;
    link.download = `portal-cliente-${bodaId}.png`;
    link.click();
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center justify-center gap-2 rounded-full border border-bloom-border bg-bloom-surface px-5 py-2.5 text-sm font-medium text-bloom-ink shadow-sm transition-colors hover:bg-bloom-border focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-bloom-accent"
      >
        📱 Ver QR
      </button>

      <ResponsiveModal
        open={open}
        onClose={() => setOpen(false)}
        title="Portal del cliente"
        subtitle="Comparte el acceso al portal de la boda"
        size="md"
      >
        <div className="space-y-5 text-center">
          <p className="text-sm text-bloom-muted">
            El cliente puede escanear este QR para acceder a su portal.
          </p>

          <div className="flex justify-center">
            {loading ? (
              <div className="flex h-[280px] w-[280px] items-center justify-center rounded-2xl border border-dashed border-bloom-border bg-bloom-canvas text-sm text-bloom-muted">
                Generando QR…
              </div>
            ) : qrDataUrl ? (
              <img
                src={qrDataUrl}
                alt="Código QR del portal del cliente"
                className="h-[280px] w-[280px] rounded-2xl border border-bloom-border bg-white p-3 shadow-sm"
              />
            ) : (
              <div className="flex h-[280px] w-[280px] items-center justify-center rounded-2xl border border-dashed border-bloom-border bg-bloom-canvas text-sm text-bloom-muted">
                QR no disponible
              </div>
            )}
          </div>

          {portalUrl && (
            <div className="rounded-xl border border-bloom-border bg-bloom-canvas/50 px-4 py-3 text-left">
              <p className="text-xs font-medium uppercase tracking-wider text-bloom-muted">
                Enlace del portal
              </p>
              <p className="mt-1 break-all text-sm text-bloom-ink">{portalUrl}</p>
              <button
                type="button"
                onClick={handleCopyLink}
                className="mt-3 rounded-full border border-bloom-border bg-bloom-surface px-4 py-2 text-sm font-medium text-bloom-ink transition-colors hover:bg-bloom-canvas"
              >
                {copied ? "¡Enlace copiado!" : "Copiar enlace"}
              </button>
            </div>
          )}

          {error && (
            <p className="text-sm text-red-700" role="alert">
              {error}
            </p>
          )}
        </div>
        footer={
          <div className="flex justify-end">
            <button
              type="button"
              onClick={handleDownloadQr}
              disabled={!qrDataUrl}
              className="rounded-full bg-bloom-accent px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-bloom-accent-hover disabled:opacity-60"
            >
              Descargar QR
            </button>
          </div>
        }
      </ResponsiveModal>
    </>
  );
}
