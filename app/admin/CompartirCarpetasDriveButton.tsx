"use client";

import { useState } from "react";

type DriveShareFolderResult = {
  folderId: string;
  folderName: string | null;
  bodaId: string;
  kind: "principal" | "subcarpeta";
  ok: boolean;
  error?: string;
};

type ShareRegisteredFoldersSummary = {
  email: string;
  total: number;
  shared: number;
  failed: number;
  results: DriveShareFolderResult[];
};

export function CompartirCarpetasDriveButton() {
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<ShareRegisteredFoldersSummary | null>(
    null,
  );

  async function handleShare() {
    setError(null);
    setSummary(null);

    if (!password.trim()) {
      setError("Ingresa la contraseña de administración.");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/admin/compartir-carpetas-drive", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });

      const body = (await response.json()) as
        | ShareRegisteredFoldersSummary
        | { error?: string };

      if (!response.ok) {
        throw new Error(
          "error" in body && body.error
            ? body.error
            : "No se pudieron compartir las carpetas.",
        );
      }

      setSummary(body as ShareRegisteredFoldersSummary);
      setPassword("");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Error al compartir carpetas.",
      );
    } finally {
      setLoading(false);
    }
  }

  const failedResults =
    summary?.results.filter((result) => !result.ok) ?? [];

  return (
    <section className="rounded-2xl border border-bloom-border bg-bloom-surface p-6 shadow-sm">
      <h2 className="font-display text-xl text-bloom-ink">
        Compartir carpetas de Drive
      </h2>
      <p className="mt-1 text-sm text-bloom-muted">
        Otorga acceso de escritura a{" "}
        <span className="font-medium text-bloom-ink">
          infocelestiaevents@gmail.com
        </span>{" "}
        en todas las carpetas de bodas ya creadas (incluye subcarpetas).
      </p>

      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="min-w-0 flex-1 space-y-1.5">
          <label
            htmlFor="admin-drive-share-password"
            className="text-sm font-medium text-bloom-ink"
          >
            Contraseña de administración
          </label>
          <input
            id="admin-drive-share-password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={loading}
            className="w-full rounded-xl border border-bloom-border bg-bloom-canvas px-3 py-2 text-sm text-bloom-ink outline-none focus:border-bloom-accent focus:ring-2 focus:ring-bloom-accent/30 disabled:opacity-60"
            placeholder="ADMIN_PANEL_PASSWORD"
            autoComplete="current-password"
          />
        </div>
        <button
          type="button"
          onClick={handleShare}
          disabled={loading}
          className="inline-flex items-center justify-center rounded-full bg-bloom-accent px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-bloom-accent-hover disabled:opacity-60"
        >
          {loading ? "Compartiendo…" : "Compartir carpetas existentes"}
        </button>
      </div>

      {error && (
        <p className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      {summary && (
        <div className="mt-4 space-y-3 rounded-xl border border-bloom-border bg-bloom-canvas/60 p-4 text-sm">
          <p className="font-medium text-bloom-ink">
            Resultado para {summary.email}
          </p>
          <dl className="grid gap-2 sm:grid-cols-3">
            <div>
              <dt className="text-bloom-muted">Total</dt>
              <dd className="font-semibold text-bloom-ink">{summary.total}</dd>
            </div>
            <div>
              <dt className="text-bloom-muted">Compartidas</dt>
              <dd className="font-semibold text-bloom-success">
                {summary.shared}
              </dd>
            </div>
            <div>
              <dt className="text-bloom-muted">Fallidas</dt>
              <dd className="font-semibold text-red-700">{summary.failed}</dd>
            </div>
          </dl>

          {failedResults.length > 0 && (
            <div>
              <p className="font-medium text-bloom-ink">Detalle de fallos</p>
              <ul className="mt-2 max-h-48 space-y-2 overflow-y-auto text-xs text-bloom-muted">
                {failedResults.map((result) => (
                  <li
                    key={`${result.folderId}-${result.kind}`}
                    className="rounded-lg border border-red-100 bg-red-50/80 px-3 py-2 text-red-800"
                  >
                    <span className="font-medium">
                      {result.folderName || result.folderId}
                    </span>{" "}
                    ({result.kind}) — {result.error}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
