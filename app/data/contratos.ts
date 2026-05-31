export type ContratoEstado = "borrador" | "enviado" | "firmado";

export type ContratoFirmante = "novia" | "novio";

export type ContratoRow = {
  id: string;
  boda_id: string;
  honorarios: number | null;
  anticipo: number | null;
  saldo: number | null;
  lugar_venue: string | null;
  ciudad: string | null;
  firmante: ContratoFirmante | null;
  fecha_firma: string | null;
  estado: ContratoEstado;
  created_at: string;
};

export const CONTRATO_ESTADO_LABELS: Record<ContratoEstado, string> = {
  borrador: "Borrador",
  enviado: "Enviado",
  firmado: "Firmado",
};

export const CONTRATO_ESTADO_STYLES: Record<ContratoEstado, string> = {
  borrador: "bg-slate-100 text-slate-700 border-slate-200",
  enviado: "bg-amber-100 text-amber-900 border-amber-200",
  firmado: "bg-green-100 text-green-800 border-green-200",
};

export function computeContratoSaldo(
  honorarios: number | null | undefined,
  anticipo: number | null | undefined,
): number | null {
  if (honorarios === null || honorarios === undefined) return null;
  if (anticipo === null || anticipo === undefined) return honorarios;
  return Math.max(0, honorarios - anticipo);
}
