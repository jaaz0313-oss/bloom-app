"use client";

import { useClienteLocale } from "@/app/components/cliente/ClienteLocaleProvider";
import { useClienteUsdPreference } from "@/app/components/cliente/ClienteUsdPreferenceProvider";

export function ClienteUsdToggle() {
  const { t } = useClienteLocale();
  const { showUsd, toggleShowUsd } = useClienteUsdPreference();

  return (
    <button
      type="button"
      onClick={toggleShowUsd}
      aria-pressed={showUsd}
      aria-label={showUsd ? t.hideUsdLabel : t.showUsdLabel}
      className={`inline-flex min-h-[34px] items-center rounded-full border px-3 py-1 text-xs font-semibold tracking-wide shadow-sm transition-all duration-200 sm:min-h-[36px] sm:px-3.5 sm:text-sm ${
        showUsd
          ? "border-bloom-accent/40 bg-bloom-accent text-white"
          : "border-bloom-accent/25 bg-bloom-surface/90 text-bloom-muted ring-1 ring-bloom-border/40 backdrop-blur-sm hover:text-bloom-ink"
      }`}
    >
      {showUsd ? t.hideUsdLabel : t.showUsdLabel}
    </button>
  );
}
