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

type BriefBodaProps = {
  bodaId: string;
  initialBrief: BriefBodaRow | null;
  embedded?: boolean;
};

type FieldDef = {
  key: keyof BriefBodaFormData;
  label: string;
  type?: "textarea" | "text" | "checkbox";
  rows?: number;
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
      { key: "vision_palabras_clave", label: "Palabras clave", rows: 2 },
    ],
  },
  {
    id: "ceremonia",
    title: "Ceremonia",
    fields: [
      { key: "ceremonia_tipo", label: "Tipo de ceremonia", type: "text" },
      { key: "ceremonia_musica", label: "Música", rows: 2 },
      { key: "ceremonia_inspiracion", label: "Inspiración", rows: 3 },
    ],
  },
  {
    id: "coctel",
    title: "Cóctel",
    fields: [
      { key: "coctel_duracion", label: "Duración", type: "text" },
      { key: "coctel_ambiente", label: "Ambiente", rows: 2 },
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
      { key: "catering_restricciones", label: "Restricciones alimentarias", rows: 2 },
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
      { key: "logistica_transporte_novios", label: "Transporte novios", rows: 2 },
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
    fields: [{ key: "restricciones", label: "Restricciones generales", rows: 4 }],
  },
];

const inputClass =
  "w-full rounded-xl border border-bloom-border bg-bloom-canvas px-3 py-2 text-sm text-bloom-ink outline-none focus:border-bloom-accent focus:ring-2 focus:ring-bloom-accent/20 disabled:cursor-default disabled:bg-bloom-canvas/60 disabled:text-bloom-ink";

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

export function BriefBoda({
  bodaId,
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
  const [expanded, setExpanded] = useState<Record<string, boolean>>({
    vision: true,
  });
  const [editingSection, setEditingSection] = useState<string | null>(null);
  const [savingSection, setSavingSection] = useState<string | null>(null);
  const [savingAll, setSavingAll] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedSection, setSavedSection] = useState<string | null>(null);

  const sectionFieldKeys = useMemo(() => {
    const map: Record<string, (keyof BriefBodaFormData)[]> = {};
    for (const section of BRIEF_SECTIONS) {
      map[section.id] = section.fields.map((f) => f.key);
    }
    return map;
  }, []);

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

  function startEditing(sectionId: string) {
    setError(null);
    setEditingSection(sectionId);
    setExpanded((prev) => ({ ...prev, [sectionId]: true }));
  }

  function cancelEditing(sectionId: string) {
    setForm({ ...savedForm });
    setEditingSection(null);
    setError(null);
  }

  async function handleSaveSection(sectionId: string) {
    setError(null);
    setSavingSection(sectionId);
    try {
      const row = await persistBrief(form);
      setBriefId(row.id);
      const nextForm = briefRowToFormData(row);
      setForm(nextForm);
      setSavedForm(nextForm);
      setEditingSection(null);
      setSavedSection(sectionId);
      window.setTimeout(() => setSavedSection(null), 2000);
      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "No se pudo guardar la sección.",
      );
    } finally {
      setSavingSection(null);
    }
  }

  async function handleSaveAll() {
    setError(null);
    setSavingAll(true);
    try {
      const row = await persistBrief(form);
      setBriefId(row.id);
      const nextForm = briefRowToFormData(row);
      setForm(nextForm);
      setSavedForm(nextForm);
      setEditingSection(null);
      setSavedSection("all");
      window.setTimeout(() => setSavedSection(null), 2000);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo guardar el brief.");
    } finally {
      setSavingAll(false);
    }
  }

  function sectionHasContent(sectionId: string): boolean {
    const keys = sectionFieldKeys[sectionId] ?? [];
    return keys.some((key) => {
      const val = form[key];
      if (typeof val === "boolean") return val;
      return Boolean(val?.toString().trim());
    });
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

      <div className={`space-y-3 ${embedded ? "" : "mt-5"}`}>
        {BRIEF_SECTIONS.map((section) => {
          const isOpen = expanded[section.id] ?? false;
          const isEditing = editingSection === section.id;
          const isSaving = savingSection === section.id;
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
                  <div className="space-y-4">
                    {section.fields.map((field) => (
                      <FieldControl
                        key={field.key}
                        field={field}
                        value={form[field.key]}
                        disabled={!isEditing}
                        onChange={(value) => updateField(field.key, value)}
                      />
                    ))}
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    {isEditing ? (
                      <>
                        <button
                          type="button"
                          onClick={() => handleSaveSection(section.id)}
                          disabled={isSaving}
                          className="rounded-full bg-bloom-accent px-4 py-2 text-sm font-medium text-white hover:bg-bloom-accent-hover disabled:opacity-60"
                        >
                          {isSaving ? "Guardando…" : "Guardar sección"}
                        </button>
                        <button
                          type="button"
                          onClick={() => cancelEditing(section.id)}
                          disabled={isSaving}
                          className="rounded-full border border-bloom-border px-4 py-2 text-sm font-medium text-bloom-ink hover:bg-bloom-canvas disabled:opacity-60"
                        >
                          Cancelar
                        </button>
                      </>
                    ) : (
                      <button
                        type="button"
                        onClick={() => startEditing(section.id)}
                        className="rounded-full border border-bloom-border px-4 py-2 text-sm font-medium text-bloom-ink hover:bg-bloom-surface"
                      >
                        Editar sección
                      </button>
                    )}
                    {savedSection === section.id && (
                      <span className="self-center text-xs text-green-700">
                        Guardado
                      </span>
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

      <div className="mt-5 flex flex-wrap items-center gap-3 border-t border-bloom-border pt-4">
        <button
          type="button"
          onClick={handleSaveAll}
          disabled={savingAll}
          className="rounded-full bg-bloom-accent px-5 py-2.5 text-sm font-medium text-white hover:bg-bloom-accent-hover disabled:opacity-60"
        >
          {savingAll ? "Guardando…" : "Guardar todo el brief"}
        </button>
        {savedSection === "all" && (
          <span className="text-sm text-green-700">Brief guardado</span>
        )}
      </div>
    </Shell>
  );
}

function FieldControl({
  field,
  value,
  disabled,
  onChange,
}: {
  field: FieldDef;
  value: string | boolean | null;
  disabled: boolean;
  onChange: (value: string | boolean) => void;
}) {
  if (field.type === "checkbox") {
    return (
      <label className="flex cursor-pointer items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={Boolean(value)}
          disabled={disabled}
          onChange={(e) => onChange(e.target.checked)}
          className="h-4 w-4 rounded border-bloom-border text-bloom-accent focus:ring-bloom-accent/30 disabled:opacity-60"
        />
        <span className="font-medium text-bloom-ink">{field.label}</span>
      </label>
    );
  }

  const stringValue = typeof value === "string" ? value : value ? String(value) : "";

  if (field.type === "text") {
    return (
      <div className="space-y-1.5">
        <label className="text-sm font-medium text-bloom-ink">{field.label}</label>
        <input
          type="text"
          className={inputClass}
          value={stringValue}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value)}
        />
      </div>
    );
  }

  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium text-bloom-ink">{field.label}</label>
      <textarea
        className={textareaClass}
        rows={field.rows ?? 3}
        value={stringValue}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}