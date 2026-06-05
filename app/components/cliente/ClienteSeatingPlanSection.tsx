"use client";

import { useClienteLocale } from "@/app/components/cliente/ClienteLocaleProvider";

type ClienteSeatingPlanSectionProps = {
  link: string;
};

export function ClienteSeatingPlanSection({
  link,
}: ClienteSeatingPlanSectionProps) {
  const { t } = useClienteLocale();

  return (
    <section className="overflow-hidden rounded-2xl border border-bloom-border bg-bloom-surface shadow-sm">
      <div className="border-b border-bloom-border/70 bg-gradient-to-br from-bloom-canvas/80 to-bloom-surface px-5 py-7 sm:px-8 sm:py-8">
        <h2 className="font-display text-2xl text-bloom-ink sm:text-3xl">
          {t.seatingTitle}
        </h2>
        <p className="mt-2 text-sm text-bloom-muted sm:text-base">
          {t.seatingSubtitle}
        </p>
      </div>

      <div className="flex justify-center px-5 py-8 sm:px-8 sm:py-10">
        <a
          href={link}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex min-h-[44px] items-center justify-center gap-2.5 rounded-full border border-bloom-accent/30 bg-bloom-surface px-6 py-2.5 text-sm font-medium text-bloom-accent shadow-sm transition-colors hover:border-bloom-accent hover:bg-bloom-canvas"
        >
          <ExternalLinkIcon />
          {t.viewSeatingPlan}
        </a>
      </div>
    </section>
  );
}

function ExternalLinkIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 20 20"
      fill="currentColor"
      className="h-4 w-4 shrink-0"
      aria-hidden
    >
      <path
        fillRule="evenodd"
        d="M4.25 5.5a.75.75 0 0 1 .75-.75h6.5a.75.75 0 0 1 0 1.5H6.31l5.22 5.22a.75.75 0 1 1-1.06 1.06L5.25 7.31v4.19a.75.75 0 0 1-1.5 0v-6.5Z"
        clipRule="evenodd"
      />
      <path
        fillRule="evenodd"
        d="M6.75 4.25a.75.75 0 0 1 .75-.75h6.5a.75.75 0 0 1 .75.75v6.5a.75.75 0 0 1-1.5 0V6.31l-5.22 5.22a.75.75 0 1 1-1.06-1.06L11.69 5.25H7.5a.75.75 0 0 1-.75-.75Z"
        clipRule="evenodd"
      />
    </svg>
  );
}
