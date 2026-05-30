"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { CitaRow } from "@/app/data/citas";
import {
  buildCitaCancelacionWhatsAppMessageFromCita,
  getCitaWhatsAppUrl,
  getClienteInfoForCita,
  isCitaActiva,
  normalizeCitaRow,
} from "@/lib/citas";
import type { UserRole } from "@/lib/auth/roles";
import { supabase } from "@/lib/supabase";
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

  const bodasById = useMemo(
    () => Object.fromEntries(bodas.map((b) => [b.id, b])),
    [bodas],
  );
  const leadsById = useMemo(
    () => Object.fromEntries(leads.map((l) => [l.id, l])),
    [leads],
  );

  const activa = isCitaActiva(cita.estado);

  const cancelWhatsappMessage = useMemo(() => {
    if (!cancelledCita) return null;
    return buildCitaCancelacionWhatsAppMessageFromCita(cancelledCita, {
      bodasById,
      leadsById,
    });
  }, [cancelledCita, bodasById, leadsById]);

  const cancelWhatsappUrl = useMemo(() => {
    if (!cancelledCita || !cancelWhatsappMessage) return null;
    const cliente = getClienteInfoForCita(cancelledCita, bodasById, leadsById);
    return getCitaWhatsAppUrl(cliente?.telefono, cancelWhatsappMessage);
  }, [cancelledCita, cancelWhatsappMessage, bodasById, leadsById]);

  async function handleCancelConfirm() {
    if (!supabase) return;
    setBusy(true);
    setError(null);
    try {
      const { data, error: updateError } = await supabase
        .from("citas")
        .update({ estado: "cancelada", confirmada: false })
        .eq("id", cita.id)
        .select("*")
        .single();

      if (updateError) throw new Error(updateError.message);

      const updated = normalizeCitaRow(data as CitaRow);
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
          <button
            type="button"
            onClick={() => setEditOpen(true)}
            className="rounded-full border border-bloom-border px-3 py-1 text-xs font-medium text-bloom-ink hover:bg-bloom-canvas"
          >
            Editar
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
  onConfirm: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4"
      role="alertdialog"
      aria-modal="true"
    >
      <div className="w-full max-w-md rounded-2xl border border-bloom-border bg-bloom-surface p-6 shadow-lg">
        <h4 className="font-display text-lg text-bloom-ink">{title}</h4>
        <p className="mt-2 text-sm text-bloom-muted">{description}</p>
        {error && (
          <p className="mt-2 text-sm text-red-700" role="alert">
            {error}
          </p>
        )}
        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            className="rounded-full border border-bloom-border px-4 py-2 text-sm font-medium text-bloom-ink disabled:opacity-60"
          >
            Volver
          </button>
          <button
            type="button"
            onClick={onConfirm}
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
