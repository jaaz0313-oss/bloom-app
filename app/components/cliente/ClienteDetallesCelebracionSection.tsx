"use client";

import { useCallback, useId, useMemo, useState } from "react";
import { useClienteLocale } from "@/app/components/cliente/ClienteLocaleProvider";
import {
  countDetallesCelebracionFilledFields,
  detallesCelebracionRowToForm,
  type DetallesCelebracionFormData,
  type DetallesCelebracionRow,
} from "@/app/data/detalles-celebracion";
import {
  DETALLES_CELEBRACION_FIELDS,
  getDetallesCelebracionFieldLabel,
} from "@/lib/detalles-celebracion";

type ClienteDetallesCelebracionSectionProps = {
  bodaId: string;
  initialDetalles: DetallesCelebracionRow | null;
};

function formsEqual(
  a: DetallesCelebracionFormData,
  b: DetallesCelebracionFormData,
): boolean {
  return DETALLES_CELEBRACION_FIELDS.every((field) => a[field.key] === b[field.key]);
}

export function ClienteDetallesCelebracionSection({
  bodaId,
  initialDetalles,
}: ClienteDetallesCelebracionSectionProps) {
  const panelId = useId();
  const { locale, t } = useClienteLocale();
  const [open, setOpen] = useState(false);
  const [savedForm, setSavedForm] = useState(() =>
    detallesCelebracionRowToForm(initialDetalles),
  );
  const [form, setForm] = useState(savedForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [justSaved, setJustSaved] = useState(false);

  const hasPendingChanges = useMemo(
    () => !formsEqual(form, savedForm),
    [form, savedForm],
  );

  const filledCount = useMemo(
    () => countDetallesCelebracionFilledFields(savedForm),
    [savedForm],
  );

  const updateField = useCallback(
    (key: keyof DetallesCelebracionFormData, value: string) => {
      setForm((current) => ({ ...current, [key]: value }));
      setJustSaved(false);
      setError(null);
    },
    [],
  );

  const handleDiscardChanges = useCallback(() => {
    setForm(savedForm);
    setError(null);
    setJustSaved(false);
  }, [savedForm]);

  const handleSave = useCallback(async () => {
    setSaving(true);
    setError(null);
    setJustSaved(false);

    try {
      const response = await fetch(
        `/api/cliente/${bodaId}/detalles-celebracion`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        },
      );

      const data = (await response.json()) as {
        error?: string;
        detalles?: DetallesCelebracionRow;
      };

      if (!response.ok) {
        throw new Error(data.error ?? t.detallesCelebracionSaveError);
      }

      const nextSaved = detallesCelebracionRowToForm(data.detalles ?? null);
      setSavedForm(nextSaved);
      setForm(nextSaved);
      setJustSaved(true);
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : t.detallesCelebracionSaveError,
      );
    } finally {
      setSaving(false);
    }
  }, [bodaId, form, t.detallesCelebracionSaveError]);

  return (
    <>
      <section className="overflow-hidden rounded-2xl border border-bloom-border bg-bloom-surface shadow-sm">
        <button
          type="button"
          id={`${panelId}-trigger`}
          aria-expanded={open}
          aria-controls={panelId}
          onClick={() => setOpen((value) => !value)}
          className="flex min-h-[52px] w-full touch-manipulation flex-col gap-3 bg-gradient-to-br from-bloom-canvas to-[#f3ebe3] px-5 py-4 text-left transition-colors hover:from-bloom-canvas hover:to-[#efe6dc] active:bg-bloom-canvas/80 sm:px-8 sm:py-5"
        >
          <span className="flex w-full items-start justify-between gap-4">
            <span className="min-w-0 flex-1">
              <span className="font-display text-2xl text-bloom-ink sm:text-3xl">
                {t.detallesCelebracionTitle}
              </span>
            </span>
            <AccordionChevron open={open} />
          </span>
          <span className="block w-full text-sm font-medium text-bloom-muted">
            {t.detallesCelebracionSubtitle(filledCount, DETALLES_CELEBRACION_FIELDS.length)}
          </span>
        </button>

        <div
          id={panelId}
          role="region"
          aria-labelledby={`${panelId}-trigger`}
          className={`grid transition-[grid-template-rows] duration-300 ease-in-out ${
            open ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
          }`}
        >
          <div className="min-h-0 overflow-hidden">
            <div className="space-y-6 border-t border-bloom-border/80 px-5 py-6 sm:px-8 sm:py-8">
              <p className="text-sm leading-relaxed text-bloom-muted">
                {t.detallesCelebracionIntro}
              </p>

              <div className="space-y-5">
                {DETALLES_CELEBRACION_FIELDS.map((field) => (
                  <FieldControl
                    key={field.key}
                    label={getDetallesCelebracionFieldLabel(field, locale)}
                    value={form[field.key]}
                    onChange={(value) => updateField(field.key, value)}
                  />
                ))}
              </div>

              {error && (
                <p className="text-sm text-red-700" role="alert">
                  {error}
                </p>
              )}

              {!hasPendingChanges && justSaved && (
                <p className="text-center text-sm text-green-700" role="status">
                  {t.detallesCelebracionSaved}
                </p>
              )}
            </div>
          </div>
        </div>
      </section>

      {hasPendingChanges && (
        <div
          className="fixed bottom-6 left-1/2 z-40 flex w-[min(calc(100%-2rem),28rem)] -translate-x-1/2 flex-wrap items-center justify-center gap-2 rounded-2xl border border-bloom-border bg-bloom-surface px-4 py-3 shadow-lg"
          role="status"
        >
          <span className="text-sm text-bloom-muted">
            {t.detallesCelebracionUnsaved}
          </span>
          <button
            type="button"
            onClick={handleDiscardChanges}
            disabled={saving}
            className="rounded-full border border-bloom-border px-4 py-2 text-sm font-medium text-bloom-ink transition-colors hover:bg-bloom-canvas disabled:opacity-60"
          >
            {t.detallesCelebracionDiscard}
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="rounded-full bg-bloom-accent px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-bloom-accent-hover disabled:opacity-60"
          >
            {saving ? t.detallesCelebracionSaving : t.detallesCelebracionSave}
          </button>
        </div>
      )}
    </>
  );
}

function FieldControl({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-medium text-bloom-ink">
        {label}
      </span>
      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        rows={2}
        className="w-full resize-y rounded-xl border border-bloom-border bg-bloom-canvas/50 px-4 py-3 text-sm text-bloom-ink outline-none transition-colors placeholder:text-bloom-muted/70 focus:border-bloom-accent focus:ring-2 focus:ring-bloom-accent/20"
        placeholder="—"
      />
    </label>
  );
}

function AccordionChevron({ open }: { open: boolean }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 20 20"
      fill="currentColor"
      className={`mt-1 h-5 w-5 shrink-0 text-bloom-muted transition-transform duration-300 ${
        open ? "rotate-180" : "rotate-0"
      }`}
      aria-hidden
    >
      <path
        fillRule="evenodd"
        d="M5.22 8.22a.75.75 0 0 1 1.06 0L10 11.94l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 9.28a.75.75 0 0 1 0-1.06Z"
        clipRule="evenodd"
      />
    </svg>
  );
}
