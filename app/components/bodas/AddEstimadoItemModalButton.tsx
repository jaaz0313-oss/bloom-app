"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ResponsiveModal } from "@/app/components/ui/ResponsiveModal";
import type { PresupuestoEstimadoCategoriaRow } from "@/app/data/presupuesto-estimado";
import { PROVIDER_CATEGORIES } from "@/lib/provider-categories";
import {
  formatInputCurrency,
  parseInputCurrency,
} from "@/lib/format";
import { supabase } from "@/lib/supabase";

type AddEstimadoItemModalButtonProps = {
  bodaId: string;
  existingEstimados: PresupuestoEstimadoCategoriaRow[];
  onCreated: (row: PresupuestoEstimadoCategoriaRow) => void;
};

const inputClass =
  "w-full rounded-xl border border-bloom-border bg-bloom-canvas px-3 py-2 text-sm text-bloom-ink outline-none focus:border-bloom-accent focus:ring-2 focus:ring-bloom-accent/30";

export function AddEstimadoItemModalButton({
  bodaId,
  existingEstimados,
  onCreated,
}: AddEstimadoItemModalButtonProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [categoria, setCategoria] = useState("");
  const [valor, setValor] = useState("");
  const [notas, setNotas] = useState("");
  const [mostrarNotaCliente, setMostrarNotaCliente] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const usedCategories = useMemo(
    () =>
      new Set(
        existingEstimados.map((row) => row.categoria.trim().toLowerCase()),
      ),
    [existingEstimados],
  );

  function resetForm() {
    setCategoria("");
    setValor("");
    setNotas("");
    setMostrarNotaCliente(false);
    setError(null);
  }

  function close() {
    if (submitting) return;
    setOpen(false);
    resetForm();
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!supabase || submitting) return;

    const cat = categoria.trim();
    if (!cat) {
      setError("Selecciona una categoría.");
      return;
    }
    if (usedCategories.has(cat.toLowerCase())) {
      setError("Ya existe un ítem estimado para esa categoría.");
      return;
    }

    const amount = parseInputCurrency(valor);
    if (!Number.isFinite(amount) || amount < 0) {
      setError("Ingresa un valor estimado válido (>= 0).");
      return;
    }

    const nextOrden =
      Math.max(
        -1,
        ...existingEstimados.map((row) =>
          Number.isFinite(Number(row.orden)) ? Number(row.orden) : -1,
        ),
      ) + 1;

    setSubmitting(true);
    setError(null);

    try {
      const { data, error: insertError } = await supabase
        .from("presupuesto_estimado_categorias")
        .insert({
          boda_id: bodaId,
          categoria: cat,
          valor_estimado: Math.round(amount),
          notas: notas.trim() || null,
          mostrar_nota_cliente: mostrarNotaCliente,
          orden: nextOrden,
        })
        .select("*")
        .single();

      if (insertError) {
        setError(insertError.message);
        return;
      }

      onCreated(data as PresupuestoEstimadoCategoriaRow);
      setOpen(false);
      resetForm();
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center justify-center rounded-full border border-bloom-border bg-bloom-surface px-4 py-2.5 text-sm font-medium text-bloom-ink transition-colors hover:bg-bloom-canvas"
      >
        Agregar ítem estimado
      </button>

      <ResponsiveModal
        open={open}
        onClose={close}
        title="Agregar ítem estimado"
        subtitle="Reserva un valor tentativo para una categoría aún sin proveedor."
        size="md"
        closeDisabled={submitting}
        footer={
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={close}
              disabled={submitting}
              className="rounded-full border border-bloom-border bg-bloom-surface px-4 py-2 text-sm font-medium text-bloom-ink hover:bg-bloom-canvas disabled:opacity-60"
            >
              Cancelar
            </button>
            <button
              type="submit"
              form="add-estimado-item-form"
              disabled={submitting}
              className="rounded-full bg-bloom-accent px-4 py-2 text-sm font-medium text-white hover:bg-bloom-accent-hover disabled:opacity-60"
            >
              {submitting ? "Guardando…" : "Guardar"}
            </button>
          </div>
        }
      >
        <form
          id="add-estimado-item-form"
          className="space-y-4"
          onSubmit={handleSubmit}
        >
          <label className="block space-y-1.5 text-sm">
            <span className="font-medium text-bloom-ink">Categoría</span>
            <select
              className={inputClass}
              value={categoria}
              onChange={(e) => setCategoria(e.target.value)}
              required
              disabled={submitting}
            >
              <option value="">Selecciona…</option>
              {PROVIDER_CATEGORIES.map((cat) => (
                <option
                  key={cat}
                  value={cat}
                  disabled={usedCategories.has(cat.toLowerCase())}
                >
                  {cat}
                </option>
              ))}
            </select>
          </label>

          <label className="block space-y-1.5 text-sm">
            <span className="font-medium text-bloom-ink">Valor estimado</span>
            <input
              className={inputClass}
              inputMode="numeric"
              value={valor}
              onChange={(e) => setValor(formatInputCurrency(e.target.value))}
              placeholder="0"
              disabled={submitting}
            />
          </label>

          <label className="block space-y-1.5 text-sm">
            <span className="font-medium text-bloom-ink">Notas (opcional)</span>
            <textarea
              className={`${inputClass} min-h-[72px] resize-y`}
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
              placeholder="Detalle interno o para el cliente"
              disabled={submitting}
              rows={3}
            />
          </label>

          <label className="inline-flex cursor-pointer items-center gap-2.5 text-sm text-bloom-ink">
            <span
              className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors ${
                mostrarNotaCliente ? "bg-bloom-accent" : "bg-bloom-border"
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                  mostrarNotaCliente ? "translate-x-4" : "translate-x-0.5"
                }`}
              />
              <input
                type="checkbox"
                className="sr-only"
                checked={mostrarNotaCliente}
                disabled={submitting}
                onChange={(e) => setMostrarNotaCliente(e.target.checked)}
              />
            </span>
            Mostrar nota al cliente
          </label>

          {error ? (
            <p className="text-sm text-red-700" role="alert">
              {error}
            </p>
          ) : null}
        </form>
      </ResponsiveModal>
    </>
  );
}
