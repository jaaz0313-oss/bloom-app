"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { CronogramaItemRow } from "@/app/data/cronograma";
import {
  buildPresupuestoEstimadoLineas,
  getCategoriasPresupuestoFromCronograma,
  sumPresupuestoPorEstado,
  type PresupuestoEstimadoCategoriaRow,
} from "@/app/data/presupuesto-estimado";
import type { ProveedorRow } from "@/app/data/providers";
import {
  formatCurrency,
  formatInputCurrency,
  formatInputCurrencyFromNumber,
  parseInputCurrency,
} from "@/lib/format";
import { supabase } from "@/lib/supabase";

type PresupuestoEstimadoSectionProps = {
  embedded?: boolean;
  bodaId: string;
  providers: ProveedorRow[];
  cronogramaItems: CronogramaItemRow[];
  initialEstimados: PresupuestoEstimadoCategoriaRow[];
  mostrarAlCliente: boolean;
};

const ESTADO_LABEL: Record<string, string> = {
  contratado: "Contratado",
  en_evaluacion: "En evaluación",
  estimado: "Estimado",
};

const ESTADO_CLASS: Record<string, string> = {
  contratado: "bg-emerald-100 text-emerald-800",
  en_evaluacion: "bg-amber-100 text-amber-800",
  estimado: "bg-bloom-border/70 text-bloom-muted",
};

export function PresupuestoEstimadoSection({
  embedded = false,
  bodaId,
  providers,
  cronogramaItems,
  initialEstimados,
  mostrarAlCliente,
}: PresupuestoEstimadoSectionProps) {
  const router = useRouter();
  const [estimados, setEstimados] =
    useState<PresupuestoEstimadoCategoriaRow[]>(initialEstimados);
  const [draftValues, setDraftValues] = useState<Record<string, string>>({});
  const [savingCategoria, setSavingCategoria] = useState<string | null>(null);
  const [mostrarCliente, setMostrarCliente] = useState(mostrarAlCliente);
  const [toggling, setToggling] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setEstimados(initialEstimados);
  }, [initialEstimados]);

  useEffect(() => {
    setMostrarCliente(mostrarAlCliente);
  }, [mostrarAlCliente]);

  const categorias = useMemo(
    () => getCategoriasPresupuestoFromCronograma(cronogramaItems),
    [cronogramaItems],
  );

  const lineas = useMemo(
    () => buildPresupuestoEstimadoLineas(categorias, providers, estimados),
    [categorias, providers, estimados],
  );

  const totals = useMemo(() => sumPresupuestoPorEstado(lineas), [lineas]);

  useEffect(() => {
    const next: Record<string, string> = {};
    for (const line of lineas) {
      if (!line.editable) continue;
      next[line.categoria] = formatInputCurrencyFromNumber(line.valor || null);
    }
    setDraftValues(next);
  }, [lineas]);

  async function saveEstimado(categoria: string, rawValue: string) {
    if (!supabase || savingCategoria) return;

    const amount = parseInputCurrency(rawValue);
    if (!Number.isFinite(amount) || amount < 0) {
      setError("Ingresa un valor estimado válido (>= 0).");
      return;
    }

    const existing = estimados.find(
      (row) =>
        row.categoria.trim().toLowerCase() === categoria.trim().toLowerCase(),
    );

    setSavingCategoria(categoria);
    setError(null);

    try {
      if (existing) {
        const { data, error: updateError } = await supabase
          .from("presupuesto_estimado_categorias")
          .update({
            valor_estimado: Math.round(amount),
            updated_at: new Date().toISOString(),
          })
          .eq("id", existing.id)
          .select("*")
          .single();

        if (updateError) {
          setError(updateError.message);
          return;
        }

        const updated = data as PresupuestoEstimadoCategoriaRow;
        setEstimados((prev) =>
          prev.map((row) => (row.id === updated.id ? updated : row)),
        );
      } else {
        const { data, error: insertError } = await supabase
          .from("presupuesto_estimado_categorias")
          .insert({
            boda_id: bodaId,
            categoria,
            valor_estimado: Math.round(amount),
          })
          .select("*")
          .single();

        if (insertError) {
          setError(insertError.message);
          return;
        }

        const created = data as PresupuestoEstimadoCategoriaRow;
        setEstimados((prev) => [...prev, created]);
      }

      router.refresh();
    } finally {
      setSavingCategoria(null);
    }
  }

  async function toggleMostrarAlCliente(next: boolean) {
    if (!supabase || toggling) return;

    const previous = mostrarCliente;
    setMostrarCliente(next);
    setToggling(true);
    setError(null);

    try {
      const { error: updateError } = await supabase
        .from("bodas")
        .update({ mostrar_presupuesto_estimado_cliente: next })
        .eq("id", bodaId);

      if (updateError) {
        setMostrarCliente(previous);
        setError(updateError.message);
        return;
      }

      router.refresh();
    } finally {
      setToggling(false);
    }
  }

  const content = (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-bloom-muted">
          Completa valores estimados en categorías sin proveedor. Los
          contratados y en evaluación se toman automáticamente.
        </p>
        <label className="inline-flex cursor-pointer items-center gap-2.5 rounded-full border border-bloom-border bg-bloom-canvas/50 px-3 py-2 text-sm text-bloom-ink">
          <span
            className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors ${
              mostrarCliente ? "bg-bloom-accent" : "bg-bloom-border"
            } ${toggling ? "opacity-60" : ""}`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                mostrarCliente ? "translate-x-4" : "translate-x-0.5"
              }`}
            />
            <input
              type="checkbox"
              className="sr-only"
              checked={mostrarCliente}
              disabled={toggling}
              onChange={(e) => toggleMostrarAlCliente(e.target.checked)}
            />
          </span>
          Mostrar presupuesto estimado al cliente
        </label>
      </div>

      {error && (
        <p className="text-sm text-red-700" role="alert">
          {error}
        </p>
      )}

      {categorias.length === 0 ? (
        <p className="rounded-xl border border-dashed border-bloom-border bg-bloom-canvas/40 px-4 py-8 text-center text-sm text-bloom-muted">
          Aún no hay categorías de cronograma. Genera el cronograma de
          contratación para armar el presupuesto estimado.
        </p>
      ) : (
        <>
          <div className="overflow-x-auto rounded-xl border border-bloom-border">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-bloom-canvas/80 text-xs uppercase tracking-wide text-bloom-muted">
                <tr>
                  <th className="px-4 py-3 font-medium">Categoría</th>
                  <th className="px-4 py-3 font-medium">Estado</th>
                  <th className="px-4 py-3 font-medium">Valor</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-bloom-border/70 bg-bloom-surface">
                {lineas.map((line) => (
                  <tr key={line.categoria}>
                    <td className="px-4 py-3 align-top">
                      <p className="font-medium text-bloom-ink">
                        {line.categoria}
                      </p>
                      {line.incluidoEn ? (
                        <p className="mt-0.5 text-xs text-bloom-muted">
                          Incluido en {line.incluidoEn}
                        </p>
                      ) : line.proveedorNombre ? (
                        <p className="mt-0.5 text-xs text-bloom-muted">
                          {line.proveedorNombre}
                        </p>
                      ) : null}
                    </td>
                    <td className="px-4 py-3 align-top">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${ESTADO_CLASS[line.estado]}`}
                      >
                        {ESTADO_LABEL[line.estado]}
                      </span>
                    </td>
                    <td className="px-4 py-3 align-top">
                      {line.editable ? (
                        <div className="flex flex-wrap items-center gap-2">
                          <input
                            className="w-36 rounded-lg border border-bloom-border bg-white px-3 py-1.5 text-sm text-bloom-ink outline-none focus:border-bloom-accent"
                            inputMode="numeric"
                            value={draftValues[line.categoria] ?? ""}
                            disabled={savingCategoria === line.categoria}
                            onChange={(e) => {
                              const formatted = formatInputCurrency(
                                e.target.value,
                              );
                              setDraftValues((prev) => ({
                                ...prev,
                                [line.categoria]: formatted,
                              }));
                            }}
                            onBlur={() =>
                              saveEstimado(
                                line.categoria,
                                draftValues[line.categoria] ?? "",
                              )
                            }
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                e.currentTarget.blur();
                              }
                            }}
                            placeholder="0"
                          />
                          {savingCategoria === line.categoria ? (
                            <span className="text-xs text-bloom-muted">
                              Guardando…
                            </span>
                          ) : null}
                        </div>
                      ) : line.incluidoEn ? (
                        <span className="text-bloom-muted">—</span>
                      ) : (
                        <span className="font-medium text-bloom-ink">
                          {line.valor > 0
                            ? formatCurrency(line.valor)
                            : "Por definir"}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="grid gap-3 rounded-xl border border-bloom-border bg-bloom-canvas/50 p-4 sm:grid-cols-4">
            <TotalChip label="Contratados" value={totals.contratado} />
            <TotalChip label="En evaluación" value={totals.enEvaluacion} />
            <TotalChip label="Estimados" value={totals.estimado} />
            <TotalChip label="Total general" value={totals.total} emphasize />
          </div>
        </>
      )}
    </div>
  );

  if (embedded) return content;

  return (
    <section className="rounded-2xl border border-bloom-border bg-bloom-surface p-5 shadow-sm sm:p-6">
      <h2 className="font-display text-xl text-bloom-ink">
        Presupuesto estimado
      </h2>
      <div className="mt-4">{content}</div>
    </section>
  );
}

function TotalChip({
  label,
  value,
  emphasize = false,
}: {
  label: string;
  value: number;
  emphasize?: boolean;
}) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wide text-bloom-muted">
        {label}
      </p>
      <p
        className={`mt-1 font-display ${
          emphasize ? "text-xl text-bloom-ink" : "text-lg text-bloom-ink"
        }`}
      >
        {formatCurrency(value)}
      </p>
    </div>
  );
}
