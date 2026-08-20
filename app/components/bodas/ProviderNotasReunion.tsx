"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { NotaReunionRow } from "@/app/data/notas-reunion";
import type { ProveedorRow } from "@/app/data/providers";
import { formatDateTimeStable } from "@/lib/format";
import type { UserRole } from "@/lib/auth/roles";
import { supabase } from "@/lib/supabase";
import { AUDITORIA_ACCIONES, logAuditoria } from "@/lib/auditoria";
import { FormattedNotaTextarea } from "@/app/components/bodas/FormattedNotaTextarea";
import { NotaMarkdown } from "@/app/components/bodas/NotaMarkdown";

type ProviderNotasReunionProps = {
  bodaId: string;
  bodaNombre: string;
  provider: ProveedorRow;
  initialNotas: NotaReunionRow[];
  currentUserId: string;
  currentUserNombre: string;
  role: UserRole;
};

type FormState = {
  fecha: string;
  resumen: string;
};

const inputClass =
  "w-full rounded-xl border border-bloom-border bg-bloom-canvas px-3 py-2 text-sm text-bloom-ink outline-none ring-0 focus:border-bloom-accent focus:ring-2 focus:ring-bloom-accent/30";

const textareaClass =
  "w-full resize-y rounded-xl border border-bloom-border bg-bloom-canvas px-3 py-2 text-sm text-bloom-ink outline-none ring-0 focus:border-bloom-accent focus:ring-2 focus:ring-bloom-accent/30";

function toDatetimeLocalValue(date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function emptyForm(): FormState {
  return {
    fecha: toDatetimeLocalValue(),
    resumen: "",
  };
}

function canEditNota(
  nota: NotaReunionRow,
  currentUserId: string,
  role: UserRole,
): boolean {
  if (role === "admin" || role === "lider") return true;
  return Boolean(nota.creado_por && nota.creado_por === currentUserId);
}

export function ProviderNotasReunion({
  bodaId,
  bodaNombre,
  provider,
  initialNotas,
  currentUserId,
  currentUserNombre,
  role,
}: ProviderNotasReunionProps) {
  const router = useRouter();
  const [notas, setNotas] = useState(initialNotas);

  useEffect(() => {
    setNotas(initialNotas);
  }, [initialNotas]);
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editResumen, setEditResumen] = useState("");
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sortedNotas = useMemo(
    () =>
      [...notas].sort(
        (a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime(),
      ),
    [notas],
  );

  function openForm() {
    setError(null);
    setEditingId(null);
    setForm(emptyForm());
    setFormOpen(true);
  }

  function startEdit(nota: NotaReunionRow) {
    if (!canEditNota(nota, currentUserId, role)) return;
    setError(null);
    setFormOpen(false);
    setEditingId(nota.id);
    setEditResumen(nota.resumen);
  }

  function cancelEdit() {
    setEditingId(null);
    setEditResumen("");
    setError(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const resumen = form.resumen.trim();
    if (!resumen) {
      setError("Escribe el resumen de la reunión.");
      return;
    }

    if (!form.fecha) {
      setError("Indica la fecha y hora de la reunión.");
      return;
    }

    if (!supabase) {
      setError("Supabase no está configurado.");
      return;
    }

    const conQuien = provider.nombre.trim() || "Proveedor";

    setSubmitting(true);
    try {
      const { data, error: insertError } = await supabase
        .from("notas_reunion")
        .insert({
          boda_id: bodaId,
          proveedor_id: provider.id,
          fecha: new Date(form.fecha).toISOString(),
          con_quien: conQuien,
          resumen,
          creado_por: currentUserId,
          creado_por_nombre: currentUserNombre.trim() || null,
        })
        .select("*")
        .single();

      if (insertError) {
        setError(insertError.message);
        return;
      }

      if (data) {
        const nota = data as NotaReunionRow;
        setNotas((current) => [nota, ...current]);
        await logAuditoria({
          accion: AUDITORIA_ACCIONES.NOTA_REUNION_AGREGADA,
          entidad: "nota_reunion",
          entidadId: nota.id,
          bodaNombre,
          detalle: `${conQuien} · ${resumen.slice(0, 120)}${resumen.length > 120 ? "…" : ""}`,
        });

        const categoria = provider.categoria?.trim() || "Sin categoría";
        const { error: copiaError } = await supabase.from("notas_boda").insert({
          boda_id: bodaId,
          contenido: `📋 ${conQuien} (${categoria}): ${resumen}`,
          created_by: currentUserId,
          created_by_nombre: currentUserNombre.trim() || null,
          origen: "proveedor",
        });
        if (copiaError) {
          console.error(
            "[ProviderNotasReunion] No se pudo copiar a notas_boda:",
            copiaError.message,
          );
        }
      }

      setFormOpen(false);
      setForm(emptyForm());
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  }

  async function handleSaveEdit(nota: NotaReunionRow) {
    if (!canEditNota(nota, currentUserId, role)) return;

    const resumen = editResumen.trim();
    if (!resumen) {
      setError("Escribe el resumen de la reunión.");
      return;
    }

    if (!supabase) {
      setError("Supabase no está configurado.");
      return;
    }

    setEditSubmitting(true);
    setError(null);
    try {
      const { data, error: updateError } = await supabase
        .from("notas_reunion")
        .update({ resumen })
        .eq("id", nota.id)
        .select("*")
        .single();

      if (updateError) {
        setError(updateError.message);
        return;
      }

      if (data) {
        const updated = data as NotaReunionRow;
        setNotas((current) =>
          current.map((n) => (n.id === updated.id ? updated : n)),
        );
        await logAuditoria({
          accion: AUDITORIA_ACCIONES.NOTA_REUNION_EDITADA,
          entidad: "nota_reunion",
          entidadId: updated.id,
          bodaNombre,
          detalle: `${provider.nombre} · ${resumen.slice(0, 120)}${resumen.length > 120 ? "…" : ""}`,
        });
      }

      setEditingId(null);
      setEditResumen("");
      router.refresh();
    } finally {
      setEditSubmitting(false);
    }
  }

  async function handleDelete(notaId: string) {
    if (!supabase || role !== "admin") return;

    setError(null);
    setDeletingId(notaId);
    try {
      const { error: deleteError } = await supabase
        .from("notas_reunion")
        .delete()
        .eq("id", notaId);

      if (deleteError) {
        setError(deleteError.message);
        return;
      }

      setNotas((current) => current.filter((n) => n.id !== notaId));
      if (editingId === notaId) {
        setEditingId(null);
        setEditResumen("");
      }
      router.refresh();
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <section className="mt-5 border-t border-bloom-border pt-5">
      <div className="flex items-center justify-between gap-3">
        <h4 className="font-display text-lg text-bloom-ink">Notas de reunión</h4>
        <button
          type="button"
          onClick={openForm}
          className="inline-flex items-center justify-center rounded-full border border-bloom-border bg-bloom-canvas px-4 py-2 text-xs font-medium text-bloom-ink transition-colors hover:bg-bloom-border"
        >
          Nueva nota
        </button>
      </div>

      {formOpen && (
        <form
          className="mt-4 space-y-4 rounded-xl border border-bloom-border bg-bloom-canvas/50 p-4"
          onSubmit={handleSubmit}
        >
          <Field label="Fecha y hora">
            <input
              type="datetime-local"
              className={inputClass}
              value={form.fecha}
              onChange={(e) =>
                setForm((s) => ({ ...s, fecha: e.target.value }))
              }
              disabled={submitting}
              required
            />
          </Field>

          <Field label="Resumen">
            <FormattedNotaTextarea
              rows={4}
              className={textareaClass}
              value={form.resumen}
              onChange={(resumen) => setForm((s) => ({ ...s, resumen }))}
              placeholder="Puntos tratados, acuerdos y próximos pasos…"
              disabled={submitting}
              required
            />
          </Field>

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setFormOpen(false)}
              disabled={submitting}
              className="rounded-full border border-bloom-border bg-bloom-surface px-4 py-2 text-xs font-medium text-bloom-ink transition-colors hover:bg-bloom-border disabled:opacity-60"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center justify-center rounded-full bg-bloom-accent px-4 py-2 text-xs font-medium text-white transition-colors hover:bg-bloom-accent-hover disabled:opacity-60"
            >
              {submitting ? "Guardando…" : "Guardar nota"}
            </button>
          </div>
        </form>
      )}

      {error && (
        <p className="mt-3 rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      {sortedNotas.length === 0 ? (
        <p className="mt-4 rounded-xl border border-dashed border-bloom-border bg-bloom-canvas/60 px-4 py-6 text-center text-sm text-bloom-muted">
          Aún no hay notas de reunión con este proveedor.
        </p>
      ) : (
        <ul className="mt-4 space-y-3">
          {sortedNotas.map((nota) => {
            const isEditing = editingId === nota.id;
            const canEdit = canEditNota(nota, currentUserId, role);
            const busy =
              editSubmitting || deletingId === nota.id || submitting;

            return (
              <li
                key={nota.id}
                className="rounded-xl border border-bloom-border bg-bloom-canvas/60 px-4 py-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium text-bloom-muted">
                      {formatDateTimeStable(nota.fecha)}
                    </p>

                    {isEditing ? (
                      <div className="mt-2 space-y-3">
                        <FormattedNotaTextarea
                          rows={4}
                          className={textareaClass}
                          value={editResumen}
                          onChange={setEditResumen}
                          disabled={editSubmitting}
                          autoFocus
                        />
                        <div className="flex flex-wrap justify-end gap-2">
                          <button
                            type="button"
                            onClick={cancelEdit}
                            disabled={editSubmitting}
                            className="rounded-full border border-bloom-border bg-bloom-surface px-4 py-2 text-xs font-medium text-bloom-ink transition-colors hover:bg-bloom-border disabled:opacity-60"
                          >
                            Cancelar
                          </button>
                          <button
                            type="button"
                            onClick={() => handleSaveEdit(nota)}
                            disabled={editSubmitting}
                            className="inline-flex items-center justify-center rounded-full bg-bloom-accent px-4 py-2 text-xs font-medium text-white transition-colors hover:bg-bloom-accent-hover disabled:opacity-60"
                          >
                            {editSubmitting ? "Guardando…" : "Guardar"}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="mt-2">
                        <NotaMarkdown text={nota.resumen} />
                      </div>
                    )}

                    <p className="mt-2 text-xs text-bloom-muted">
                      Registrado por{" "}
                      {nota.creado_por_nombre?.trim() || "Equipo"}
                    </p>
                  </div>

                  {!isEditing && (
                    <div className="flex shrink-0 items-center gap-1.5">
                      {canEdit && (
                        <button
                          type="button"
                          onClick={() => startEdit(nota)}
                          disabled={busy}
                          aria-label="Editar nota"
                          title="Editar nota"
                          className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-bloom-border bg-bloom-surface text-bloom-ink transition-colors hover:bg-bloom-border disabled:opacity-60"
                        >
                          <PencilIcon />
                        </button>
                      )}
                      {role === "admin" && (
                        <button
                          type="button"
                          onClick={() => handleDelete(nota.id)}
                          disabled={deletingId === nota.id}
                          className="rounded-full border border-red-200 bg-red-50 px-3 py-1 text-xs font-medium text-red-700 transition-colors hover:bg-red-100 disabled:opacity-60"
                        >
                          {deletingId === nota.id ? "Eliminando…" : "Eliminar"}
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

function PencilIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 20 20"
      fill="currentColor"
      className="h-3.5 w-3.5"
      aria-hidden
    >
      <path d="m2.695 14.762-1.262 3.155a.5.5 0 0 0 .65.65l3.155-1.262a4 4 0 0 0 1.343-.886L17.5 5.501a2.121 2.121 0 0 0-3-3L3.58 13.419a4 4 0 0 0-.885 1.343Z" />
    </svg>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium text-bloom-ink">{label}</label>
      {children}
    </div>
  );
}
