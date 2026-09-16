import type { ContratoFirmante } from "@/app/data/contratos";
import type { ReciboPagoRow } from "@/app/data/recibos";
import type { BodaRow } from "@/app/data/weddings";
import { formatCurrency, formatShortDateStable } from "@/lib/format";

/** Datos fijos de empresa en el recibo (diseño Celestia). */
export const RECIBO_EMPRESA = {
  nombre: "Celestia Events",
  nit: "1037580461-5",
  direccion: "Diagonal 31 e # 27 a sur 49, interior 12 - Envigado",
  telefono: "+57 3195538654",
  email: "celestiaandevents@gmail.com",
} as const;

export type ReciboClienteSnapshot = {
  nombre: string;
  direccion: string;
  ciudad: string;
  telefono: string;
  documento: string;
};

export type ReciboDocumentData = {
  fecha: string;
  metodoPago: string;
  cuenta: string;
  concepto: string;
  valor: number;
  total: number;
  cliente: ReciboClienteSnapshot;
  elaboradoPor: string;
  /** Nombre de la pareja (solo para nombre de archivo / share). */
  nombrePareja: string;
};

function formatDocumento(
  tipo: string | null | undefined,
  numero: string | null | undefined,
): string {
  const num = numero?.trim() || "";
  if (!num) return "";
  const tipoNorm = tipo?.trim() || "CC";
  return `${tipoNorm} ${num}`.trim();
}

/** Defaults editables al crear un recibo (sin placeholders de contrato). */
export function buildReciboClienteDefaults(
  boda: Pick<
    BodaRow,
    | "nombre_pareja"
    | "nombre_novia"
    | "nombre_novio"
    | "tipo_documento_novia"
    | "tipo_documento_novio"
    | "documento_novia"
    | "documento_novio"
    | "ciudad"
    | "direccion"
    | "telefono_novia"
    | "telefono_novio"
  >,
  firmante: ContratoFirmante,
): ReciboClienteSnapshot {
  if (firmante === "novio") {
    return {
      nombre:
        boda.nombre_novio?.trim() ||
        boda.nombre_pareja.split(/\s+y\s+/i).pop()?.trim() ||
        boda.nombre_pareja.trim(),
      direccion: boda.direccion?.trim() || "",
      ciudad: boda.ciudad?.trim() || "",
      telefono: boda.telefono_novio?.trim() || "",
      documento: formatDocumento(
        boda.tipo_documento_novio,
        boda.documento_novio,
      ),
    };
  }

  return {
    nombre: boda.nombre_novia?.trim() || boda.nombre_pareja.trim(),
    direccion: boda.direccion?.trim() || "",
    ciudad: boda.ciudad?.trim() || "",
    telefono: boda.telefono_novia?.trim() || "",
    documento: formatDocumento(
      boda.tipo_documento_novia,
      boda.documento_novia,
    ),
  };
}

export function reciboDocumentDataFromRow(
  row: ReciboPagoRow,
  nombrePareja: string,
): ReciboDocumentData {
  return {
    fecha: row.fecha,
    metodoPago: row.metodo_pago,
    cuenta: row.cuenta?.trim() || "",
    concepto: row.concepto,
    valor: Number(row.valor),
    total: Number(row.total),
    cliente: {
      nombre: row.cliente_nombre,
      direccion: row.cliente_direccion?.trim() || "",
      ciudad: row.cliente_ciudad?.trim() || "",
      telefono: row.cliente_telefono?.trim() || "",
      documento: row.cliente_documento?.trim() || "",
    },
    elaboradoPor: row.created_by?.trim() || "",
    nombrePareja,
  };
}

function sanitizeFilenamePart(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9-_]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);
}

export function buildReciboFilename(data: ReciboDocumentData): string {
  const cliente =
    sanitizeFilenamePart(data.cliente.nombre || data.nombrePareja) || "cliente";
  const fecha = data.fecha?.trim() || "sin-fecha";
  return `Recibo de pago - ${cliente} - ${fecha}.docx`;
}

export function buildReciboPdfFilename(data: ReciboDocumentData): string {
  return buildReciboFilename(data).replace(/\.docx$/i, ".pdf");
}

export function formatReciboFechaDisplay(isoDate: string): string {
  if (!isoDate?.trim()) return "—";
  try {
    return formatShortDateStable(isoDate);
  } catch {
    return isoDate;
  }
}

export function formatReciboMoney(amount: number): string {
  return formatCurrency(amount);
}

export function displayOrBlank(value: string | null | undefined): string {
  return value?.trim() || "";
}
