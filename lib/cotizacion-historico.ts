import type { HistoricoPrecioCategoria } from "@/lib/cotizacion-lead";

type ProveedorHistoricoRow = {
  categoria: string;
  valor_total: number;
};

type CotizacionItemHistoricoRow = {
  categoria: string;
  precio_estimado: number | null;
  incluido: boolean;
  cotizaciones:
    | { numero_invitados: number | null }
    | { numero_invitados: number | null }[]
    | null;
};

export function buildHistoricoPrecios(
  proveedores: ProveedorHistoricoRow[],
  cotizacionItems: CotizacionItemHistoricoRow[],
): HistoricoPrecioCategoria[] {
  const historico: HistoricoPrecioCategoria[] = [];

  for (const p of proveedores) {
    if (p.valor_total > 0) {
      historico.push({
        categoria: p.categoria,
        valor: p.valor_total,
        numero_invitados: null,
      });
    }
  }

  for (const item of cotizacionItems) {
    if (!item.incluido) continue;
    if (item.precio_estimado == null || item.precio_estimado <= 0) continue;

    const invitados = Array.isArray(item.cotizaciones)
      ? (item.cotizaciones[0]?.numero_invitados ?? null)
      : (item.cotizaciones?.numero_invitados ?? null);

    historico.push({
      categoria: item.categoria,
      valor: item.precio_estimado,
      numero_invitados: invitados,
    });
  }

  return historico;
}
