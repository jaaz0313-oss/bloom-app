"use client";

import { ClienteDescargarCotizacionButton } from "@/app/components/cliente/ClienteDescargarCotizacionButton";
import { useClienteLocale } from "@/app/components/cliente/ClienteLocaleProvider";

type ClienteCotizacionBarProps = {
  bodaId: string;
  cotizacionDisponible: boolean;
  seatingPlanLink?: string | null;
};

export function ClienteCotizacionBar({
  bodaId,
  cotizacionDisponible,
  seatingPlanLink,
}: ClienteCotizacionBarProps) {
  const { t } = useClienteLocale();
  const seatingLink = seatingPlanLink?.trim() ?? "";
  const showSeatingAction = Boolean(seatingLink) && !cotizacionDisponible;

  return (
    <div className="-mt-2 border-b border-bloom-border/40 bg-gradient-to-b from-[#efe8df] to-bloom-canvas px-5 sm:px-8">
      <div className="mx-auto flex max-w-3xl items-center justify-center py-4">
        {cotizacionDisponible && (
          <ClienteDescargarCotizacionButton bodaId={bodaId} />
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
    </div>
  );
}
