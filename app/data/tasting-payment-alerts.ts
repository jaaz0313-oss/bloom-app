import { getTastingDisplayTitle } from "@/lib/tastings";
import type { TastingRow } from "./tastings";

export type TastingPaymentAlert = {
  tastingId: string;
  bodaId: string;
  nombrePareja: string;
  tastingTitulo: string;
  fecha: string;
  horaInicio: string;
};

type TastingWithBoda = Pick<
  TastingRow,
  | "id"
  | "boda_id"
  | "fecha"
  | "hora_inicio"
  | "proveedor_id"
  | "nombre_proveedor"
  | "costo"
> & {
  bodas:
    | { nombre_pareja: string }
    | { nombre_pareja: string }[]
    | null;
};

function resolveBodaNombre(
  bodas: TastingWithBoda["bodas"],
): string {
  if (Array.isArray(bodas)) {
    return bodas[0]?.nombre_pareja?.trim() || "Boda";
  }
  return bodas?.nombre_pareja?.trim() || "Boda";
}

export function buildTastingPaymentAlerts(
  rows: TastingWithBoda[],
): TastingPaymentAlert[] {
  return rows
    .filter((row) => (row.costo ?? 0) > 0)
    .map((row) => ({
      tastingId: row.id,
      bodaId: row.boda_id,
      nombrePareja: resolveBodaNombre(row.bodas),
      tastingTitulo: getTastingDisplayTitle(row),
      fecha: row.fecha,
      horaInicio: row.hora_inicio,
    }))
    .sort((a, b) => {
      const dateCompare = a.fecha.localeCompare(b.fecha);
      if (dateCompare !== 0) return dateCompare;
      return a.horaInicio.localeCompare(b.horaInicio);
    });
}
