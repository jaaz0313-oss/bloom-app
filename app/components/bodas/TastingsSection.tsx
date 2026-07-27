"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  TastingProveedorPicker,
  type TastingProveedorSelection,
} from "@/app/components/bodas/TastingProveedorPicker";
import {
  normalizeTastingRow,
  sortTastingsBySchedule,
  type TastingRow,
} from "@/app/data/tastings";
import type { UserRole } from "@/lib/auth/roles";
import type { EquipoUsuarioMencion } from "@/lib/notas-menciones";
import {
  CITA_TIME_SLOT_OPTIONS,
  citaTimeFromDb,
  citaTimeToDb,
  getCitaEndTimeSlotOptions,
} from "@/lib/cita-time-slots";
import { formatCurrency, formatShortDateStable } from "@/lib/format";
import { supabase } from "@/lib/supabase";
import {
  actualizarEventoCalendarTasting,
  crearEventoCalendarTasting,
  eliminarEventoCalendarTastingSiVinculado,
} from "@/lib/tasting-google-calendar";
import {
  checkTastingScheduleConflict,
  checkTastingScheduleWarnings,
} from "@/lib/tastings-conflict";
import {
  canManageTastings,
  canViewTastings,
  getTastingDisplayTitle,
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
  embedded?: boolean;
};

type FormState = {
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
    costo: tasting.costo ? String(tasting.costo) : "",
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

    const costoNum = form.costo.trim() ? Number(form.costo) : 0;
    if (!Number.isFinite(costoNum) || costoNum < 0) {
      setError("Ingresa un costo válido.");
      return;
    }

    const payload = {
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
                ? { ...item, google_event_id: calendarResult.eventId ?? null }
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
            Agenda de degustaciones con proveedores para esta boda.
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
            Agregar tasting
          </button>
        </div>
      )}

      {formOpen && canManage && (
        <form
          className="mt-5 space-y-4 rounded-xl border border-bloom-border bg-bloom-canvas/50 p-4 sm:p-5"
          onSubmit={handleSubmit}
        >
          <p className="text-sm font-medium text-bloom-ink">
            {editingId ? "Editar tasting" : "Nuevo tasting"}
          </p>

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
                type="number"
                min={0}
                step="1000"
                className={inputClass}
                value={form.costo}
                onChange={(e) =>
                  setForm((current) => ({ ...current, costo: e.target.value }))
                }
                disabled={submitting}
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
          Aún no hay tastings programados para esta boda.
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

              {canView && tasting.notas && (
                <p className="mt-3 whitespace-pre-wrap text-sm text-bloom-muted">
                  {tasting.notas}
                </p>
              )}
            </li>
          ))}
        </ul>
      )}
    </Shell>
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
