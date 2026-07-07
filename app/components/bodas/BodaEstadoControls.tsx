"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  BODA_ESTADO_ACTIVA,
  BODA_ESTADO_FINALIZADA,
  isBodaFinalizada,
} from "@/lib/boda-estado";
import { supabase } from "@/lib/supabase";

type BodaEstadoControlsProps = {
  bodaId: string;
  estado: string | null | undefined;
  canManage: boolean;
};

export function BodaEstadoControls({
  bodaId,
  estado,
  canManage,
}: BodaEstadoControlsProps) {
  const router = useRouter();
  const [confirmFinalizeOpen, setConfirmFinalizeOpen] = useState(false);
  const [confirmReactivateOpen, setConfirmReactivateOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const finalizada = isBodaFinalizada(estado);

  useEffect(() => {
    if (!confirmFinalizeOpen && !confirmReactivateOpen) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !submitting) {
        setConfirmFinalizeOpen(false);
        setConfirmReactivateOpen(false);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [confirmFinalizeOpen, confirmReactivateOpen, submitting]);

  async function updateEstado(nextEstado: string) {
    if (!supabase || submitting) return;

    setSubmitting(true);
    setError(null);

    try {
      const { error: updateError } = await supabase
        .from("bodas")
        .update({ estado: nextEstado })
        .eq("id", bodaId);

      if (updateError) {
        setError(updateError.message);
        return;
      }

      setConfirmFinalizeOpen(false);
      setConfirmReactivateOpen(false);
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      {finalizada && (
        <div className="mt-4 rounded-xl border border-bloom-border bg-bloom-canvas/70 px-4 py-3 sm:px-5">
          <p className="text-sm font-medium text-bloom-ink">
            Esta boda está finalizada
          </p>
          {canManage && (
            <button
              type="button"
              onClick={() => {
                setError(null);
                setConfirmReactivateOpen(true);
              }}
              className="mt-3 inline-flex items-center justify-center rounded-full border border-bloom-border bg-bloom-surface px-4 py-2 text-sm font-medium text-bloom-ink transition-colors hover:bg-bloom-border"
            >
              Reactivar boda
            </button>
          )}
        </div>
      )}

      {canManage && !finalizada && (
        <div className="mt-4">
          <button
          type="button"
          onClick={() => {
            setError(null);
            setConfirmFinalizeOpen(true);
          }}
          className="inline-flex items-center justify-center rounded-full border border-bloom-border bg-bloom-surface px-4 py-2 text-sm font-medium text-bloom-ink transition-colors hover:bg-bloom-border"
        >
          Marcar como finalizada
        </button>
        </div>
      )}

      {error && (
        <p className="mt-2 text-sm text-red-700" role="alert">
          {error}
        </p>
      )}

      {confirmFinalizeOpen && (
        <ConfirmDialog
          title="Marcar como finalizada"
          message="¿Estás seguro de que quieres marcar esta boda como finalizada? Seguirá siendo accesible en Bloom."
          confirmLabel="Marcar como finalizada"
          submitting={submitting}
          onCancel={() => {
            if (!submitting) setConfirmFinalizeOpen(false);
          }}
          onConfirm={() => updateEstado(BODA_ESTADO_FINALIZADA)}
        />
      )}

      {confirmReactivateOpen && (
        <ConfirmDialog
          title="Reactivar boda"
          message="¿Quieres volver a marcar esta boda como activa? Volverá a aparecer en el listado de bodas activas y en las alertas del dashboard."
          confirmLabel="Reactivar boda"
          submitting={submitting}
          onCancel={() => {
            if (!submitting) setConfirmReactivateOpen(false);
          }}
          onConfirm={() => updateEstado(BODA_ESTADO_ACTIVA)}
        />
      )}
    </>
  );
}

function ConfirmDialog({
  title,
  message,
  confirmLabel,
  submitting,
  onCancel,
  onConfirm,
}: {
  title: string;
  message: string;
  confirmLabel: string;
  submitting: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="boda-estado-dialog-title"
      onClick={(e) => {
        if (e.target === e.currentTarget && !submitting) onCancel();
      }}
    >
      <div className="w-full max-w-md rounded-2xl border border-bloom-border bg-bloom-surface p-6 shadow-lg">
        <h3
          id="boda-estado-dialog-title"
          className="font-display text-xl text-bloom-ink"
        >
          {title}
        </h3>
        <p className="mt-2 text-sm text-bloom-muted">{message}</p>
        <div className="mt-6 flex items-center justify-end gap-3">
          <button
            type="button"
            className="rounded-full border border-bloom-border bg-bloom-surface px-5 py-2.5 text-sm font-medium text-bloom-ink transition-colors hover:bg-bloom-border disabled:opacity-60"
            onClick={onCancel}
            disabled={submitting}
          >
            Cancelar
          </button>
          <button
            type="button"
            className="inline-flex items-center justify-center rounded-full bg-bloom-accent px-5 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-bloom-accent-hover disabled:opacity-60"
            onClick={onConfirm}
            disabled={submitting}
          >
            {submitting ? "Guardando..." : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
