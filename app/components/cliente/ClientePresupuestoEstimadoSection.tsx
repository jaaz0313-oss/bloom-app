"use client";

import { useMemo } from "react";
import { ClienteAccordionSection } from "@/app/components/cliente/ClienteAccordionSection";
import { useClienteLocale } from "@/app/components/cliente/ClienteLocaleProvider";
import {
  buildPresupuestoTotalLineas,
  sumPresupuestoTotalEstimado,
  type PresupuestoEstimadoCategoriaRow,
} from "@/app/data/presupuesto-estimado";
import type { ProveedorRow } from "@/app/data/providers";
import { getClienteCronogramaCategoriaLabel } from "@/lib/cliente-i18n";
import { formatCurrency } from "@/lib/format";
import { appendUsdApprox } from "@/lib/tasa-cambio";

type ClientePresupuestoEstimadoSectionProps = {
  providers: ProveedorRow[];
  estimados: PresupuestoEstimadoCategoriaRow[];
  copPorUsd?: number | null;
};

export function ClientePresupuestoEstimadoSection({
  providers,
  estimados,
  copPorUsd = null,
}: ClientePresupuestoEstimadoSectionProps) {
  const { locale, t } = useClienteLocale();

  const lineas = useMemo(
    () => buildPresupuestoTotalLineas(providers, estimados),
    [providers, estimados],
  );

  const total = useMemo(
    () => sumPresupuestoTotalEstimado(lineas),
    [lineas],
  );

  if (lineas.length === 0) return null;

  const estadoLabel = {
    contratado: t.budgetStatusContracted,
    en_evaluacion: t.budgetStatusEvaluation,
    estimado: t.budgetStatusEstimated,
  } as const;

  return (
    <ClienteAccordionSection
      title={t.budgetEstimateTitle}
      summary={t.budgetEstimateSubtitle}
      defaultOpen
    >
      <div className="overflow-x-auto rounded-xl border border-bloom-border/80">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-bloom-canvas/70 text-xs uppercase tracking-wide text-bloom-muted">
            <tr>
              <th className="px-4 py-3 font-medium">{t.budgetCategory}</th>
              <th className="px-4 py-3 font-medium">{t.budgetStatus}</th>
              <th className="px-4 py-3 font-medium text-right">
                {t.budgetValue}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-bloom-border/60">
            {lineas.map((line) => (
              <tr key={`${line.estado}-${line.categoria}`}>
                <td className="px-4 py-3">
                  <p className="font-medium text-bloom-ink">
                    {getClienteCronogramaCategoriaLabel(line.categoria, locale)}
                  </p>
                  {line.proveedorNombre ? (
                    <p className="mt-0.5 text-xs text-bloom-muted">
                      {line.proveedorNombre}
                    </p>
                  ) : null}
                  {line.estado === "estimado" &&
                  line.mostrarNotaCliente &&
                  line.notas?.trim() ? (
                    <p className="mt-0.5 text-xs text-bloom-muted">
                      {line.notas.trim()}
                    </p>
                  ) : null}
                </td>
                <td className="px-4 py-3 text-bloom-muted">
                  {estadoLabel[line.estado]}
                </td>
                <td className="px-4 py-3 text-right font-medium text-bloom-ink">
                  {line.valor > 0
                    ? appendUsdApprox(
                        formatCurrency(line.valor),
                        line.valor,
                        copPorUsd,
                      )
                    : t.toBeConfirmed}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t border-bloom-border bg-bloom-canvas/50">
              <td
                className="px-4 py-3 font-display text-base text-bloom-ink"
                colSpan={2}
              >
                {t.budgetTotal}
              </td>
              <td className="px-4 py-3 text-right font-display text-base text-bloom-ink">
                {appendUsdApprox(formatCurrency(total), total, copPorUsd)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
      <p className="mt-3 text-xs text-bloom-muted">{t.budgetEstimateNote}</p>
    </ClienteAccordionSection>
  );
}
