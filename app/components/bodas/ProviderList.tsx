"use client";

import { useEffect, useMemo, type ReactNode } from "react";
import type { PagoRow } from "@/app/data/pagos";
import type { ProveedorRow } from "@/app/data/providers";
import type { UserRole } from "@/lib/auth/roles";
import type { CotizacionBodaContext } from "@/lib/proveedor-cotizacion";
import { CompararCotizacionesBar } from "./CompararCotizacionesBar";
import { ProviderCard } from "./ProviderCard";

type ProviderListProps = {
  providers: ProveedorRow[];
  bodaId: string;
  boda: CotizacionBodaContext;
  plannerName: string;
  pagosByProveedor: Record<string, PagoRow[]>;
  role: UserRole;
  whatsappGrupoLink?: string | null;
  highlightProveedorId?: string | null;
};

function compareProvidersByOrden(a: ProveedorRow, b: ProveedorRow): number {
  const ao = a.orden ?? Number.MAX_SAFE_INTEGER;
  const bo = b.orden ?? Number.MAX_SAFE_INTEGER;
  if (ao !== bo) return ao - bo;
  return a.created_at.localeCompare(b.created_at);
}

export function ProviderList({
  providers,
  bodaId,
  boda,
  plannerName,
  pagosByProveedor,
  role,
  whatsappGrupoLink = null,
  highlightProveedorId = null,
}: ProviderListProps) {
  useEffect(() => {
    if (!highlightProveedorId) return;
    const el = document.getElementById(`proveedor-${highlightProveedorId}`);
    if (!el) return;
    const timer = window.setTimeout(() => {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 150);
    return () => window.clearTimeout(timer);
  }, [highlightProveedorId, providers]);

  const visibleProviders = useMemo(
    () => providers.filter((p) => p.estado !== "descartado"),
    [providers],
  );

  const descartadosCount = providers.length - visibleProviders.length;

  const usesOrden = useMemo(
    () => visibleProviders.some((provider) => provider.orden != null),
    [visibleProviders],
  );

  const orderedProviders = useMemo(() => {
    if (!usesOrden) return visibleProviders;
    return [...visibleProviders].sort(compareProvidersByOrden);
  }, [usesOrden, visibleProviders]);

  const providersByCategoria = useMemo(() => {
    const map = new Map<string, ProveedorRow[]>();
    for (const provider of visibleProviders) {
      const list = map.get(provider.categoria) ?? [];
      list.push(provider);
      map.set(provider.categoria, list);
    }
    return Array.from(map.entries());
  }, [visibleProviders]);

  if (providers.length === 0) {
    return (
      <p className="rounded-2xl border border-dashed border-bloom-border bg-bloom-surface px-5 py-8 text-center text-sm text-bloom-muted">
        Aún no hay proveedores registrados para esta boda.
      </p>
    );
  }

  function renderProviderItem(provider: ProveedorRow, extra?: ReactNode) {
    return (
      <li
        key={provider.id}
        id={`proveedor-${provider.id}`}
        className={
          highlightProveedorId === provider.id
            ? "scroll-mt-24 space-y-3 rounded-2xl ring-2 ring-bloom-accent/40 ring-offset-2"
            : "scroll-mt-24 space-y-3"
        }
      >
        {extra}
        <ProviderCard
          provider={provider}
          bodaId={bodaId}
          boda={boda}
          plannerName={plannerName}
          pagos={pagosByProveedor[provider.id] ?? []}
          role={role}
        />
      </li>
    );
  }

  function renderOrderedList() {
    const enNegociacionByCategoria = new Map<string, ProveedorRow[]>();
    for (const provider of orderedProviders) {
      if (provider.estado !== "en_negociacion") continue;
      const list = enNegociacionByCategoria.get(provider.categoria) ?? [];
      list.push(provider);
      enNegociacionByCategoria.set(provider.categoria, list);
    }

    const compareShown = new Set<string>();

    return (
      <ul className="space-y-3">
        {orderedProviders.map((provider) => {
          const enNegociacion =
            enNegociacionByCategoria.get(provider.categoria) ?? [];
          const showCompare =
            enNegociacion.length >= 2 && !compareShown.has(provider.categoria);

          if (showCompare) {
            compareShown.add(provider.categoria);
          }

          return renderProviderItem(
            provider,
            showCompare ? (
              <CompararCotizacionesBar
                categoria={provider.categoria}
                proveedores={enNegociacion}
                grupoLink={whatsappGrupoLink}
              />
            ) : null,
          );
        })}
      </ul>
    );
  }

  return (
    <div className="space-y-6">
      {descartadosCount > 0 && (
        <p className="text-xs text-bloom-muted">
          {descartadosCount}{" "}
          {descartadosCount === 1
            ? "proveedor descartado oculto"
            : "proveedores descartados ocultos"}
        </p>
      )}

      {usesOrden ? (
        renderOrderedList()
      ) : (
        providersByCategoria.map(([categoria, categoriaProviders]) => {
          const enNegociacion = categoriaProviders.filter(
            (p) => p.estado === "en_negociacion",
          );
          const showCompare = enNegociacion.length >= 2;

          return (
            <section key={categoria}>
              {showCompare && (
                <CompararCotizacionesBar
                  categoria={categoria}
                  proveedores={enNegociacion}
                  grupoLink={whatsappGrupoLink}
                />
              )}
              <ul className="space-y-3">
                {categoriaProviders.map((provider) =>
                  renderProviderItem(provider),
                )}
              </ul>
            </section>
          );
        })
      )}
    </div>
  );
}
