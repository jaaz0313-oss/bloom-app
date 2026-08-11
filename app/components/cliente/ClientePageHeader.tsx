"use client";

import { CelestiaLogo } from "@/app/components/cliente/CelestiaLogo";
import { ClienteHeaderControls } from "@/app/components/cliente/ClienteHeaderControls";
import { useClienteLocale } from "@/app/components/cliente/ClienteLocaleProvider";
import { formatClienteWeddingDate } from "@/lib/cliente-i18n";

type ClientePageHeaderProps = {
  nombrePareja: string;
  fechaBoda: string;
  ciudad?: string | null;
  showLanguageToggle?: boolean;
};

export function ClientePageHeader({
  nombrePareja,
  fechaBoda,
  ciudad,
  showLanguageToggle = true,
}: ClientePageHeaderProps) {
  const { locale, t } = useClienteLocale();
  const fechaFormateada = formatClienteWeddingDate(fechaBoda, locale);

  return (
    <header className="relative overflow-hidden border-b border-bloom-border/60 bg-gradient-to-b from-[#faf6f0] via-[#f5efe8] to-[#efe8df]">
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(125,107,90,0.08)_0%,_transparent_55%)]"
        aria-hidden
      />

      {showLanguageToggle && (
        <div className="absolute right-4 top-4 z-10 sm:right-8 sm:top-5">
          <ClienteHeaderControls />
        </div>
      )}

      <div className="relative mx-auto flex max-w-3xl flex-col items-center gap-2 px-5 py-6 text-center sm:px-8">
        <CelestiaLogo variant="header" />

        <p className="text-xs tracking-[0.2em] text-bloom-muted uppercase sm:text-sm">
          {t.brandTagline}
        </p>

        <div className="flex w-8 items-center gap-1" aria-hidden>
          <span className="h-px flex-1 bg-bloom-accent/20" />
          <span className="text-[10px] leading-none text-bloom-accent/30">✦</span>
          <span className="h-px flex-1 bg-bloom-accent/20" />
        </div>

        <h1 className="font-display text-5xl font-medium leading-tight tracking-wide text-bloom-ink sm:text-6xl">
          {nombrePareja}
        </h1>

        <p className="text-base text-bloom-muted sm:text-lg">
          {fechaFormateada}
          {ciudad ? (
            <>
              <span className="mx-2 text-bloom-border">·</span>
              {ciudad}
            </>
          ) : null}
        </p>
      </div>
    </header>
  );
}
