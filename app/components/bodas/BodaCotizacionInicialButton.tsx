"use client";

import { useState } from "react";

type BodaCotizacionInicialButtonProps = {
  leadId: string;
};

export function BodaCotizacionInicialButton({
  leadId,
}: BodaCotizacionInicialButtonProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDownload() {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/leads/${leadId}/cotizacion-pdf`);

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as {
          error?: string;
        } | null;
        throw new Error(
          payload?.error ?? "No se pudo descargar la cotización inicial.",
        );
      }

      const blob = await response.blob();
      const disposition = response.headers.get("Content-Disposition");
      const filenameMatch = disposition?.match(/filename="([^"]+)"/);
      const filename = filenameMatch?.[1] ?? "Cotizacion-inicial.pdf";

      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = filename;
      anchor.click();
      URL.revokeObjectURL(url);
    } catch (downloadError) {
      setError(
        downloadError instanceof Error
          ? downloadError.message
          : "No se pudo descargar la cotización inicial.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col items-start gap-1">
      <button
        type="button"
        onClick={handleDownload}
        disabled={loading}
        className="inline-flex items-center justify-center gap-2 rounded-full border border-bloom-border bg-bloom-surface px-5 py-2.5 text-sm font-medium text-bloom-ink shadow-sm transition-colors hover:bg-bloom-border focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-bloom-accent disabled:opacity-60"
      >
        <DownloadIcon />
        {loading ? "Generando PDF…" : "Cotización inicial"}
      </button>
      {error && (
        <p className="text-xs text-red-700" role="alert">
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
      className="h-4 w-4"
      aria-hidden
    >
      <path d="M10.75 2.75a.75.75 0 0 0-1.5 0v8.614L6.295 8.235a.75.75 0 1 0-1.09 1.03l4.25 4.5a.75.75 0 0 0 1.09 0l4.25-4.5a.75.75 0 0 0-1.09-1.03l-2.955 3.129V2.75Z" />
      <path d="M3.5 12.75a.75.75 0 0 0-1.5 0v2.5A2.75 2.75 0 0 0 4.75 18h10.5A2.75 2.75 0 0 0 18 15.25v-2.5a.75.75 0 0 0-1.5 0v2.5c0 .69-.56 1.25-1.25 1.25H4.75c-.69 0-1.25-.56-1.25-1.25v-2.5Z" />
    </svg>
  );
}
