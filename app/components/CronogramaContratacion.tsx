"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import {
  CRONOGRAMA_STATUS_BADGE_STYLES,
  CRONOGRAMA_STATUS_LABELS,
  CRONOGRAMA_STATUS_STYLES,
  getCronogramaItemStatus,
  type CronogramaItemRow,
} from "@/app/data/cronograma";
import { CRONOGRAMA_AUTO_SYNCED_EVENT } from "@/app/components/bodas/AutoSyncCronograma";
import { insertarCronograma, actualizarCronograma, regenerarCronograma } from "@/lib/cronograma";
import { formatShortDate } from "@/lib/format";
import {
  removeById,
  subscribeRealtimeTables,
  upsertById,
} from "@/lib/supabase-realtime";
import { supabase } from "@/lib/supabase";

type CronogramaContratacionProps = {
  bodaId: string;
  fechaBoda: string;
  canManage: boolean;
  canActualizarPlantilla?: boolean;
  embedded?: boolean;
};

function CronogramaShell({
  embedded,
  children,
}: {
  embedded: boolean;
  children: React.ReactNode;
}) {
  if (embedded) return <div>{children}</div>;
  return (
    <section className="rounded-2xl border border-bloom-border bg-bloom-surface p-6 shadow-sm">
      {children}
    </section>
  );
}

export function CronogramaContratacion({
  bodaId,
  fechaBoda,
  canManage,
  canActualizarPlantilla = false,
  embedded = false,
}: CronogramaContratacionProps) {
  const router = useRouter();
  const [items, setItems] = useState<CronogramaItemRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const loadItems = useCallback(async () => {
    if (!supabase) {
      setError("Supabase no está configurado.");
      setLoading(false);
      return;
    }

    const { data, error: fetchError } = await supabase
      .from("cronograma_items")
      .select("*")
      .eq("boda_id", bodaId)
      .order("fecha_limite", { ascending: true });

    if (fetchError) {
      setError(fetchError.message);
      setItems([]);
    } else {
      setError(null);
      setItems((data ?? []) as CronogramaItemRow[]);
    }
    setLoading(false);
  }, [bodaId]);

  useEffect(() => {
    loadItems();
  }, [loadItems]);

  useEffect(() => {
    function handleAutoSynced(event: Event) {
      const detail = (event as CustomEvent<{ bodaId?: string }>).detail;
      if (detail?.bodaId !== bodaId) return;
      void loadItems();
    }

    window.addEventListener(CRONOGRAMA_AUTO_SYNCED_EVENT, handleAutoSynced);
    return () => {
      window.removeEventListener(CRONOGRAMA_AUTO_SYNCED_EVENT, handleAutoSynced);
    };
  }, [bodaId, loadItems]);

  useEffect(() => {
    return subscribeRealtimeTables(`boda:${bodaId}:cronograma`, [
      {
        table: "cronograma_items",
        filter: `boda_id=eq.${bodaId}`,
        onPayload: (payload) => {
          if (payload.eventType === "DELETE") {
            const oldRow = payload.old as Partial<CronogramaItemRow>;
            if (!oldRow.id) return;
            setItems((prev) => removeById(prev, oldRow.id!));
            return;
          }

          const row = payload.new as CronogramaItemRow;
          if (!row?.id || row.boda_id !== bodaId) return;
          setItems((prev) =>
            [...upsertById(prev, row)].sort((a, b) =>
              a.fecha_limite.localeCompare(b.fecha_limite),
            ),
          );
        },
      },
    ]);
  }, [bodaId]);

  async function handleToggle(item: CronogramaItemRow) {
    if (!canManage) return;
    if (!supabase || togglingId) return;

    const nextCompletado = !item.completado;
    setTogglingId(item.id);
    setError(null);

    setItems((prev) =>
      prev.map((row) =>
        row.id === item.id ? { ...row, completado: nextCompletado } : row,
      ),
    );

    const { error: updateError } = await supabase
      .from("cronograma_items")
      .update({ completado: nextCompletado })
      .eq("id", item.id);

    setTogglingId(null);

    if (updateError) {
      setItems((prev) =>
        prev.map((row) =>
          row.id === item.id ? { ...row, completado: item.completado } : row,
        ),
      );
      setError(updateError.message);
      return;
    }

    router.refresh();
  }

  async function handleGenerarCronograma() {
    if (!canManage) return;
    if (!supabase || generating) return;

    setGenerating(true);
    setError(null);

    const result = await insertarCronograma(supabase, bodaId, fechaBoda);

    if (!result.ok) {
      setError(result.message);
      setGenerating(false);
      return;
    }

    await loadItems();
    setGenerating(false);
    router.refresh();
  }

  async function handleRegenerarCronograma() {
    if (!canManage) return;
    if (!supabase || regenerating) return;

    const confirmed = window.confirm(
      "Se borrarán todos los hitos actuales y se crearán de nuevo con la plantilla actualizada. El progreso marcado como completado se perderá. ¿Continuar?",
    );
    if (!confirmed) return;

    setRegenerating(true);
    setError(null);

    const result = await regenerarCronograma(supabase, bodaId, fechaBoda);

    if (!result.ok) {
      setError(result.message);
      setRegenerating(false);
      return;
    }

    window.location.reload();
  }

  async function handleActualizarCronograma() {
    if (!canActualizarPlantilla) return;
    if (!supabase || updating) return;

    const confirmed = window.confirm(
      "Esto agregará los hitos nuevos de la plantilla actual y eliminará hitos combinados obsoletos si ya existen las versiones separadas. Los demás hitos existentes no se modificarán. ¿Continuar?",
    );
    if (!confirmed) return;

    setUpdating(true);
    setError(null);

    const result = await actualizarCronograma(supabase, bodaId, fechaBoda);

    if (!result.ok) {
      setError(result.message);
      setUpdating(false);
      return;
    }

    await loadItems();
    setUpdating(false);
    router.refresh();
  }

  async function handleDelete(item: CronogramaItemRow) {
    if (!canActualizarPlantilla) return;
    if (!supabase || deletingId) return;

    const confirmed = window.confirm(
      "¿Eliminar este hito del cronograma? Esta acción no se puede deshacer.",
    );
    if (!confirmed) return;

    setDeletingId(item.id);
    setError(null);

    const { error: deleteError } = await supabase
      .from("cronograma_items")
      .delete()
      .eq("id", item.id);

    setDeletingId(null);

    if (deleteError) {
      setError(deleteError.message);
      return;
    }

    setItems((prev) => prev.filter((row) => row.id !== item.id));
    router.refresh();
  }

  const completados = items.filter((i) => i.completado).length;
  const total = items.length;
  const progressPct = total > 0 ? Math.round((completados / total) * 100) : 0;

  const itemsOrdenados = useMemo(
    () =>
      [...items].sort((a, b) => a.fecha_limite.localeCompare(b.fecha_limite)),
    [items],
  );

  if (loading) {
    return (
      <CronogramaShell embedded={embedded}>
        {!embedded && (
          <h2 className="font-display text-xl text-bloom-ink">
            Cronograma de contratación
          </h2>
        )}
        <p className={`text-sm text-bloom-muted ${embedded ? "" : "mt-4"}`}>
          Cargando hitos…
        </p>
      </CronogramaShell>
    );
  }

  if (items.length === 0) {
    return (
      <CronogramaShell embedded={embedded}>
        {!embedded && (
          <h2 className="font-display text-xl text-bloom-ink">
            Cronograma de contratación
          </h2>
        )}
        <p className={`text-sm text-bloom-muted ${embedded ? "mb-0" : "mt-1"}`}>
          Esta boda aún no tiene hitos de contratación.
        </p>

        {error && (
          <p className="mt-4 text-sm text-red-700" role="alert">
            {error}
          </p>
        )}

        {canManage && (
          <button
            type="button"
            onClick={handleGenerarCronograma}
            disabled={generating || !supabase}
            className="mt-5 inline-flex items-center justify-center rounded-full bg-bloom-accent px-5 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-bloom-accent-hover disabled:opacity-60"
          >
            {generating ? "Generando…" : "Generar cronograma"}
          </button>
        )}
      </CronogramaShell>
    );
  }

  return (
    <CronogramaShell embedded={embedded}>
      <div
        className={`flex flex-col gap-4 sm:flex-row sm:items-end ${
          embedded ? "sm:justify-end" : "sm:justify-between"
        }`}
      >
        {!embedded && (
          <div>
            <h2 className="font-display text-xl text-bloom-ink">
              Cronograma de contratación
            </h2>
            <p className="mt-1 text-sm text-bloom-muted">
              Hitos recomendados · boda el {formatShortDate(fechaBoda)}
            </p>
          </div>
        )}
        {embedded && (
          <p className="text-sm text-bloom-muted sm:mr-auto">
            Hitos recomendados · boda el {formatShortDate(fechaBoda)}
          </p>
        )}
        <div className="flex flex-col items-start gap-2 sm:items-end">
          <p className="text-sm font-medium text-bloom-ink">
            {completados} de {total} completados
          </p>
          {canManage && (
            <div className="flex flex-wrap justify-end gap-2">
              {canActualizarPlantilla && (
                <button
                  type="button"
                  onClick={handleActualizarCronograma}
                  disabled={updating || regenerating || !supabase}
                  className="rounded-full border border-bloom-border bg-bloom-surface px-4 py-2 text-xs font-medium text-bloom-ink transition-colors hover:bg-bloom-canvas disabled:opacity-60"
                >
                  {updating ? "Actualizando…" : "Actualizar cronograma"}
                </button>
              )}
              <button
                type="button"
                onClick={handleRegenerarCronograma}
                disabled={regenerating || updating || !supabase}
                className="rounded-full border border-amber-300 bg-amber-50 px-4 py-2 text-xs font-medium text-amber-900 transition-colors hover:bg-amber-100 disabled:opacity-60"
              >
                {regenerating ? "Regenerando…" : "Regenerar cronograma"}
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="mt-5">
        <div className="flex items-center justify-between text-xs text-bloom-muted">
          <span>Progreso</span>
          <span>{progressPct}%</span>
        </div>
        <div
          className="mt-2 h-2 overflow-hidden rounded-full bg-bloom-border"
          role="progressbar"
          aria-valuenow={completados}
          aria-valuemin={0}
          aria-valuemax={total}
          aria-label={`${completados} de ${total} hitos completados`}
        >
          <div
            className="h-full rounded-full bg-bloom-success transition-all duration-300"
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </div>

      {error && (
        <p className="mt-4 text-sm text-red-700" role="alert">
          {error}
        </p>
      )}

      <ul className="mt-5 space-y-2">
        {itemsOrdenados.map((item) => {
          const status = getCronogramaItemStatus(item);
          const isToggling = togglingId === item.id;
          const isDeleting = deletingId === item.id;

          const rowContent = (
            <>
              <span
                className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border ${
                  item.completado
                    ? "border-green-600 bg-green-600 text-white"
                    : "border-bloom-border bg-bloom-surface"
                }`}
                aria-hidden
              >
                {item.completado ? <CheckIcon /> : null}
              </span>

              <span className="min-w-0 flex-1">
                <span className="flex flex-wrap items-center gap-2">
                  <span className="font-medium text-bloom-ink">
                    {item.descripcion}
                  </span>
                  <span
                    className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${CRONOGRAMA_STATUS_BADGE_STYLES[status]}`}
                  >
                    {CRONOGRAMA_STATUS_LABELS[status]}
                  </span>
                </span>
                <span className="mt-1 block text-sm text-bloom-muted">
                  {item.categoria} · límite {formatShortDate(item.fecha_limite)}
                  {item.meses_antes > 0 && (
                    <> · {item.meses_antes} meses antes</>
                  )}
                </span>
              </span>
            </>
          );

          if (!canManage) {
            return (
              <li key={item.id}>
                <div
                  className={`flex w-full items-start gap-3 rounded-xl border px-4 py-3 text-left ${CRONOGRAMA_STATUS_STYLES[status]}`}
                >
                  {rowContent}
                </div>
              </li>
            );
          }

          return (
            <li key={item.id}>
              <div
                className={`flex items-start gap-2 rounded-xl border ${CRONOGRAMA_STATUS_STYLES[status]}`}
              >
                <button
                  type="button"
                  onClick={() => handleToggle(item)}
                  disabled={isToggling || isDeleting}
                  className="flex min-w-0 flex-1 items-start gap-3 px-4 py-3 text-left transition-opacity hover:opacity-90 disabled:opacity-60"
                >
                  {rowContent}
                </button>
                {canActualizarPlantilla && (
                  <button
                    type="button"
                    onClick={() => handleDelete(item)}
                    disabled={isToggling || isDeleting}
                    className="mr-3 mt-3 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-red-200 bg-red-50 text-red-700 transition-colors hover:bg-red-100 disabled:opacity-60"
                    aria-label={`Eliminar hito ${item.descripcion}`}
                    title="Eliminar hito"
                  >
                    <Trash2 className="h-4 w-4" aria-hidden />
                  </button>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </CronogramaShell>
  );
}

function CheckIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 20 20"
      fill="currentColor"
      className="h-3.5 w-3.5"
      aria-hidden
    >
      <path
        fillRule="evenodd"
        d="M16.704 4.153a.75.75 0 0 1 .143 1.052l-8 10.5a.75.75 0 0 1-1.127.075l-4.5-4.5a.75.75 0 1 1 1.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 0 1 1.05-.143Z"
        clipRule="evenodd"
      />
    </svg>
  );
}

