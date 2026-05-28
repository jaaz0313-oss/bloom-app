export type ProviderStatus =
  | "pendiente"
  | "cotizacion_solicitada"
  | "en_negociacion"
  | "contratado"
  | "descartado";

export type ProveedorRow = {
  id: string;
  boda_id: string;
  nombre: string;
  categoria: string;
  valor_total: number;
  anticipo: number;
  fecha_saldo: string | null;
  banco: string | null;
  numero_cuenta: string | null;
  tipo_cuenta: string | null;
  titular_cuenta: string | null;
  documento_nit: string | null;
  email: string | null;
  telefono: string | null;
  direccion: string | null;
  link_pago: string | null;
  descripcion_servicio: string | null;
  notas: string | null;
  estado: ProviderStatus;
  cotizacion_solicitada_at: string | null;
  cotizacion_recibida_at: string | null;
  monto_cotizado: number | null;
  notas_cotizacion: string | null;
  created_at: string;
};

export const PROVIDER_STATUS_LABELS: Record<ProviderStatus, string> = {
  pendiente: "Pendiente",
  cotizacion_solicitada: "Cotización solicitada",
  en_negociacion: "En negociación",
  contratado: "Contratado",
  descartado: "Descartado",
};

export const PROVIDER_STATUS_STYLES: Record<ProviderStatus, string> = {
  pendiente: "bg-gray-200 text-gray-700",
  cotizacion_solicitada: "bg-orange-100 text-orange-800",
  en_negociacion: "bg-yellow-100 text-yellow-800",
  contratado: "bg-green-100 text-green-800",
  descartado: "bg-red-100 text-red-700",
};

export function getProviderSaldoPendiente(provider: ProveedorRow): number {
  return provider.valor_total - provider.anticipo;
}

export function getProviderSaldoPendienteConPagos(
  provider: ProveedorRow,
  pagos: { monto: number }[] = [],
): number {
  const pagosRegistrados = pagos.reduce(
    (sum, pago) => sum + Number(pago.monto),
    0,
  );
  return Math.max(
    0,
    provider.valor_total - (provider.anticipo + pagosRegistrados),
  );
}

/** Monto del pago más reciente registrado, o el anticipo si no hay pagos. */
export function getUltimoMontoPagoRegistrado(
  provider: ProveedorRow,
  pagos: { monto: number; fecha_pago: string }[] = [],
): number {
  if (pagos.length > 0) {
    const sorted = [...pagos].sort((a, b) =>
      b.fecha_pago.localeCompare(a.fecha_pago),
    );
    return Number(sorted[0].monto);
  }
  if (provider.anticipo > 0) return provider.anticipo;
  return 0;
}

export function computePaymentProjection(
  providers: ProveedorRow[],
  pagosByProveedor: Record<string, { monto: number }[]> = {},
) {
  const contratados = providers.filter((p) => p.estado === "contratado");
  const totalContratado = contratados.reduce((sum, p) => sum + p.valor_total, 0);
  const totalPagado = contratados.reduce((sum, p) => {
    const pagos = pagosByProveedor[p.id] ?? [];
    const pagosRegistrados = pagos.reduce((acc, pago) => acc + Number(pago.monto), 0);
    return sum + p.anticipo + pagosRegistrados;
  }, 0);
  const saldoPendiente = contratados.reduce(
    (sum, p) => {
      const pagos = pagosByProveedor[p.id] ?? [];
      const pagosRegistrados = pagos.reduce((acc, pago) => acc + Number(pago.monto), 0);
      const pendiente = p.valor_total - (p.anticipo + pagosRegistrados);
      return sum + Math.max(0, pendiente);
    },
    0,
  );

  return { totalContratado, totalPagado, saldoPendiente };
}
