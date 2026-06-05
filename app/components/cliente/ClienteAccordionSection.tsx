"use client";

import { useId, useState, type ReactNode } from "react";

type ClienteAccordionSectionProps = {
  title: string;
  summary?: ReactNode;
  defaultOpen?: boolean;
  children: ReactNode;
};

export function ClienteAccordionSection({
  title,
  summary,
  defaultOpen = false,
  children,
}: ClienteAccordionSectionProps) {
  const [open, setOpen] = useState(defaultOpen);
  const panelId = useId();
  const triggerId = `${panelId}-trigger`;

  return (
    <section className="overflow-hidden rounded-2xl border border-bloom-border bg-bloom-surface shadow-sm">
      <button
        type="button"
        id={triggerId}
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((value) => !value)}
        className="flex min-h-[52px] w-full touch-manipulation flex-col gap-3 bg-gradient-to-br from-bloom-canvas to-[#f3ebe3] px-5 py-4 text-left transition-colors hover:from-bloom-canvas hover:to-[#efe6dc] active:bg-bloom-canvas/80 sm:px-8 sm:py-5"
      >
        <span className="flex w-full items-start justify-between gap-4">
          <span className="min-w-0 flex-1">
            <span className="font-display text-2xl text-bloom-ink sm:text-3xl">
              {title}
            </span>
          </span>
          <ClienteAccordionChevron open={open} />
        </span>
        {summary ? (
          <span className="block w-full text-sm font-medium text-bloom-muted">
            {summary}
          </span>
        ) : null}
      </button>

      <div
        id={panelId}
        role="region"
        aria-labelledby={triggerId}
        className={`grid transition-[grid-template-rows] duration-300 ease-in-out ${
          open ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
        }`}
      >
        <div className="min-h-0 overflow-hidden">
          <div className="border-t border-bloom-border/80 px-5 py-6 sm:px-8 sm:py-8">
            {children}
          </div>
        </div>
      </div>
    </section>
  );
}

export function ClienteAccordionChevron({ open }: { open: boolean }) {
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
