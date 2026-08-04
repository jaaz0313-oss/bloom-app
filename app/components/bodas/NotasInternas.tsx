"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ResponsiveModal } from "@/app/components/ui/ResponsiveModal";
import { wasNotaBodaEdited, type NotaBodaRow } from "@/app/data/notas-boda";
import {
  normalizeTareaPrioridad,
  TAREA_PRIORIDAD_LABELS,
  type TareaPrioridad,
} from "@/app/data/tareas";
import { formatDateTimeStable } from "@/lib/format";
import type { UserRole } from "@/lib/auth/roles";
import {
  buildMencionNotaWhatsAppUrls,
  findMentionedUsers,
  openMencionNotaWhatsAppTabs,
  type EquipoUsuarioMencion,
} from "@/lib/notas-menciones";
import { supabase } from "@/lib/supabase";
import { MentionTextarea } from "./MentionTextarea";

type NotasInternasProps = {
  bodaId: string;
  bodaNombre: string;
  initialNotas: NotaBodaRow[];
  equipo: EquipoUsuarioMencion[];
  currentUserId: string;
  currentUserNombre: string;
  role: UserRole;
  embedded?: boolean;
};

const textareaClass =
  "w-full resize-y rounded-xl border border-bloom-border bg-bloom-canvas px-3 py-2 text-sm text-bloom-ink outline-none ring-0 focus:border-bloom-accent focus:ring-2 focus:ring-bloom-accent/30";

const inputClass =
  "w-full rounded-xl border border-bloom-border bg-bloom-canvas px-3 py-2 text-sm text-bloom-ink outline-none ring-0 focus:border-bloom-accent focus:ring-2 focus:ring-bloom-accent/30";

const ASSIGNEE_USERNAMES = ["jaime", "luisa", "juliana", "natalia"] as const;

type ConvertirTareaForm = {
  titulo: string;
  asignadoA: string;
  prioridad: TareaPrioridad;
  fechaLimite: string;
};

function truncateTitulo(texto: string, max = 100): string {
  const trimmed = texto.trim().replace(/\s+/g, " ");
  if (trimmed.length <= max) return trimmed;
  return `${trimmed.slice(0, max - 1).trimEnd()}…`;
}

export function NotasInternas({
  bodaId,
  bodaNombre,
  initialNotas,
  equipo,
  currentUserId,
  currentUserNombre,
  role,
  embedded = false,
}: NotasInternasProps) {
  const router = useRouter();
  const [notas, setNotas] = useState(initialNotas);
  const [contenido, setContenido] = useState("");

  useEffect(() => {
    setNotas(initialNotas);
  }, [initialNotas]);
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContenido, setEditContenido] = useState("");
  const [savingEditId, setSavingEditId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [convertNota, setConvertNota] = useState<NotaBodaRow | null>(null);
  const [convertForm, setConvertForm] = useState<ConvertirTareaForm>({
    titulo: "",
    asignadoA: "",
    prioridad: "media",
    fechaLimite: "",
  });
  const [convertSubmitting, setConvertSubmitting] = useState(false);
  const [convertError, setConvertError] = useState<string | null>(null);

  const currentUsername =
    equipo.find((u) => u.id === currentUserId)?.username ?? "";

  const assignees = useMemo(() => {
    const byUsername = new Map(
      equipo.map((u) => [u.username.trim().toLowerCase(), u]),
    );
    const preferred = ASSIGNEE_USERNAMES.map((username) =>
      byUsername.get(username),
    ).filter((u): u is EquipoUsuarioMencion => Boolean(u));
    if (preferred.length > 0) return preferred;
    return [...equipo].sort((a, b) =>
      a.nombre.localeCompare(b.nombre, "es"),
    );
  }, [equipo]);

  function canEditNota(nota: NotaBodaRow): boolean {
    if (role === "admin" || role === "lider") return true;
    return nota.created_by === currentUserId;
  }

  function canDeleteNota(nota: NotaBodaRow): boolean {
    if (role === "admin") return true;
    return nota.created_by === currentUserId;
  }

  function openConvertirTarea(nota: NotaBodaRow) {
    setError(null);
    setSuccessMessage(null);
    setConvertError(null);
    setConvertNota(nota);
    setConvertForm({
      titulo: truncateTitulo(nota.contenido),
      asignadoA:
        assignees.find((u) => u.username === currentUsername)?.username ??
        assignees[0]?.username ??
        "",
      prioridad: "media",
      fechaLimite: "",
    });
  }

  function closeConvertirTarea() {
    if (convertSubmitting) return;
    setConvertNota(null);
    setConvertError(null);
  }

  async function handleConvertirTarea(e: React.FormEvent) {
    e.preventDefault();
    setConvertError(null);
    setSuccessMessage(null);

    const titulo = convertForm.titulo.trim();
    if (!titulo) {
      setConvertError("Ingresa el título de la tarea.");
      return;
    }
    if (!convertForm.asignadoA.trim()) {
      setConvertError("Selecciona a quién asignar la tarea.");
      return;
    }
    if (!currentUsername) {
      setConvertError("No se pudo identificar tu usuario.");
      return;
    }
    if (!supabase) {
      setConvertError("Supabase no está configurado.");
      return;
    }

    setConvertSubmitting(true);
    try {
      const { error: insertError } = await supabase.from("tareas").insert({
        titulo,
        descripcion: convertNota?.contenido?.trim() || null,
        boda_id: bodaId,
        asignado_a: convertForm.asignadoA.trim(),
        creado_por: currentUsername,
        prioridad: convertForm.prioridad,
        fecha_limite: convertForm.fechaLimite || null,
        completada: false,
        updated_at: new Date().toISOString(),
      });

      if (insertError) {
        setConvertError(insertError.message);
        return;
      }

      setConvertNota(null);
      setSuccessMessage("Tarea creada correctamente");
      router.refresh();
    } finally {
      setConvertSubmitting(false);
    }
  }

  async function procesarMenciones(notaId: string, texto: string) {
    const mencionados = findMentionedUsers(texto, equipo).filter(
      (u) => u.id !== currentUserId,
    );

    if (mencionados.length === 0) return;

    const rows = mencionados.map((u) => ({
      nota_id: notaId,
      usuario_id: u.id,
      visto: false,
    }));

    const { error: mencionesError } = await supabase!
      .from("menciones_notas")
      .insert(rows);

    if (mencionesError) {
      console.error("[menciones_notas]", mencionesError.message);
    }

    const urls = buildMencionNotaWhatsAppUrls(mencionados, {
      bodaNombre,
      contenidoNota: texto,
      autorNombre: currentUserNombre,
    });

    if (urls.length > 0) {
      openMencionNotaWhatsAppTabs(urls);
    }
  }

  async function handleAgregar(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const texto = contenido.trim();
    if (!texto) {
      setError("Escribe el contenido de la nota.");
      return;
    }

    if (!supabase) {
      setError("Supabase no está configurado.");
      return;
    }

    setSubmitting(true);
    try {
      const { data, error: insertError } = await supabase
        .from("notas_boda")
        .insert({
          boda_id: bodaId,
          contenido: texto,
          created_by: currentUserId,
          created_by_nombre: currentUserNombre.trim() || null,
        })
        .select("*")
        .single();

      if (insertError) {
        setError(insertError.message);
        return;
      }

      if (data) {
        const nota = data as NotaBodaRow;
        setNotas((current) => [nota, ...current]);
        await procesarMenciones(nota.id, texto);
      }
      setContenido("");
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  }

  function startEdit(nota: NotaBodaRow) {
    setError(null);
    setEditingId(nota.id);
    setEditContenido(nota.contenido);
  }

  function cancelEdit() {
    setEditingId(null);
    setEditContenido("");
  }

  async function handleGuardarEdicion(notaId: string) {
    setError(null);

    const texto = editContenido.trim();
    if (!texto) {
      setError("La nota no puede quedar vacía.");
      return;
    }

    if (!supabase) {
      setError("Supabase no está configurado.");
      return;
    }

    setSavingEditId(notaId);
    try {
      const updatedAt = new Date().toISOString();
      const { data, error: updateError } = await supabase
        .from("notas_boda")
        .update({
          contenido: texto,
          updated_at: updatedAt,
        })
        .eq("id", notaId)
        .select("*")
        .single();

      if (updateError) {
        setError(updateError.message);
        return;
      }

      if (data) {
        const notaActualizada = data as NotaBodaRow;
        setNotas((current) =>
          current.map((nota) =>
            nota.id === notaId ? notaActualizada : nota,
          ),
        );
      }

      setEditingId(null);
      setEditContenido("");
      router.refresh();
    } finally {
      setSavingEditId(null);
    }
  }

  async function handleEliminar(notaId: string) {
    if (!supabase) return;

    setError(null);
    setDeletingId(notaId);
    try {
      const { error: deleteError } = await supabase
        .from("notas_boda")
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
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="font-display text-xl text-bloom-ink">Notas del equipo</h2>
            <span className="inline-flex rounded-full bg-bloom-canvas px-2.5 py-0.5 text-[10px] font-medium uppercase tracking-wider text-bloom-muted">
              Solo visible para el equipo
            </span>
          </div>
          <p className="mt-1 text-sm text-bloom-muted">
            Notas internas para coordinación. Usa @ para mencionar a alguien del
            equipo.
          </p>
        </>
      )}
      {embedded && (
        <p className="mb-4 text-sm text-bloom-muted">
          Usa @ para mencionar a alguien del equipo.
        </p>
      )}

      <form className={`space-y-3 ${embedded ? "" : "mt-5"}`} onSubmit={handleAgregar}>
        <label htmlFor="nota-interna-contenido" className="sr-only">
          Nueva nota
        </label>
        <MentionTextarea
          id="nota-interna-contenido"
          value={contenido}
          onChange={setContenido}
          equipo={equipo}
          rows={3}
          className={textareaClass}
          placeholder="Escribe una nota… Usa @ para mencionar al equipo"
          disabled={submitting}
        />
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={submitting || !contenido.trim()}
            className="inline-flex items-center justify-center rounded-full bg-bloom-accent px-5 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-bloom-accent-hover disabled:opacity-60"
          >
            {submitting ? "Guardando…" : "Agregar nota"}
          </button>
        </div>
      </form>

      {error && (
        <p className="mt-3 rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      {successMessage && (
        <p
          className="mt-3 rounded-xl border border-green-200 bg-green-50 px-4 py-2 text-sm text-green-800"
          role="status"
        >
          {successMessage}
        </p>
      )}

      {notas.length === 0 ? (
        <p className="mt-6 rounded-xl border border-dashed border-bloom-border bg-bloom-canvas/60 px-4 py-8 text-center text-sm text-bloom-muted">
          Aún no hay notas para esta boda.
        </p>
      ) : (
        <ul className="mt-6 space-y-3">
          {notas.map((nota) => {
            const isEditing = editingId === nota.id;
            const isSaving = savingEditId === nota.id;

            return (
            <li
              key={nota.id}
              className="rounded-xl border border-bloom-border bg-bloom-canvas/60 px-4 py-3"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  {isEditing ? (
                    <div className="space-y-3">
                      <MentionTextarea
                        value={editContenido}
                        onChange={setEditContenido}
                        equipo={equipo}
                        rows={3}
                        className={textareaClass}
                        placeholder="Escribe una nota… Usa @ para mencionar al equipo"
                        disabled={isSaving}
                      />
                      <div className="flex flex-wrap justify-end gap-2">
                        <button
                          type="button"
                          onClick={cancelEdit}
                          disabled={isSaving}
                          className="rounded-full border border-bloom-border bg-bloom-surface px-4 py-1.5 text-xs font-medium text-bloom-ink transition-colors hover:bg-bloom-canvas disabled:opacity-60"
                        >
                          Cancelar
                        </button>
                        <button
                          type="button"
                          onClick={() => handleGuardarEdicion(nota.id)}
                          disabled={isSaving || !editContenido.trim()}
                          className="rounded-full bg-bloom-accent px-4 py-1.5 text-xs font-medium text-white transition-colors hover:bg-bloom-accent-hover disabled:opacity-60"
                        >
                          {isSaving ? "Guardando…" : "Guardar"}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="flex flex-wrap items-center gap-2">
                        {nota.origen === "proveedor" ? (
                          <span className="inline-flex rounded-full bg-sky-100 px-2 py-0.5 text-[11px] font-medium text-sky-800">
                            De proveedor
                          </span>
                        ) : null}
                      </div>
                      <p
                        className={`whitespace-pre-wrap text-sm text-bloom-ink ${
                          nota.origen === "proveedor" ? "mt-1.5" : ""
                        }`}
                      >
                        {nota.contenido}
                      </p>
                      <div className="mt-2 space-y-0.5 text-xs text-bloom-muted">
                        <p>
                          {nota.created_by_nombre?.trim() || "Equipo"}
                        </p>
                        <p>
                          Creada el {formatDateTimeStable(nota.created_at)}
                        </p>
                        {wasNotaBodaEdited(nota) ? (
                          <p className="text-[11px] text-bloom-muted/80">
                            Editada el {formatDateTimeStable(nota.updated_at)}
                          </p>
                        ) : null}
                      </div>
                    </>
                  )}
                </div>
                {!isEditing ? (
                  <div className="flex shrink-0 items-center gap-1">
                    <button
                      type="button"
                      onClick={() => openConvertirTarea(nota)}
                      aria-label="Convertir en tarea"
                      title="Convertir en tarea"
                      className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-bloom-border bg-bloom-surface text-bloom-muted transition-colors hover:bg-bloom-canvas hover:text-bloom-ink"
                    >
                      <TaskIcon />
                    </button>
                    {canEditNota(nota) ? (
                      <button
                        type="button"
                        onClick={() => startEdit(nota)}
                        aria-label="Editar nota"
                        title="Editar nota"
                        className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-bloom-border bg-bloom-surface text-bloom-muted transition-colors hover:bg-bloom-canvas hover:text-bloom-ink"
                      >
                        <PencilIcon />
                      </button>
                    ) : null}
                    {canDeleteNota(nota) ? (
                      <button
                        type="button"
                        onClick={() => handleEliminar(nota.id)}
                        disabled={deletingId === nota.id}
                        className="rounded-full border border-red-200 bg-red-50 px-3 py-1 text-xs font-medium text-red-700 transition-colors hover:bg-red-100 disabled:opacity-60"
                      >
                        {deletingId === nota.id ? "Eliminando…" : "Eliminar"}
                      </button>
                    ) : null}
                  </div>
                ) : null}
              </div>
            </li>
            );
          })}
        </ul>
      )}

      <ResponsiveModal
        open={Boolean(convertNota)}
        onClose={closeConvertirTarea}
        title="Convertir en tarea"
        subtitle="Crea una tarea a partir de esta nota."
        size="md"
        closeDisabled={convertSubmitting}
        footer={
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={closeConvertirTarea}
              disabled={convertSubmitting}
              className="rounded-full border border-bloom-border bg-bloom-surface px-4 py-2 text-sm font-medium text-bloom-ink transition-colors hover:bg-bloom-canvas disabled:opacity-60"
            >
              Cancelar
            </button>
            <button
              type="submit"
              form="convertir-nota-tarea-form"
              disabled={convertSubmitting}
              className="rounded-full bg-bloom-accent px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-bloom-accent-hover disabled:opacity-60"
            >
              {convertSubmitting ? "Creando…" : "Crear tarea"}
            </button>
          </div>
        }
      >
        <form
          id="convertir-nota-tarea-form"
          className="space-y-4"
          onSubmit={handleConvertirTarea}
        >
          <div className="space-y-1.5">
            <label
              htmlFor="convertir-tarea-titulo"
              className="text-sm font-medium text-bloom-ink"
            >
              Título
            </label>
            <input
              id="convertir-tarea-titulo"
              className={inputClass}
              value={convertForm.titulo}
              onChange={(e) =>
                setConvertForm((s) => ({ ...s, titulo: e.target.value }))
              }
              maxLength={120}
              required
              disabled={convertSubmitting}
            />
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor="convertir-tarea-asignado"
              className="text-sm font-medium text-bloom-ink"
            >
              Asignado a
            </label>
            <select
              id="convertir-tarea-asignado"
              className={inputClass}
              value={convertForm.asignadoA}
              onChange={(e) =>
                setConvertForm((s) => ({ ...s, asignadoA: e.target.value }))
              }
              required
              disabled={convertSubmitting || assignees.length === 0}
            >
              {assignees.length === 0 ? (
                <option value="">Sin usuarios disponibles</option>
              ) : (
                assignees.map((user) => (
                  <option key={user.id} value={user.username}>
                    {user.nombre} ({user.username})
                  </option>
                ))
              )}
            </select>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label
                htmlFor="convertir-tarea-prioridad"
                className="text-sm font-medium text-bloom-ink"
              >
                Prioridad
              </label>
              <select
                id="convertir-tarea-prioridad"
                className={inputClass}
                value={convertForm.prioridad}
                onChange={(e) =>
                  setConvertForm((s) => ({
                    ...s,
                    prioridad: normalizeTareaPrioridad(e.target.value),
                  }))
                }
                disabled={convertSubmitting}
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
            <div className="space-y-1.5">
              <label
                htmlFor="convertir-tarea-fecha"
                className="text-sm font-medium text-bloom-ink"
              >
                Fecha límite
              </label>
              <input
                id="convertir-tarea-fecha"
                type="date"
                className={inputClass}
                value={convertForm.fechaLimite}
                onChange={(e) =>
                  setConvertForm((s) => ({
                    ...s,
                    fechaLimite: e.target.value,
                  }))
                }
                disabled={convertSubmitting}
              />
            </div>
          </div>

          {convertError ? (
            <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {convertError}
            </p>
          ) : null}
        </form>
      </ResponsiveModal>
    </Shell>
  );
}

function TaskIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-4 w-4"
      aria-hidden
    >
      <path d="M5.5 3.5h9A1.5 1.5 0 0 1 16 5v10a1.5 1.5 0 0 1-1.5 1.5h-9A1.5 1.5 0 0 1 4 15V5a1.5 1.5 0 0 1 1.5-1.5Z" />
      <path d="m7 10 2 2 4-4" />
    </svg>
  );
}

function PencilIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-4 w-4"
      aria-hidden
    >
      <path d="M13.5 3.5a1.414 1.414 0 0 1 2 2L6.5 14.5l-3 1 1-3 9-9Z" />
    </svg>
  );
}
