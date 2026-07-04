import type { ProveedorRow } from "@/app/data/providers";
import { getProviderSaldoPendienteConPagos } from "@/app/data/providers";
import type { PagoRow } from "@/app/data/pagos";
import { getDaysUntil } from "@/app/data/payment-alerts";

export type ClientePagoUrgency = "esta_semana" | "pronto";

export type ClientePagoPendiente = {
  proveedor: ProveedorRow;
  saldoPendiente: number;
  fechaLimite: string | null;
  diasRestantes: number | null;
  urgency: ClientePagoUrgency | null;
};

export const CLIENTE_PAGO_URGENCY_LABELS: Record<ClientePagoUrgency, string> = {
  esta_semana: "🔴 Vence en 7 días o menos",
  pronto: "🟡 Vence en 15 días o menos",
};

export const CLIENTE_PAGO_URGENCY_STYLES: Record<ClientePagoUrgency, string> = {
  esta_semana: "bg-red-100 text-red-800 ring-1 ring-red-200/80",
  pronto: "bg-amber-100 text-amber-900 ring-1 ring-amber-200/80",
};

export const CLIENTE_PAGO_URGENCY_CARD_STYLES: Record<
  ClientePagoUrgency,
  string
> = {
  esta_semana: "border-red-200/90 ring-1 ring-red-100",
  pronto: "border-amber-200/90 ring-1 ring-amber-100",
};

/** ≤ 7 días (o vencido) = rojo; ≤ 15 días = amarillo; más de 15 = sin alerta. */
export function getClientePagoUrgency(
  diasRestantes: number,
): ClientePagoUrgency | null {
  if (diasRestantes <= 7) return "esta_semana";
  if (diasRestantes <= 15) return "pronto";
  return null;
}

export function countClientePagosUrgentes(
  pagosPendientes: ClientePagoPendiente[],
): number {
  return pagosPendientes.filter((item) => item.urgency === "esta_semana")
    .length;
}

export function buildClientePagosPendientes(
  proveedores: ProveedorRow[],
  pagosByProveedor: Record<string, PagoRow[]>,
  fromDate = new Date(),
): ClientePagoPendiente[] {
  const items: ClientePagoPendiente[] = [];

  for (const proveedor of proveedores) {
    const pagos = pagosByProveedor[proveedor.id] ?? [];
    const saldoPendiente = getProviderSaldoPendienteConPagos(proveedor, pagos);
    if (saldoPendiente <= 0) continue;

    const fechaLimite = proveedor.fecha_saldo;
    const diasRestantes =
      fechaLimite ? getDaysUntil(fechaLimite, fromDate) : null;
    const urgency =
      diasRestantes !== null ? getClientePagoUrgency(diasRestantes) : null;

    items.push({
      proveedor,
      saldoPendiente,
      fechaLimite,
      diasRestantes,
      urgency,
    });
  }

  return items.sort((a, b) => {
    if (!a.fechaLimite && !b.fechaLimite) return 0;
    if (!a.fechaLimite) return 1;
    if (!b.fechaLimite) return -1;
    return a.fechaLimite.localeCompare(b.fechaLimite);
  });
}

export function computeClientePorcentajePagado(
  totalContratado: number,
  totalPagado: number,
): number {
  if (totalContratado <= 0) return 0;
  return Math.min(100, Math.round((totalPagado / totalContratado) * 100));
}
