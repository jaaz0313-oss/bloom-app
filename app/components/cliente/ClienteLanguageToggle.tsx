"use client";

import { useClienteLocale } from "@/app/components/cliente/ClienteLocaleProvider";
import type { ClienteLocale } from "@/lib/cliente-i18n";

const OPTIONS: { value: ClienteLocale; label: string }[] = [
  { value: "es", label: "ES" },
  { value: "en", label: "EN" },
];

export function ClienteLanguageToggle() {
  const { locale, setLocale, t } = useClienteLocale();

  return (
    <div
      className="inline-flex items-center rounded-full border border-bloom-accent/25 bg-bloom-surface/90 p-0.5 shadow-sm ring-1 ring-bloom-border/40 backdrop-blur-sm"
      role="group"
      aria-label={t.languageToggleLabel}
    >
      {OPTIONS.map((option) => {
        const active = locale === option.value;
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => setLocale(option.value)}
            aria-pressed={active}
            className={`min-h-[32px] min-w-[2.5rem] rounded-full px-3 py-1 text-xs font-semibold tracking-wide transition-all duration-200 sm:min-h-[34px] sm:px-3.5 sm:text-sm ${
              active
                ? "bg-bloom-accent text-white shadow-sm"
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
