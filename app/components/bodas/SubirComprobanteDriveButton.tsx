"use client";

import { useState } from "react";

type SubirComprobanteDriveButtonProps = {
  bodaId: string;
  disabled?: boolean;
};

export function SubirComprobanteDriveButton({
  bodaId,
  disabled = false,
}: SubirComprobanteDriveButtonProps) {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function handleOpenFolder() {
    setLoading(true);
    setMessage(null);

    try {
      const response = await fetch(`/api/drive/comprobantes-pago/${bodaId}`);
      const data = (await response.json()) as {
        folder_url?: string;
        error?: string;
      };

      if (response.status === 404 && data.error === "NO_DRIVE_FOLDER") {
        setMessage("Primero crea la carpeta de Drive de esta boda");
        return;
      }

      if (!response.ok || !data.folder_url) {
        throw new Error(
          data.error ?? "No se pudo abrir la carpeta de comprobantes.",
        );
      }

      window.open(data.folder_url, "_blank", "noopener,noreferrer");
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "No se pudo abrir la carpeta de comprobantes.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={handleOpenFolder}
        disabled={disabled || loading}
        className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-bloom-accent/30 bg-bloom-canvas px-4 py-2.5 text-sm font-medium text-bloom-accent shadow-sm transition-colors hover:border-bloom-accent hover:bg-bloom-surface disabled:cursor-not-allowed disabled:opacity-60"
      >
        <span aria-hidden>📁</span>
        {loading ? "Abriendo carpeta…" : "Subir comprobante"}
      </button>
      <p className="text-xs leading-relaxed text-bloom-muted">
        Sube el comprobante a la carpeta &quot;Comprobantes de pago&quot; en
        Google Drive.
      </p>
      {message && (
        <p
          className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900"
          role="alert"
        >
          {message}
        </p>
      )}
    </div>
  );
}
