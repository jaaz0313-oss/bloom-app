"use client";

import { useEffect, useId, useState } from "react";
import { useClienteLocale } from "@/app/components/cliente/ClienteLocaleProvider";

export function ClienteHelpGuide() {
  const { t } = useClienteLocale();
  const [open, setOpen] = useState(false);
  const titleId = useId();

  useEffect(() => {
    if (!open) return;

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };

    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={t.helpGuideButtonLabel}
        className="fixed bottom-5 right-5 z-40 flex h-12 w-12 touch-manipulation items-center justify-center rounded-full border border-bloom-border bg-bloom-surface text-xl font-semibold text-bloom-ink shadow-lg transition-colors hover:bg-bloom-canvas active:scale-95 sm:bottom-6 sm:right-6"
      >
        ?
      </button>

      {open ? (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          onClick={(event) => {
            if (event.target === event.currentTarget) setOpen(false);
          }}
        >
          <div className="flex max-h-[90vh] w-full max-w-md flex-col rounded-t-2xl border border-bloom-border bg-bloom-surface shadow-xl sm:rounded-2xl">
            <div className="flex items-start justify-between gap-3 border-b border-bloom-border/70 px-5 py-4 sm:px-6">
              <div className="min-w-0">
                <h2
                  id={titleId}
                  className="font-display text-2xl text-bloom-ink"
                >
                  {t.helpGuideTitle}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label={t.helpGuideClose}
                className="inline-flex h-11 w-11 shrink-0 touch-manipulation items-center justify-center rounded-full border border-bloom-border bg-bloom-canvas text-bloom-muted transition-colors hover:text-bloom-ink"
              >
                <span aria-hidden className="text-xl leading-none">
                  ×
                </span>
              </button>
            </div>

            <ul className="space-y-3 overflow-y-auto px-5 py-5 sm:px-6 sm:py-6">
              {t.helpGuideItems.map((item) => (
                <li
                  key={item.title}
                  className="flex gap-3 rounded-xl border border-bloom-border/70 bg-bloom-canvas/50 px-4 py-3"
                >
                  <span
                    className="mt-0.5 shrink-0 text-lg"
                    aria-hidden
                  >
                    {item.icon}
                  </span>
                  <div className="min-w-0">
                    <p className="font-medium text-bloom-ink">{item.title}</p>
                    <p className="mt-0.5 text-sm leading-relaxed text-bloom-muted">
                      {item.description}
                    </p>
                  </div>
                </li>
              ))}
            </ul>

            <div className="border-t border-bloom-border/70 px-5 py-4 sm:px-6">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="inline-flex min-h-[44px] w-full touch-manipulation items-center justify-center rounded-full bg-bloom-accent px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-bloom-accent-hover"
              >
                {t.helpGuideClose}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
