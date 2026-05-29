"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AUDITORIA_ACCIONES, logAuditoria } from "@/lib/auditoria";
import { eliminarBoda } from "@/lib/delete-boda";
import { supabase } from "@/lib/supabase";

type DeleteWeddingButtonProps = {
  bodaId: string;
  bodaNombre: string;
};

export function DeleteWeddingButton({
  bodaId,
  bodaNombre,
}: DeleteWeddingButtonProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !deleting) setOpen(false);
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, deleting]);

  async function handleConfirmDelete() {
    if (!supabase || deleting) return;

    setDeleting(true);
    setError(null);

    const result = await eliminarBoda(supabase, bodaId);

    if (!result.ok) {
      setError(result.message);
      setDeleting(false);
      return;
    }

    await logAuditoria({
      accion: AUDITORIA_ACCIONES.BODA_ELIMINADA,
      entidad: "boda",
      entidadId: bodaId,
      bodaNombre,
    });

    setOpen(false);
    router.push("/");
    router.refresh();
  }

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setError(null);
          setOpen(true);
        }}
        className="inline-flex items-center justify-center rounded-full border border-red-300 bg-red-50 px-5 py-2.5 text-sm font-medium text-red-700 transition-colors hover:bg-red-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-500"
      >
        Eliminar boda
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-wedding-title"
          onClick={(e) => {
            if (e.target === e.currentTarget && !deleting) setOpen(false);
          }}
        >
          <div className="w-full max-w-md rounded-2xl border border-bloom-border bg-bloom-surface p-6 shadow-lg">
            <h2
              id="delete-wedding-title"
              className="font-display text-xl text-bloom-ink"
            >
              Eliminar boda
            </h2>
            <p className="mt-3 text-sm text-bloom-muted">
              ¿Estás seguro que deseas eliminar esta boda? Esta acción no se
              puede deshacer.
            </p>

            {error && (
              <p className="mt-4 text-sm text-red-700" role="alert">
                {error}
              </p>
            )}

            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setOpen(false)}
                disabled={deleting}
                className="rounded-full border border-bloom-border bg-bloom-surface px-5 py-2.5 text-sm font-medium text-bloom-ink transition-colors hover:bg-bloom-border disabled:opacity-60"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={deleting || !supabase}
                className="inline-flex items-center justify-center rounded-full bg-red-600 px-5 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-red-700 disabled:opacity-60"
              >
                {deleting ? "Eliminando…" : "Eliminar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
