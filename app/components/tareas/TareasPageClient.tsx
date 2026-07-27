"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  TareaFormModal,
  type TareaBodaOption,
  type TareaEquipoUsuario,
} from "@/app/components/tareas/TareaFormModal";
import { TareaCommentsSection } from "@/app/components/tareas/TareaCommentsSection";
import { ResponsiveModal } from "@/app/components/ui/ResponsiveModal";
import {
  compareTareasByFechaLimite,
  getTareaUrgency,
  isTareaVisibleForUser,
  normalizeTareaRow,
  TAREA_PRIORIDAD_LABELS,
  TAREA_PRIORIDAD_STYLES,
  TAREA_URGENCY_LABELS,
  TAREA_URGENCY_STYLES,
  type TareaRow,
} from "@/app/data/tareas";
import { formatShortDateStable } from "@/lib/format";
import {
  removeById,
  subscribeRealtimeTables,
  upsertById,
} from "@/lib/supabase-realtime";
import { supabase } from "@/lib/supabase";
import { ChevronDown, ChevronUp, MessageSquare } from "lucide-react";

type FilterTab = "todas" | "pendientes" | "completadas";

type TareasPageClientProps = {
  initialTareas: TareaRow[];
  equipo: TareaEquipoUsuario[];
  bodas: TareaBodaOption[];
  currentUsername: string;
};

export function TareasPageClient({
  initialTareas,
  equipo,
  bodas,
  currentUsername,
}: TareasPageClientProps) {
  const router = useRouter();
  const [tareas, setTareas] = useState(initialTareas);
  const [filter, setFilter] = useState<FilterTab>("pendientes");
  const [bodaFilter, setBodaFilter] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<"create" | "edit">("create");
  const [editingTarea, setEditingTarea] = useState<TareaRow | null>(null);
  const [transferTarea, setTransferTarea] = useState<TareaRow | null>(null);
  const [transferAsignado, setTransferAsignado] = useState("");
  const [transferring, setTransferring] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setTareas(initialTareas);
  }, [initialTareas]);

  useEffect(() => {
    return subscribeRealtimeTables(`tareas:list:${currentUsername}`, [
      {
        table: "tareas",
        onPayload: (payload) => {
          if (payload.eventType === "DELETE") {
            const oldRow = payload.old as Partial<TareaRow>;
            if (!oldRow.id) return;
            setTareas((prev) => removeById(prev, oldRow.id!));
            return;
          }

          const row = normalizeTareaRow(payload.new as TareaRow);
          if (!row?.id) return;

          if (!isTareaVisibleForUser(row, currentUsername)) {
            setTareas((prev) => removeById(prev, row.id));
            return;
          }

          setTareas((prev) => upsertById(prev, row));
        },
      },
    ]);
  }, [currentUsername]);

  const nombreByUsername = useMemo(() => {
    const map = new Map<string, string>();
    for (const usuario of equipo) {
      map.set(usuario.username, usuario.nombre);
    }
    return map;
  }, [equipo]);

  const bodaNombreById = useMemo(() => {
    const map = new Map<string, string>();
    for (const boda of bodas) {
      map.set(boda.id, boda.nombre_pareja);
    }
    return map;
  }, [bodas]);

  const bodasEnTareas = useMemo(() => {
    const ids = new Set(
      tareas.map((tarea) => tarea.boda_id).filter(Boolean) as string[],
    );
    return bodas.filter((boda) => ids.has(boda.id));
  }, [tareas, bodas]);

  const filteredTareas = useMemo(() => {
    return tareas
      .filter((tarea) => {
        if (filter === "pendientes" && tarea.completada) return false;
        if (filter === "completadas" && !tarea.completada) return false;
        if (bodaFilter && tarea.boda_id !== bodaFilter) return false;
        return true;
      })
      .sort((a, b) => {
        if (a.completada !== b.completada) {
          return a.completada ? 1 : -1;
        }
        return compareTareasByFechaLimite(a, b);
      });
  }, [tareas, filter, bodaFilter]);

  function openCreate() {
    setFormMode("create");
    setEditingTarea(null);
    setFormOpen(true);
  }

  function openEdit(tarea: TareaRow) {
    setFormMode("edit");
    setEditingTarea(tarea);
    setFormOpen(true);
  }

  function openTransfer(tarea: TareaRow) {
    setTransferTarea(tarea);
    setTransferAsignado(tarea.asignado_a);
    setError(null);
  }

  function handleSaved(tarea: TareaRow) {
    setTareas((current) => {
      const exists = current.some((item) => item.id === tarea.id);
      if (exists) {
        return current.map((item) => (item.id === tarea.id ? tarea : item));
      }
      return [tarea, ...current];
    });
    router.refresh();
  }

  function toggleExpanded(tareaId: string) {
    setExpandedIds((current) => {
      const next = new Set(current);
      if (next.has(tareaId)) next.delete(tareaId);
      else next.add(tareaId);
      return next;
    });
  }

  async function handleToggleCompletada(tarea: TareaRow) {
    if (!supabase) return;
    setError(null);
    setTogglingId(tarea.id);
    const nextCompletada = !tarea.completada;
    const now = new Date().toISOString();
    try {
      const { data, error: updateError } = await supabase
        .from("tareas")
        .update({
          completada: nextCompletada,
          completada_por: nextCompletada ? currentUsername : null,
          completada_at: nextCompletada ? now : null,
          updated_at: now,
        })
        .eq("id", tarea.id)
        .select("*")
        .single();

      if (updateError) {
        setError(updateError.message);
        return;
      }

      handleSaved(data as TareaRow);
    } finally {
      setTogglingId(null);
    }
  }

  async function handleDelete(tarea: TareaRow) {
    if (!supabase) return;
    if (!window.confirm(`¿Eliminar la tarea "${tarea.titulo}"?`)) return;

    setError(null);
    setDeletingId(tarea.id);
    try {
      const { error: deleteError } = await supabase
        .from("tareas")
        .delete()
        .eq("id", tarea.id);

      if (deleteError) {
        setError(deleteError.message);
        return;
      }

      setTareas((current) => current.filter((item) => item.id !== tarea.id));
      router.refresh();
    } finally {
      setDeletingId(null);
    }
  }

  async function handleTransfer() {
    if (!supabase || !transferTarea) return;
    if (!transferAsignado.trim()) {
      setError("Selecciona a quién trasladar la tarea.");
      return;
    }

    setTransferring(true);
    setError(null);
    try {
      const { data, error: updateError } = await supabase
        .from("tareas")
        .update({
          asignado_a: transferAsignado.trim(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", transferTarea.id)
        .select("*")
        .single();

      if (updateError) {
        setError(updateError.message);
        return;
      }

      handleSaved(data as TareaRow);
      setTransferTarea(null);
    } finally {
      setTransferring(false);
    }
  }

  return (
    <div className="mt-6 space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-2">
          {(
            [
              ["pendientes", "Pendientes"],
              ["completadas", "Completadas"],
              ["todas", "Todas"],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => setFilter(value)}
              className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                filter === value
                  ? "bg-bloom-accent text-white"
                  : "border border-bloom-border bg-bloom-surface text-bloom-ink hover:bg-bloom-canvas"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={openCreate}
          className="inline-flex items-center justify-center rounded-full bg-bloom-accent px-5 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-bloom-accent-hover"
        >
          Nueva tarea
        </button>
      </div>

      {bodasEnTareas.length > 0 && (
        <div className="max-w-xs">
          <label
            htmlFor="filtro-boda"
            className="mb-1.5 block text-sm font-medium text-bloom-ink"
          >
            Por boda
          </label>
          <select
            id="filtro-boda"
            value={bodaFilter}
            onChange={(e) => setBodaFilter(e.target.value)}
            className="w-full rounded-xl border border-bloom-border bg-bloom-surface px-3 py-2 text-sm text-bloom-ink outline-none focus:border-bloom-accent focus:ring-2 focus:ring-bloom-accent/30"
          >
            <option value="">Todas las bodas</option>
            {bodasEnTareas.map((boda) => (
              <option key={boda.id} value={boda.id}>
                {boda.nombre_pareja}
              </option>
            ))}
          </select>
        </div>
      )}

      {error && (
        <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      {filteredTareas.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-bloom-border bg-bloom-surface/60 px-5 py-12 text-center text-sm text-bloom-muted">
          No hay tareas para mostrar con estos filtros.
        </p>
      ) : (
        <ul className="space-y-3">
          {filteredTareas.map((tarea) => {
            const urgency = getTareaUrgency(tarea.fecha_limite, tarea.completada);
            const canEdit = tarea.creado_por === currentUsername;
            const asignadoNombre =
              nombreByUsername.get(tarea.asignado_a) ?? tarea.asignado_a;
            const creadorNombre =
              nombreByUsername.get(tarea.creado_por) ?? tarea.creado_por;
            const bodaNombre = tarea.boda_id
              ? bodaNombreById.get(tarea.boda_id)
              : null;

            return (
              <li
                key={tarea.id}
                className={`rounded-2xl border border-bloom-border bg-bloom-surface px-4 py-4 shadow-sm sm:px-5 ${
                  tarea.completada ? "opacity-70" : ""
                }`}
              >
                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    checked={tarea.completada}
                    onChange={() => handleToggleCompletada(tarea)}
                    disabled={togglingId === tarea.id}
                    className="mt-1 h-4 w-4 rounded border-bloom-border text-bloom-accent focus:ring-bloom-accent/30"
                    aria-label={
                      tarea.completada
                        ? "Marcar como pendiente"
                        : "Marcar como completada"
                    }
                  />

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3
                        className={`font-medium text-bloom-ink ${
                          tarea.completada ? "line-through" : ""
                        }`}
                      >
                        {tarea.titulo}
                      </h3>
                      <span
                        className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${
                          TAREA_PRIORIDAD_STYLES[tarea.prioridad]
                        }`}
                      >
                        {TAREA_PRIORIDAD_LABELS[tarea.prioridad]}
                      </span>
                      {urgency && (
                        <span
                          className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${
                            TAREA_URGENCY_STYLES[urgency]
                          }`}
                        >
                          {TAREA_URGENCY_LABELS[urgency]}
                        </span>
                      )}
                    </div>

                    {tarea.descripcion?.trim() ? (
                      <p className="mt-1 whitespace-pre-wrap text-sm text-bloom-muted">
                        {tarea.descripcion}
                      </p>
                    ) : null}

                    <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-bloom-muted">
                      <span>Asignada a {asignadoNombre}</span>
                      <span>Creada por {creadorNombre}</span>
                      {bodaNombre ? (
                        <Link
                          href={`/bodas/${tarea.boda_id}`}
                          className="font-medium text-bloom-accent hover:text-bloom-accent-hover"
                        >
                          {bodaNombre}
                        </Link>
                      ) : null}
                      {tarea.fecha_limite ? (
                        <span>
                          Límite: {formatShortDateStable(tarea.fecha_limite)}
                        </span>
                      ) : null}
                    </div>

                    <div className="mt-3 flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => toggleExpanded(tarea.id)}
                        className="inline-flex items-center gap-1.5 rounded-full border border-bloom-border bg-bloom-canvas px-3 py-1 text-xs font-medium text-bloom-ink transition-colors hover:bg-bloom-border/60"
                      >
                        <MessageSquare className="h-3.5 w-3.5" aria-hidden />
                        Comentarios
                        {expandedIds.has(tarea.id) ? (
                          <ChevronUp className="h-3.5 w-3.5" aria-hidden />
                        ) : (
                          <ChevronDown className="h-3.5 w-3.5" aria-hidden />
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={() => openTransfer(tarea)}
                        className="rounded-full border border-bloom-border bg-bloom-canvas px-3 py-1 text-xs font-medium text-bloom-ink transition-colors hover:bg-bloom-border/60"
                      >
                        Trasladar
                      </button>
                      {canEdit ? (
                        <>
                          <button
                            type="button"
                            onClick={() => openEdit(tarea)}
                            className="rounded-full border border-bloom-border bg-bloom-canvas px-3 py-1 text-xs font-medium text-bloom-ink transition-colors hover:bg-bloom-border/60"
                          >
                            Editar
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(tarea)}
                            disabled={deletingId === tarea.id}
                            className="rounded-full border border-red-200 bg-red-50 px-3 py-1 text-xs font-medium text-red-700 transition-colors hover:bg-red-100 disabled:opacity-60"
                          >
                            {deletingId === tarea.id ? "Eliminando…" : "Eliminar"}
                          </button>
                        </>
                      ) : null}
                    </div>

                    {expandedIds.has(tarea.id) ? (
                      <TareaCommentsSection
                        tareaId={tarea.id}
                        currentUsername={currentUsername}
                        nombreByUsername={nombreByUsername}
                      />
                    ) : null}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <TareaFormModal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        mode={formMode}
        tarea={editingTarea}
        equipo={equipo}
        bodas={bodas}
        currentUsername={currentUsername}
        onSaved={handleSaved}
      />

      <ResponsiveModal
        open={Boolean(transferTarea)}
        onClose={() => setTransferTarea(null)}
        title="Trasladar tarea"
        subtitle={
          transferTarea
            ? `Reasignar "${transferTarea.titulo}" a otro miembro del equipo.`
            : undefined
        }
        size="md"
        closeDisabled={transferring}
        footer={
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setTransferTarea(null)}
              disabled={transferring}
              className="rounded-full border border-bloom-border bg-bloom-surface px-4 py-2 text-sm font-medium text-bloom-ink transition-colors hover:bg-bloom-canvas disabled:opacity-60"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleTransfer}
              disabled={transferring}
              className="rounded-full bg-bloom-accent px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-bloom-accent-hover disabled:opacity-60"
            >
              {transferring ? "Trasladando…" : "Trasladar"}
            </button>
          </div>
        }
      >
        <div className="space-y-1.5">
          <label
            htmlFor="transfer-asignado"
            className="text-sm font-medium text-bloom-ink"
          >
            Nuevo asignado
          </label>
          <select
            id="transfer-asignado"
            value={transferAsignado}
            onChange={(e) => setTransferAsignado(e.target.value)}
            disabled={transferring}
            className="w-full rounded-xl border border-bloom-border bg-bloom-canvas px-3 py-2 text-sm text-bloom-ink outline-none focus:border-bloom-accent focus:ring-2 focus:ring-bloom-accent/30"
          >
            {equipo.map((usuario) => (
              <option key={usuario.id} value={usuario.username}>
                {usuario.nombre}
              </option>
            ))}
          </select>
        </div>
      </ResponsiveModal>
    </div>
  );
}
