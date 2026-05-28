import type { PagoRow } from "@/app/data/pagos";
import type { ProveedorRow } from "@/app/data/providers";
import type { UserRole } from "@/lib/auth/roles";
import type { CotizacionBodaContext } from "@/lib/proveedor-cotizacion";
import { ProviderCard } from "./ProviderCard";

type ProviderListProps = {
  providers: ProveedorRow[];
  bodaId: string;
  boda: CotizacionBodaContext;
  plannerName: string;
  pagosByProveedor: Record<string, PagoRow[]>;
  role: UserRole;
};

export function ProviderList({
  providers,
  bodaId,
  boda,
  plannerName,
  pagosByProveedor,
  role,
}: ProviderListProps) {
  if (providers.length === 0) {
    return (
      <p className="rounded-2xl border border-dashed border-bloom-border bg-bloom-surface px-5 py-8 text-center text-sm text-bloom-muted">
        Aún no hay proveedores registrados para esta boda.
      </p>
    );
  }

  return (
    <ul className="space-y-3">
      {providers.map((provider) => (
        <ProviderCard
          key={provider.id}
          provider={provider}
          bodaId={bodaId}
          boda={boda}
          plannerName={plannerName}
          pagos={pagosByProveedor[provider.id] ?? []}
          role={role}
        />
      ))}
    </ul>
  );
}
