export const BODA_ESTADO_ACTIVA = "activa";
export const BODA_ESTADO_FINALIZADA = "finalizada";

export function normalizeBodaEstado(
  estado: string | null | undefined,
): string {
  return (estado ?? BODA_ESTADO_ACTIVA).trim().toLowerCase();
}

export function isBodaActiva(estado: string | null | undefined): boolean {
  const normalized = normalizeBodaEstado(estado);
  return normalized !== "cancelada" && normalized !== BODA_ESTADO_FINALIZADA;
}

export function isBodaFinalizada(estado: string | null | undefined): boolean {
  return normalizeBodaEstado(estado) === BODA_ESTADO_FINALIZADA;
}
