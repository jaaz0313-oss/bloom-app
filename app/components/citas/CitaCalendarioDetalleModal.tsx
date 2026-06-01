"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  CITA_ESTADO_LABELS,
  CITA_ESTADO_STYLES,
  CITA_TIPO_LABELS,
  type CitaRow,
} from "@/app/data/citas";
import { ResponsiveModal } from "@/app/components/ui/ResponsiveModal";
import {
  formatCitaHorario,
  getCitaRelacionLabel,
  isCitaActiva,
  normalizeCitaRow,
} from "@/lib/citas";
import type { UserRole } from "@/lib/auth/roles";
import { formatShortDateStable } from "@/lib/format";
import { supabase } from "@/lib/supabase";
import { CitaFormModal } from "./CitaFormModal";
import type { CitaLookupBoda, CitaLookupEquipo, CitaLookupLead } from "./cita-lookup";

type CitaCalendarioDetalleModalProps = {
  cita: CitaRow | null;
  onClose: () => void;
  bodas: CitaLookupBoda[];
  leads: CitaLookupLead[];
  equipo: CitaLookupEquipo[];
  role: UserRole;
  currentUserId: string;
  currentUserNombre: string;
  onChange: (cita: CitaRow | null) => void;
};

export function CitaCalendarioDetalleModal({
  cita,
  onClose,
  bodas,
  leads,
  equipo,
  role,
  currentUserId,
  currentUserNombre,
  onChange,
}: CitaCalendarioDetalleModalProps) {
  const router = useRouter();
  const [editOpen, setEditOpen] = useState(false);
  const [cancelConfirmOpen, setCancelConfirmOpen] = useState(false);
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

  const relacion = cita
    ? getCitaRelacionLabel(cita, bodasById, leadsById)
    : "";
  const activa = cita ? isCitaActiva(cita.estado) : false;

  async function handleCancelConfirm() {
    if (!supabase || !cita) return;
    const citaId = cita.id;
    setBusy(true);
    setError(null);
    try {
      const { data, error: updateError } = await supabase
        .from("citas")
        .update({ estado: "cancelada", confirmada: false })
        .eq("id", citaId)
        .select("*")
        .single();

      if (updateError) throw new Error(updateError.message);

      const updated = normalizeCitaRow(data as CitaRow);
      setCancelConfirmOpen(false);
      onChange(updated);
      onClose();
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo cancelar la cita.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <ResponsiveModal
        open={cita != null}
        onClose={onClose}
        title={cita?.titulo ?? "Cita"}
        subtitle={cita ? CITA_TIPO_LABELS[cita.tipo] : undefined}
        size="md"
        footer={
          cita ? (
            <div className="flex flex-wrap justify-end gap-2">
              <button
                type="button"
                onClick={() => setEditOpen(true)}
                className="rounded-full border border-bloom-border bg-bloom-surface px-4 py-2 text-sm font-medium text-bloom-ink hover:bg-bloom-canvas"
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
                  className="rounded-full border border-amber-200 bg-amber-50 px-4 py-2 text-sm font-medium text-amber-900 hover:bg-amber-100"
                >
                  Cancelar cita
                </button>
              )}
            </div>
          ) : undefined
        }
      >
        {cita && (
          <dl className="space-y-4 text-sm">
            <DetailRow label="Tipo">{CITA_TIPO_LABELS[cita.tipo]}</DetailRow>
            <DetailRow label="Estado">
              <span
                className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-medium ${CITA_ESTADO_STYLES[cita.estado]}`}
              >
                {CITA_ESTADO_LABELS[cita.estado]}
              </span>
            </DetailRow>
            <DetailRow label="Fecha y hora">
              {formatShortDateStable(cita.fecha)} · {formatCitaHorario(cita)}
            </DetailRow>
            <DetailRow label="Lugar">{cita.lugar || "—"}</DetailRow>
            <DetailRow label="Link de Meet">
              {cita.link_meet ? (
                <a
                  href={cita.link_meet}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="break-all text-bloom-accent hover:underline"
                >
                  {cita.link_meet}
                </a>
              ) : (
                "—"
              )}
            </DetailRow>
            <DetailRow label="Boda o lead">{relacion || "—"}</DetailRow>
            <DetailRow label="Asignado a">
              {cita.asignado_nombre || "—"}
            </DetailRow>
          </dl>
        )}
      </ResponsiveModal>

      {cita && (
        <CitaFormModal
          open={editOpen}
          onClose={() => setEditOpen(false)}
          editingCita={cita}
          onUpdated={(updated) => {
            onChange(updated);
            onClose();
          }}
          role={role}
          currentUserId={currentUserId}
          currentUserNombre={currentUserNombre}
          bodas={bodas}
          leads={leads}
          equipo={equipo}
        />
      )}

      {cita && cancelConfirmOpen && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4"
          role="alertdialog"
          aria-modal="true"
        >
          <div className="w-full max-w-md rounded-2xl border border-bloom-border bg-bloom-surface p-6 shadow-lg">
            <h4 className="font-display text-lg text-bloom-ink">
              ¿Cancelar esta cita?
            </h4>
            <p className="mt-2 text-sm text-bloom-muted">
              La cita quedará marcada como cancelada.
            </p>
            {error && (
              <p className="mt-2 text-sm text-red-700" role="alert">
                {error}
              </p>
            )}
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setCancelConfirmOpen(false)}
                disabled={busy}
                className="rounded-full border border-bloom-border px-4 py-2 text-sm font-medium text-bloom-ink disabled:opacity-60"
              >
                Volver
              </button>
              <button
                type="button"
                onClick={handleCancelConfirm}
                disabled={busy}
                className="rounded-full bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-700 disabled:opacity-60"
              >
                {busy ? "Cancelando…" : "Sí, cancelar cita"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function DetailRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wide text-bloom-muted">
        {label}
      </dt>
      <dd className="mt-1 text-bloom-ink">{children}</dd>
    </div>
  );
}
