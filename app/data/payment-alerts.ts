import {
  getProviderSaldoPendiente,
  isProveedorSinCosto,
  type ProveedorRow,
} from "./providers";

export type PaymentAlertUrgency = "urgent" | "soon" | "upcoming";

export type PaymentAlert = {
  proveedorId: string;
  bodaId: string;
  nombrePareja: string;
  nombreProveedor: string;
  saldoPendiente: number;
  fechaSaldo: string;
  diasRestantes: number;
  urgency: PaymentAlertUrgency;
  banco: string | null;
  numeroCuenta: string | null;
  titularCuenta: string | null;
  whatsappGrupoLink: string | null;
  telefonoNovia: string | null;
};

export const PAYMENT_ALERT_URGENCY_LABELS: Record<PaymentAlertUrgency, string> = {
  urgent: "Urgente",
  soon: "Próximo",
  upcoming: "Programado",
};

export const PAYMENT_ALERT_URGENCY_STYLES: Record<PaymentAlertUrgency, string> = {
  urgent: "bg-red-100 text-red-800",
  soon: "bg-yellow-100 text-yellow-800",
  upcoming: "bg-green-100 text-green-800",
};

export function getDaysUntil(isoDate: string, fromDate = new Date()): number {
  const start = new Date(fromDate);
  start.setHours(0, 0, 0, 0);
  const target = new Date(isoDate + "T12:00:00");
  const diffMs = target.getTime() - start.getTime();
  return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
}

export function getPaymentAlertUrgency(daysUntil: number): PaymentAlertUrgency {
  if (daysUntil < 7) return "urgent";
  if (daysUntil < 15) return "soon";
  return "upcoming";
}

function addDays(date: Date, days: number): string {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result.toISOString().slice(0, 10);
}

type ProveedorWithBoda = ProveedorRow & {
  bodas:
    | {
        nombre_pareja: string;
        whatsapp_grupo_link: string | null;
        telefono_novia: string | null;
      }
    | {
        nombre_pareja: string;
        whatsapp_grupo_link: string | null;
        telefono_novia: string | null;
      }[]
    | null;
};

export function buildPaymentAlerts(
  proveedores: ProveedorWithBoda[],
  windowDays = 30,
): PaymentAlert[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const maxDate = addDays(today, windowDays);

  const alerts: PaymentAlert[] = [];

  for (const proveedor of proveedores) {
    if (isProveedorSinCosto(proveedor)) continue;
    if (!proveedor.fecha_saldo) continue;

    const fechaSaldo = proveedor.fecha_saldo;
    if (fechaSaldo < today.toISOString().slice(0, 10)) continue;
    if (fechaSaldo > maxDate) continue;

    const saldoPendiente = getProviderSaldoPendiente(proveedor);
    if (saldoPendiente <= 0) continue;

    const boda = Array.isArray(proveedor.bodas)
      ? proveedor.bodas[0]
      : proveedor.bodas;
    if (!boda?.nombre_pareja) continue;

    const diasRestantes = getDaysUntil(fechaSaldo, today);

    alerts.push({
      proveedorId: proveedor.id,
      bodaId: proveedor.boda_id,
      nombrePareja: boda.nombre_pareja,
      nombreProveedor: proveedor.nombre,
      saldoPendiente,
      fechaSaldo,
      diasRestantes,
      urgency: getPaymentAlertUrgency(diasRestantes),
      banco: proveedor.banco,
      numeroCuenta: proveedor.numero_cuenta,
      titularCuenta: proveedor.titular_cuenta,
      whatsappGrupoLink: boda.whatsapp_grupo_link,
      telefonoNovia: boda.telefono_novia,
    });
  }

  return alerts.sort((a, b) => a.fechaSaldo.localeCompare(b.fechaSaldo));
}
