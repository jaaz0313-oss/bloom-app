"use client";

import { useState, type Dispatch, type ReactNode, type SetStateAction } from "react";
import type { LeadSeguimientoStatus } from "@/app/data/leads";
import { formatInputCurrency } from "@/lib/format";

export type LeadFormState = {
  nombrePareja: string;
  fechaTentativa: string;
  ciudad: string;
  presupuestoEstimado: string;
  cantidadInvitados: string;
  tipoCeremonia: string;
  paisOrigenNovios: string;
  ciudadResidenciaActual: string;
  conceptoBoda: string;
  prioridades: string;
  comoNosConocieron: string;
  estadoSeguimiento: LeadSeguimientoStatus;
  notas: string;
  honorariosAcordados: string;
  anticipoAcordado: string;
  lugarVenue: string;
  telefono: string;
  email: string;
};

export const emptyLeadForm: LeadFormState = {
  nombrePareja: "",
  fechaTentativa: "",
  ciudad: "",
  presupuestoEstimado: "",
  cantidadInvitados: "",
  tipoCeremonia: "",
  paisOrigenNovios: "",
  ciudadResidenciaActual: "",
  conceptoBoda: "",
  prioridades: "",
  comoNosConocieron: "",
  estadoSeguimiento: "nuevo",
  notas: "",
  honorariosAcordados: "",
  anticipoAcordado: "",
  lugarVenue: "",
  telefono: "",
  email: "",
};

const CEREMONY_OPTIONS = [
  "Civil",
  "Religiosa",
  "Simbólica",
  "Civil y Religiosa",
] as const;

const inputClass =
  "w-full rounded-xl border border-bloom-border bg-bloom-canvas px-3 py-2 text-sm text-bloom-ink outline-none ring-0 focus:border-bloom-accent focus:ring-2 focus:ring-bloom-accent/30";

const textareaClass =
  "w-full resize-y rounded-xl border border-bloom-border bg-bloom-canvas px-3 py-2 text-sm text-bloom-ink outline-none ring-0 focus:border-bloom-accent focus:ring-2 focus:ring-bloom-accent/30";

type FormBind = {
  form: LeadFormState;
  setForm: Dispatch<SetStateAction<LeadFormState>>;
  submitting: boolean;
};

type MoreField =
  | "ciudad"
  | "presupuesto"
  | "invitados"
  | "tipoCeremonia"
  | "estado"
  | "pais"
  | "ciudadResidencia"
  | "concepto"
  | "prioridades"
  | "comoNosConocieron"
  | "notas"
  | "acuerdos";

const MORE_FIELDS: MoreField[] = [
  "ciudad",
  "presupuesto",
  "invitados",
  "tipoCeremonia",
  "estado",
  "pais",
  "ciudadResidencia",
  "concepto",
  "prioridades",
  "comoNosConocieron",
  "notas",
  "acuerdos",
];

function Field({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium text-bloom-ink">{label}</label>
      {children}
    </div>
  );
}

export function LeadAcuerdosFields({
  form,
  setForm,
  submitting,
  anticipoTouched,
  onAnticipoTouched,
  onHonorariosChange,
}: FormBind & {
  anticipoTouched: boolean;
  onAnticipoTouched: () => void;
  onHonorariosChange: (value: string) => void;
}) {
  return (
    <fieldset className="space-y-4 rounded-xl border border-bloom-border bg-bloom-canvas/50 p-4">
      <legend className="px-1 text-sm font-medium text-bloom-ink">
        Acuerdos primera reunión
      </legend>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Honorarios acordados (COP)">
          <input
            type="text"
            inputMode="numeric"
            autoComplete="off"
            className={inputClass}
            value={form.honorariosAcordados}
            onChange={(e) => {
              const value = formatInputCurrency(e.target.value);
              setForm((s) => ({ ...s, honorariosAcordados: value }));
              onHonorariosChange(value);
            }}
            disabled={submitting}
            placeholder="Ej. 15.000.000"
          />
        </Field>
        <Field label="Anticipo (COP)">
          <input
            type="text"
            inputMode="numeric"
            autoComplete="off"
            className={inputClass}
            value={form.anticipoAcordado}
            onChange={(e) => {
              onAnticipoTouched();
              setForm((s) => ({
                ...s,
                anticipoAcordado: formatInputCurrency(e.target.value),
              }));
            }}
            disabled={submitting}
            placeholder={
              anticipoTouched ? "Editable" : "50% de honorarios por defecto"
            }
          />
        </Field>
      </div>
      <Field label="Lugar / Venue de la boda">
        <input
          className={inputClass}
          value={form.lugarVenue}
          onChange={(e) =>
            setForm((s) => ({ ...s, lugarVenue: e.target.value }))
          }
          disabled={submitting}
          placeholder="Ej. Hacienda El Paraíso"
        />
      </Field>
    </fieldset>
  );
}

function LeadCiudadField({
  form,
  setForm,
  submitting,
  label,
}: FormBind & { label: string }) {
  return (
    <Field label={label}>
      <input
        className={inputClass}
        value={form.ciudad}
        onChange={(e) => setForm((s) => ({ ...s, ciudad: e.target.value }))}
        disabled={submitting}
        placeholder="Ej. Medellín"
      />
    </Field>
  );
}

function LeadPresupuestoField({ form, setForm, submitting }: FormBind) {
  return (
    <Field label="Presupuesto estimado">
      <input
        type="text"
        inputMode="numeric"
        autoComplete="off"
        className={inputClass}
        value={form.presupuestoEstimado}
        onChange={(e) =>
          setForm((s) => ({
            ...s,
            presupuestoEstimado: formatInputCurrency(e.target.value),
          }))
        }
        disabled={submitting}
      />
    </Field>
  );
}

function LeadInvitadosField({
  form,
  setForm,
  submitting,
  label,
}: FormBind & { label: string }) {
  return (
    <Field label={label}>
      <input
        type="number"
        min={0}
        step={1}
        className={inputClass}
        value={form.cantidadInvitados}
        onChange={(e) =>
          setForm((s) => ({ ...s, cantidadInvitados: e.target.value }))
        }
        disabled={submitting}
      />
    </Field>
  );
}

function LeadEstadoField({ form, setForm, submitting }: FormBind) {
  return (
    <Field label="Estado de seguimiento">
      <select
        className={inputClass}
        value={form.estadoSeguimiento}
        onChange={(e) =>
          setForm((s) => ({
            ...s,
            estadoSeguimiento: e.target.value as LeadSeguimientoStatus,
          }))
        }
        disabled={submitting}
      >
        <option value="nuevo">Nuevo</option>
        <option value="en_conversacion">En conversación</option>
        <option value="perdido">Perdido</option>
      </select>
    </Field>
  );
}

function LeadNotasField({ form, setForm, submitting }: FormBind) {
  return (
    <Field label="Notas">
      <textarea
        rows={4}
        className={textareaClass}
        value={form.notas}
        onChange={(e) => setForm((s) => ({ ...s, notas: e.target.value }))}
        disabled={submitting}
      />
    </Field>
  );
}

function LeadTipoCeremoniaField({ form, setForm, submitting }: FormBind) {
  return (
    <Field label="Tipo de ceremonia">
      <select
        className={inputClass}
        value={form.tipoCeremonia}
        onChange={(e) =>
          setForm((s) => ({ ...s, tipoCeremonia: e.target.value }))
        }
        disabled={submitting}
      >
        <option value="">Seleccionar</option>
        {CEREMONY_OPTIONS.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </Field>
  );
}

function LeadPaisOrigenField({ form, setForm, submitting }: FormBind) {
  return (
    <Field label="País de origen de los novios">
      <input
        className={inputClass}
        value={form.paisOrigenNovios}
        onChange={(e) =>
          setForm((s) => ({ ...s, paisOrigenNovios: e.target.value }))
        }
        disabled={submitting}
      />
    </Field>
  );
}

function LeadCiudadResidenciaField({ form, setForm, submitting }: FormBind) {
  return (
    <Field label="Ciudad donde viven actualmente">
      <input
        className={inputClass}
        value={form.ciudadResidenciaActual}
        onChange={(e) =>
          setForm((s) => ({ ...s, ciudadResidenciaActual: e.target.value }))
        }
        disabled={submitting}
      />
    </Field>
  );
}

function LeadConceptoField({ form, setForm, submitting }: FormBind) {
  return (
    <Field label="Concepto de la boda">
      <textarea
        rows={3}
        className={textareaClass}
        value={form.conceptoBoda}
        onChange={(e) =>
          setForm((s) => ({ ...s, conceptoBoda: e.target.value }))
        }
        disabled={submitting}
      />
    </Field>
  );
}

function LeadPrioridadesField({ form, setForm, submitting }: FormBind) {
  return (
    <Field label="Prioridades">
      <textarea
        rows={3}
        className={textareaClass}
        value={form.prioridades}
        onChange={(e) =>
          setForm((s) => ({ ...s, prioridades: e.target.value }))
        }
        disabled={submitting}
      />
    </Field>
  );
}

function LeadComoNosConocieronField({ form, setForm, submitting }: FormBind) {
  return (
    <Field label="Cómo nos conocieron">
      <input
        className={inputClass}
        value={form.comoNosConocieron}
        onChange={(e) =>
          setForm((s) => ({ ...s, comoNosConocieron: e.target.value }))
        }
        disabled={submitting}
        placeholder="Ej. Instagram, referido, Google…"
      />
    </Field>
  );
}

function LeadFechaField({
  form,
  setForm,
  submitting,
  label,
  fechaConflicto,
}: FormBind & { label: string; fechaConflicto: string[] }) {
  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium text-bloom-ink">{label}</label>
      <input
        type="date"
        className={inputClass}
        value={form.fechaTentativa}
        onChange={(e) =>
          setForm((s) => ({ ...s, fechaTentativa: e.target.value }))
        }
        disabled={submitting}
      />
      {fechaConflicto.length > 0 && (
        <p
          className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs leading-relaxed text-amber-900"
          role="status"
        >
          ⚠️ Ya tienes una boda agendada para esta fecha:{" "}
          {fechaConflicto.join(", ")}. Verifica disponibilidad antes de
          confirmar.
        </p>
      )}
    </div>
  );
}

type MasInformacionProps = FormBind & {
  defaultOpen: boolean;
  omit?: MoreField[];
  fechaConflicto?: string[];
  canManageAcuerdos: boolean;
  anticipoTouched: boolean;
  onAnticipoTouched: () => void;
  onHonorariosChange: (value: string) => void;
};

export function LeadMasInformacionSection({
  form,
  setForm,
  submitting,
  defaultOpen,
  omit = [],
  canManageAcuerdos,
  anticipoTouched,
  onAnticipoTouched,
  onHonorariosChange,
}: MasInformacionProps) {
  const [open, setOpen] = useState(defaultOpen);
  const hidden = new Set(omit);
  const show = (field: MoreField) => !hidden.has(field);
  const visible = MORE_FIELDS.some(
    (field) => show(field) && (field !== "acuerdos" || canManageAcuerdos),
  );
  if (!visible) return null;

  const bind = { form, setForm, submitting };
  const row = (items: Array<ReactNode | false>) => {
    const shown = items.filter(Boolean);
    if (shown.length === 0) return null;
    if (shown.length === 1) return shown[0];
    return <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">{shown}</div>;
  };

  return (
    <div className="overflow-hidden rounded-xl border border-bloom-border">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left text-sm font-medium text-bloom-ink transition-colors hover:bg-bloom-canvas/70"
      >
        <span>Más información (opcional)</span>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 20 20"
          fill="currentColor"
          className={`h-4 w-4 shrink-0 text-bloom-muted transition-transform ${
            open ? "rotate-180" : ""
          }`}
          aria-hidden
        >
          <path
            fillRule="evenodd"
            d="M5.22 8.22a.75.75 0 0 1 1.06 0L10 11.94l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 9.28a.75.75 0 0 1 0-1.06Z"
            clipRule="evenodd"
          />
        </svg>
      </button>

      {open && (
        <div className="space-y-4 border-t border-bloom-border px-4 py-4">
          {show("ciudad") && (
            <LeadCiudadField {...bind} label="Ciudad de la boda" />
          )}
          {row([
            show("presupuesto") && <LeadPresupuestoField {...bind} />,
            show("invitados") && (
              <LeadInvitadosField {...bind} label="Cantidad de invitados" />
            ),
          ])}
          {row([
            show("tipoCeremonia") && <LeadTipoCeremoniaField {...bind} />,
            show("estado") && <LeadEstadoField {...bind} />,
          ])}
          {row([
            show("pais") && <LeadPaisOrigenField {...bind} />,
            show("ciudadResidencia") && <LeadCiudadResidenciaField {...bind} />,
          ])}
          {show("concepto") && <LeadConceptoField {...bind} />}
          {show("prioridades") && <LeadPrioridadesField {...bind} />}
          {show("comoNosConocieron") && (
            <LeadComoNosConocieronField {...bind} />
          )}
          {show("notas") && <LeadNotasField {...bind} />}
          {show("acuerdos") && canManageAcuerdos && (
            <LeadAcuerdosFields
              {...bind}
              anticipoTouched={anticipoTouched}
              onAnticipoTouched={onAnticipoTouched}
              onHonorariosChange={onHonorariosChange}
            />
          )}
        </div>
      )}
    </div>
  );
}

const EDIT_ALREADY_VISIBLE: MoreField[] = [
  "ciudad",
  "presupuesto",
  "invitados",
  "estado",
  "comoNosConocieron",
  "notas",
  "acuerdos",
];

type FormBodyProps = FormBind & {
  fechaConflicto?: string[];
  canManageAcuerdos: boolean;
  anticipoTouched: boolean;
  onAnticipoTouched: () => void;
  onHonorariosChange: (value: string) => void;
};

export function LeadEditFields({
  form,
  setForm,
  submitting,
  fechaConflicto = [],
  canManageAcuerdos,
  anticipoTouched,
  onAnticipoTouched,
  onHonorariosChange,
}: FormBodyProps) {
  const bind = { form, setForm, submitting };

  return (
    <div className="space-y-4">
      <fieldset className="space-y-4 rounded-xl border border-bloom-border bg-bloom-canvas/50 p-4">
        <legend className="px-1 text-sm font-medium text-bloom-ink">
          Información básica
        </legend>
        <Field label="Nombre de la pareja">
          <input
            className={inputClass}
            value={form.nombrePareja}
            onChange={(e) =>
              setForm((s) => ({ ...s, nombrePareja: e.target.value }))
            }
            required
            disabled={submitting}
            placeholder="Ej. Valentina y Andrés"
            autoFocus
          />
        </Field>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Teléfono">
            <input
              type="tel"
              className={inputClass}
              value={form.telefono}
              onChange={(e) =>
                setForm((s) => ({ ...s, telefono: e.target.value }))
              }
              placeholder="Ej. 3001234567"
              disabled={submitting}
            />
          </Field>
          <Field label="Email">
            <input
              type="email"
              className={inputClass}
              value={form.email}
              onChange={(e) =>
                setForm((s) => ({ ...s, email: e.target.value }))
              }
              disabled={submitting}
              placeholder="correo@ejemplo.com"
            />
          </Field>
        </div>
      </fieldset>

      <fieldset className="space-y-4 rounded-xl border border-bloom-border bg-bloom-canvas/50 p-4">
        <legend className="px-1 text-sm font-medium text-bloom-ink">
          Detalles de la boda
        </legend>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <LeadFechaField
            {...bind}
            label="Fecha tentativa de la boda"
            fechaConflicto={fechaConflicto}
          />
          <LeadCiudadField {...bind} label="Ciudad" />
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <LeadPresupuestoField {...bind} />
          <LeadInvitadosField {...bind} label="Número de invitados" />
        </div>
        <LeadComoNosConocieronField {...bind} />
      </fieldset>

      <fieldset className="space-y-4 rounded-xl border border-bloom-border bg-bloom-canvas/50 p-4">
        <legend className="px-1 text-sm font-medium text-bloom-ink">
          Seguimiento
        </legend>
        <LeadEstadoField {...bind} />
        <LeadNotasField {...bind} />
      </fieldset>

      {canManageAcuerdos && (
        <LeadAcuerdosFields
          {...bind}
          anticipoTouched={anticipoTouched}
          onAnticipoTouched={onAnticipoTouched}
          onHonorariosChange={onHonorariosChange}
        />
      )}

      <LeadMasInformacionSection
        {...bind}
        defaultOpen
        omit={EDIT_ALREADY_VISIBLE}
        canManageAcuerdos={canManageAcuerdos}
        anticipoTouched={anticipoTouched}
        onAnticipoTouched={onAnticipoTouched}
        onHonorariosChange={onHonorariosChange}
      />
    </div>
  );
}

export function LeadCreateFields({
  form,
  setForm,
  submitting,
  fechaConflicto = [],
  canManageAcuerdos,
  anticipoTouched,
  onAnticipoTouched,
  onHonorariosChange,
}: FormBodyProps) {
  const bind = { form, setForm, submitting };

  return (
    <>
      <Field label="Nombre de la pareja">
        <input
          className={inputClass}
          value={form.nombrePareja}
          onChange={(e) =>
            setForm((s) => ({ ...s, nombrePareja: e.target.value }))
          }
          required
          disabled={submitting}
          placeholder="Ej. Valentina y Andrés"
          autoFocus
        />
      </Field>

      <Field label="Email">
        <input
          type="email"
          className={inputClass}
          value={form.email}
          onChange={(e) => setForm((s) => ({ ...s, email: e.target.value }))}
          required
          disabled={submitting}
          placeholder="correo@ejemplo.com"
        />
      </Field>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Teléfono">
          <input
            type="tel"
            className={inputClass}
            value={form.telefono}
            onChange={(e) =>
              setForm((s) => ({ ...s, telefono: e.target.value }))
            }
            placeholder="Ej. 3001234567"
            disabled={submitting}
          />
        </Field>
        <LeadFechaField
          {...bind}
          label="Fecha tentativa"
          fechaConflicto={fechaConflicto}
        />
      </div>

      <LeadMasInformacionSection
        {...bind}
        defaultOpen={false}
        canManageAcuerdos={canManageAcuerdos}
        anticipoTouched={anticipoTouched}
        onAnticipoTouched={onAnticipoTouched}
        onHonorariosChange={onHonorariosChange}
      />
    </>
  );
}
