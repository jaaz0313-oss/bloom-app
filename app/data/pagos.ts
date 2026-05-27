export type PagoRow = {
  id: string;
  proveedor_id: string;
  monto: number;
  fecha_pago: string;
  concepto: string | null;
  comprobante_url: string | null;
  created_at?: string;
};

export function computeTotalPagado(pagos: PagoRow[]): number {
  return pagos.reduce((sum, p) => sum + Number(p.monto), 0);
}

export function groupPagosByProveedor(
  pagos: PagoRow[],
): Record<string, PagoRow[]> {
  return pagos.reduce<Record<string, PagoRow[]>>((acc, pago) => {
    const list = acc[pago.proveedor_id] ?? [];
    list.push(pago);
    acc[pago.proveedor_id] = list;
    return acc;
  }, {});
}
