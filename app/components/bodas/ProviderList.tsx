import type { PagoRow } from "@/app/data/pagos";
import type { ProveedorRow } from "@/app/data/providers";
import { ProviderCard } from "./ProviderCard";

type ProviderListProps = {
  providers: ProveedorRow[];
  bodaId: string;
  pagosByProveedor: Record<string, PagoRow[]>;
};

export function ProviderList({
  providers,
  bodaId,
  pagosByProveedor,
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
          pagos={pagosByProveedor[provider.id] ?? []}
        />
      ))}
    </ul>
  );
}
