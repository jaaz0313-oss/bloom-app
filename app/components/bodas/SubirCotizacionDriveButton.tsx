"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

type SubirCotizacionDriveButtonProps = {
  bodaId: string;
  proveedorId: string;
  cotizacionDriveUrl?: string | null;
  disabled?: boolean;
};

export function SubirCotizacionDriveButton({
  bodaId,
  proveedorId,
  cotizacionDriveUrl = null,
  disabled = false,
}: SubirCotizacionDriveButtonProps) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [fileUrl, setFileUrl] = useState(cotizacionDriveUrl);

  useEffect(() => {
    setFileUrl(cotizacionDriveUrl);
  }, [cotizacionDriveUrl]);

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setMessage(null);

    const formData = new FormData();
    formData.append("file", file);
    formData.append("proveedorId", proveedorId);

    try {
      const response = await fetch(`/api/drive/cotizaciones/${bodaId}`, {
        method: "POST",
        body: formData,
      });
      const data = (await response.json()) as {
        file_url?: string;
        error?: string;
      };

      if (response.status === 404 && data.error === "NO_DRIVE_FOLDER") {
        setMessage("Primero crea la carpeta de Drive de esta boda");
        return;
      }

      if (response.status === 413) {
        setMessage(data.error ?? "El archivo no puede superar 500 KB");
        return;
      }

      if (!response.ok || !data.file_url) {
        throw new Error(data.error ?? "No se pudo subir la cotización.");
      }

      setFileUrl(data.file_url);
      router.refresh();
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "No se pudo subir la cotización.",
      );
    } finally {
      setLoading(false);
      if (inputRef.current) {
        inputRef.current.value = "";
      }
    }
  }

  return (
    <div className="space-y-2">
      <input
        ref={inputRef}
        type="file"
        accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg,.webp"
        className="sr-only"
        disabled={disabled || loading}
        onChange={handleFileChange}
      />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={disabled || loading}
        className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-bloom-accent/30 bg-bloom-canvas px-4 py-2.5 text-sm font-medium text-bloom-accent shadow-sm transition-colors hover:border-bloom-accent hover:bg-bloom-surface disabled:cursor-not-allowed disabled:opacity-60"
      >
        <span aria-hidden>📁</span>
        {loading ? "Subiendo cotización…" : "Subir cotización"}
      </button>
      <p className="text-xs leading-relaxed text-bloom-muted">
        Sube el archivo a la carpeta &quot;Cotizaciones&quot; en Google Drive.
      </p>
      {fileUrl && (
        <a
          href={fileUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex rounded-full border border-bloom-border bg-bloom-surface px-3 py-1 text-xs font-medium text-bloom-ink transition-colors hover:bg-bloom-border"
        >
          Ver cotización
        </a>
      )}
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
