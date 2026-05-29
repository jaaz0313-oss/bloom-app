import type { ProveedorRow } from "@/app/data/providers";

export function calcularValorComision(
  valorTotal: number,
  porcentajeComision: number,
): number {
  if (valorTotal <= 0 || porcentajeComision <= 0) return 0;
  return Math.round((valorTotal * porcentajeComision) / 100);
}

export function getPorcentajeComisionProveedor(proveedor: ProveedorRow): number {
  const pct = proveedor.porcentaje_comision ?? 10;
  return pct > 0 ? pct : 10;
}

export function getValorComisionProveedor(proveedor: ProveedorRow): number {
  return calcularValorComision(
    proveedor.valor_total,
    getPorcentajeComisionProveedor(proveedor),
  );
}

export type ComisionesResumen = {
  totalEsperado: number;
  totalRecibido: number;
  totalPendiente: number;
};

export function calcularResumenComisiones(
  proveedores: ProveedorRow[],
): ComisionesResumen {
  let totalEsperado = 0;
  let totalRecibido = 0;

  for (const p of proveedores) {
    if (!p.da_comision) continue;
    const valor = getValorComisionProveedor(p);
    totalEsperado += valor;
    if (p.comision_recibida) {
      totalRecibido += valor;
    }
  }

  return {
    totalEsperado,
    totalRecibido,
    totalPendiente: totalEsperado - totalRecibido,
  };
}
