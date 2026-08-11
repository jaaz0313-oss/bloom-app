"use client";

import { ClienteDescargarCotizacionButton } from "@/app/components/cliente/ClienteDescargarCotizacionButton";
import { ClienteDescargarProyeccionButton } from "@/app/components/cliente/ClienteDescargarProyeccionButton";
import { ClienteDescargarProyeccionExcelButton } from "@/app/components/cliente/ClienteDescargarProyeccionExcelButton";
import { ClienteHeaderControls } from "@/app/components/cliente/ClienteHeaderControls";
import { useClienteLocale } from "@/app/components/cliente/ClienteLocaleProvider";
import { useState } from "react";

type ClienteCotizacionBarProps = {
  bodaId: string;
  cotizacionDisponible: boolean;
  hasProyeccionActual: boolean;
  seatingPlanLink?: string | null;
};

export function ClienteCotizacionBar({
  bodaId,
  cotizacionDisponible,
  hasProyeccionActual,
  seatingPlanLink,
}: ClienteCotizacionBarProps) {
  const { t } = useClienteLocale();
  const [error, setError] = useState<string | null>(null);
  const seatingLink = seatingPlanLink?.trim() ?? "";
  const showSeatingAction = Boolean(seatingLink) && !cotizacionDisponible;

  return (
    <div className="-mt-2 border-b border-bloom-border/40 bg-gradient-to-b from-[#efe8df] to-bloom-canvas px-5 sm:px-8">
      <div className="mx-auto max-w-3xl py-4">
        <div className="relative flex flex-col items-center gap-4 sm:block sm:min-h-[44px]">
          <div className="flex flex-wrap items-center justify-center gap-3">
            {cotizacionDisponible && (
              <ClienteDescargarCotizacionButton
                bodaId={bodaId}
                inline
                onError={setError}
              />
            )}
            {hasProyeccionActual && (
              <>
                <ClienteDescargarProyeccionButton
                  bodaId={bodaId}
                  inline
                  onError={setError}
                />
                <ClienteDescargarProyeccionExcelButton
                  bodaId={bodaId}
                  inline
                  onError={setError}
                />
              </>
            )}
            {showSeatingAction && (
              <a
                href={seatingLink}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-[44px] items-center justify-center gap-2.5 rounded-full border border-bloom-accent/30 bg-bloom-surface px-6 py-2.5 text-sm font-medium text-bloom-accent shadow-sm transition-colors hover:border-bloom-accent hover:bg-bloom-canvas"
              >
                {t.viewSeatingPlan}
              </a>
            )}
          </div>

          <div className="sm:absolute sm:right-0 sm:top-1/2 sm:-translate-y-1/2">
            <ClienteHeaderControls />
          </div>
        </div>

        {error && (
          <p className="mt-3 text-center text-sm text-red-700" role="alert">
            {error}
          </p>
        )}
      </div>
    </div>
  );
}
