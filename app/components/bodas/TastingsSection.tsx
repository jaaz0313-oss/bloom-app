"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  TastingProveedorPicker,
  type TastingProveedorSelection,
} from "@/app/components/bodas/TastingProveedorPicker";
import { SubirFotosTastingDriveButton } from "@/app/components/bodas/SubirFotosTastingDriveButton";
import {
  normalizeTastingRow,
  sortTastingsBySchedule,
  type TastingRow,
  type TastingTipoCita,
} from "@/app/data/tastings";
import type { UserRole } from "@/lib/auth/roles";
import type { EquipoUsuarioMencion } from "@/lib/notas-menciones";
import {
  CITA_TIME_SLOT_OPTIONS,
  citaTimeFromDb,
  citaTimeToDb,
  getCitaEndTimeSlotOptions,
} from "@/lib/cita-time-slots";
import { formatCurrency, formatDateTimeStable, formatInputCurrency, formatInputCurrencyFromNumber, formatShortDateStable, parseInputCurrency } from "@/lib/format";
import { supabase } from "@/lib/supabase";
import {
  actualizarEventoCalendarTasting,
  crearEventoCalendarTasting,
  eliminarEventoCalendarTastingSiVinculado,
} from "@/lib/tasting-google-calendar";
import {
  appendTastingNotaReunion,
  parseTastingNotasReunion,
  serializeTastingNotasReunion,
} from "@/lib/tasting-notas-reunion";
import {
  checkTastingScheduleConflict,
  checkTastingScheduleWarnings,
} from "@/lib/tastings-conflict";
import {
  canManageTastings,
  canViewTastings,
  getTastingDisplayTitle,
  getTastingTipoBadgeClass,
  getTastingTipoLabel,
  normalizeTastingTipoCita,
  TASTING_TIPO_CITA_OPTIONS,
  type TastingScheduleWarning,
  validateTastingSchedule,
} from "@/lib/tastings";
import { AUDITORIA_ACCIONES, logAuditoria } from "@/lib/auditoria";

type TastingsSectionProps = {
  bodaId: string;
  bodaNombre: string;
  initialTastings: TastingRow[];
  equipo: EquipoUsuarioMencion[];
  role: UserRole;
  currentUserId: string;
  currentUserNombre: string;
  embedded?: boolean;
};

type FormState = {
  tipoCita: TastingTipoCita;
  proveedor: TastingProveedorSelection | null;
  nombreManual: string;
  emailInvitado: string;
  fecha: string;
  horaInicio: string;
  horaFin: string;
  direccion: string;
  costo: string;
  pruebaPagada: boolean;
  asignadoId: string;
  confirmado: boolean;
  notas: string;
};

const inputClass =
  "w-full rounded-xl border border-bloom-border bg-bloom-canvas px-3 py-2 text-sm text-bloom-ink outline-none ring-0 focus:border-bloom-accent focus:ring-2 focus:ring-bloom-accent/30";

const textareaClass = `${inputClass} resize-y min-h-[72px]`;

function emptyForm(): FormState {
  return {
    tipoCita: "tasting",
    proveedor: null,
    nombreManual: "",
    emailInvitado: "",
    fecha: "",
    horaInicio: "",
    horaFin: "",
    direccion: "",
    costo: "",
    pruebaPagada: false,
    asignadoId: "",
    confirmado: false,
    notas: "",
  };
}

function formToState(tasting: TastingRow): FormState {
  const hasProveedor = Boolean(tasting.proveedor_id);
  const emailInvitado = tasting.email_invitado?.trim() ?? "";
  return {
    tipoCita: normalizeTastingTipoCita(tasting.tipo_cita),
    proveedor: hasProveedor
      ? {
          proveedor_id: tasting.proveedor_id as string,
          nombre: tasting.nombre_proveedor,
          categoria: tasting.categoria ?? "",
          email: emailInvitado || null,
        }
      : null,
    nombreManual: hasProveedor ? "" : tasting.nombre_proveedor,
    emailInvitado,
    fecha: tasting.fecha,
    horaInicio: citaTimeFromDb(tasting.hora_inicio),
    horaFin: tasting.hora_fin ? citaTimeFromDb(tasting.hora_fin) : "",
    direccion: tasting.direccion ?? "",
    costo: formatInputCurrencyFromNumber(
      tasting.costo > 0 ? tasting.costo : null,
    ),
    pruebaPagada: tasting.prueba_pagada,
    asignadoId: tasting.asignado_a ?? "",
    confirmado: tasting.confirmado,
    notas: tasting.notas ?? "",
  };
}

function formatTastingTime(value: string): string {
  const match = citaTimeFromDb(value).match(/^(\d{1,2}):(\d{2})/);
  if (!match) return value;
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  const period = hour >= 12 ? "PM" : "AM";
  const hour12 = hour % 12 === 0 ? 12 : hour % 12;
  return `${hour12}:${String(minute).padStart(2, "0")} ${period}`;
}

function formatTastingSchedule(tasting: TastingRow): string {
  const start = formatTastingTime(tasting.hora_inicio);
  if (!tasting.hora_fin) return start;
  return `${start} – ${formatTastingTime(tasting.hora_fin)}`;
}

export function TastingsSection({
  bodaId,
  bodaNombre,
  initialTastings,
  equipo,
  role,
  currentUserId,
  currentUserNombre,
  embedded = false,
}: TastingsSectionProps) {
  const router = useRouter();
  const canView = canViewTastings(role);
  const canManage = canManageTastings(role);
  const [tastings, setTastings] = useState(() =>
    sortTastingsBySchedule(initialTastings.map(normalizeTastingRow)),
  );
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [scheduleWarnings, setScheduleWarnings] = useState<TastingScheduleWarning[]>(
    [],
  );
  const [assigneeConflictWarning, setAssigneeConflictWarning] = useState<
    string | null
  >(null);
  const [calendarWarning, setCalendarWarning] = useState<string | null>(null);
  const [notaOpenId, setNotaOpenId] = useState<string | null>(null);
  const [notaDraft, setNotaDraft] = useState("");
  const [notaSavingId, setNotaSavingId] = useState<string | null>(null);
  const [notaError, setNotaError] = useState<string | null>(null);

  useEffect(() => {
    setTastings(sortTastingsBySchedule(initialTastings.map(normalizeTastingRow)));
  }, [initialTastings]);

  const endTimeOptions = useMemo(
    () => getCitaEndTimeSlotOptions(form.horaInicio),
    [form.horaInicio],
  );

  const asignadoNombre = useMemo(() => {
    if (!form.asignadoId) return "";
    return equipo.find((member) => member.id === form.asignadoId)?.nombre ?? "";
  }, [form.asignadoId, equipo]);

  useEffect(() => {
    if (!formOpen || !supabase) {
      setScheduleWarnings([]);
      setAssigneeConflictWarning(null);
      return;
    }

    if (!form.fecha.trim() || !form.horaInicio.trim()) {
      setScheduleWarnings([]);
      setAssigneeConflictWarning(null);
      return;
    }

    const scheduleError = validateTastingSchedule(form.horaInicio, form.horaFin);
    if (scheduleError) {
      setScheduleWarnings([]);
      setAssigneeConflictWarning(null);
      return;
    }

    let cancelled = false;
    const horaInicioDb = citaTimeToDb(form.horaInicio);
    const horaFinDb = form.horaFin ? citaTimeToDb(form.horaFin) : null;

    void (async () => {
      try {
        const warnings = await checkTastingScheduleWarnings(supabase, {
          fecha: form.fecha,
          horaInicio: horaInicioDb,
          horaFin: horaFinDb,
          excludeTastingId: editingId,
        });

        let assigneeMessage: string | null = null;
        if (form.asignadoId && asignadoNombre) {
          const assigneeConflict = await checkTastingScheduleConflict(supabase, {
            asignadoId: form.asignadoId,
            asignadoNombre,
            fecha: form.fecha,
            horaInicio: horaInicioDb,
            horaFin: horaFinDb,
            excludeTastingId: editingId,
          });
          assigneeMessage = assigneeConflict.message;
        }

        if (!cancelled) {
          setScheduleWarnings(warnings);
          setAssigneeConflictWarning(assigneeMessage);
        }
      } catch {
        if (!cancelled) {
          setScheduleWarnings([]);
          setAssigneeConflictWarning(null);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [
    formOpen,
    form.fecha,
    form.horaInicio,
    form.horaFin,
    form.asignadoId,
    asignadoNombre,
    editingId,
  ]);

  function openForm() {
    if (!canManage) return;
    setError(null);
    setScheduleWarnings([]);
    setAssigneeConflictWarning(null);
    setCalendarWarning(null);
    setEditingId(null);
    setForm(emptyForm());
    setFormOpen(true);
  }

  function openEditForm(tasting: TastingRow) {
    if (!canManage) return;
    setError(null);
    setScheduleWarnings([]);
    setAssigneeConflictWarning(null);
    setCalendarWarning(null);
    setEditingId(tasting.id);
    setForm(formToState(tasting));
    setFormOpen(true);
  }

  function closeForm() {
    setFormOpen(false);
    setEditingId(null);
    setForm(emptyForm());
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canManage) return;
    setError(null);
    setCalendarWarning(null);

    if (!form.fecha.trim()) {
      setError("Indica la fecha del tasting.");
      return;
    }

    const scheduleError = validateTastingSchedule(form.horaInicio, form.horaFin);
    if (scheduleError) {
      setError(scheduleError);
      return;
    }

    if (!supabase) {
      setError("Supabase no está configurado.");
      return;
    }

    const costoNum = form.costo.trim() ? parseInputCurrency(form.costo) : 0;
    if (!Number.isFinite(costoNum) || costoNum < 0) {
      setError("Ingresa un costo válido.");
      return;
    }

    const payload = {
      tipo_cita: form.tipoCita,
      proveedor_id: form.proveedor?.proveedor_id ?? null,
      nombre_proveedor: form.proveedor?.nombre ?? form.nombreManual.trim(),
      categoria: form.proveedor?.categoria ?? null,
      fecha: form.fecha,
      hora_inicio: citaTimeToDb(form.horaInicio),
      hora_fin: form.horaFin ? citaTimeToDb(form.horaFin) : null,
      direccion: form.direccion.trim() || null,
      costo: costoNum,
      costo_pagado: form.pruebaPagada,
      prueba_pagada: form.pruebaPagada,
      asignado_a: form.asignadoId || null,
      asignado_nombre: asignadoNombre || null,
      confirmado: form.confirmado,
      notas: form.notas.trim() || null,
      email_invitado: form.emailInvitado.trim() || null,
    };

    setSubmitting(true);
    try {
      if (editingId) {
        const { data, error: updateError } = await supabase
          .from("tastings")
          .update(payload)
          .eq("id", editingId)
          .select("*")
          .single();

        if (updateError) {
          setError(updateError.message);
          return;
        }

        const tasting = normalizeTastingRow(data as TastingRow);
        setTastings((current) =>
          sortTastingsBySchedule(
            current.map((item) => (item.id === tasting.id ? tasting : item)),
          ),
        );

        await logAuditoria({
          accion: AUDITORIA_ACCIONES.TASTING_EDITADO,
          entidad: "tasting",
          entidadId: tasting.id,
          bodaNombre,
          detalle: `${getTastingDisplayTitle(tasting)} · ${formatShortDateStable(tasting.fecha)} ${formatTastingSchedule(tasting)}`,
        });

        if (tasting.google_event_id) {
          const calendarResult = await actualizarEventoCalendarTasting(tasting.id);
          if (calendarResult.warning) {
            setCalendarWarning(calendarResult.warning);
          }
        }

        closeForm();
        router.refresh();
        return;
      }

      const { data, error: insertError } = await supabase
        .from("tastings")
        .insert({ boda_id: bodaId, ...payload })
        .select("*")
        .single();

      if (insertError) {
        setError(insertError.message);
        return;
      }

      const tasting = normalizeTastingRow(data as TastingRow);
      setTastings((current) => sortTastingsBySchedule([...current, tasting]));

      await logAuditoria({
        accion: AUDITORIA_ACCIONES.TASTING_AGREGADO,
        entidad: "tasting",
        entidadId: tasting.id,
        bodaNombre,
        detalle: `${getTastingDisplayTitle(tasting)} · ${formatShortDateStable(tasting.fecha)} ${formatTastingSchedule(tasting)}`,
      });

      const calendarResult = await crearEventoCalendarTasting(tasting.id);
      if (calendarResult.warning) {
        setCalendarWarning(calendarResult.warning);
      } else if (calendarResult.eventId) {
        setTastings((current) =>
          sortTastingsBySchedule(
            current.map((item) =>
              item.id === tasting.id
                ? {
                    ...item,
                    google_event_id: calendarResult.eventId ?? null,
                    google_meet_link: calendarResult.meetLink ?? null,
                  }
                : item,
            ),
          ),
        );
      }

      closeForm();
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(tasting: TastingRow) {
    if (!canManage || !supabase) return;

    const confirmed = window.confirm(
      "¿Eliminar este tasting? Esta acción no se puede deshacer.",
    );
    if (!confirmed) return;

    setDeletingId(tasting.id);
    setError(null);
    setCalendarWarning(null);

    try {
      await eliminarEventoCalendarTastingSiVinculado(tasting);

      const { error: deleteError } = await supabase
        .from("tastings")
        .delete()
        .eq("id", tasting.id);

      if (deleteError) {
        setError(deleteError.message);
        return;
      }

      setTastings((current) => current.filter((item) => item.id !== tasting.id));

      if (editingId === tasting.id) {
        closeForm();
      }

      await logAuditoria({
        accion: AUDITORIA_ACCIONES.TASTING_ELIMINADO,
        entidad: "tasting",
        entidadId: tasting.id,
        bodaNombre,
        detalle: `${getTastingDisplayTitle(tasting)} · ${formatShortDateStable(tasting.fecha)} ${formatTastingSchedule(tasting)}`,
      });
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "No se pudo eliminar el tasting.",
      );
    } finally {
      setDeletingId(null);
    }
  }

  function openNotaForm(tastingId: string) {
    if (!canManage) return;
    setNotaError(null);
    setNotaDraft("");
    setNotaOpenId(tastingId);
  }

  function closeNotaForm() {
    setNotaOpenId(null);
    setNotaDraft("");
    setNotaError(null);
  }

  async function handleSaveNota(tasting: TastingRow) {
    if (!canManage || !supabase) return;

    const texto = notaDraft.trim();
    if (!texto) {
      setNotaError("Escribe la nota antes de guardar.");
      return;
    }

    setNotaSavingId(tasting.id);
    setNotaError(null);

    const fecha = new Date().toISOString();
    const autor = currentUserNombre.trim() || "Sin autor";
    let notaReunionId: string | null = null;

    try {
      if (tasting.proveedor_id) {
        const { data, error: insertError } = await supabase
          .from("notas_reunion")
          .insert({
            boda_id: bodaId,
            proveedor_id: tasting.proveedor_id,
            fecha,
            con_quien: getTastingDisplayTitle(tasting),
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
          bodaNombre,
          detalle: `${getTastingDisplayTitle(tasting)} · ${texto.slice(0, 120)}${texto.length > 120 ? "…" : ""}`,
        });
      }

      const nextEntries = appendTastingNotaReunion(tasting.notas_reunion, {
        texto,
        fecha,
        autor,
        autorId: currentUserId,
        notaReunionId,
      });

      const { data: updatedData, error: updateError } = await supabase
        .from("tastings")
        .update({
          notas_reunion: serializeTastingNotasReunion(nextEntries),
        })
        .eq("id", tasting.id)
        .select("*")
        .single();

      if (updateError) {
        setNotaError(updateError.message);
        return;
      }

      const updated = normalizeTastingRow(updatedData as TastingRow);
      setTastings((current) =>
        sortTastingsBySchedule(
          current.map((item) => (item.id === updated.id ? updated : item)),
        ),
      );
      closeNotaForm();
      router.refresh();
    } catch (err) {
      setNotaError(
        err instanceof Error ? err.message : "No se pudo guardar la nota.",
      );
    } finally {
      setNotaSavingId(null);
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
          <h2 className="font-display text-xl text-bloom-ink">Semana de Tastings</h2>
          <p className="mt-1 text-sm text-bloom-muted">
            Agenda de degustaciones, visitas y reuniones con proveedores para esta boda.
          </p>
        </>
      )}

      {canManage && (
        <div className={`flex justify-end ${embedded ? "" : "mt-5"}`}>
          <button
            type="button"
            onClick={openForm}
            className="inline-flex items-center justify-center rounded-full bg-bloom-accent px-5 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-bloom-accent-hover"
          >
            Agregar cita
          </button>
        </div>
      )}

      {formOpen && canManage && (
        <form
          className="mt-5 space-y-4 rounded-xl border border-bloom-border bg-bloom-canvas/50 p-4 sm:p-5"
          onSubmit={handleSubmit}
        >
          <p className="text-sm font-medium text-bloom-ink">
            {editingId ? "Editar cita" : "Nueva cita"}
          </p>

          <Field label="Tipo de cita">
            <select
              className={inputClass}
              value={form.tipoCita}
              onChange={(e) =>
                setForm((current) => ({
                  ...current,
                  tipoCita: normalizeTastingTipoCita(e.target.value),
                }))
              }
              disabled={submitting}
              required
            >
              {TASTING_TIPO_CITA_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Proveedor (opcional)">
            <TastingProveedorPicker
              value={form.proveedor}
              onChange={(proveedor) =>
                setForm((current) => ({
                  ...current,
                  proveedor,
                  // Prefill from directorio when a provider is selected; clear if none.
                  emailInvitado: proveedor
                    ? proveedor.email?.trim() || ""
                    : current.emailInvitado,
                }))
              }
              disabled={submitting}
            />
          </Field>

          {!form.proveedor && (
            <Field label="Nombre o descripción (si no hay proveedor)">
              <input
                type="text"
                className={inputClass}
                value={form.nombreManual}
                onChange={(e) =>
                  setForm((current) => ({
                    ...current,
                    nombreManual: e.target.value,
                  }))
                }
                disabled={submitting}
                placeholder="Ej. Visita al salón, degustación menú…"
              />
            </Field>
          )}

          <Field label="Email para invitar (opcional)">
            <input
              type="email"
              className={inputClass}
              value={form.emailInvitado}
              onChange={(e) =>
                setForm((current) => ({
                  ...current,
                  emailInvitado: e.target.value,
                }))
              }
              disabled={submitting}
              placeholder="Se agrega como invitado al evento de Calendar"
              autoComplete="off"
            />
          </Field>

          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Fecha">
              <input
                type="date"
                className={inputClass}
                value={form.fecha}
                onChange={(e) =>
                  setForm((current) => ({ ...current, fecha: e.target.value }))
                }
                disabled={submitting}
                required
              />
            </Field>
            <Field label="Hora inicio">
              <select
                className={inputClass}
                value={form.horaInicio}
                onChange={(e) =>
                  setForm((current) => ({
                    ...current,
                    horaInicio: e.target.value,
                    horaFin:
                      current.horaFin &&
                      getCitaEndTimeSlotOptions(e.target.value).some(
                        (slot) => slot.value === current.horaFin,
                      )
                        ? current.horaFin
                        : "",
                  }))
                }
                disabled={submitting}
                required
              >
                <option value="">Seleccionar…</option>
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
                value={form.horaFin}
                onChange={(e) =>
                  setForm((current) => ({ ...current, horaFin: e.target.value }))
                }
                disabled={submitting || !form.horaInicio}
              >
                <option value="">Sin hora fin</option>
                {endTimeOptions.map((slot) => (
                  <option key={slot.value} value={slot.value}>
                    {slot.label}
                  </option>
                ))}
              </select>
            </Field>
          </div>

          {(scheduleWarnings.length > 0 || assigneeConflictWarning) && (
            <div className="space-y-2">
              {scheduleWarnings.map((warning) => (
                <p
                  key={`${warning.type}-${warning.message}`}
                  className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-900"
                  role="alert"
                >
                  {warning.message}
                </p>
              ))}
              {assigneeConflictWarning && (
                <p
                  className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-900"
                  role="alert"
                >
                  {assigneeConflictWarning}
                </p>
              )}
            </div>
          )}

          <Field label="Dirección">
            <input
              type="text"
              className={inputClass}
              value={form.direccion}
              onChange={(e) =>
                setForm((current) => ({ ...current, direccion: e.target.value }))
              }
              disabled={submitting}
              placeholder="Dirección del tasting"
            />
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Costo">
              <input
                type="text"
                inputMode="numeric"
                autoComplete="off"
                className={inputClass}
                value={form.costo}
                onChange={(e) =>
                  setForm((current) => ({
                    ...current,
                    costo: formatInputCurrency(e.target.value),
                  }))
                }
                disabled={submitting}
                placeholder="Ej: 150.000"
              />
            </Field>
            <Field label="Asignado a">
              <select
                className={inputClass}
                value={form.asignadoId}
                onChange={(e) =>
                  setForm((current) => ({
                    ...current,
                    asignadoId: e.target.value,
                  }))
                }
                disabled={submitting}
              >
                <option value="">Sin asignar</option>
                {equipo.map((member) => (
                  <option key={member.id} value={member.id}>
                    {member.nombre}
                  </option>
                ))}
              </select>
            </Field>
          </div>

          <div className="flex flex-wrap gap-4">
            <label className="inline-flex items-center gap-2 text-sm text-bloom-ink">
              <input
                type="checkbox"
                checked={form.pruebaPagada}
                onChange={(e) =>
                  setForm((current) => ({
                    ...current,
                    pruebaPagada: e.target.checked,
                  }))
                }
                disabled={submitting}
                className="h-4 w-4 rounded border-bloom-border text-bloom-accent focus:ring-bloom-accent/30"
              />
              ¿El cliente pagó la prueba?
            </label>
            <label className="inline-flex items-center gap-2 text-sm text-bloom-ink">
              <input
                type="checkbox"
                checked={form.confirmado}
                onChange={(e) =>
                  setForm((current) => ({
                    ...current,
                    confirmado: e.target.checked,
                  }))
                }
                disabled={submitting}
                className="h-4 w-4 rounded border-bloom-border text-bloom-accent focus:ring-bloom-accent/30"
              />
              Confirmado
            </label>
          </div>

          <Field label="Notas">
            <textarea
              rows={3}
              className={textareaClass}
              value={form.notas}
              onChange={(e) =>
                setForm((current) => ({ ...current, notas: e.target.value }))
              }
              disabled={submitting}
              placeholder="Notas internas del equipo…"
            />
          </Field>

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={closeForm}
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
              {submitting
                ? "Guardando…"
                : editingId
                  ? "Guardar cambios"
                  : "Guardar tasting"}
            </button>
          </div>
        </form>
      )}

      {calendarWarning && (
        <p
          className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-900"
          role="status"
        >
          {calendarWarning}
        </p>
      )}

      {error && (
        <p className="mt-3 rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      {tastings.length === 0 ? (
        <p className="mt-6 rounded-xl border border-dashed border-bloom-border bg-bloom-canvas/60 px-4 py-8 text-center text-sm text-bloom-muted">
          Aún no hay citas programadas para esta boda.
        </p>
      ) : (
        <ul className="mt-6 space-y-3">
          {tastings.map((tasting) => (
            <li
              key={tasting.id}
              className="rounded-xl border border-bloom-border bg-bloom-canvas/60 px-4 py-4"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-medium text-bloom-ink">
                      {getTastingDisplayTitle(tasting)}
                    </h3>
                    <span
                      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${getTastingTipoBadgeClass(tasting.tipo_cita)}`}
                    >
                      {getTastingTipoLabel(tasting.tipo_cita)}
                    </span>
                    {tasting.confirmado && (
                      <span className="inline-flex rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800">
                        Confirmado
                      </span>
                    )}
                    {(tasting.costo ?? 0) > 0 &&
                      (tasting.prueba_pagada ? (
                        <span className="inline-flex rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800">
                          ✅ Prueba pagada
                        </span>
                      ) : (
                        <span className="inline-flex rounded-full bg-orange-100 px-2.5 py-0.5 text-xs font-medium text-orange-800">
                          💰 Pago pendiente
                        </span>
                      ))}
                  </div>
                  {tasting.proveedor_id && tasting.categoria && (
                    <p className="mt-0.5 text-sm text-bloom-muted">
                      {tasting.categoria}
                    </p>
                  )}
                </div>
                <div className="flex items-start gap-3">
                  <div className="text-right text-sm">
                    <p className="font-medium text-bloom-ink">
                      {formatShortDateStable(tasting.fecha)}
                    </p>
                    <p className="text-bloom-muted">
                      {formatTastingSchedule(tasting)}
                    </p>
                  </div>
                  {canManage && (
                    <div className="flex shrink-0 items-center gap-1">
                      <button
                        type="button"
                        onClick={() =>
                          notaOpenId === tasting.id
                            ? closeNotaForm()
                            : openNotaForm(tasting.id)
                        }
                        aria-label="Tomar nota"
                        title="Tomar nota"
                        disabled={deletingId === tasting.id}
                        className="inline-flex h-8 items-center gap-1 rounded-full px-2 text-xs font-medium text-bloom-muted transition-colors hover:bg-bloom-border hover:text-bloom-ink disabled:opacity-50"
                      >
                        <NoteIcon />
                        <span className="hidden sm:inline">Tomar nota</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => openEditForm(tasting)}
                        aria-label="Editar tasting"
                        title="Editar"
                        disabled={deletingId === tasting.id}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-full text-bloom-muted transition-colors hover:bg-bloom-border hover:text-bloom-ink disabled:opacity-50"
                      >
                        <PencilIcon />
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleDelete(tasting)}
                        aria-label="Eliminar tasting"
                        title="Eliminar"
                        disabled={deletingId === tasting.id}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-full text-bloom-muted transition-colors hover:bg-red-50 hover:text-red-700 disabled:opacity-50"
                      >
                        <TrashIcon />
                      </button>
                    </div>
                  )}
                </div>
              </div>

              <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
                {tasting.direccion && (
                  <div>
                    <dt className="text-bloom-muted">Dirección</dt>
                    <dd className="font-medium text-bloom-ink">
                      {tasting.direccion}
                    </dd>
                  </div>
                )}
                {canView && (
                  <div>
                    <dt className="text-bloom-muted">Costo</dt>
                    <dd className="font-medium text-bloom-ink">
                      {formatCurrency(tasting.costo)}
                    </dd>
                  </div>
                )}
                {tasting.asignado_nombre && (
                  <div>
                    <dt className="text-bloom-muted">Asignado a</dt>
                    <dd className="font-medium text-bloom-ink">
                      {tasting.asignado_nombre}
                    </dd>
                  </div>
                )}
                {tasting.google_event_id && (
                  <div>
                    <dt className="text-bloom-muted">Google Calendar</dt>
                    <dd className="font-medium text-bloom-success">Sincronizado</dd>
                  </div>
                )}
              </dl>

              {tasting.google_meet_link?.trim() && (
                <div className="mt-3">
                  <a
                    href={tasting.google_meet_link.trim()}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex rounded-full border border-bloom-accent bg-bloom-accent/10 px-4 py-2 text-sm font-medium text-bloom-accent hover:bg-bloom-accent/20"
                  >
                    Unirse a Meet
                  </a>
                </div>
              )}

              {canView && tasting.notas && (
                <p className="mt-3 whitespace-pre-wrap text-sm text-bloom-muted">
                  {tasting.notas}
                </p>
              )}

              {canManage && (
                <SubirFotosTastingDriveButton
                  bodaId={bodaId}
                  tastingId={tasting.id}
                  fotosDriveUrl={tasting.fotos_drive_url}
                  disabled={deletingId === tasting.id}
                  onSaved={(url) => {
                    setTastings((current) =>
                      current.map((item) =>
                        item.id === tasting.id
                          ? { ...item, fotos_drive_url: url }
                          : item,
                      ),
                    );
                  }}
                />
              )}

              {!canManage && tasting.fotos_drive_url && (
                <div className="mt-3">
                  <a
                    href={tasting.fotos_drive_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex rounded-full border border-bloom-border bg-bloom-surface px-3 py-1.5 text-xs font-medium text-bloom-ink transition-colors hover:bg-bloom-border"
                  >
                    Ver fotos
                  </a>
                </div>
              )}

              {(() => {
                const notasReunion = parseTastingNotasReunion(
                  tasting.notas_reunion,
                );
                if (notasReunion.length === 0) return null;
                return (
                  <ul className="mt-4 space-y-2 border-t border-bloom-border/70 pt-3">
                    {notasReunion.map((nota) => (
                      <li
                        key={nota.id}
                        className="rounded-xl border border-bloom-border/70 bg-bloom-surface/70 px-3 py-2.5"
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
                );
              })()}

              {canManage && notaOpenId === tasting.id && (
                <div className="mt-4 space-y-3 rounded-xl border border-bloom-border bg-bloom-surface/80 p-3">
                  <label className="block text-sm font-medium text-bloom-ink">
                    Nueva nota
                  </label>
                  <textarea
                    className={`${textareaClass} min-h-[96px]`}
                    value={notaDraft}
                    onChange={(e) => setNotaDraft(e.target.value)}
                    placeholder="Escribe lo que conversaron en esta cita…"
                    disabled={notaSavingId === tasting.id}
                    autoFocus
                  />
                  {notaError && notaOpenId === tasting.id && (
                    <p className="text-sm text-red-700" role="alert">
                      {notaError}
                    </p>
                  )}
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={closeNotaForm}
                      disabled={notaSavingId === tasting.id}
                      className="rounded-full border border-bloom-border px-4 py-2 text-sm font-medium text-bloom-ink hover:bg-bloom-canvas disabled:opacity-60"
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleSaveNota(tasting)}
                      disabled={notaSavingId === tasting.id}
                      className="rounded-full bg-bloom-accent px-4 py-2 text-sm font-medium text-white hover:bg-bloom-accent-hover disabled:opacity-60"
                    >
                      {notaSavingId === tasting.id
                        ? "Guardando…"
                        : "Guardar nota"}
                    </button>
                  </div>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </Shell>
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
      className="h-4 w-4"
      aria-hidden
    >
      <path d="M5 3.5h7.5L15.5 6.5V16.5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-12a1 1 0 0 1 1-1Z" />
      <path d="M12.5 3.5V6.5H15.5" />
      <path d="M7 9.5h6M7 12.5h6M7 15.5h3.5" />
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

function TrashIcon() {
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
      <path d="M3.5 5.5h13" />
      <path d="M8 5.5V4a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v1.5" />
      <path d="M6.5 5.5V16a1.5 1.5 0 0 0 1.5 1.5h4a1.5 1.5 0 0 0 1.5-1.5V5.5" />
      <path d="M8.5 9v5M11.5 9v5" />
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
