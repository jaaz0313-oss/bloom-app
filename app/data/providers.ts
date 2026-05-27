export type ProviderStatus = "pendiente" | "en_negociacion" | "contratado";

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
  descripcion_servicio: string | null;
  notas: string | null;
  estado: ProviderStatus;
  created_at: string;
};

export const PROVIDER_STATUS_LABELS: Record<ProviderStatus, string> = {
  pendiente: "Pendiente",
  en_negociacion: "En negociación",
  contratado: "Contratado",
};

export const PROVIDER_STATUS_ORDER: ProviderStatus[] = [
  "pendiente",
  "en_negociacion",
  "contratado",
];

export const PROVIDER_STATUS_STYLES: Record<ProviderStatus, string> = {
  pendiente: "bg-gray-200 text-gray-700",
  en_negociacion: "bg-yellow-100 text-yellow-800",
  contratado: "bg-green-100 text-green-800",
};

export function getNextStatus(current: ProviderStatus): ProviderStatus {
  const index = PROVIDER_STATUS_ORDER.indexOf(current);
  return PROVIDER_STATUS_ORDER[(index + 1) % PROVIDER_STATUS_ORDER.length];
}

export function getProviderSaldoPendiente(provider: ProveedorRow): number {
  return provider.valor_total - provider.anticipo;
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
