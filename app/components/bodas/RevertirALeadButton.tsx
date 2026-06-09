"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { RevertBodaPayload } from "@/lib/revert-boda-to-lead";
import { revertirBodaALead } from "@/lib/revert-boda-to-lead";
import { AUDITORIA_ACCIONES, logAuditoria } from "@/lib/auditoria";
import { supabase } from "@/lib/supabase";

type RevertirALeadButtonProps = {
  boda: RevertBodaPayload;
};

export function RevertirALeadButton({ boda }: RevertirALeadButtonProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !busy) setOpen(false);
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, busy]);

  async function handleConfirm() {
    if (!supabase || busy) return;

    setBusy(true);
    setError(null);

    const result = await revertirBodaALead(supabase, boda);

    if (!result.ok) {
      setError(result.message);
      setBusy(false);
      return;
    }

    await logAuditoria({
      accion: AUDITORIA_ACCIONES.BODA_REVERTIDA_A_LEAD,
      entidad: "boda",
      entidadId: boda.id,
      bodaNombre: boda.nombre_pareja,
      detalle: `Lead reactivado: ${boda.nombre_pareja}`,
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
        className="inline-flex items-center justify-center rounded-full border border-amber-300 bg-amber-50 px-5 py-2.5 text-sm font-medium text-amber-900 transition-colors hover:bg-amber-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-500"
      >
        Revertir a lead
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="revert-boda-title"
          onClick={(e) => {
            if (e.target === e.currentTarget && !busy) setOpen(false);
          }}
        >
          <div className="w-full max-w-md rounded-2xl border border-bloom-border bg-bloom-surface p-6 shadow-lg">
            <h2
              id="revert-boda-title"
              className="font-display text-xl text-bloom-ink"
            >
              Revertir a lead
            </h2>
            <p className="mt-3 text-sm text-bloom-muted">
              ¿Revertir esta boda a lead? La boda se eliminará de bodas activas
              y volverá al módulo de leads como lead activo. Los proveedores y
              pagos registrados se perderán.
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
                disabled={busy}
                className="rounded-full border border-bloom-border bg-bloom-surface px-5 py-2.5 text-sm font-medium text-bloom-ink transition-colors hover:bg-bloom-border disabled:opacity-60"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirm}
                disabled={busy || !supabase}
                className="inline-flex items-center justify-center rounded-full bg-amber-600 px-5 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-amber-700 disabled:opacity-60"
              >
                {busy ? "Revirtiendo…" : "Revertir a lead"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
