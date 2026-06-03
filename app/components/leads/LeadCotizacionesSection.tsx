"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ResponsiveModal } from "@/app/components/ui/ResponsiveModal";
import {
  COTIZACION_ESTADO_LABELS,
  type CotizacionRow,
} from "@/app/data/cotizaciones";
import type { LeadRow } from "@/app/data/leads";
import { formatShortDateStable } from "@/lib/format";
import { createCotizacionForLead } from "@/lib/create-lead-cotizacion";
import { supabase } from "@/lib/supabase";

type LeadCotizacionesSectionProps = {
  lead: LeadRow;
  cotizaciones: CotizacionRow[];
};

export function LeadCotizacionesSection({
  lead,
  cotizaciones,
}: LeadCotizacionesSectionProps) {
  const router = useRouter();
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  async function handleCreate() {
    setError(null);
    if (!supabase) {
      setError("Supabase no está configurado.");
      return;
    }

    setCreating(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      const result = await createCotizacionForLead(
        supabase,
        lead,
        user?.id ?? null,
      );

      if ("error" in result) {
        setError(result.error);
        return;
      }

      router.push(`/cotizaciones/${result.id}`);
    } finally {
      setCreating(false);
    }
  }

  function openDeleteConfirm(cotizacionId: string) {
    setDeleteError(null);
    setPendingDeleteId(cotizacionId);
  }

  function closeDeleteConfirm() {
    if (deleting) return;
    setPendingDeleteId(null);
    setDeleteError(null);
  }

  async function handleConfirmDelete() {
    if (!pendingDeleteId || !supabase) return;

    const cotizacion = cotizaciones.find((cot) => cot.id === pendingDeleteId);
    if (!cotizacion || cotizacion.estado !== "borrador") {
      setDeleteError("Solo se pueden eliminar cotizaciones en borrador.");
      return;
    }

    setDeleting(true);
    setDeleteError(null);

    try {
      const { error: deleteError } = await supabase
        .from("cotizaciones")
        .delete()
        .eq("id", pendingDeleteId)
        .eq("estado", "borrador");

      if (deleteError) {
        setDeleteError(deleteError.message);
        return;
      }

      setPendingDeleteId(null);
      router.refresh();
    } finally {
      setDeleting(false);
    }
  }

  return (
    <section className="mt-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="font-display text-xl text-bloom-ink">Cotizaciones</h2>
        <button
          type="button"
          onClick={handleCreate}
          disabled={creating}
          className="inline-flex items-center justify-center rounded-full bg-bloom-accent px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-bloom-accent-hover disabled:opacity-60"
        >
          {creating ? "Creando…" : "Crear cotización"}
        </button>
      </div>

      {error && (
        <p className="mt-3 rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      {cotizaciones.length === 0 ? (
        <p className="mt-4 rounded-2xl border border-dashed border-bloom-border bg-bloom-surface px-5 py-8 text-center text-sm text-bloom-muted">
          Aún no hay cotizaciones para este lead.
        </p>
      ) : (
        <ul className="mt-4 space-y-2">
          {cotizaciones.map((cot) => (
            <li key={cot.id} className="flex items-stretch gap-2">
              <Link
                href={`/cotizaciones/${cot.id}`}
                className="flex min-w-0 flex-1 items-center justify-between rounded-xl border border-bloom-border bg-bloom-surface px-4 py-3 text-sm transition-colors hover:bg-bloom-canvas"
              >
                <span className="font-medium text-bloom-ink">
                  Cotización ·{" "}
                  {cot.fecha_estimada
                    ? formatShortDateStable(cot.fecha_estimada)
                    : formatShortDateStable(cot.created_at.slice(0, 10))}
                </span>
                <span className="text-xs text-bloom-muted">
                  {COTIZACION_ESTADO_LABELS[cot.estado]}
                </span>
              </Link>
              {cot.estado === "borrador" && (
                <button
                  type="button"
                  onClick={() => openDeleteConfirm(cot.id)}
                  className="shrink-0 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-700 transition-colors hover:bg-red-100"
                >
                  Eliminar borrador
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      <ResponsiveModal
        open={pendingDeleteId !== null}
        onClose={closeDeleteConfirm}
        title="¿Eliminar este borrador de cotización?"
        subtitle="Esta acción no se puede deshacer."
        size="md"
        closeDisabled={deleting}
        footer={
          <div className="flex flex-col gap-3">
            {deleteError && (
              <p className="text-sm text-red-700" role="alert">
                {deleteError}
              </p>
            )}
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={closeDeleteConfirm}
                disabled={deleting}
                className="rounded-full border border-bloom-border bg-bloom-surface px-4 py-2 text-sm font-medium text-bloom-ink transition-colors hover:bg-bloom-border disabled:opacity-60"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={deleting}
                className="rounded-full bg-red-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-700 disabled:opacity-60"
              >
                {deleting ? "Eliminando…" : "Eliminar"}
              </button>
            </div>
          </div>
        }
      >
        {null}
      </ResponsiveModal>
    </section>
  );
}
