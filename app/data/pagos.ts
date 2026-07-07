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

/** Pago para mostrar en el historial. Los sintéticos (como el anticipo) no existen en la tabla `pagos`. */
export type PagoDisplay = PagoRow & { esSintetico?: boolean };

export const CONCEPTO_ANTICIPO = "Anticipo";

/**
 * Devuelve el historial de pagos para mostrar, incluyendo el anticipo del proveedor
 * como un registro sintético (concepto "Anticipo", fecha = created_at) cuando
 * `anticipo > 0` y todavía no existe un pago real con ese concepto.
 * No escribe en la base de datos; el registro es solo para visualización.
 */
export function buildPagosConAnticipo(
  provider: { id: string; anticipo: number; created_at?: string | null },
  pagos: PagoRow[],
): PagoDisplay[] {
  const anticipo = Number(provider.anticipo ?? 0);
  const yaExisteAnticipo = pagos.some(
    (p) => p.concepto?.trim().toLowerCase() === CONCEPTO_ANTICIPO.toLowerCase(),
  );

  const list: PagoDisplay[] = [...pagos];

  if (anticipo > 0 && !yaExisteAnticipo) {
    list.push({
      id: `anticipo-${provider.id}`,
      proveedor_id: provider.id,
      monto: anticipo,
      fecha_pago: (provider.created_at ?? "").slice(0, 10),
      concepto: CONCEPTO_ANTICIPO,
      comprobante_url: null,
      esSintetico: true,
    });
  }

  return list;
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
