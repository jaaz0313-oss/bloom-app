"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { NotaReunionRow } from "@/app/data/notas-reunion";
import type { ProveedorRow } from "@/app/data/providers";
import { formatDateTimeStable } from "@/lib/format";
import type { UserRole } from "@/lib/auth/roles";
import { supabase } from "@/lib/supabase";
import { AUDITORIA_ACCIONES, logAuditoria } from "@/lib/auditoria";

type NotasReunionSectionProps = {
  bodaId: string;
  bodaNombre: string;
  initialNotas: NotaReunionRow[];
  providers: ProveedorRow[];
  currentUserId: string;
  currentUserNombre: string;
  role: UserRole;
  embedded?: boolean;
};

type FormState = {
  tipoConQuien: "cliente" | "proveedor" | "equipo";
  proveedorId: string;
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
    tipoConQuien: "cliente",
    proveedorId: "",
    fecha: toDatetimeLocalValue(),
    resumen: "",
  };
}

function buildConQuienLabel(
  tipo: FormState["tipoConQuien"],
  proveedorNombre: string,
): string {
  if (tipo === "cliente") return "Cliente";
  if (tipo === "equipo") return "Equipo";
  return `Proveedor: ${proveedorNombre}`;
}

export function NotasReunionSection({
  bodaId,
  bodaNombre,
  initialNotas,
  providers,
  currentUserId,
  currentUserNombre,
  role,
  embedded = false,
}: NotasReunionSectionProps) {
  const router = useRouter();
  const [notas, setNotas] = useState(initialNotas);
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const providersById = useMemo(
    () => Object.fromEntries(providers.map((p) => [p.id, p])),
    [providers],
  );

  const sortedNotas = useMemo(
    () =>
      [...notas].sort(
        (a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime(),
      ),
    [notas],
  );

  function openForm() {
    setError(null);
    setForm(emptyForm());
    setFormOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const resumen = form.resumen.trim();
    if (!resumen) {
      setError("Escribe el resumen de la reunión.");
      return;
    }

    if (form.tipoConQuien === "proveedor" && !form.proveedorId) {
      setError("Selecciona un proveedor.");
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

    const proveedor = form.proveedorId
      ? providersById[form.proveedorId]
      : undefined;
    const conQuien = buildConQuienLabel(
      form.tipoConQuien,
      proveedor?.nombre ?? "Sin nombre",
    );

    setSubmitting(true);
    try {
      const { data, error: insertError } = await supabase
        .from("notas_reunion")
        .insert({
          boda_id: bodaId,
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
      }

      setFormOpen(false);
      setForm(emptyForm());
      router.refresh();
    } finally {
      setSubmitting(false);
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
      router.refresh();
    } finally {
      setDeletingId(null);
    }
  }

  const shellClass = embedded
    ? ""
    : "rounded-2xl border border-bloom-border bg-bloom-surface p-5 shadow-sm";
  const Shell = embedded ? "div" : "section";

  return (
    <Shell className={shellClass}>
      {!embedded && (
        <>
          <h2 className="font-display text-xl text-bloom-ink">Notas de reunión</h2>
          <p className="mt-1 text-sm text-bloom-muted">
            Resumen de reuniones con cliente, proveedores o equipo.
          </p>
        </>
      )}

      <div className={`flex justify-end ${embedded ? "" : "mt-5"}`}>
        <button
          type="button"
          onClick={openForm}
          className="inline-flex items-center justify-center rounded-full bg-bloom-accent px-5 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-bloom-accent-hover"
        >
          Nueva nota
        </button>
      </div>

      {formOpen && (
        <form
          className="mt-5 space-y-4 rounded-xl border border-bloom-border bg-bloom-canvas/50 p-4 sm:p-5"
          onSubmit={handleSubmit}
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Con quién">
              <select
                className={inputClass}
                value={form.tipoConQuien}
                onChange={(e) =>
                  setForm((s) => ({
                    ...s,
                    tipoConQuien: e.target.value as FormState["tipoConQuien"],
                    proveedorId:
                      e.target.value === "proveedor" ? s.proveedorId : "",
                  }))
                }
                disabled={submitting}
              >
                <option value="cliente">Cliente</option>
                <option value="proveedor">Proveedor</option>
                <option value="equipo">Equipo</option>
              </select>
            </Field>

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
          </div>

          {form.tipoConQuien === "proveedor" && (
            <Field label="Proveedor">
              <select
                className={inputClass}
                value={form.proveedorId}
                onChange={(e) =>
                  setForm((s) => ({ ...s, proveedorId: e.target.value }))
                }
                disabled={submitting}
                required
              >
                <option value="">Seleccionar proveedor</option>
                {providers.map((provider) => (
                  <option key={provider.id} value={provider.id}>
                    {provider.nombre}
                    {provider.categoria ? ` · ${provider.categoria}` : ""}
                  </option>
                ))}
              </select>
            </Field>
          )}

          <Field label="Resumen">
            <textarea
              rows={4}
              className={textareaClass}
              value={form.resumen}
              onChange={(e) =>
                setForm((s) => ({ ...s, resumen: e.target.value }))
              }
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
              className="rounded-full border border-bloom-border bg-bloom-surface px-5 py-2.5 text-sm font-medium text-bloom-ink transition-colors hover:bg-bloom-border disabled:opacity-60"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center justify-center rounded-full bg-bloom-accent px-5 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-bloom-accent-hover disabled:opacity-60"
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
        <p className="mt-6 rounded-xl border border-dashed border-bloom-border bg-bloom-canvas/60 px-4 py-8 text-center text-sm text-bloom-muted">
          Aún no hay notas de reunión registradas.
        </p>
      ) : (
        <ul className="mt-6 space-y-3">
          {sortedNotas.map((nota) => (
            <li
              key={nota.id}
              className="rounded-xl border border-bloom-border bg-bloom-canvas/60 px-4 py-3"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-bloom-muted">
                    <span>{formatDateTimeStable(nota.fecha)}</span>
                    <span aria-hidden>·</span>
                    <span className="font-medium text-bloom-ink">
                      {nota.con_quien}
                    </span>
                  </div>
                  <p className="mt-2 whitespace-pre-wrap text-sm text-bloom-ink">
                    {nota.resumen}
                  </p>
                  <p className="mt-2 text-xs text-bloom-muted">
                    Registrado por{" "}
                    {nota.creado_por_nombre?.trim() || "Equipo"}
                  </p>
                </div>
                {role === "admin" && (
                  <button
                    type="button"
                    onClick={() => handleDelete(nota.id)}
                    disabled={deletingId === nota.id}
                    className="shrink-0 rounded-full border border-red-200 bg-red-50 px-3 py-1 text-xs font-medium text-red-700 transition-colors hover:bg-red-100 disabled:opacity-60"
                  >
                    {deletingId === nota.id ? "Eliminando…" : "Eliminar"}
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </Shell>
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
