"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  CRONOGRAMA_STATUS_BADGE_STYLES,
  CRONOGRAMA_STATUS_LABELS,
  CRONOGRAMA_STATUS_STYLES,
  getCronogramaItemStatus,
  type CronogramaItemRow,
} from "@/app/data/cronograma";
import { insertarCronograma, regenerarCronograma } from "@/lib/cronograma";
import { formatShortDate } from "@/lib/format";
import { supabase } from "@/lib/supabase";

type CronogramaContratacionProps = {
  bodaId: string;
  fechaBoda: string;
  canManage: boolean;
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
  embedded = false,
}: CronogramaContratacionProps) {
  const router = useRouter();
  const [items, setItems] = useState<CronogramaItemRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [regenerating, setRegenerating] = useState(false);

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
            <button
              type="button"
              onClick={handleRegenerarCronograma}
              disabled={regenerating || !supabase}
              className="rounded-full border border-amber-300 bg-amber-50 px-4 py-2 text-xs font-medium text-amber-900 transition-colors hover:bg-amber-100 disabled:opacity-60"
            >
              {regenerating ? "Regenerando…" : "Regenerar cronograma"}
            </button>
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
              <button
                type="button"
                onClick={() => handleToggle(item)}
                disabled={isToggling}
                className={`flex w-full items-start gap-3 rounded-xl border px-4 py-3 text-left transition-opacity hover:opacity-90 disabled:opacity-60 ${CRONOGRAMA_STATUS_STYLES[status]}`}
              >
                {rowContent}
              </button>
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

