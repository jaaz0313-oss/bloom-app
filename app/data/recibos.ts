import type { MedioPago } from "@/app/data/pagos";
import { MEDIOS_PAGO } from "@/app/data/pagos";

export type ReciboEstado = "borrador" | "enviado" | "emitido";

export type ReciboPagoRow = {
  id: string;
  boda_id: string;
  fecha: string;
  metodo_pago: string;
  cuenta: string | null;
  concepto: string;
  valor: number;
  total: number;
  estado: ReciboEstado;
  created_by: string | null;
  cliente_nombre: string;
  cliente_direccion: string | null;
  cliente_ciudad: string | null;
  cliente_telefono: string | null;
  cliente_documento: string | null;
  created_at: string;
};

export const RECIBO_ESTADO_LABELS: Record<ReciboEstado, string> = {
  borrador: "Borrador",
  enviado: "Enviado",
  emitido: "Emitido",
};

export const RECIBO_ESTADO_STYLES: Record<ReciboEstado, string> = {
  borrador: "bg-slate-100 text-slate-700 border-slate-200",
  enviado: "bg-amber-100 text-amber-900 border-amber-200",
  emitido: "bg-green-100 text-green-800 border-green-200",
};

export function isMedioPagoKnown(value: string): value is MedioPago {
  return (MEDIOS_PAGO as readonly string[]).includes(value);
}

/** Si el valor guardado no está en MEDIOS_PAGO, tratarlo como "Otro" + texto libre. */
export function parseMetodoPagoForForm(value: string | null | undefined): {
  metodoPago: MedioPago;
  metodoPagoOtro: string;
} {
  const trimmed = value?.trim() || "";
  if (!trimmed) {
    return { metodoPago: "Transferencia Colombia", metodoPagoOtro: "" };
  }
  if (isMedioPagoKnown(trimmed)) {
    return {
      metodoPago: trimmed,
      metodoPagoOtro: "",
    };
  }
  return { metodoPago: "Otro", metodoPagoOtro: trimmed };
}

export function resolveMetodoPagoToStore(
  metodoPago: MedioPago,
  metodoPagoOtro: string,
): string {
  if (metodoPago !== "Otro") return metodoPago;
  const other = metodoPagoOtro.trim();
  return other || "Otro";
}
