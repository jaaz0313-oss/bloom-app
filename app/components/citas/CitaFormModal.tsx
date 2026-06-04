"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  CITA_TIPO_LABELS,
  type CitaRow,
  type CitaTipo,
} from "@/app/data/citas";
import {
  collectCitaInvolvedEmails,
  emailsToStrings,
  type CitaInvolvedEmail,
} from "@/lib/cita-emails";
import {
  CITA_TIME_SLOT_OPTIONS,
  citaTimeFromDb,
  citaTimeToDb,
} from "@/lib/cita-time-slots";
import {
  buildAutoCitaTitulo,
  getCitaRelacionNombre,
  parseProveedorFromCitaTitulo,
} from "@/lib/cita-titulo";
import {
  canCreateCitaTipo,
  citaScheduleChanged,
  getCitaScheduleSnapshot,
  getCitaTiposForRole,
  normalizeCitaRow,
  type CitaScheduleSnapshot,
} from "@/lib/citas";
import { CitaCreadaConfirmacion } from "./CitaCreadaConfirmacion";
import type {
  CitaLookupBoda,
  CitaLookupEquipo,
  CitaLookupLead,
} from "./cita-lookup";
import {
  CitaProveedorPicker,
  type CitaProveedorCita,
} from "./CitaProveedorPicker";
import type { UserRole } from "@/lib/auth/roles";
import {
  actualizarEventoCalendar,
  crearEventoCalendar,
} from "@/lib/cita-google-calendar";
import { supabase } from "@/lib/supabase";

export type { CitaLookupBoda, CitaLookupEquipo, CitaLookupLead } from "./cita-lookup";

type CitaFormModalProps = {
  open: boolean;
  onClose: () => void;
  role: UserRole;
  currentUserId: string;
  currentUserNombre: string;
  bodas: CitaLookupBoda[];
  leads: CitaLookupLead[];
  equipo: CitaLookupEquipo[];
  defaultBodaId?: string | null;
  defaultLeadId?: string | null;
  defaultFecha?: string;
  editingCita?: CitaRow | null;
  onCreated?: (cita: CitaRow) => void;
  onUpdated?: (cita: CitaRow) => void;
};

type ConfirmacionTipo = "created" | "modified" | "updated";

const inputClass =
  "w-full rounded-xl border border-bloom-border bg-bloom-canvas px-3 py-2 text-sm text-bloom-ink outline-none focus:border-bloom-accent focus:ring-2 focus:ring-bloom-accent/20";

export function CitaFormModal({
  open,
  onClose,
  role,
  currentUserId,
  bodas,
  leads,
  equipo,
  defaultBodaId = null,
  defaultLeadId = null,
  defaultFecha,
  editingCita = null,
  onCreated,
  onUpdated,
}: CitaFormModalProps) {
  const router = useRouter();
  const isEditing = !!editingCita;
  const scheduleBeforeRef = useRef<CitaScheduleSnapshot | null>(null);
  const tiposDisponibles = useMemo(() => getCitaTiposForRole(role), [role]);

  const [tipo, setTipo] = useState<CitaTipo>(tiposDisponibles[0] ?? "reunion_seguimiento");
  const [titulo, setTitulo] = useState("");
  const [fecha, setFecha] = useState(defaultFecha ?? "");
  const [horaInicio, setHoraInicio] = useState("10:00");
  const [horaFin, setHoraFin] = useState("");
  const [lugar, setLugar] = useState("");
  const [linkMeet, setLinkMeet] = useState("");
  const [notas, setNotas] = useState("");
  const [relacionTipo, setRelacionTipo] = useState<"ninguna" | "boda" | "lead">(
    defaultBodaId ? "boda" : defaultLeadId ? "lead" : "ninguna",
  );
  const [bodaId, setBodaId] = useState(defaultBodaId ?? "");
  const [leadId, setLeadId] = useState(defaultLeadId ?? "");
  const [proveedorCita, setProveedorCita] = useState<CitaProveedorCita | null>(
    null,
  );
  const [asignadoId, setAsignadoId] = useState(currentUserId);
  const [tituloEditadoManual, setTituloEditadoManual] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdCita, setCreatedCita] = useState<CitaRow | null>(null);
  const [confirmacionTipo, setConfirmacionTipo] =
    useState<ConfirmacionTipo>("created");
  const [involvedEmails, setInvolvedEmails] = useState<CitaInvolvedEmail[]>([]);
  const [createdProveedorTelefono, setCreatedProveedorTelefono] = useState<
    string | null
  >(null);
  const [calendarWarning, setCalendarWarning] = useState<string | null>(null);

  const bodasById = useMemo(
    () => Object.fromEntries(bodas.map((b) => [b.id, b])),
    [bodas],
  );
  const leadsById = useMemo(
    () => Object.fromEntries(leads.map((l) => [l.id, l])),
    [leads],
  );

  const esReunionProveedor = tipo === "reunion_proveedor";

  function loadFormFromCita(raw: CitaRow) {
    const cita = normalizeCitaRow(raw);
    setTipo(cita.tipo);
    setTitulo(cita.titulo);
    setFecha(cita.fecha);
    setHoraInicio(citaTimeFromDb(cita.hora_inicio));
    setHoraFin(cita.hora_fin ? citaTimeFromDb(cita.hora_fin) : "");
    setLugar(cita.lugar ?? "");
    setLinkMeet(cita.link_meet ?? "");
    setNotas(cita.notas ?? "");
    if (cita.boda_id) {
      setRelacionTipo("boda");
      setBodaId(cita.boda_id);
      setLeadId("");
    } else if (cita.lead_id) {
      setRelacionTipo("lead");
      setLeadId(cita.lead_id);
      setBodaId("");
    } else {
      setRelacionTipo("ninguna");
      setBodaId("");
      setLeadId("");
    }
    if (cita.tipo === "reunion_proveedor") {
      const parsed = parseProveedorFromCitaTitulo(cita.titulo);
      setProveedorCita(
        parsed ?
          { ...parsed, email: null }
        : null,
      );
    } else {
      setProveedorCita(null);
    }
    setAsignadoId(cita.asignado_a ?? currentUserId);
    setTituloEditadoManual(true);
    scheduleBeforeRef.current = getCitaScheduleSnapshot(cita);
  }

  useEffect(() => {
    if (!open) return;
    setError(null);
    setCreatedCita(null);
    setInvolvedEmails([]);
    setCreatedProveedorTelefono(null);
    setConfirmacionTipo("created");

    if (editingCita) {
      loadFormFromCita(editingCita);
      return;
    }

    setTipo(tiposDisponibles[0] ?? "reunion_seguimiento");
    setTitulo("");
    setFecha(defaultFecha ?? new Date().toISOString().slice(0, 10));
    setHoraInicio("10:00");
    setHoraFin("");
    setLugar("");
    setLinkMeet("");
    setNotas("");
    setRelacionTipo(defaultBodaId ? "boda" : defaultLeadId ? "lead" : "ninguna");
    setBodaId(defaultBodaId ?? "");
    setLeadId(defaultLeadId ?? "");
    setProveedorCita(null);
    setAsignadoId(currentUserId);
    setTituloEditadoManual(false);
    scheduleBeforeRef.current = null;
  }, [
    open,
    editingCita,
    tiposDisponibles,
    defaultFecha,
    defaultBodaId,
    defaultLeadId,
    currentUserId,
  ]);

  useEffect(() => {
    if (!esReunionProveedor) {
      setProveedorCita(null);
      return;
    }
    setRelacionTipo("boda");
    setLeadId("");
  }, [esReunionProveedor]);

  const relacionNombre = useMemo(
    () =>
      getCitaRelacionNombre({
        relacionTipo,
        bodaId,
        leadId,
        bodasById,
        leadsById,
      }),
    [relacionTipo, bodaId, leadId, bodasById, leadsById],
  );

  const tituloAutomatico = useMemo(
    () =>
      buildAutoCitaTitulo({
        tipo,
        relacionNombre,
        proveedor: proveedorCita,
      }),
    [tipo, relacionNombre, proveedorCita],
  );

  useEffect(() => {
    if (tituloEditadoManual) return;
    setTitulo(tituloAutomatico);
  }, [tituloAutomatico, tituloEditadoManual]);

  async function applyGoogleCalendarSync(
    cita: CitaRow,
    mode: "create" | "update",
    hadGoogleEvent: boolean,
  ): Promise<CitaRow> {
    if (mode === "update" && !hadGoogleEvent) {
      return cita;
    }

    const result =
      mode === "create"
        ? await crearEventoCalendar(cita.id)
        : await actualizarEventoCalendar(cita.id);

    if (result.warning) {
      setCalendarWarning(result.warning);
      return cita;
    }

    setCalendarWarning(null);

    if (!result.meetLink && !result.eventId) {
      return cita;
    }

    return {
      ...cita,
      google_event_id: result.eventId ?? cita.google_event_id,
      google_meet_link: result.meetLink ?? cita.google_meet_link,
      link_meet: result.meetLink ?? cita.link_meet,
    };
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!canCreateCitaTipo(role, tipo)) {
      setError("No tienes permiso para crear este tipo de cita.");
      return;
    }

    const tituloTrim = titulo.trim();
    if (!tituloTrim) return setError("Ingresa un título.");
    if (!fecha) return setError("Selecciona una fecha.");
    if (!horaInicio) return setError("Selecciona la hora de inicio.");

    if (relacionTipo === "boda" && !bodaId) {
      return setError("Selecciona una boda.");
    }
    if (relacionTipo === "lead" && !leadId) {
      return setError("Selecciona un lead.");
    }
    if (esReunionProveedor) {
      if (relacionTipo !== "boda" || !bodaId) {
        return setError("Selecciona una boda para la reunión con proveedor.");
      }
      if (!proveedorCita?.nombre.trim()) {
        return setError("Selecciona o ingresa un proveedor.");
      }
    }

    const asignado = equipo.find((u) => u.id === asignadoId);

    const emailEntries = collectCitaInvolvedEmails({
      tipo,
      relacionTipo,
      bodaId,
      asignadoId,
      equipo,
      boda: bodaId ? (bodasById[bodaId] ?? null) : null,
      proveedor: proveedorCita,
    });
    const emailsInvolucrados = emailsToStrings(emailEntries);

    if (!supabase) {
      setError("Supabase no está configurado.");
      return;
    }

    const payload = {
      tipo,
      titulo: tituloTrim,
      fecha,
      hora_inicio: citaTimeToDb(horaInicio),
      hora_fin: horaFin ? citaTimeToDb(horaFin) : null,
      lugar: lugar.trim() || null,
      link_meet: linkMeet.trim() || null,
      notas: notas.trim() || null,
      boda_id: relacionTipo === "boda" ? bodaId : null,
      lead_id: relacionTipo === "lead" ? leadId : null,
      proveedor_id: null,
      emails_involucrados:
        emailsInvolucrados.length > 0 ? emailsInvolucrados : null,
      asignado_a: asignadoId || null,
      asignado_nombre: asignado?.nombre ?? null,
    };

    setSubmitting(true);
    setCalendarWarning(null);
    try {
      if (isEditing && editingCita) {
        const { data, error: updateError } = await supabase
          .from("citas")
          .update({
            ...payload,
            confirmada: editingCita.estado === "confirmada",
            estado: editingCita.estado,
          })
          .eq("id", editingCita.id)
          .select("*")
          .single();

        if (updateError) {
          setError(updateError.message);
          return;
        }

        const cita = data as CitaRow;
        const scheduleChanged =
          scheduleBeforeRef.current ?
            citaScheduleChanged(
              scheduleBeforeRef.current,
              getCitaScheduleSnapshot(cita),
            )
          : false;

        const syncedCita = await applyGoogleCalendarSync(
          cita,
          "update",
          Boolean(editingCita.google_event_id),
        );

        setCreatedCita(syncedCita);
        setInvolvedEmails(emailEntries);
        setConfirmacionTipo(scheduleChanged ? "modified" : "updated");
        onUpdated?.(syncedCita);
        router.refresh();
        return;
      }

      const { data, error: insertError } = await supabase
        .from("citas")
        .insert({
          ...payload,
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

      const cita = data as CitaRow;
      const syncedCita = await applyGoogleCalendarSync(cita, "create", false);

      setCreatedCita(syncedCita);
      setInvolvedEmails(emailEntries);
      setCreatedProveedorTelefono(proveedorCita?.telefono?.trim() || null);
      setConfirmacionTipo("created");
      onCreated?.(syncedCita);
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  }

  const confirmacionHeading =
    confirmacionTipo === "created"
      ? "Cita creada"
      : confirmacionTipo === "modified"
        ? "Cita actualizada"
        : "Cambios guardados";

  function handleConfirmacionClose() {
    setCreatedCita(null);
    setCreatedProveedorTelefono(null);
    setCalendarWarning(null);
    onClose();
  }

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      role="dialog"
      aria-modal="true"
      aria-label={createdCita ? confirmacionHeading : isEditing ? "Editar cita" : "Nueva cita"}
      onClick={(e) => {
        if (e.target === e.currentTarget && !submitting && !createdCita) onClose();
      }}
    >
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-bloom-border bg-bloom-surface p-6 shadow-lg">
        <div className="flex items-start justify-between gap-4">
          <h3 className="font-display text-xl text-bloom-ink">
            {createdCita
              ? confirmacionHeading
              : isEditing
                ? "Editar cita"
                : "Nueva cita"}
          </h3>
          <button
            type="button"
            onClick={createdCita ? handleConfirmacionClose : onClose}
            className="rounded-full p-2 text-bloom-muted hover:bg-bloom-border"
          >
            ✕
          </button>
        </div>

        {createdCita ? (
          <CitaCreadaConfirmacion
            cita={createdCita}
            involvedEmails={involvedEmails}
            bodasById={bodasById}
            leadsById={leadsById}
            onClose={handleConfirmacionClose}
            variant={confirmacionTipo}
            proveedorTelefono={createdProveedorTelefono}
            calendarWarning={calendarWarning}
          />
        ) : (
          <form className="mt-5 space-y-4" onSubmit={handleSubmit}>
            {/* 1. Tipo de cita */}
            <Field label="Tipo de cita">
              <select
                className={inputClass}
                value={tipo}
                onChange={(e) => {
                  setTituloEditadoManual(false);
                  setTipo(e.target.value as CitaTipo);
                }}
                required
              >
                {tiposDisponibles.map((t) => (
                  <option key={t} value={t}>
                    {CITA_TIPO_LABELS[t]}
                  </option>
                ))}
              </select>
            </Field>

            {/* 2. Boda / lead / proveedor */}
            {esReunionProveedor ? (
              <>
                <CitaProveedorPicker
                  open={open}
                  value={proveedorCita}
                  onChange={setProveedorCita}
                  onInteraction={() => setTituloEditadoManual(false)}
                />
                <Field label="Boda">
                  <select
                    className={inputClass}
                    value={bodaId}
                    onChange={(e) => {
                      setTituloEditadoManual(false);
                      setBodaId(e.target.value);
                    }}
                    required
                  >
                    <option value="">Seleccionar boda</option>
                    {bodas.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.nombre_pareja}
                      </option>
                    ))}
                  </select>
                </Field>
              </>
            ) : (
              <>
                <Field label="Vincular a">
                  <select
                    className={inputClass}
                    value={relacionTipo}
                    onChange={(e) => {
                      setTituloEditadoManual(false);
                      const value = e.target.value as "ninguna" | "boda" | "lead";
                      setRelacionTipo(value);
                      if (value !== "boda") setBodaId("");
                      if (value !== "lead") setLeadId("");
                    }}
                  >
                    <option value="ninguna">Sin vincular</option>
                    <option value="boda">Boda</option>
                    <option value="lead">Lead</option>
                  </select>
                </Field>
                {relacionTipo === "boda" && (
                  <Field label="Boda">
                    <select
                      className={inputClass}
                      value={bodaId}
                      onChange={(e) => {
                        setTituloEditadoManual(false);
                        setBodaId(e.target.value);
                      }}
                      required
                    >
                      <option value="">Seleccionar boda</option>
                      {bodas.map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.nombre_pareja}
                        </option>
                      ))}
                    </select>
                  </Field>
                )}
                {relacionTipo === "lead" && (
                  <Field label="Lead">
                    <select
                      className={inputClass}
                      value={leadId}
                      onChange={(e) => {
                        setTituloEditadoManual(false);
                        setLeadId(e.target.value);
                      }}
                      required
                    >
                      <option value="">Seleccionar lead</option>
                      {leads.map((l) => (
                        <option key={l.id} value={l.id}>
                          {l.nombre_pareja}
                        </option>
                      ))}
                    </select>
                  </Field>
                )}
              </>
            )}

            {/* 3. Equipo Celestia */}
            <Field label="Miembro del equipo Celestia asignado">
              <select
                className={inputClass}
                value={asignadoId}
                onChange={(e) => setAsignadoId(e.target.value)}
              >
                {equipo.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.nombre}
                  </option>
                ))}
              </select>
            </Field>

            {/* 4. Fecha */}
            <Field label="Fecha">
              <input
                type="date"
                className={inputClass}
                value={fecha}
                onChange={(e) => setFecha(e.target.value)}
                required
              />
            </Field>

            {/* 5. Horas */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Field label="Hora inicio">
                <select
                  className={inputClass}
                  value={horaInicio}
                  onChange={(e) => setHoraInicio(e.target.value)}
                  required
                >
                  {CITA_TIME_SLOT_OPTIONS.map((slot) => (
                    <option key={slot.value} value={slot.value}>
                      {slot.label}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Hora fin">
                <select
                  className={inputClass}
                  value={horaFin}
                  onChange={(e) => setHoraFin(e.target.value)}
                >
                  <option value="">Sin hora fin</option>
                  {CITA_TIME_SLOT_OPTIONS.map((slot) => (
                    <option key={slot.value} value={slot.value}>
                      {slot.label}
                    </option>
                  ))}
                </select>
              </Field>
            </div>

            {/* 6. Meet */}
            <Field label="Link de Meet (opcional)">
              <input
                type="url"
                className={inputClass}
                value={linkMeet}
                onChange={(e) => setLinkMeet(e.target.value)}
                placeholder="https://meet.google.com/..."
              />
            </Field>

            {/* 7. Lugar */}
            <Field label="Lugar (opcional)">
              <input
                className={inputClass}
                value={lugar}
                onChange={(e) => setLugar(e.target.value)}
              />
            </Field>

            {/* 8. Título */}
            <Field label="Título">
              <input
                className={inputClass}
                value={titulo}
                onChange={(e) => {
                  setTituloEditadoManual(true);
                  setTitulo(e.target.value);
                }}
                placeholder={tituloAutomatico || "Se genera automáticamente"}
                required
              />
              {!tituloEditadoManual && tituloAutomatico && (
                <p className="text-xs text-bloom-muted">
                  Generado automáticamente según tipo y selección
                </p>
              )}
            </Field>

            {/* 9. Notas */}
            <Field label="Notas (opcional)">
              <textarea
                className={inputClass}
                rows={2}
                value={notas}
                onChange={(e) => setNotas(e.target.value)}
              />
            </Field>

            {error && (
              <p className="text-sm text-red-700" role="alert">
                {error}
              </p>
            )}

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                disabled={submitting}
                className="rounded-full border border-bloom-border px-5 py-2.5 text-sm font-medium text-bloom-ink"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="rounded-full bg-bloom-accent px-5 py-2.5 text-sm font-medium text-white hover:bg-bloom-accent-hover disabled:opacity-60"
              >
                {submitting
                  ? "Guardando…"
                  : isEditing
                    ? "Guardar cambios"
                    : "Crear cita"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
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
