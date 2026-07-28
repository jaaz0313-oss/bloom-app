"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { LeadRow } from "@/app/data/leads";
import { ResponsiveModal } from "@/app/components/ui/ResponsiveModal";
import {
  CITA_TIME_SLOT_OPTIONS,
  citaTimeToDb,
  getCitaEndTimeSlotOptions,
} from "@/lib/cita-time-slots";
import { crearEventoCalendar } from "@/lib/cita-google-calendar";
import { canCreateCitaTipo, normalizeCitaRow } from "@/lib/citas";
import {
  AUDITORIA_ACCIONES,
  buildCitaAuditoriaDetalle,
  logAuditoria,
} from "@/lib/auditoria";
import type { UserRole } from "@/lib/auth/roles";
import { supabase } from "@/lib/supabase";
import type { CitaRow } from "@/app/data/citas";

type LeadAgendarReunionModalProps = {
  open: boolean;
  onClose: () => void;
  lead: Pick<LeadRow, "id" | "nombre_pareja" | "email">;
  role: UserRole;
  currentUserId: string;
  currentUserNombre: string;
  onCreated?: () => void;
};

const inputClass =
  "w-full rounded-xl border border-bloom-border bg-bloom-canvas px-3 py-2 text-sm text-bloom-ink outline-none focus:border-bloom-accent focus:ring-2 focus:ring-bloom-accent/20";

function defaultTitulo(nombre: string): string {
  const trimmed = nombre.trim() || "lead";
  return `Reunión con ${trimmed}`;
}

export function LeadAgendarReunionModal({
  open,
  onClose,
  lead,
  role,
  currentUserId,
  currentUserNombre,
  onCreated,
}: LeadAgendarReunionModalProps) {
  const router = useRouter();
  const [fecha, setFecha] = useState("");
  const [horaInicio, setHoraInicio] = useState("10:00");
  const [horaFin, setHoraFin] = useState("");
  const [lugar, setLugar] = useState("");
  const [notas, setNotas] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const endOptions = useMemo(
    () => getCitaEndTimeSlotOptions(horaInicio),
    [horaInicio],
  );

  useEffect(() => {
    if (!open) return;
    setFecha("");
    setHoraInicio("10:00");
    setHoraFin("");
    setLugar("");
    setNotas("");
    setError(null);
    setSuccess(false);
    setSubmitting(false);
  }, [open, lead.id]);

  useEffect(() => {
    if (!horaFin) return;
    if (endOptions.some((slot) => slot.value === horaFin)) return;
    setHoraFin("");
  }, [horaFin, endOptions]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!supabase) {
      setError("Supabase no está configurado.");
      return;
    }
    if (!fecha) {
      setError("Ingresa la fecha.");
      return;
    }
    if (!horaInicio) {
      setError("Ingresa la hora de inicio.");
      return;
    }

    const tipo = canCreateCitaTipo(role, "primera_reunion")
      ? "primera_reunion"
      : "reunion_seguimiento";

    const email = lead.email?.trim() || null;
    const titulo = defaultTitulo(lead.nombre_pareja);

    setSubmitting(true);
    try {
      const { data, error: insertError } = await supabase
        .from("citas")
        .insert({
          tipo,
          titulo,
          fecha,
          hora_inicio: citaTimeToDb(horaInicio),
          hora_fin: horaFin ? citaTimeToDb(horaFin) : null,
          lugar: lugar.trim() || null,
          link_meet: null,
          notas: notas.trim() || null,
          boda_id: null,
          lead_id: lead.id,
          proveedor_id: null,
          emails_involucrados: email ? [email] : null,
          asignado_a: currentUserId,
          asignado_nombre: currentUserNombre.trim() || null,
          estado: "programada",
          confirmada: false,
          created_by: currentUserId,
        })
        .select("*")
        .single();

      if (insertError) {
        setError(insertError.message);
        return;
      }

      const cita = normalizeCitaRow(data as CitaRow);

      await crearEventoCalendar(cita.id);

      await logAuditoria({
        accion: AUDITORIA_ACCIONES.CITA_CREADA,
        entidad: "cita",
        entidadId: cita.id,
        bodaNombre: lead.nombre_pareja,
        detalle: buildCitaAuditoriaDetalle(cita),
      });

      setSuccess(true);
      onCreated?.();
      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "No se pudo agendar la reunión.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <ResponsiveModal
      open={open}
      onClose={() => {
        if (!submitting) onClose();
      }}
      title={success ? "Reunión agendada" : "Agendar reunión"}
      subtitle={
        success
          ? undefined
          : `Con ${lead.nombre_pareja.trim() || "este lead"}`
      }
      size="md"
      closeDisabled={submitting}
      footer={
        success ? (
          <button
            type="button"
            onClick={onClose}
            className="rounded-full bg-bloom-accent px-5 py-2.5 text-sm font-medium text-white hover:bg-bloom-accent-hover"
          >
            Listo
          </button>
        ) : (
          <div className="flex w-full items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="rounded-full border border-bloom-border px-5 py-2.5 text-sm font-medium text-bloom-ink hover:bg-bloom-canvas disabled:opacity-60"
            >
              Cancelar
            </button>
            <button
              type="submit"
              form="lead-agendar-reunion-form"
              disabled={submitting}
              className="rounded-full bg-bloom-accent px-5 py-2.5 text-sm font-medium text-white hover:bg-bloom-accent-hover disabled:opacity-60"
            >
              {submitting ? "Agendando…" : "Agendar"}
            </button>
          </div>
        )
      }
    >
      {success ? (
        <div className="space-y-3">
          <p className="text-sm text-bloom-ink">
            Reunión agendada correctamente
          </p>
        </div>
      ) : (
        <form
          id="lead-agendar-reunion-form"
          className="space-y-4"
          onSubmit={handleSubmit}
        >
          <div className="rounded-xl border border-bloom-border/70 bg-bloom-canvas/60 px-3 py-2 text-xs text-bloom-muted">
            <p>
              <span className="font-medium text-bloom-ink">Título:</span>{" "}
              {defaultTitulo(lead.nombre_pareja)}
            </p>
            {lead.email?.trim() ? (
              <p className="mt-1">
                <span className="font-medium text-bloom-ink">Email Calendar:</span>{" "}
                {lead.email.trim()}
              </p>
            ) : (
              <p className="mt-1">Sin email en el lead (puedes agregarlo después).</p>
            )}
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-bloom-ink">Fecha</label>
            <input
              type="date"
              className={inputClass}
              value={fecha}
              onChange={(e) => setFecha(e.target.value)}
              required
              disabled={submitting}
              autoFocus
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-bloom-ink">
                Hora inicio
              </label>
              <select
                className={inputClass}
                value={horaInicio}
                onChange={(e) => setHoraInicio(e.target.value)}
                required
                disabled={submitting}
              >
                {CITA_TIME_SLOT_OPTIONS.map((slot) => (
                  <option key={slot.value} value={slot.value}>
                    {slot.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-bloom-ink">
                Hora fin{" "}
                <span className="font-normal text-bloom-muted">(opcional)</span>
              </label>
              <select
                className={inputClass}
                value={horaFin}
                onChange={(e) => setHoraFin(e.target.value)}
                disabled={submitting}
              >
                <option value="">Sin hora fin</option>
                {endOptions.map((slot) => (
                  <option key={slot.value} value={slot.value}>
                    {slot.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-bloom-ink">
              Lugar / modalidad
            </label>
            <input
              className={inputClass}
              value={lugar}
              onChange={(e) => setLugar(e.target.value)}
              placeholder="Videollamada, Oficina Celestia…"
              disabled={submitting}
              list="lead-reunion-lugar-suggestions"
            />
            <datalist id="lead-reunion-lugar-suggestions">
              <option value="Videollamada" />
              <option value="Oficina Celestia" />
              <option value="Presencial" />
            </datalist>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-bloom-ink">
              Notas{" "}
              <span className="font-normal text-bloom-muted">(opcional)</span>
            </label>
            <textarea
              rows={3}
              className={inputClass}
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
              disabled={submitting}
              placeholder="Temas a tratar, contexto…"
            />
          </div>

          {error && (
            <p className="text-sm text-red-700" role="alert">
              {error}
            </p>
          )}
        </form>
      )}
    </ResponsiveModal>
  );
}

type LeadAgendarReunionButtonProps = {
  lead: Pick<LeadRow, "id" | "nombre_pareja" | "email">;
  role: UserRole;
  currentUserId: string;
  currentUserNombre: string;
  className?: string;
  label?: string;
};

export function LeadAgendarReunionButton({
  lead,
  role,
  currentUserId,
  currentUserNombre,
  className,
  label = "Agendar reunión",
}: LeadAgendarReunionButtonProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={
          className ??
          "rounded-full border border-bloom-border bg-bloom-canvas px-4 py-2 text-xs font-medium text-bloom-ink transition-colors hover:bg-bloom-border"
        }
      >
        {label}
      </button>
      <LeadAgendarReunionModal
        open={open}
        onClose={() => setOpen(false)}
        lead={lead}
        role={role}
        currentUserId={currentUserId}
        currentUserNombre={currentUserNombre}
      />
    </>
  );
}
