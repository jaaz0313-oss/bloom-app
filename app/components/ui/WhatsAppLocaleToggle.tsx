"use client";

import type { WhatsAppLocale } from "@/lib/whatsapp-locale";

type WhatsAppLocaleToggleProps = {
  locale: WhatsAppLocale;
  onChange: (locale: WhatsAppLocale) => void;
};

const OPTIONS: { value: WhatsAppLocale; label: string }[] = [
  { value: "es", label: "ES" },
  { value: "en", label: "EN" },
];

export function WhatsAppLocaleToggle({
  locale,
  onChange,
}: WhatsAppLocaleToggleProps) {
  return (
    <div
      className="inline-flex shrink-0 items-center rounded-full border border-bloom-border/80 bg-bloom-surface/90 p-0.5"
      role="group"
      aria-label="Idioma del mensaje"
      onClick={(e) => e.stopPropagation()}
    >
      {OPTIONS.map((option) => {
        const active = locale === option.value;
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            aria-pressed={active}
            className={`min-h-[28px] min-w-[2rem] rounded-full px-2 py-0.5 text-[11px] font-semibold tracking-wide transition-colors ${
              active
                ? "bg-bloom-accent text-white"
                : "text-bloom-muted hover:text-bloom-ink"
            }`}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
