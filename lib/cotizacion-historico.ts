import type { HistoricoPrecioCategoria } from "@/lib/cotizacion-lead";

type ProveedorHistoricoRow = {
  categoria: string;
  valor_total: number;
};

type CotizacionItemHistoricoRow = {
  categoria: string;
  precio_min: number | null;
  precio_max: number | null;
  precio_fijo: number | null;
  es_precio_fijo: boolean;
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

    let min = 0;
    let max = 0;
    if (item.es_precio_fijo && item.precio_fijo != null && item.precio_fijo > 0) {
      min = item.precio_fijo;
      max = item.precio_fijo;
    } else {
      min = item.precio_min ?? 0;
      max = item.precio_max ?? 0;
    }
    if (min <= 0 && max <= 0) continue;

    const invitados = Array.isArray(item.cotizaciones)
      ? (item.cotizaciones[0]?.numero_invitados ?? null)
      : (item.cotizaciones?.numero_invitados ?? null);

    historico.push({
      categoria: item.categoria,
      valor: (min + max) / 2,
      numero_invitados: invitados,
    });
  }

  return historico;
}
