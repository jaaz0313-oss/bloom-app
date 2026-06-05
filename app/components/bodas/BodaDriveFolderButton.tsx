"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type BodaDriveFolderButtonProps = {
  bodaId: string;
  driveFolderUrl: string | null;
};

export function BodaDriveFolderButton({
  bodaId,
  driveFolderUrl,
}: BodaDriveFolderButtonProps) {
  const router = useRouter();
  const [folderUrl, setFolderUrl] = useState(driveFolderUrl);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleCreateFolder() {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/drive/crear-carpeta-boda", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bodaId }),
      });

      const data = (await response.json()) as {
        folder_url?: string;
        error?: string;
      };

      if (!response.ok) {
        throw new Error(data.error ?? "No se pudo crear la carpeta.");
      }

      if (data.folder_url) {
        setFolderUrl(data.folder_url);
      }

      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error inesperado.");
    } finally {
      setLoading(false);
    }
  }

  const buttonClass =
    "inline-flex shrink-0 items-center justify-center rounded-full border border-bloom-border bg-bloom-surface px-4 py-2 text-sm font-medium text-bloom-ink transition-colors hover:bg-bloom-border disabled:opacity-60";

  const secondaryButtonClass =
    "inline-flex shrink-0 items-center justify-center rounded-full border border-bloom-border/80 bg-bloom-canvas px-3 py-1.5 text-xs font-medium text-bloom-muted transition-colors hover:border-bloom-border hover:bg-bloom-surface hover:text-bloom-ink";

  return (
    <div className="mt-4 flex flex-col gap-3 rounded-xl border border-bloom-border bg-bloom-canvas/50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <p className="text-xs font-medium uppercase tracking-wider text-bloom-muted">
          📁 Carpeta Drive
        </p>
        <p className="mt-1 truncate text-sm font-medium text-bloom-ink">
          {folderUrl ? "Carpeta creada en Google Drive" : "Sin carpeta en Drive"}
        </p>
        {error && (
          <p className="mt-1 text-sm text-red-700" role="alert">
            {error}
          </p>
        )}
      </div>

      {folderUrl ? (
        <div className="flex shrink-0 flex-col items-stretch gap-2 sm:items-end">
          <a
            href={folderUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={buttonClass}
          >
            Abrir carpeta
          </a>
          <div className="flex flex-col gap-1 sm:items-end">
            <a
              href={folderUrl}
              target="_blank"
              rel="noopener noreferrer"
              title="Sube manualmente la plantilla de timing a esta carpeta"
              className={secondaryButtonClass}
            >
              📄 Subir timing
            </a>
            <p className="text-xs leading-snug text-bloom-muted sm:max-w-[11rem] sm:text-right">
              Sube manualmente la plantilla de timing a esta carpeta
            </p>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={handleCreateFolder}
          disabled={loading}
          className={buttonClass}
        >
          {loading ? "Creando..." : "Crear carpeta en Drive"}
        </button>
      )}
    </div>
  );
}
