"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { hasPermission, type UserRole } from "@/lib/auth/roles";
import { supabase } from "@/lib/supabase";

type BodaNumInvitadosProps = {
  bodaId: string;
  numInvitados: number | null;
  role: UserRole;
};

const inputClass =
  "w-full rounded-xl border border-bloom-border bg-bloom-canvas px-3 py-2 text-sm text-bloom-ink outline-none ring-0 focus:border-bloom-accent focus:ring-2 focus:ring-bloom-accent/30";

export function BodaNumInvitados({
  bodaId,
  numInvitados,
  role,
}: BodaNumInvitadosProps) {
  const router = useRouter();
  const canEdit = hasPermission(role, "providers.manage");
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState(
    numInvitados != null ? String(numInvitados) : "",
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setValue(numInvitados != null ? String(numInvitados) : "");
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, numInvitados]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!supabase) {
      setError("Supabase no está configurado.");
      return;
    }

    const trimmed = value.trim();
    const parsed = trimmed === "" ? null : Number(trimmed);
    if (parsed !== null && (!Number.isFinite(parsed) || parsed < 0)) {
      setError("Ingresa un número de invitados válido (>= 0).");
      return;
    }

    setSubmitting(true);
    try {
      const { error: updateError } = await supabase
        .from("bodas")
        .update({ num_invitados: parsed })
        .eq("id", bodaId);

      if (updateError) {
        setError(updateError.message);
        return;
      }

      setOpen(false);
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  }

  const display =
    numInvitados != null
      ? numInvitados.toLocaleString("es-CO")
      : "No especificado";

  return (
    <>
      <div className="flex flex-wrap items-center gap-x-2 gap-y-2">
        <dt className="text-bloom-muted">Número de invitados</dt>
        <dd className="flex flex-wrap items-center gap-2 font-medium text-bloom-ink">
          <span>{display}</span>
          {canEdit && (
            <button
              type="button"
              onClick={() => {
                setError(null);
                setOpen(true);
              }}
              className="inline-flex items-center justify-center rounded-full border border-bloom-border bg-bloom-surface px-2.5 py-0.5 text-xs font-medium text-bloom-muted transition-colors hover:border-bloom-accent/40 hover:text-bloom-ink"
            >
              Editar
            </button>
          )}
        </dd>
      </div>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Editar número de invitados"
          onClick={(e) => {
            if (e.target === e.currentTarget) setOpen(false);
          }}
        >
          <div className="w-full max-w-md rounded-2xl border border-bloom-border bg-bloom-surface p-6 shadow-lg">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="font-display text-xl text-bloom-ink">
                  Número de invitados
                </h2>
                <p className="mt-1 text-sm text-bloom-muted">
                  Cantidad estimada de invitados para esta boda.
                </p>
              </div>
              <button
                type="button"
                className="rounded-full p-2 text-bloom-muted transition-colors hover:bg-bloom-border hover:text-bloom-ink"
                onClick={() => setOpen(false)}
                aria-label="Cerrar"
                disabled={submitting}
              >
                <XIcon />
              </button>
            </div>

            <form className="mt-5 space-y-4" onSubmit={handleSave}>
              <label className="block space-y-1.5">
                <span className="text-sm font-medium text-bloom-ink">
                  Invitados
                </span>
                <input
                  type="number"
                  min={0}
                  step={1}
                  className={inputClass}
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                  placeholder="Ej: 120"
                  disabled={submitting}
                  autoFocus
                />
              </label>

              {error && (
                <p className="text-sm text-red-700" role="alert">
                  {error}
                </p>
              )}

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  className="rounded-full border border-bloom-border bg-bloom-surface px-5 py-2.5 text-sm font-medium text-bloom-ink transition-colors hover:bg-bloom-border disabled:opacity-60"
                  onClick={() => setOpen(false)}
                  disabled={submitting}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex items-center justify-center rounded-full bg-bloom-accent px-5 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-bloom-accent-hover disabled:opacity-60"
                >
                  {submitting ? "Guardando…" : "Guardar"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
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
