export function normalizeBodaFecha(fecha: string): string {
  const trimmed = fecha.trim();
  const match = trimmed.match(/^(\d{4}-\d{2}-\d{2})/);
  if (!match) {
    throw new Error("La fecha de la boda no tiene un formato válido (YYYY-MM-DD).");
  }
  return match[1];
}

export function bodaFechaNecesitaReconfirmar(boda: {
  fecha_confirmada: boolean | null;
  fecha_boda: string;
  fecha_boda_confirmada: string | null;
}): boolean {
  if (!boda.fecha_confirmada) return false;
  if (!boda.fecha_boda_confirmada) return false;

  const actual = normalizeBodaFecha(boda.fecha_boda);
  const confirmada = normalizeBodaFecha(boda.fecha_boda_confirmada);
  return actual !== confirmada;
}
