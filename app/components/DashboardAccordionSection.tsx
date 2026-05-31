"use client";

import { useId, useState } from "react";

type DashboardAccordionSectionProps = {
  title: string;
  count: number;
  subtitle?: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
};

export function DashboardAccordionSection({
  title,
  count,
  subtitle,
  defaultOpen = false,
  children,
}: DashboardAccordionSectionProps) {
  const [open, setOpen] = useState(defaultOpen);
  const panelId = useId();

  return (
    <section className="overflow-hidden rounded-2xl border border-bloom-border bg-bloom-surface shadow-sm">
      <button
        type="button"
        id={`${panelId}-trigger`}
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((value) => !value)}
        className="flex min-h-[52px] w-full touch-manipulation items-center justify-between gap-4 px-4 py-4 text-left transition-colors hover:bg-bloom-canvas/60 active:bg-bloom-canvas sm:px-6"
      >
        <span className="flex min-w-0 flex-1 flex-col gap-0.5 sm:flex-row sm:items-center sm:gap-3">
          <span className="flex min-w-0 items-center gap-2.5">
            <span className="font-display text-lg text-bloom-ink sm:text-xl">
              {title}
            </span>
            <span className="inline-flex shrink-0 rounded-full bg-bloom-accent/15 px-2.5 py-0.5 text-xs font-semibold tabular-nums text-bloom-accent">
              {count}
            </span>
          </span>
          {subtitle && (
            <span className="truncate text-sm text-bloom-muted sm:sr-only">
              {subtitle}
            </span>
          )}
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
          <div className="border-t border-bloom-border/70 px-4 pb-5 pt-4 sm:px-6 sm:pb-6">
            {subtitle && (
              <p className="mb-4 text-sm text-bloom-muted sm:hidden">
                {subtitle}
              </p>
            )}
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
