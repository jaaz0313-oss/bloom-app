"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import {
  getPresupuestoEstimadoIdsForCategoria,
  type PresupuestoEstimadoCategoriaRow,
} from "@/app/data/presupuesto-estimado";
import { formatCurrency } from "@/lib/format";
import { supabase } from "@/lib/supabase";

type EstimadoItemCardProps = {
  item: PresupuestoEstimadoCategoriaRow;
  /** Todos los estimados de la boda (para borrar duplicados de la misma categoría). */
  allEstimados: PresupuestoEstimadoCategoriaRow[];
  canDelete: boolean;
  onDeleted: (ids: string[]) => void;
};

export function EstimadoItemCard({
  item,
  allEstimados,
  canDelete,
  onDeleted,
}: EstimadoItemCardProps) {
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const valor = Number(item.valor_estimado ?? 0);
  const duplicateIds = getPresupuestoEstimadoIdsForCategoria(
    allEstimados,
    item.categoria,
  );
  const hasDuplicates = duplicateIds.length > 1;

  async function handleDelete() {
    if (!canDelete || !supabase || deleting) return;

    const confirmed = window.confirm(
      hasDuplicates
        ? `¿Eliminar "${item.categoria}" y sus ${duplicateIds.length - 1} duplicado(s)?`
        : `¿Eliminar el ítem estimado "${item.categoria}"?`,
    );
    if (!confirmed) return;

    setDeleting(true);
    setError(null);
    try {
      const { error: deleteError } = await supabase
        .from("presupuesto_estimado_categorias")
        .delete()
        .in("id", duplicateIds);

      if (deleteError) {
        setError(deleteError.message);
        return;
      }

      onDeleted(duplicateIds);
      router.refresh();
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="rounded-2xl border border-dashed border-bloom-border bg-bloom-surface/80 px-5 py-4 shadow-sm sm:px-6">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-medium text-bloom-ink">{item.categoria}</p>
            <span className="inline-flex rounded-full bg-bloom-border/70 px-2.5 py-0.5 text-xs font-medium text-bloom-muted">
              Estimado
            </span>
            {hasDuplicates ? (
              <span className="inline-flex rounded-full bg-amber-100 px-2.5 py-0.5 text-[10px] font-medium text-amber-900">
                {duplicateIds.length} registros · se limpia al eliminar
              </span>
            ) : null}
          </div>
          <p className="mt-1 text-sm font-medium text-bloom-ink">
            {valor > 0 ? formatCurrency(valor) : "Por definir"}
          </p>
          {item.notas?.trim() ? (
            <p className="mt-1.5 text-xs text-bloom-muted">
              {item.notas.trim()}
              {item.mostrar_nota_cliente ? (
                <span className="ml-2 text-[10px] uppercase tracking-wide text-bloom-accent">
                  Visible al cliente
                </span>
              ) : null}
            </p>
          ) : null}
          {error ? (
            <p className="mt-1 text-xs text-red-700" role="alert">
              {error}
            </p>
          ) : null}
        </div>
        {canDelete ? (
          <button
            type="button"
            onClick={() => void handleDelete()}
            disabled={deleting}
            aria-label={`Eliminar ${item.categoria}`}
            title="Eliminar ítem estimado"
            className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-bloom-muted transition-colors hover:bg-red-50 hover:text-red-700 disabled:opacity-50"
          >
            <Trash2 className="h-4 w-4" aria-hidden />
          </button>
        ) : null}
      </div>
    </div>
  );
}
