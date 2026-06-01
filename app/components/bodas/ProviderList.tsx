"use client";

import { useEffect, useMemo } from "react";
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

      {providersByCategoria.map(([categoria, categoriaProviders]) => {
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
              {categoriaProviders.map((provider) => (
                <li
                  key={provider.id}
                  id={`proveedor-${provider.id}`}
                  className={
                    highlightProveedorId === provider.id
                      ? "scroll-mt-24 rounded-2xl ring-2 ring-bloom-accent/40 ring-offset-2"
                      : "scroll-mt-24"
                  }
                >
                  <ProviderCard
                    provider={provider}
                    bodaId={bodaId}
                    boda={boda}
                    plannerName={plannerName}
                    pagos={pagosByProveedor[provider.id] ?? []}
                    role={role}
                  />
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
