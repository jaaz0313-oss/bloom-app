"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import type { CronogramaItemRow } from "@/app/data/cronograma";
import {
  buildPresupuestoEstimadoLineas,
  collectPresupuestoCategorias,
  sumPresupuestoPorEstado,
  type PresupuestoCategoriaLinea,
  type PresupuestoEstimadoCategoriaRow,
} from "@/app/data/presupuesto-estimado";
import type { ProveedorRow } from "@/app/data/providers";
import {
  canManageClientePortalFlags,
  type UserRole,
} from "@/lib/auth/roles";
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
  role: UserRole;
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

const inputClass =
  "w-full rounded-lg border border-bloom-border bg-white px-3 py-1.5 text-sm text-bloom-ink outline-none focus:border-bloom-accent";

type AddItemForm = {
  categoria: string;
  valor: string;
  descripcion: string;
};

export function PresupuestoEstimadoSection({
  embedded = false,
  bodaId,
  role,
  providers,
  cronogramaItems,
  initialEstimados,
  mostrarAlCliente,
}: PresupuestoEstimadoSectionProps) {
  const router = useRouter();
  const canDelete = canManageClientePortalFlags(role);
  const [estimados, setEstimados] =
    useState<PresupuestoEstimadoCategoriaRow[]>(initialEstimados);
  const [draftValues, setDraftValues] = useState<Record<string, string>>({});
  const [savingCategoria, setSavingCategoria] = useState<string | null>(null);
  const [mostrarCliente, setMostrarCliente] = useState(mostrarAlCliente);
  const [toggling, setToggling] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [addForm, setAddForm] = useState<AddItemForm>({
    categoria: "",
    valor: "",
    descripcion: "",
  });
  const [addSubmitting, setAddSubmitting] = useState(false);
  const [editingDescCategoria, setEditingDescCategoria] = useState<
    string | null
  >(null);
  const [descDraft, setDescDraft] = useState("");
  const [savingDesc, setSavingDesc] = useState(false);

  useEffect(() => {
    setEstimados(initialEstimados);
  }, [initialEstimados]);

  useEffect(() => {
    setMostrarCliente(mostrarAlCliente);
  }, [mostrarAlCliente]);

  const { categorias, personalizadasKeys } = useMemo(
    () => collectPresupuestoCategorias(cronogramaItems, estimados),
    [cronogramaItems, estimados],
  );

  const lineas = useMemo(
    () =>
      buildPresupuestoEstimadoLineas(
        categorias,
        providers,
        estimados,
        personalizadasKeys,
      ),
    [categorias, providers, estimados, personalizadasKeys],
  );

  const totals = useMemo(() => sumPresupuestoPorEstado(lineas), [lineas]);

  const proveedoresActivos = useMemo(
    () =>
      providers
        .filter((p) => p.estado !== "descartado")
        .slice()
        .sort((a, b) => a.nombre.localeCompare(b.nombre, "es")),
    [providers],
  );

  useEffect(() => {
    const next: Record<string, string> = {};
    for (const line of lineas) {
      if (!line.editable || line.incluidoEnProveedorId) continue;
      next[line.categoria] = formatInputCurrencyFromNumber(line.valor || null);
    }
    setDraftValues(next);
  }, [lineas]);

  function findEstimado(
    categoria: string,
  ): PresupuestoEstimadoCategoriaRow | undefined {
    return estimados.find(
      (row) =>
        row.categoria.trim().toLowerCase() === categoria.trim().toLowerCase(),
    );
  }

  async function upsertEstimadoFields(
    categoria: string,
    fields: {
      valor_estimado?: number;
      notas?: string | null;
      incluido_en_proveedor_id?: string | null;
    },
  ): Promise<PresupuestoEstimadoCategoriaRow | null> {
    if (!supabase) {
      setError("Supabase no está configurado.");
      return null;
    }

    const existing = findEstimado(categoria);
    const payload = {
      ...fields,
      updated_at: new Date().toISOString(),
    };

    if (existing) {
      const { data, error: updateError } = await supabase
        .from("presupuesto_estimado_categorias")
        .update(payload)
        .eq("id", existing.id)
        .select("*")
        .single();

      if (updateError) {
        setError(updateError.message);
        return null;
      }

      const updated = data as PresupuestoEstimadoCategoriaRow;
      setEstimados((prev) =>
        prev.map((row) => (row.id === updated.id ? updated : row)),
      );
      return updated;
    }

    const { data, error: insertError } = await supabase
      .from("presupuesto_estimado_categorias")
      .insert({
        boda_id: bodaId,
        categoria,
        valor_estimado: fields.valor_estimado ?? 0,
        notas: fields.notas ?? null,
        incluido_en_proveedor_id: fields.incluido_en_proveedor_id ?? null,
      })
      .select("*")
      .single();

    if (insertError) {
      setError(insertError.message);
      return null;
    }

    const created = data as PresupuestoEstimadoCategoriaRow;
    setEstimados((prev) => [...prev, created]);
    return created;
  }

  async function saveEstimado(categoria: string, rawValue: string) {
    if (!supabase || savingCategoria) return;

    const amount = parseInputCurrency(rawValue);
    if (!Number.isFinite(amount) || amount < 0) {
      setError("Ingresa un valor estimado válido (>= 0).");
      return;
    }

    setSavingCategoria(categoria);
    setError(null);

    try {
      const saved = await upsertEstimadoFields(categoria, {
        valor_estimado: Math.round(amount),
      });
      if (saved) router.refresh();
    } finally {
      setSavingCategoria(null);
    }
  }

  async function toggleIncluido(
    line: PresupuestoCategoriaLinea,
    checked: boolean,
    proveedorId?: string,
  ) {
    if (!line.editable || savingCategoria) return;

    setSavingCategoria(line.categoria);
    setError(null);

    try {
      const nextProveedorId = checked
        ? proveedorId ||
          line.incluidoEnProveedorId ||
          proveedoresActivos[0]?.id ||
          null
        : null;

      if (checked && !nextProveedorId) {
        setError("Selecciona un proveedor que incluya este ítem.");
        return;
      }

      const saved = await upsertEstimadoFields(line.categoria, {
        incluido_en_proveedor_id: nextProveedorId,
        ...(checked ? { valor_estimado: 0 } : {}),
      });
      if (saved) router.refresh();
    } finally {
      setSavingCategoria(null);
    }
  }

  async function saveDescripcion(categoria: string) {
    if (savingDesc) return;
    setSavingDesc(true);
    setError(null);

    try {
      const saved = await upsertEstimadoFields(categoria, {
        notas: descDraft.trim() || null,
      });
      if (saved) {
        setEditingDescCategoria(null);
        setDescDraft("");
        router.refresh();
      }
    } finally {
      setSavingDesc(false);
    }
  }

  async function handleDelete(line: PresupuestoCategoriaLinea) {
    if (!canDelete || !line.estimadoId || !supabase || deletingId) return;

    const confirmed = window.confirm(
      `¿Eliminar el ítem "${line.categoria}" del presupuesto estimado?`,
    );
    if (!confirmed) return;

    setDeletingId(line.estimadoId);
    setError(null);

    try {
      const { error: deleteError } = await supabase
        .from("presupuesto_estimado_categorias")
        .delete()
        .eq("id", line.estimadoId);

      if (deleteError) {
        setError(deleteError.message);
        return;
      }

      setEstimados((prev) => prev.filter((row) => row.id !== line.estimadoId));
      router.refresh();
    } finally {
      setDeletingId(null);
    }
  }

  async function handleAddItem(e: React.FormEvent) {
    e.preventDefault();
    if (!supabase || addSubmitting) return;

    const categoria = addForm.categoria.trim();
    if (!categoria) {
      setError("Ingresa el nombre de la categoría.");
      return;
    }

    const amount = parseInputCurrency(addForm.valor);
    if (!Number.isFinite(amount) || amount < 0) {
      setError("Ingresa un valor estimado válido (>= 0).");
      return;
    }

    const duplicate = estimados.some(
      (row) =>
        row.categoria.trim().toLowerCase() === categoria.toLowerCase(),
    );
    const duplicateCronograma = categorias.some(
      (c) => c.trim().toLowerCase() === categoria.toLowerCase(),
    );
    if (duplicate || duplicateCronograma) {
      setError("Ya existe un ítem con esa categoría.");
      return;
    }

    setAddSubmitting(true);
    setError(null);

    try {
      const { data, error: insertError } = await supabase
        .from("presupuesto_estimado_categorias")
        .insert({
          boda_id: bodaId,
          categoria,
          valor_estimado: Math.round(amount),
          notas: addForm.descripcion.trim() || null,
        })
        .select("*")
        .single();

      if (insertError) {
        setError(insertError.message);
        return;
      }

      setEstimados((prev) => [...prev, data as PresupuestoEstimadoCategoriaRow]);
      setAddForm({ categoria: "", valor: "", descripcion: "" });
      setAddOpen(false);
      router.refresh();
    } finally {
      setAddSubmitting(false);
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

      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => {
            setAddOpen((open) => !open);
            setError(null);
          }}
          className="inline-flex items-center justify-center rounded-full border border-bloom-border bg-bloom-surface px-4 py-2 text-sm font-medium text-bloom-ink transition-colors hover:bg-bloom-canvas"
        >
          {addOpen ? "Cancelar" : "+ Agregar ítem"}
        </button>
      </div>

      {addOpen ? (
        <form
          onSubmit={handleAddItem}
          className="space-y-3 rounded-xl border border-bloom-border bg-bloom-canvas/40 p-4"
        >
          <p className="text-sm font-medium text-bloom-ink">
            Nuevo ítem personalizado
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block space-y-1.5 text-sm">
              <span className="font-medium text-bloom-ink">
                Nombre de la categoría
              </span>
              <input
                className={inputClass}
                value={addForm.categoria}
                onChange={(e) =>
                  setAddForm((s) => ({ ...s, categoria: e.target.value }))
                }
                placeholder="Ej. Favores, Transporte extras…"
                disabled={addSubmitting}
                required
              />
            </label>
            <label className="block space-y-1.5 text-sm">
              <span className="font-medium text-bloom-ink">Valor estimado</span>
              <input
                className={inputClass}
                inputMode="numeric"
                value={addForm.valor}
                onChange={(e) =>
                  setAddForm((s) => ({
                    ...s,
                    valor: formatInputCurrency(e.target.value),
                  }))
                }
                placeholder="0"
                disabled={addSubmitting}
              />
            </label>
          </div>
          <label className="block space-y-1.5 text-sm">
            <span className="font-medium text-bloom-ink">
              Descripción (opcional)
            </span>
            <input
              className={inputClass}
              value={addForm.descripcion}
              onChange={(e) =>
                setAddForm((s) => ({ ...s, descripcion: e.target.value }))
              }
              placeholder="Detalle breve del ítem"
              disabled={addSubmitting}
            />
          </label>
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={addSubmitting}
              className="rounded-full bg-bloom-accent px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-bloom-accent-hover disabled:opacity-60"
            >
              {addSubmitting ? "Guardando…" : "Guardar ítem"}
            </button>
          </div>
        </form>
      ) : null}

      {lineas.length === 0 ? (
        <p className="rounded-xl border border-dashed border-bloom-border bg-bloom-canvas/40 px-4 py-8 text-center text-sm text-bloom-muted">
          Aún no hay categorías. Genera el cronograma de contratación o agrega
          un ítem personalizado.
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
                  <th className="px-4 py-3 font-medium">
                    <span className="sr-only">Acciones</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-bloom-border/70 bg-bloom-surface">
                {lineas.map((line) => {
                  const isIncluidoManual = Boolean(
                    line.editable && line.incluidoEnProveedorId,
                  );
                  const busy =
                    savingCategoria === line.categoria ||
                    deletingId === line.estimadoId;

                  return (
                    <tr key={line.categoria}>
                      <td className="px-4 py-3 align-top">
                        <p className="font-medium text-bloom-ink">
                          {line.categoria}
                          {line.esPersonalizado ? (
                            <span className="ml-2 inline-flex rounded-full bg-bloom-canvas px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-bloom-muted">
                              Personalizado
                            </span>
                          ) : null}
                        </p>
                        {line.incluidoEn && !line.editable ? (
                          <p className="mt-0.5 text-xs text-bloom-muted">
                            Incluido en {line.incluidoEn}
                          </p>
                        ) : line.proveedorNombre ? (
                          <p className="mt-0.5 text-xs text-bloom-muted">
                            {line.proveedorNombre}
                          </p>
                        ) : null}

                        {line.editable ? (
                          <div className="mt-2 space-y-2">
                            {editingDescCategoria === line.categoria ? (
                              <div className="space-y-1.5">
                                <input
                                  className={inputClass}
                                  value={descDraft}
                                  onChange={(e) => setDescDraft(e.target.value)}
                                  placeholder="Descripción…"
                                  disabled={savingDesc}
                                  autoFocus
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter") {
                                      e.preventDefault();
                                      void saveDescripcion(line.categoria);
                                    }
                                    if (e.key === "Escape") {
                                      setEditingDescCategoria(null);
                                      setDescDraft("");
                                    }
                                  }}
                                />
                                <div className="flex gap-2">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setEditingDescCategoria(null);
                                      setDescDraft("");
                                    }}
                                    disabled={savingDesc}
                                    className="text-xs font-medium text-bloom-muted hover:text-bloom-ink disabled:opacity-60"
                                  >
                                    Cancelar
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      void saveDescripcion(line.categoria)
                                    }
                                    disabled={savingDesc}
                                    className="text-xs font-medium text-bloom-accent hover:text-bloom-accent-hover disabled:opacity-60"
                                  >
                                    {savingDesc ? "Guardando…" : "Guardar"}
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingDescCategoria(line.categoria);
                                  setDescDraft(line.notas ?? "");
                                }}
                                className="block max-w-xs text-left text-xs text-bloom-muted transition-colors hover:text-bloom-ink"
                              >
                                {line.notas?.trim()
                                  ? line.notas.trim()
                                  : "Agregar descripción…"}
                              </button>
                            )}

                            <label className="flex flex-wrap items-center gap-2 text-xs text-bloom-ink">
                              <input
                                type="checkbox"
                                className="h-3.5 w-3.5 rounded border-bloom-border text-bloom-accent focus:ring-bloom-accent/30"
                                checked={isIncluidoManual}
                                disabled={busy || proveedoresActivos.length === 0}
                                onChange={(e) =>
                                  void toggleIncluido(line, e.target.checked)
                                }
                              />
                              Incluido en otro proveedor
                            </label>
                            {isIncluidoManual ? (
                              <select
                                className={`${inputClass} max-w-xs`}
                                value={line.incluidoEnProveedorId ?? ""}
                                disabled={busy}
                                onChange={(e) =>
                                  void toggleIncluido(
                                    line,
                                    true,
                                    e.target.value,
                                  )
                                }
                              >
                                {proveedoresActivos.map((p) => (
                                  <option key={p.id} value={p.id}>
                                    {p.nombre}
                                    {p.categoria ? ` (${p.categoria})` : ""}
                                  </option>
                                ))}
                              </select>
                            ) : null}
                          </div>
                        ) : line.notas?.trim() ? (
                          <p className="mt-1 max-w-xs text-xs text-bloom-muted">
                            {line.notas.trim()}
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
                        {line.editable && isIncluidoManual ? (
                          <span className="text-sm font-medium text-bloom-ink">
                            Incluido en {line.incluidoEn}
                          </span>
                        ) : line.editable ? (
                          <div className="flex flex-wrap items-center gap-2">
                            <input
                              className="w-36 rounded-lg border border-bloom-border bg-white px-3 py-1.5 text-sm text-bloom-ink outline-none focus:border-bloom-accent"
                              inputMode="numeric"
                              value={draftValues[line.categoria] ?? ""}
                              disabled={busy}
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
                          <span className="text-sm text-bloom-muted">
                            Incluido en {line.incluidoEn}
                          </span>
                        ) : (
                          <span className="font-medium text-bloom-ink">
                            {line.valor > 0
                              ? formatCurrency(line.valor)
                              : "Por definir"}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 align-top">
                        {canDelete && line.estimadoId ? (
                          <button
                            type="button"
                            onClick={() => void handleDelete(line)}
                            disabled={busy}
                            aria-label={`Eliminar ${line.categoria}`}
                            title="Eliminar ítem"
                            className="inline-flex h-8 w-8 items-center justify-center rounded-full text-bloom-muted transition-colors hover:bg-red-50 hover:text-red-700 disabled:opacity-50"
                          >
                            <Trash2 className="h-4 w-4" aria-hidden />
                          </button>
                        ) : null}
                      </td>
                    </tr>
                  );
                })}
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
