"use client";

import { useEffect, useId, useState } from "react";

type BodaAccordionSectionProps = {
  title: string;
  sectionKey?: string;
  openSection?: string | null;
  defaultOpen?: boolean;
  hasContent?: boolean;
  children: React.ReactNode;
};

export function BodaAccordionSection({
  title,
  sectionKey,
  openSection = null,
  defaultOpen = false,
  hasContent = false,
  children,
}: BodaAccordionSectionProps) {
  const forceOpen =
    sectionKey != null && openSection != null && openSection === sectionKey;
  const [open, setOpen] = useState(defaultOpen || forceOpen);
  const panelId = useId();

  useEffect(() => {
    if (forceOpen) {
      setOpen(true);
    }
  }, [forceOpen]);

  return (
    <section className="overflow-hidden rounded-2xl border border-bloom-border bg-bloom-surface shadow-sm">
      <button
        type="button"
        id={`${panelId}-trigger`}
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((value) => !value)}
        className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left transition-colors hover:bg-bloom-canvas/60 sm:px-6"
      >
        <span className="flex min-w-0 items-center gap-3">
          {hasContent ? (
            <span
              className="h-2 w-2 shrink-0 rounded-full bg-bloom-success"
              title="Tiene contenido"
              aria-hidden
            />
          ) : (
            <span className="h-2 w-2 shrink-0 rounded-full bg-transparent" aria-hidden />
          )}
          <span className="font-display text-xl text-bloom-ink">{title}</span>
        </span>
        <AccordionChevron open={open} />
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
          <div className="border-t border-bloom-border/70 px-5 pb-5 pt-4 sm:px-6 sm:pb-6">
            {children}
          </div>
        </div>
      </div>
    </section>
  );
}

function AccordionChevron({ open }: { open: boolean }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 20 20"
      fill="currentColor"
      className={`h-5 w-5 shrink-0 text-bloom-muted transition-transform duration-300 ${
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
