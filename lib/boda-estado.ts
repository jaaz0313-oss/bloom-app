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

/** True cuando la fecha del evento es anterior a hoy (no incluye el día de hoy). */
export function isBodaFechaPasada(
  fechaBoda: string,
  fromDate = new Date(),
): boolean {
  const today = fromDate.toISOString().slice(0, 10);
  return fechaBoda < today;
}
