"use client";

import { ClienteAccordionSection } from "@/app/components/cliente/ClienteAccordionSection";
import { useClienteLocale } from "@/app/components/cliente/ClienteLocaleProvider";
import type { ProveedorRow } from "@/app/data/providers";
import { getClienteCronogramaCategoriaLabel } from "@/lib/cliente-i18n";
import { formatCurrency } from "@/lib/format";

type ClienteProveedoresEvaluacionSectionProps = {
  proveedores: ProveedorRow[];
};

export function ClienteProveedoresEvaluacionSection({
  proveedores,
}: ClienteProveedoresEvaluacionSectionProps) {
  const { locale, t } = useClienteLocale();

  if (proveedores.length === 0) {
    return null;
  }

  return (
    <ClienteAccordionSection
      title={t.providersEvaluationTitle}
      summary={t.providersEvaluationSubtitle(proveedores.length)}
      defaultOpen
    >
      <ul className="space-y-4">
        {proveedores.map((provider) => {
          const categoriaLabel = getClienteCronogramaCategoriaLabel(
            provider.categoria,
            locale,
          );
          const descripcion = provider.descripcion_servicio?.trim();
          const montoCotizado = Number(provider.monto_cotizado ?? 0);

          return (
            <li
              key={provider.id}
              className="rounded-xl border border-bloom-border/80 bg-bloom-canvas/40 px-5 py-4 sm:px-6"
            >
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-display text-xl text-bloom-ink">
                      {provider.nombre}
                    </p>
                    <span className="inline-flex rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-800">
                      {t.providersEvaluationBadge}
                    </span>
                  </div>
                  <p className="mt-0.5 text-sm text-bloom-muted">
                    {categoriaLabel}
                  </p>
                </div>
                {Number.isFinite(montoCotizado) && montoCotizado > 0 ? (
                  <p className="shrink-0 text-sm font-medium text-bloom-ink">
                    <span className="text-bloom-muted">
                      {t.providersEvaluationQuotedValue}
                      {": "}
                    </span>
                    {formatCurrency(montoCotizado)}
                  </p>
                ) : null}
              </div>

              {descripcion ? (
                <div className="mt-3 border-t border-bloom-border/60 pt-3">
                  <p className="text-xs font-medium uppercase tracking-[0.08em] text-bloom-muted">
                    {t.serviceDescription}
                  </p>
                  <p className="mt-1 whitespace-pre-wrap text-sm text-bloom-ink">
                    {descripcion}
                  </p>
                </div>
              ) : null}
            </li>
          );
        })}
      </ul>
    </ClienteAccordionSection>
  );
}
