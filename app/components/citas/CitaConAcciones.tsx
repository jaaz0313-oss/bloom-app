"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { CitaRow } from "@/app/data/citas";
import {
  buildCitaCancelacionWhatsAppMessageFromCita,
  getCitaClienteWhatsAppUrl,
  isCitaActiva,
  normalizeCitaRow,
} from "@/lib/citas";
import type { UserRole } from "@/lib/auth/roles";
import { supabase } from "@/lib/supabase";
import { eliminarEventoCalendarSiVinculado } from "@/lib/cita-google-calendar";
import {
  appendCitaNotaReunion,
  parseCitaNotasReunion,
  serializeCitaNotasReunion,
} from "@/lib/cita-notas-reunion";
import { formatDateTimeStable } from "@/lib/format";
import {
  AUDITORIA_ACCIONES,
  buildCitaAuditoriaDetalle,
  logAuditoria,
  resolveCitaBodaNombre,
} from "@/lib/auditoria";
import { CitaFormModal } from "./CitaFormModal";
import { CitaListItem } from "./CitaListItem";
import type { CitaLookupBoda, CitaLookupEquipo, CitaLookupLead } from "./cita-lookup";

type CitaConAccionesProps = {
  cita: CitaRow;
  bodas: CitaLookupBoda[];
  leads: CitaLookupLead[];
  equipo: CitaLookupEquipo[];
  role: UserRole;
  currentUserId: string;
  currentUserNombre: string;
  lockBodaId?: string | null;
  showDate?: boolean;
  compact?: boolean;
  onChange: (cita: CitaRow | null) => void;
};

export function CitaConAcciones({
  cita,
  bodas,
  leads,
  equipo,
  role,
  currentUserId,
  currentUserNombre,
  lockBodaId = null,
  showDate = false,
  compact = false,
  onChange,
}: CitaConAccionesProps) {
  const router = useRouter();
  const [editOpen, setEditOpen] = useState(false);
  const [cancelConfirmOpen, setCancelConfirmOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [cancelledCita, setCancelledCita] = useState<CitaRow | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notaOpen, setNotaOpen] = useState(false);
  const [notaDraft, setNotaDraft] = useState("");
  const [notaSaving, setNotaSaving] = useState(false);
  const [notaError, setNotaError] = useState<string | null>(null);

  const bodasById = useMemo(
    () => Object.fromEntries(bodas.map((b) => [b.id, b])),
    [bodas],
  );
  const leadsById = useMemo(
    () => Object.fromEntries(leads.map((l) => [l.id, l])),
    [leads],
  );

  const activa = isCitaActiva(cita.estado);
  const meetUrl =
    cita.google_meet_link?.trim() || cita.link_meet?.trim() || null;
  const notasReunion = useMemo(
    () => parseCitaNotasReunion(cita.notas_reunion),
    [cita.notas_reunion],
  );

  const cancelWhatsappMessage = useMemo(() => {
    if (!cancelledCita) return null;
    return buildCitaCancelacionWhatsAppMessageFromCita(cancelledCita, {
      bodasById,
      leadsById,
    });
  }, [cancelledCita, bodasById, leadsById]);

  const cancelWhatsappUrl = useMemo(() => {
    if (!cancelledCita || !cancelWhatsappMessage) return null;
    return getCitaClienteWhatsAppUrl(
      cancelledCita,
      cancelWhatsappMessage,
      bodasById,
    );
  }, [cancelledCita, cancelWhatsappMessage, bodasById]);

  function openNotaForm() {
    setNotaError(null);
    setNotaDraft("");
    setNotaOpen(true);
  }

  function closeNotaForm() {
    setNotaOpen(false);
    setNotaDraft("");
    setNotaError(null);
  }

  async function handleSaveNota() {
    if (!supabase) return;

    const texto = notaDraft.trim();
    if (!texto) {
      setNotaError("Escribe la nota antes de guardar.");
      return;
    }

    const bodaId = cita.boda_id?.trim() || lockBodaId?.trim() || null;
    const fecha = new Date().toISOString();
    const autor = currentUserNombre.trim() || "Sin autor";
    let notaReunionId: string | null = null;

    setNotaSaving(true);
    setNotaError(null);

    try {
      if (cita.proveedor_id) {
        if (!bodaId) {
          setNotaError(
            "La cita no tiene boda vinculada; no se puede guardar la nota del proveedor.",
          );
          return;
        }

        const { data, error: insertError } = await supabase
          .from("notas_reunion")
          .insert({
            boda_id: bodaId,
            proveedor_id: cita.proveedor_id,
            fecha,
            con_quien: cita.titulo.trim() || "Proveedor",
            resumen: texto,
            creado_por: currentUserId,
            creado_por_nombre: autor,
          })
          .select("id")
          .single();

        if (insertError) {
          setNotaError(insertError.message);
          return;
        }

        notaReunionId = (data as { id: string }).id;

        await logAuditoria({
          accion: AUDITORIA_ACCIONES.NOTA_REUNION_AGREGADA,
          entidad: "nota_reunion",
          entidadId: notaReunionId,
          bodaNombre: resolveCitaBodaNombre(cita, bodasById, leadsById),
          detalle: `${cita.titulo} · ${texto.slice(0, 120)}${texto.length > 120 ? "…" : ""}`,
        });
      }

      const nextEntries = appendCitaNotaReunion(cita.notas_reunion, {
        texto,
        fecha,
        autor,
        autorId: currentUserId,
        notaReunionId,
      });

      const { data: updatedData, error: updateError } = await supabase
        .from("citas")
        .update({
          notas_reunion: serializeCitaNotasReunion(nextEntries) ?? [],
        })
        .eq("id", cita.id)
        .select("*")
        .single();

      if (updateError) {
        setNotaError(updateError.message);
        return;
      }

      const updated = normalizeCitaRow(updatedData as CitaRow);
      onChange(updated);
      closeNotaForm();
      router.refresh();
    } catch (err) {
      setNotaError(
        err instanceof Error ? err.message : "No se pudo guardar la nota.",
      );
    } finally {
      setNotaSaving(false);
    }
  }

  async function handleCancelConfirm() {
    if (!supabase) return;
    setBusy(true);
    setError(null);
    try {
      await eliminarEventoCalendarSiVinculado(cita);

      const { data, error: updateError } = await supabase
        .from("citas")
        .update({ estado: "cancelada", confirmada: false })
        .eq("id", cita.id)
        .select("*")
        .single();

      if (updateError) throw new Error(updateError.message);

      const updated = normalizeCitaRow(data as CitaRow);
      await logAuditoria({
        accion: AUDITORIA_ACCIONES.CITA_CANCELADA,
        entidad: "cita",
        entidadId: updated.id,
        bodaNombre: resolveCitaBodaNombre(updated, bodasById, leadsById),
        detalle: buildCitaAuditoriaDetalle(updated),
      });
      setCancelConfirmOpen(false);
      setCancelledCita(updated);
      onChange(updated);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo cancelar la cita.");
    } finally {
      setBusy(false);
    }
  }

  async function handleDeleteConfirm() {
    if (!supabase) return;
    setBusy(true);
    setError(null);
    try {
      await eliminarEventoCalendarSiVinculado(cita);

      const { error: deleteError } = await supabase
        .from("citas")
        .delete()
        .eq("id", cita.id);

      if (deleteError) throw new Error(deleteError.message);

      setDeleteConfirmOpen(false);
      onChange(null);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo eliminar la cita.");
    } finally {
      setBusy(false);
    }
  }

  if (cancelledCita) {
    return (
      <div className="space-y-3">
        <CitaListItem
          cita={cancelledCita}
          bodasById={bodasById}
          leadsById={leadsById}
          showDate={showDate}
          compact={compact}
        />
        <div className="rounded-2xl border border-bloom-border bg-bloom-surface p-4 shadow-sm">
          <h4 className="font-display text-lg text-bloom-ink">Cita cancelada</h4>
          {cancelWhatsappMessage ? (
            <>
              <pre className="mt-3 whitespace-pre-wrap rounded-xl border border-bloom-border bg-bloom-canvas/80 p-3 text-sm text-bloom-ink">
                {cancelWhatsappMessage}
              </pre>
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => {
                    void navigator.clipboard.writeText(cancelWhatsappMessage);
                  }}
                  className="rounded-full border border-bloom-border px-4 py-2 text-sm font-medium text-bloom-ink hover:bg-bloom-canvas"
                >
                  Copiar mensaje
                </button>
                {cancelWhatsappUrl ? (
                  <a
                    href={cancelWhatsappUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex rounded-full bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700"
                  >
                    Abrir WhatsApp
                  </a>
                ) : (
                  <span className="self-center text-xs text-bloom-muted">
                    Sin teléfono del cliente registrado
                  </span>
                )}
              </div>
            </>
          ) : (
            <p className="mt-2 text-sm text-bloom-muted">
              Vincula la cita a una boda con teléfono para avisar al cliente.
            </p>
          )}
          <button
            type="button"
            onClick={() => setCancelledCita(null)}
            className="mt-4 rounded-full bg-bloom-accent px-5 py-2 text-sm font-medium text-white hover:bg-bloom-accent-hover"
          >
            Listo
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-2">
        <CitaListItem
          cita={cita}
          bodasById={bodasById}
          leadsById={leadsById}
          showDate={showDate}
          compact={compact}
        />
        <div className="flex flex-wrap gap-2 pl-1">
          {meetUrl && (
            <a
              href={meetUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-full border border-bloom-accent bg-bloom-accent/10 px-3 py-1 text-xs font-medium text-bloom-accent hover:bg-bloom-accent/20"
            >
              Unirse a Meet 📹
            </a>
          )}
          <button
            type="button"
            onClick={() => setEditOpen(true)}
            className="rounded-full border border-bloom-border px-3 py-1 text-xs font-medium text-bloom-ink hover:bg-bloom-canvas"
          >
            Editar
          </button>
          <button
            type="button"
            onClick={() => (notaOpen ? closeNotaForm() : openNotaForm())}
            className="inline-flex items-center gap-1 rounded-full border border-bloom-border px-3 py-1 text-xs font-medium text-bloom-ink hover:bg-bloom-canvas"
          >
            <NoteIcon />
            Tomar nota
          </button>
          {activa && (
            <button
              type="button"
              onClick={() => {
                setError(null);
                setCancelConfirmOpen(true);
              }}
              className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-medium text-amber-900 hover:bg-amber-100"
            >
              Cancelar cita
            </button>
          )}
          <button
            type="button"
            onClick={() => {
              setError(null);
              setDeleteConfirmOpen(true);
            }}
            className="rounded-full border border-red-200 bg-red-50 px-3 py-1 text-xs font-medium text-red-800 hover:bg-red-100"
          >
            Eliminar
          </button>
        </div>

        {notasReunion.length > 0 && (
          <ul className="ml-1 space-y-2 border-t border-bloom-border/70 pt-3">
            {notasReunion.map((nota) => (
              <li
                key={nota.id}
                className="rounded-xl border border-bloom-border/70 bg-bloom-canvas/60 px-3 py-2.5"
              >
                <p className="text-xs text-bloom-muted">
                  {formatDateTimeStable(nota.fecha)} · {nota.autor}
                </p>
                <p className="mt-1 whitespace-pre-wrap text-sm text-bloom-ink">
                  {nota.texto}
                </p>
              </li>
            ))}
          </ul>
        )}

        {notaOpen && (
          <div className="ml-1 space-y-3 rounded-xl border border-bloom-border bg-bloom-canvas/80 p-3">
            <label className="block text-sm font-medium text-bloom-ink">
              Nueva nota
            </label>
            <textarea
              className="min-h-[96px] w-full resize-y rounded-xl border border-bloom-border bg-bloom-surface px-3 py-2 text-sm text-bloom-ink outline-none focus:border-bloom-accent focus:ring-2 focus:ring-bloom-accent/20"
              value={notaDraft}
              onChange={(e) => setNotaDraft(e.target.value)}
              placeholder="Escribe lo que conversaron en esta cita…"
              disabled={notaSaving}
              autoFocus
            />
            {notaError && (
              <p className="text-sm text-red-700" role="alert">
                {notaError}
              </p>
            )}
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={closeNotaForm}
                disabled={notaSaving}
                className="rounded-full border border-bloom-border px-4 py-2 text-sm font-medium text-bloom-ink hover:bg-bloom-canvas disabled:opacity-60"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => void handleSaveNota()}
                disabled={notaSaving}
                className="rounded-full bg-bloom-accent px-4 py-2 text-sm font-medium text-white hover:bg-bloom-accent-hover disabled:opacity-60"
              >
                {notaSaving ? "Guardando…" : "Guardar nota"}
              </button>
            </div>
          </div>
        )}

        {error && (
          <p className="pl-1 text-sm text-red-700" role="alert">
            {error}
          </p>
        )}
      </div>

      <CitaFormModal
        open={editOpen}
        onClose={() => {
          setEditOpen(false);
        }}
        editingCita={cita}
        onUpdated={(updated) => {
          onChange(updated);
        }}
        role={role}
        currentUserId={currentUserId}
        currentUserNombre={currentUserNombre}
        bodas={bodas}
        leads={leads}
        equipo={equipo}
        lockBodaId={lockBodaId}
        defaultBodaId={lockBodaId}
      />

      {cancelConfirmOpen && (
        <ConfirmDialog
          title="¿Cancelar esta cita?"
          description="La cita quedará marcada como cancelada. Podrás enviar un mensaje de WhatsApp al cliente."
          confirmLabel={busy ? "Cancelando…" : "Sí, cancelar cita"}
          confirmClass="bg-amber-600 hover:bg-amber-700 text-white"
          busy={busy}
          error={error}
          onCancel={() => setCancelConfirmOpen(false)}
          onConfirm={handleCancelConfirm}
        />
      )}

      {deleteConfirmOpen && (
        <ConfirmDialog
          title="¿Eliminar esta cita?"
          description="Esta acción no se puede deshacer. La cita se eliminará permanentemente."
          confirmLabel={busy ? "Eliminando…" : "Eliminar"}
          confirmClass="bg-red-600 hover:bg-red-700 text-white"
          busy={busy}
          error={error}
          onCancel={() => setDeleteConfirmOpen(false)}
          onConfirm={handleDeleteConfirm}
        />
      )}
    </>
  );
}

function NoteIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-3.5 w-3.5"
      aria-hidden
    >
      <path d="M5 3.5h7.5L15.5 6.5V16.5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-12a1 1 0 0 1 1-1Z" />
      <path d="M12.5 3.5V6.5H15.5" />
      <path d="M7 9.5h6M7 12.5h6M7 15.5h3.5" />
    </svg>
  );
}

function ConfirmDialog({
  title,
  description,
  confirmLabel,
  confirmClass,
  busy,
  error,
  onCancel,
  onConfirm,
}: {
  title: string;
  description: string;
  confirmLabel: string;
  confirmClass: string;
  busy: boolean;
  error: string | null;
  onCancel: () => void;
  onConfirm: () => void | Promise<void>;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      role="dialog"
      aria-modal="true"
      onClick={(e) => {
        if (e.target === e.currentTarget && !busy) onCancel();
      }}
    >
      <div className="w-full max-w-md rounded-2xl border border-bloom-border bg-bloom-surface p-6 shadow-lg">
        <h3 className="font-display text-xl text-bloom-ink">{title}</h3>
        <p className="mt-2 text-sm text-bloom-muted">{description}</p>
        {error && (
          <p className="mt-3 text-sm text-red-700" role="alert">
            {error}
          </p>
        )}
        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            className="rounded-full border border-bloom-border px-4 py-2 text-sm font-medium text-bloom-ink hover:bg-bloom-canvas disabled:opacity-60"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={() => void onConfirm()}
            disabled={busy}
            className={`rounded-full px-4 py-2 text-sm font-medium disabled:opacity-60 ${confirmClass}`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
