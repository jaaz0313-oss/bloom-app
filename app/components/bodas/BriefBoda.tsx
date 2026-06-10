"use client";

import { useCallback, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  briefRowToFormData,
  EMPTY_BRIEF_FORM,
  type BriefBodaFormData,
  type BriefBodaRow,
} from "@/app/data/brief-boda";
import { supabase } from "@/lib/supabase";
import { AUDITORIA_ACCIONES, logAuditoria } from "@/lib/auditoria";

type BriefBodaProps = {
  bodaId: string;
  bodaNombre: string;
  initialBrief: BriefBodaRow | null;
  embedded?: boolean;
};

type FieldDef = {
  key: keyof BriefBodaFormData;
  label: string;
  type?: "textarea" | "text" | "checkbox";
  rows?: number;
  placeholder?: string;
};

type SectionDef = {
  id: string;
  title: string;
  fields: FieldDef[];
};

const BRIEF_SECTIONS: SectionDef[] = [
  {
    id: "vision",
    title: "Visión General",
    fields: [
      { key: "vision_concepto", label: "Concepto", rows: 3 },
      { key: "vision_colores", label: "Colores", rows: 2 },
      { key: "vision_ambiente", label: "Ambiente", rows: 2 },
      { key: "vision_inspiraciones", label: "Inspiraciones", rows: 3 },
      {
        key: "vision_palabras_clave",
        label: "Nombre de la boda",
        type: "text",
        placeholder: "Ej: María y Juan",
      },
    ],
  },
  {
    id: "comunicacion",
    title: "Comunicación",
    fields: [
      { key: "comunicacion_website", label: "Website de la boda", rows: 2 },
      { key: "comunicacion_save_the_date", label: "Save the date", rows: 2 },
      { key: "comunicacion_invitaciones", label: "Invitaciones", rows: 2 },
    ],
  },
  {
    id: "ceremonia",
    title: "Ceremonia",
    fields: [
      { key: "ceremonia_tipo", label: "Tipo de ceremonia", type: "text" },
      { key: "ceremonia_musica", label: "Música", rows: 2 },
    ],
  },
  {
    id: "coctel",
    title: "Cóctel",
    fields: [
      { key: "coctel_musica", label: "Música", rows: 2 },
      { key: "coctel_estaciones", label: "Estaciones", rows: 2 },
    ],
  },
  {
    id: "recepcion",
    title: "Recepción",
    fields: [
      { key: "recepcion_iluminacion", label: "Iluminación", rows: 2 },
      { key: "recepcion_musica", label: "Música", rows: 2 },
    ],
  },
  {
    id: "catering",
    title: "Catering",
    fields: [
      { key: "catering_tipo_servicio", label: "Tipo de servicio", rows: 2 },
      { key: "catering_menu", label: "Menú", rows: 3 },
      {
        key: "catering_restricciones",
        label: "Restricciones alimentarias",
        rows: 2,
      },
      { key: "catering_torta", label: "Torta", rows: 2 },
      { key: "catering_cocteleria", label: "Coctelería", rows: 2 },
    ],
  },
  {
    id: "foto",
    title: "Fotografía y Video",
    fields: [
      { key: "foto_estilo", label: "Estilo", rows: 2 },
      { key: "foto_album", label: "Álbum físico", type: "checkbox" },
      { key: "foto_drone", label: "Tomas con drone", type: "checkbox" },
      { key: "foto_video", label: "Video", rows: 2 },
    ],
  },
  {
    id: "decoracion",
    title: "Decoración",
    fields: [
      { key: "decoracion_estilo", label: "Estilo", rows: 2 },
      { key: "decoracion_flores", label: "Flores", rows: 2 },
      { key: "decoracion_colores", label: "Colores", rows: 2 },
      { key: "decoracion_elementos", label: "Elementos especiales", rows: 3 },
    ],
  },
  {
    id: "extras",
    title: "Extras",
    fields: [
      { key: "extras_photobooth", label: "Photobooth", rows: 2 },
      { key: "extras_hora_loca", label: "Hora loca", rows: 2 },
      { key: "extras_cafe", label: "Café / postre", rows: 2 },
      { key: "extras_otros", label: "Otros", rows: 2 },
    ],
  },
  {
    id: "logistica",
    title: "Logística",
    fields: [
      {
        key: "logistica_transporte_novios",
        label: "Transporte novios",
        rows: 2,
      },
      {
        key: "logistica_transporte_invitados",
        label: "Transporte invitados",
        rows: 2,
      },
      { key: "logistica_hotel", label: "Hotel / hospedaje", rows: 2 },
    ],
  },
  {
    id: "restricciones",
    title: "Restricciones",
    fields: [
      { key: "restricciones", label: "Restricciones generales", rows: 4 },
    ],
  },
];

const CHECKLIST_FIELD_KEYS = BRIEF_SECTIONS.flatMap((section) =>
  section.fields.filter((f) => f.type !== "checkbox").map((f) => f.key),
);

const inputClass =
  "w-full rounded-xl border border-bloom-border bg-bloom-surface px-3 py-2 text-sm text-bloom-ink outline-none focus:border-bloom-accent focus:ring-2 focus:ring-bloom-accent/20";

const textareaClass = `${inputClass} resize-y min-h-[72px]`;

function normalizeText(value: string): string | null {
  const trimmed = value.trim();
  return trimmed || null;
}

function formPayload(data: BriefBodaFormData): BriefBodaFormData {
  const payload: Record<string, string | boolean | null> = { ...data };
  for (const key of Object.keys(EMPTY_BRIEF_FORM) as (keyof BriefBodaFormData)[]) {
    if (key === "foto_album" || key === "foto_drone") continue;
    const val = payload[key as string];
    if (typeof val === "string") {
      payload[key as string] = normalizeText(val);
    }
  }
  return payload as BriefBodaFormData;
}

function fieldHasStoredValue(
  key: keyof BriefBodaFormData,
  data: BriefBodaFormData,
): boolean {
  const val = data[key];
  if (typeof val === "boolean") return val;
  return Boolean(val?.toString().trim());
}

function buildUncheckedFields(): Record<string, boolean> {
  const checked: Record<string, boolean> = {};
  for (const key of CHECKLIST_FIELD_KEYS) {
    checked[key] = false;
  }
  return checked;
}

function formsEqual(a: BriefBodaFormData, b: BriefBodaFormData): boolean {
  return JSON.stringify(formPayload(a)) === JSON.stringify(formPayload(b));
}

export function BriefBoda({
  bodaId,
  bodaNombre,
  initialBrief,
  embedded = false,
}: BriefBodaProps) {
  const router = useRouter();
  const [briefId, setBriefId] = useState<string | null>(initialBrief?.id ?? null);
  const [form, setForm] = useState<BriefBodaFormData>(() =>
    initialBrief ? briefRowToFormData(initialBrief) : { ...EMPTY_BRIEF_FORM },
  );
  const [savedForm, setSavedForm] = useState<BriefBodaFormData>(() =>
    initialBrief ? briefRowToFormData(initialBrief) : { ...EMPTY_BRIEF_FORM },
  );
  const [checkedFields, setCheckedFields] = useState<Record<string, boolean>>(
    buildUncheckedFields,
  );
  const [expanded, setExpanded] = useState<Record<string, boolean>>({
    vision: true,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [justSaved, setJustSaved] = useState(false);

  const hasPendingChanges = useMemo(
    () => !formsEqual(form, savedForm),
    [form, savedForm],
  );

  const persistBrief = useCallback(
    async (payload: BriefBodaFormData) => {
      if (!supabase) throw new Error("Supabase no está configurado.");

      const normalized = formPayload(payload);
      const now = new Date().toISOString();

      if (briefId) {
        const { data, error: updateError } = await supabase
          .from("brief_boda")
          .update({ ...normalized, updated_at: now })
          .eq("id", briefId)
          .select("*")
          .single();

        if (updateError) throw new Error(updateError.message);
        return data as BriefBodaRow;
      }

      const { data, error: insertError } = await supabase
        .from("brief_boda")
        .insert({ boda_id: bodaId, ...normalized, updated_at: now })
        .select("*")
        .single();

      if (insertError) throw new Error(insertError.message);
      return data as BriefBodaRow;
    },
    [briefId, bodaId],
  );

  function updateField(key: keyof BriefBodaFormData, value: string | boolean) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function toggleSection(sectionId: string) {
    setExpanded((prev) => ({ ...prev, [sectionId]: !prev[sectionId] }));
  }

  function toggleFieldChecked(fieldKey: string) {
    setCheckedFields((prev) => ({
      ...prev,
      [fieldKey]: !prev[fieldKey],
    }));
  }

  function handleDiscardChanges() {
    setForm({ ...savedForm });
    setCheckedFields(buildUncheckedFields());
    setError(null);
  }

  async function handleSave() {
    setError(null);
    setSaving(true);
    try {
      const row = await persistBrief(form);
      setBriefId(row.id);
      const nextForm = briefRowToFormData(row);
      setForm(nextForm);
      setSavedForm(nextForm);
      await logAuditoria({
        accion: AUDITORIA_ACCIONES.BRIEF_GUARDADO,
        entidad: "brief_boda",
        entidadId: row.id,
        bodaNombre,
        detalle: `Brief actualizado para ${bodaNombre}`,
      });
      setJustSaved(true);
      window.setTimeout(() => setJustSaved(false), 2000);
      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "No se pudo guardar el brief.",
      );
    } finally {
      setSaving(false);
    }
  }

  function sectionHasContent(sectionId: string): boolean {
    const section = BRIEF_SECTIONS.find((s) => s.id === sectionId);
    if (!section) return false;
    return section.fields.some((field) => fieldHasStoredValue(field.key, form));
  }

  const shellClass = embedded
    ? ""
    : "rounded-2xl border border-bloom-border bg-bloom-surface p-5 shadow-sm";
  const Shell = embedded ? "div" : "section";

  return (
    <Shell className={shellClass}>
      <div
        className={`flex flex-wrap items-start justify-between gap-3 ${
          embedded ? "mb-4" : ""
        }`}
      >
        {embedded ? (
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 text-[11px] font-medium uppercase tracking-wide text-amber-900">
              Solo visible para el equipo
            </span>
            {!briefId && (
              <span className="text-xs text-bloom-muted">Sin brief guardado aún</span>
            )}
          </div>
        ) : (
          <>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="font-display text-xl text-bloom-ink">Brief de la boda</h2>
                <span className="inline-flex rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 text-[11px] font-medium uppercase tracking-wide text-amber-900">
                  Solo visible para el equipo
                </span>
              </div>
              <p className="mt-1 text-sm text-bloom-muted">
                Guía interna del equipo - Segunda reunión
              </p>
            </div>
            {!briefId && (
              <span className="text-xs text-bloom-muted">Sin brief guardado aún</span>
            )}
          </>
        )}
      </div>

      <div className={`space-y-3 ${embedded ? "" : "mt-5"} ${hasPendingChanges ? "pb-24" : ""}`}>
        {BRIEF_SECTIONS.map((section) => {
          const isOpen = expanded[section.id] ?? false;
          const hasContent = sectionHasContent(section.id);

          return (
            <div
              key={section.id}
              className="overflow-hidden rounded-xl border border-bloom-border bg-bloom-canvas/40"
            >
              <button
                type="button"
                onClick={() => toggleSection(section.id)}
                className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left hover:bg-bloom-canvas/80"
                aria-expanded={isOpen}
              >
                <div className="flex items-center gap-2">
                  <span className="font-medium text-bloom-ink">{section.title}</span>
                  {hasContent && (
                    <span className="h-1.5 w-1.5 rounded-full bg-bloom-accent" />
                  )}
                </div>
                <span className="text-bloom-muted" aria-hidden>
                  {isOpen ? "−" : "+"}
                </span>
              </button>

              {isOpen && (
                <div className="border-t border-bloom-border px-4 py-4">
                  <div className="space-y-3">
                    {section.fields.map((field) =>
                      field.type === "checkbox" ? (
                        <BooleanFieldControl
                          key={field.key}
                          field={field}
                          value={form[field.key]}
                          onChange={(value) => updateField(field.key, value)}
                        />
                      ) : (
                        <BriefChecklistItem
                          key={field.key}
                          field={field}
                          checked={Boolean(checkedFields[field.key])}
                          value={form[field.key]}
                          onToggle={() => toggleFieldChecked(field.key)}
                          onChange={(value) => updateField(field.key, value)}
                        />
                      ),
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {error && (
        <p className="mt-4 text-sm text-red-700" role="alert">
          {error}
        </p>
      )}

      {hasPendingChanges && (
        <div
          className="fixed bottom-6 left-1/2 z-40 flex w-[min(100%,28rem)] -translate-x-1/2 flex-wrap items-center justify-center gap-2 rounded-2xl border border-bloom-border bg-bloom-surface px-4 py-3 shadow-lg"
          role="status"
        >
          <span className="text-sm text-bloom-muted">Cambios sin guardar</span>
          <button
            type="button"
            onClick={handleDiscardChanges}
            disabled={saving}
            className="rounded-full border border-bloom-border px-4 py-2 text-sm font-medium text-bloom-ink transition-colors hover:bg-bloom-canvas disabled:opacity-60"
          >
            Descartar
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="rounded-full bg-bloom-accent px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-bloom-accent-hover disabled:opacity-60"
          >
            {saving ? "Guardando…" : "Guardar"}
          </button>
        </div>
      )}

      {!hasPendingChanges && justSaved && (
        <p className="mt-4 text-center text-sm text-green-700" role="status">
          Brief guardado
        </p>
      )}
    </Shell>
  );
}

function BriefChecklistItem({
  field,
  checked,
  value,
  onToggle,
  onChange,
}: {
  field: FieldDef;
  checked: boolean;
  value: string | boolean | null;
  onToggle: () => void;
  onChange: (value: string) => void;
}) {
  const stringValue =
    typeof value === "string" ? value : value ? String(value) : "";
  const hasContent = Boolean(stringValue.trim());
  const showContent = checked || hasContent;
  const isHighlighted = checked || hasContent;

  return (
    <div
      className={`rounded-xl border px-3 py-2.5 transition-colors ${
        isHighlighted
          ? "border-green-200 bg-green-50/50"
          : "border-bloom-border bg-bloom-surface/60"
      }`}
    >
      <label className="flex cursor-pointer items-start gap-3">
        <input
          type="checkbox"
          checked={checked}
          onChange={onToggle}
          className="mt-0.5 h-4 w-4 shrink-0 rounded border-bloom-border text-green-600 focus:ring-green-500/30"
        />
        <span
          className={`text-sm ${
            isHighlighted
              ? "font-semibold text-bloom-ink"
              : "font-medium text-bloom-muted"
          }`}
        >
          {field.label}
        </span>
      </label>

      {showContent && (
        <div className="mt-3 pl-7">
          {field.type === "text" ? (
            <input
              type="text"
              className={inputClass}
              value={stringValue}
              placeholder={field.placeholder}
              onChange={(e) => onChange(e.target.value)}
            />
          ) : (
            <textarea
              className={textareaClass}
              rows={field.rows ?? 3}
              value={stringValue}
              placeholder={`Notas sobre ${field.label.toLowerCase()}…`}
              onChange={(e) => onChange(e.target.value)}
            />
          )}
        </div>
      )}
    </div>
  );
}

function BooleanFieldControl({
  field,
  value,
  onChange,
}: {
  field: FieldDef;
  value: string | boolean | null;
  onChange: (value: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-bloom-border bg-bloom-surface/60 px-3 py-2.5 text-sm">
      <input
        type="checkbox"
        checked={Boolean(value)}
        onChange={(e) => onChange(e.target.checked)}
        className="h-4 w-4 rounded border-bloom-border text-green-600 focus:ring-green-500/30"
      />
      <span className="font-medium text-bloom-ink">{field.label}</span>
    </label>
  );
}
