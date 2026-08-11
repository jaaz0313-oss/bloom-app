"use client";

import { useMemo, useState } from "react";
import { ClienteAccordionSection } from "@/app/components/cliente/ClienteAccordionSection";
import { useClienteLocale } from "@/app/components/cliente/ClienteLocaleProvider";
import {
  getProveedorGrupoPrimaryId,
  isProveedorGrupoPrimario,
  sortProveedoresContiguosPorGrupo,
  type ProveedorRow,
} from "@/app/data/providers";
import { getClienteCronogramaCategoriaLabel } from "@/lib/cliente-i18n";
import { formatCurrency } from "@/lib/format";
import { appendUsdApprox } from "@/lib/tasa-cambio";

type ClienteProveedoresEvaluacionSectionProps = {
  bodaId: string;
  proveedores: ProveedorRow[];
  approvedProveedorIds?: string[];
  copPorUsd?: number | null;
};

export function ClienteProveedoresEvaluacionSection({
  bodaId,
  proveedores,
  approvedProveedorIds = [],
  copPorUsd = null,
}: ClienteProveedoresEvaluacionSectionProps) {
  const { locale, t } = useClienteLocale();
  const [approvedIds, setApprovedIds] = useState(
    () => new Set(approvedProveedorIds),
  );
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [submittingId, setSubmittingId] = useState<string | null>(null);
  const [errorById, setErrorById] = useState<Record<string, string>>({});

  const proveedoresOrdenados = useMemo(
    () => sortProveedoresContiguosPorGrupo(proveedores),
    [proveedores],
  );

  async function approveProvider(provider: ProveedorRow) {
    if (submittingId) return;

    setSubmittingId(provider.id);
    setErrorById((prev) => {
      const next = { ...prev };
      delete next[provider.id];
      return next;
    });

    try {
      const response = await fetch(`/api/cliente/${bodaId}/aprobar-proveedor`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ proveedorId: provider.id }),
      });

      const payload = (await response.json().catch(() => null)) as {
        error?: string;
      } | null;

      if (!response.ok) {
        setErrorById((prev) => ({
          ...prev,
          [provider.id]: payload?.error ?? t.approveProviderError,
        }));
        return;
      }

      setApprovedIds((prev) => new Set(prev).add(provider.id));
      setConfirmingId(null);
    } catch {
      setErrorById((prev) => ({
        ...prev,
        [provider.id]: t.approveProviderError,
      }));
    } finally {
      setSubmittingId(null);
    }
  }

  if (proveedoresOrdenados.length === 0) {
    return null;
  }

  return (
    <ClienteAccordionSection
      title={t.providersEvaluationTitle}
      summary={t.providersEvaluationSubtitle(proveedoresOrdenados.length)}
      defaultOpen
    >
      <ul className="space-y-4">
        {proveedoresOrdenados.map((provider) => {
          const esPrimarioGrupo = isProveedorGrupoPrimario(
            proveedoresOrdenados,
            provider,
          );
          const esSecundarioGrupo =
            !esPrimarioGrupo && Boolean(provider.grupo_id);
          const categoriaLabel = getClienteCronogramaCategoriaLabel(
            provider.categoria,
            locale,
          );

          if (esSecundarioGrupo) {
            const primaryId = provider.grupo_id
              ? getProveedorGrupoPrimaryId(
                  proveedoresOrdenados,
                  provider.grupo_id,
                )
              : provider.id;
            const primaryProvider =
              primaryId != null
                ? (proveedoresOrdenados.find((p) => p.id === primaryId) ??
                  provider)
                : provider;
            const incluidoEnLabel = t.includedInProvider(
              primaryProvider.nombre.trim().toLowerCase() ===
                provider.nombre.trim().toLowerCase()
                ? `${primaryProvider.nombre} (${getClienteCronogramaCategoriaLabel(primaryProvider.categoria, locale)})`
                : primaryProvider.nombre,
            );

            return (
              <li
                key={provider.id}
                className="rounded-xl border border-bloom-border/80 bg-bloom-canvas/40 px-5 py-4 sm:px-6"
              >
                <p className="font-display text-xl text-bloom-ink">
                  {provider.nombre}
                </p>
                <p className="mt-0.5 text-sm text-bloom-muted">
                  {categoriaLabel}
                </p>
                <p
                  className="mt-1 truncate text-xs text-bloom-muted"
                  title={incluidoEnLabel}
                >
                  {incluidoEnLabel}
                </p>
              </li>
            );
          }

          const descripcion = provider.descripcion_servicio?.trim();
          const montoCotizado = Number(provider.monto_cotizado ?? 0);
          const isApproved = approvedIds.has(provider.id);
          const isConfirming = confirmingId === provider.id;
          const isSubmitting = submittingId === provider.id;

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
                    {appendUsdApprox(
                      formatCurrency(montoCotizado),
                      montoCotizado,
                      copPorUsd,
                    )}
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

              <div className="mt-4 border-t border-bloom-border/60 pt-3">
                {isApproved ? (
                  <p className="text-sm font-medium text-emerald-800">
                    {t.approveProviderPendingTeam}
                  </p>
                ) : isConfirming ? (
                  <div className="space-y-3 rounded-xl border border-bloom-border bg-bloom-surface px-4 py-3">
                    <p className="text-sm text-bloom-ink">
                      {t.approveProviderConfirm(
                        provider.nombre,
                        categoriaLabel,
                      )}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => approveProvider(provider)}
                        disabled={isSubmitting}
                        className="inline-flex items-center justify-center rounded-full bg-emerald-600 px-4 py-2 text-xs font-medium text-white transition-colors hover:bg-emerald-700 disabled:opacity-60"
                      >
                        {isSubmitting
                          ? t.approveProviderSubmitting
                          : t.approveProviderConfirmButton}
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmingId(null)}
                        disabled={isSubmitting}
                        className="inline-flex items-center justify-center rounded-full border border-bloom-border bg-bloom-surface px-4 py-2 text-xs font-medium text-bloom-ink transition-colors hover:bg-bloom-canvas disabled:opacity-60"
                      >
                        {t.approveProviderCancel}
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setConfirmingId(provider.id)}
                    className="inline-flex items-center justify-center rounded-full bg-bloom-accent px-4 py-2 text-xs font-medium text-white transition-colors hover:bg-bloom-accent-hover"
                  >
                    {t.approveProviderButton}
                  </button>
                )}
                {errorById[provider.id] ? (
                  <p className="mt-2 text-xs text-red-700" role="alert">
                    {errorById[provider.id]}
                  </p>
                ) : null}
              </div>
            </li>
          );
        })}
      </ul>
    </ClienteAccordionSection>
  );
}
