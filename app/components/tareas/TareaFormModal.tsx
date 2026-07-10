"use client";

import { useEffect, useState } from "react";
import { ResponsiveModal } from "@/app/components/ui/ResponsiveModal";
import {
  normalizeTareaPrioridad,
  TAREA_PRIORIDAD_LABELS,
  type TareaPrioridad,
  type TareaRow,
} from "@/app/data/tareas";
import { supabase } from "@/lib/supabase";

export type TareaEquipoUsuario = {
  id: string;
  username: string;
  nombre: string;
};

export type TareaBodaOption = {
  id: string;
  nombre_pareja: string;
};

type TareaFormModalProps = {
  open: boolean;
  onClose: () => void;
  mode: "create" | "edit";
  tarea?: TareaRow | null;
  equipo: TareaEquipoUsuario[];
  bodas: TareaBodaOption[];
  currentUsername: string;
  onSaved: (tarea: TareaRow) => void;
};

type FormState = {
  titulo: string;
  descripcion: string;
  bodaId: string;
  asignadoA: string;
  prioridad: TareaPrioridad;
  fechaLimite: string;
};

const inputClass =
  "w-full rounded-xl border border-bloom-border bg-bloom-canvas px-3 py-2 text-sm text-bloom-ink outline-none ring-0 focus:border-bloom-accent focus:ring-2 focus:ring-bloom-accent/30";

const textareaClass =
  "w-full resize-y rounded-xl border border-bloom-border bg-bloom-canvas px-3 py-2 text-sm text-bloom-ink outline-none ring-0 focus:border-bloom-accent focus:ring-2 focus:ring-bloom-accent/30";

function emptyForm(defaultAsignado: string): FormState {
  return {
    titulo: "",
    descripcion: "",
    bodaId: "",
    asignadoA: defaultAsignado,
    prioridad: "media",
    fechaLimite: "",
  };
}

function formFromTarea(tarea: TareaRow): FormState {
  return {
    titulo: tarea.titulo,
    descripcion: tarea.descripcion ?? "",
    bodaId: tarea.boda_id ?? "",
    asignadoA: tarea.asignado_a,
    prioridad: normalizeTareaPrioridad(tarea.prioridad),
    fechaLimite: tarea.fecha_limite ?? "",
  };
}

export function TareaFormModal({
  open,
  onClose,
  mode,
  tarea,
  equipo,
  bodas,
  currentUsername,
  onSaved,
}: TareaFormModalProps) {
  const defaultAsignado =
    equipo.find((u) => u.username === currentUsername)?.username ??
    equipo[0]?.username ??
    currentUsername;

  const [form, setForm] = useState<FormState>(() => emptyForm(defaultAsignado));
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setError(null);
    setForm(
      mode === "edit" && tarea
        ? formFromTarea(tarea)
        : emptyForm(defaultAsignado),
    );
  }, [open, mode, tarea, defaultAsignado]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const titulo = form.titulo.trim();
    if (!titulo) {
      setError("Ingresa el título de la tarea.");
      return;
    }
    if (!form.asignadoA.trim()) {
      setError("Selecciona a quién asignar la tarea.");
      return;
    }
    if (!supabase) {
      setError("Supabase no está configurado.");
      return;
    }

    const payload = {
      titulo,
      descripcion: form.descripcion.trim() || null,
      boda_id: form.bodaId || null,
      asignado_a: form.asignadoA.trim(),
      prioridad: form.prioridad,
      fecha_limite: form.fechaLimite || null,
      updated_at: new Date().toISOString(),
    };

    setSubmitting(true);
    try {
      if (mode === "edit" && tarea) {
        const { data, error: updateError } = await supabase
          .from("tareas")
          .update(payload)
          .eq("id", tarea.id)
          .select("*")
          .single();

        if (updateError) {
          setError(updateError.message);
          return;
        }

        onSaved(data as TareaRow);
        onClose();
        return;
      }

      const { data, error: insertError } = await supabase
        .from("tareas")
        .insert({
          ...payload,
          creado_por: currentUsername,
          completada: false,
        })
        .select("*")
        .single();

      if (insertError) {
        setError(insertError.message);
        return;
      }

      onSaved(data as TareaRow);
      onClose();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <ResponsiveModal
      open={open}
      onClose={onClose}
      title={mode === "edit" ? "Editar tarea" : "Nueva tarea"}
      subtitle={
        mode === "edit"
          ? "Actualiza los detalles de la tarea."
          : "Asigna una tarea al equipo."
      }
      size="md"
      closeDisabled={submitting}
      footer={
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="rounded-full border border-bloom-border bg-bloom-surface px-4 py-2 text-sm font-medium text-bloom-ink transition-colors hover:bg-bloom-canvas disabled:opacity-60"
          >
            Cancelar
          </button>
          <button
            type="submit"
            form="tarea-form"
            disabled={submitting}
            className="rounded-full bg-bloom-accent px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-bloom-accent-hover disabled:opacity-60"
          >
            {submitting
              ? "Guardando…"
              : mode === "edit"
                ? "Guardar cambios"
                : "Crear tarea"}
          </button>
        </div>
      }
    >
      <form id="tarea-form" className="space-y-4" onSubmit={handleSubmit}>
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-bloom-ink" htmlFor="tarea-titulo">
            Título
          </label>
          <input
            id="tarea-titulo"
            className={inputClass}
            value={form.titulo}
            onChange={(e) => setForm((s) => ({ ...s, titulo: e.target.value }))}
            placeholder="Ej: Confirmar menú con catering"
            required
            disabled={submitting}
          />
        </div>

        <div className="space-y-1.5">
          <label
            className="text-sm font-medium text-bloom-ink"
            htmlFor="tarea-descripcion"
          >
            Descripción
          </label>
          <textarea
            id="tarea-descripcion"
            className={textareaClass}
            value={form.descripcion}
            onChange={(e) =>
              setForm((s) => ({ ...s, descripcion: e.target.value }))
            }
            rows={3}
            placeholder="Detalles opcionales"
            disabled={submitting}
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-medium text-bloom-ink" htmlFor="tarea-boda">
            Boda asociada
          </label>
          <select
            id="tarea-boda"
            className={inputClass}
            value={form.bodaId}
            onChange={(e) => setForm((s) => ({ ...s, bodaId: e.target.value }))}
            disabled={submitting}
          >
            <option value="">Sin boda</option>
            {bodas.map((boda) => (
              <option key={boda.id} value={boda.id}>
                {boda.nombre_pareja}
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <label
              className="text-sm font-medium text-bloom-ink"
              htmlFor="tarea-asignado"
            >
              Asignado a
            </label>
            <select
              id="tarea-asignado"
              className={inputClass}
              value={form.asignadoA}
              onChange={(e) =>
                setForm((s) => ({ ...s, asignadoA: e.target.value }))
              }
              required
              disabled={submitting}
            >
              {equipo.map((usuario) => (
                <option key={usuario.id} value={usuario.username}>
                  {usuario.nombre}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label
              className="text-sm font-medium text-bloom-ink"
              htmlFor="tarea-prioridad"
            >
              Prioridad
            </label>
            <select
              id="tarea-prioridad"
              className={inputClass}
              value={form.prioridad}
              onChange={(e) =>
                setForm((s) => ({
                  ...s,
                  prioridad: normalizeTareaPrioridad(e.target.value),
                }))
              }
              disabled={submitting}
            >
              {(Object.keys(TAREA_PRIORIDAD_LABELS) as TareaPrioridad[]).map(
                (prioridad) => (
                  <option key={prioridad} value={prioridad}>
                    {TAREA_PRIORIDAD_LABELS[prioridad]}
                  </option>
                ),
              )}
            </select>
          </div>
        </div>

        <div className="space-y-1.5">
          <label
            className="text-sm font-medium text-bloom-ink"
            htmlFor="tarea-fecha-limite"
          >
            Fecha límite
          </label>
          <input
            id="tarea-fecha-limite"
            type="date"
            className={inputClass}
            value={form.fechaLimite}
            onChange={(e) =>
              setForm((s) => ({ ...s, fechaLimite: e.target.value }))
            }
            disabled={submitting}
          />
        </div>

        {error && (
          <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">
            {error}
          </p>
        )}
      </form>
    </ResponsiveModal>
  );
}
