"use client";

import { useState } from "react";
import { useClienteLocale } from "@/app/components/cliente/ClienteLocaleProvider";
import { CLIENTE_DOWNLOAD_BUTTON_CLASS } from "@/app/components/cliente/cliente-download-styles";

type ClienteDescargarCotizacionButtonProps = {
  bodaId: string;
  inline?: boolean;
  onError?: (message: string | null) => void;
};

export function ClienteDescargarCotizacionButton({
  bodaId,
  inline = false,
  onError,
}: ClienteDescargarCotizacionButtonProps) {
  const { t } = useClienteLocale();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function reportError(message: string | null) {
    if (inline && onError) {
      onError(message);
    } else {
      setError(message);
    }
  }

  async function handleDownload() {
    setLoading(true);
    reportError(null);

    try {
      const response = await fetch(`/api/cliente/${bodaId}/cotizacion-pdf`);

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as {
          error?: string;
        } | null;
        throw new Error(payload?.error ?? t.downloadQuoteError);
      }

      const blob = await response.blob();
      const disposition = response.headers.get("Content-Disposition");
      const filenameMatch = disposition?.match(/filename="([^"]+)"/);
      const filename = filenameMatch?.[1] ?? "Cotizacion.pdf";

      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = filename;
      anchor.click();
      URL.revokeObjectURL(url);
    } catch (downloadError) {
      reportError(
        downloadError instanceof Error
          ? downloadError.message
          : t.downloadQuoteError,
      );
    } finally {
      setLoading(false);
    }
  }

  const button = (
    <button
      type="button"
      onClick={handleDownload}
      disabled={loading}
      className={CLIENTE_DOWNLOAD_BUTTON_CLASS}
    >
      <DownloadIcon />
      {loading ? t.generatingPdf : t.downloadQuote}
    </button>
  );

  if (inline) {
    return button;
  }

  return (
    <div className="flex shrink-0 flex-col items-center gap-2">
      {button}
      {error && (
        <p className="text-center text-sm text-red-700" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

function DownloadIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 20 20"
      fill="currentColor"
      className="h-4 w-4 shrink-0"
      aria-hidden
    >
      <path d="M10.75 2.75a.75.75 0 0 0-1.5 0v8.614L6.295 8.235a.75.75 0 1 0-1.09 1.03l4.25 4.5a.75.75 0 0 0 1.09 0l4.25-4.5a.75.75 0 0 0-1.09-1.03l-2.955 3.129V2.75Z" />
      <path d="M3.5 12.75a.75.75 0 0 0-1.5 0v2.5A2.75 2.75 0 0 0 4.75 18h10.5A2.75 2.75 0 0 0 18 15.25v-2.5a.75.75 0 0 0-1.5 0v2.5c0 .69-.56 1.25-1.25 1.25H4.75c-.69 0-1.25-.56-1.25-1.25v-2.5Z" />
    </svg>
  );
}
