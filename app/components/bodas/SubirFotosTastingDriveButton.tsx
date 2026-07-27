"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type SubirFotosTastingDriveButtonProps = {
  bodaId: string;
  tastingId: string;
  fotosDriveUrl?: string | null;
  disabled?: boolean;
  onSaved?: (url: string | null) => void;
};

function isValidDriveUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return (
      url.protocol === "https:" &&
      (url.hostname === "drive.google.com" ||
        url.hostname === "docs.google.com")
    );
  } catch {
    return false;
  }
}

export function SubirFotosTastingDriveButton({
  bodaId,
  tastingId,
  fotosDriveUrl = null,
  disabled = false,
  onSaved,
}: SubirFotosTastingDriveButtonProps) {
  const router = useRouter();
  const [openingFolder, setOpeningFolder] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [linkInput, setLinkInput] = useState(fotosDriveUrl ?? "");
  const [fileUrl, setFileUrl] = useState(fotosDriveUrl);
  const [panelOpen, setPanelOpen] = useState(Boolean(fotosDriveUrl));

  useEffect(() => {
    setFileUrl(fotosDriveUrl);
    setLinkInput(fotosDriveUrl ?? "");
    if (fotosDriveUrl) setPanelOpen(true);
  }, [fotosDriveUrl]);

  async function handleOpenFolder() {
    if (!bodaId?.trim()) {
      setMessage("Falta el ID de la boda. No se puede abrir la carpeta.");
      return;
    }

    setPanelOpen(true);
    setOpeningFolder(true);
    setMessage(null);

    // Abrir la pestaña en el mismo gesto del usuario (antes del await).
    const popup = window.open("about:blank", "_blank");
    const apiUrl = `/api/drive/tastings/${encodeURIComponent(bodaId)}`;

    try {
      const response = await fetch(apiUrl);

      let data: { folder_url?: string; error?: string } = {};
      const rawBody = await response.text();
      try {
        data = rawBody
          ? (JSON.parse(rawBody) as { folder_url?: string; error?: string })
          : {};
      } catch {
        throw new Error(
          `Respuesta inválida del servidor (HTTP ${response.status}).`,
        );
      }

      if (response.status === 404 && data.error === "NO_DRIVE_FOLDER") {
        popup?.close();
        setMessage("Primero crea la carpeta de Drive de esta boda");
        return;
      }

      if (!response.ok || !data.folder_url) {
        popup?.close();
        throw new Error(
          data.error ??
            `No se pudo abrir la carpeta de tastings (HTTP ${response.status}).`,
        );
      }

      if (popup && !popup.closed) {
        popup.location.href = data.folder_url;
      } else {
        const opened = window.open(
          data.folder_url,
          "_blank",
          "noopener,noreferrer",
        );
        if (!opened) {
          setMessage(
            `El navegador bloqueó la ventana. Copia este enlace: ${data.folder_url}`,
          );
        }
      }
    } catch (error) {
      popup?.close();
      setMessage(
        error instanceof Error
          ? error.message
          : "No se pudo abrir la carpeta de tastings.",
      );
    } finally {
      setOpeningFolder(false);
    }
  }

  async function handleSaveLink(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);

    const url = linkInput.trim();
    if (!url) {
      setMessage("Pega el enlace de Drive de las fotos.");
      return;
    }

    if (!isValidDriveUrl(url)) {
      setMessage("El enlace debe ser una URL válida de Google Drive.");
      return;
    }

    if (!supabase) {
      setMessage("Supabase no está configurado.");
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase
        .from("tastings")
        .update({ fotos_drive_url: url })
        .eq("id", tastingId)
        .eq("boda_id", bodaId);

      if (error) {
        throw new Error(error.message);
      }

      setFileUrl(url);
      onSaved?.(url);
      router.refresh();
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "No se pudo guardar el enlace.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleClearLink() {
    if (!supabase) {
      setMessage("Supabase no está configurado.");
      return;
    }

    setSaving(true);
    setMessage(null);
    try {
      const { error } = await supabase
        .from("tastings")
        .update({ fotos_drive_url: null })
        .eq("id", tastingId)
        .eq("boda_id", bodaId);

      if (error) {
        throw new Error(error.message);
      }

      setFileUrl(null);
      setLinkInput("");
      onSaved?.(null);
      router.refresh();
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "No se pudo quitar el enlace.",
      );
    } finally {
      setSaving(false);
    }
  }

  const busy = disabled || openingFolder || saving;

  return (
    <div className="mt-3 space-y-2 border-t border-bloom-border/70 pt-3">
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            void handleOpenFolder();
          }}
          disabled={busy}
          className="inline-flex items-center justify-center gap-1.5 rounded-full border border-bloom-accent/30 bg-bloom-canvas px-3 py-1.5 text-xs font-medium text-bloom-accent shadow-sm transition-colors hover:border-bloom-accent hover:bg-bloom-surface disabled:cursor-not-allowed disabled:opacity-60"
        >
          <span aria-hidden>📷</span>
          {openingFolder ? "Abriendo…" : "Fotos"}
        </button>
        {fileUrl && (
          <a
            href={fileUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex rounded-full border border-bloom-border bg-bloom-surface px-3 py-1.5 text-xs font-medium text-bloom-ink transition-colors hover:bg-bloom-border"
            onClick={(e) => e.stopPropagation()}
          >
            Ver fotos
          </a>
        )}
      </div>

      {panelOpen && (
        <>
          <p className="text-xs leading-relaxed text-bloom-muted">
            Abre la carpeta &quot;Tastings&quot; en Google Drive, sube las
            fotos ahí y pega el enlace abajo.
          </p>

          <form onSubmit={handleSaveLink} className="space-y-2">
            <label className="block">
              <span className="text-xs font-medium uppercase tracking-wider text-bloom-muted">
                Enlace de Drive
              </span>
              <input
                type="url"
                value={linkInput}
                onChange={(e) => setLinkInput(e.target.value)}
                placeholder="https://drive.google.com/drive/folders/..."
                disabled={busy}
                className="mt-1 w-full rounded-xl border border-bloom-border bg-bloom-surface px-3 py-2 text-sm text-bloom-ink placeholder:text-bloom-muted focus:border-bloom-accent focus:outline-none focus:ring-2 focus:ring-bloom-accent/20 disabled:opacity-60"
              />
            </label>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="submit"
                disabled={busy || !linkInput.trim()}
                className="rounded-full bg-bloom-accent px-4 py-1.5 text-xs font-medium text-white transition-colors hover:bg-bloom-accent-hover disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving ? "Guardando…" : "Guardar enlace"}
              </button>
              {fileUrl && (
                <button
                  type="button"
                  onClick={handleClearLink}
                  disabled={busy}
                  className="rounded-full border border-bloom-border bg-bloom-surface px-3 py-1 text-xs font-medium text-bloom-muted transition-colors hover:bg-bloom-border hover:text-bloom-ink disabled:opacity-60"
                >
                  Quitar
                </button>
              )}
            </div>
          </form>
        </>
      )}

      {message && (
        <p
          className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900 break-all"
          role="alert"
        >
          {message}
        </p>
      )}
    </div>
  );
}
