import type { CronogramaItemRow } from "@/app/data/cronograma";
import { getDaysUntil } from "@/app/data/payment-alerts";

const CLIENTE_SEATING_HITO_PATTERNS = [
  /^lista\s+de\s+invitados$/,
  /^lista\s+invitados$/,
  /^seating\s+(plan|chart)$/,
] as const;

export function normalizeClienteCronogramaHitoLabel(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "");
}

export function isClienteSeatingRelatedHito(descripcion: string): boolean {
  const normalized = normalizeClienteCronogramaHitoLabel(descripcion);
  return CLIENTE_SEATING_HITO_PATTERNS.some((pattern) =>
    pattern.test(normalized),
  );
}

export function getClienteSeatingRelatedHitos(
  cronogramaItems: Pick<CronogramaItemRow, "descripcion" | "completado">[],
): Pick<CronogramaItemRow, "descripcion" | "completado">[] {
  return cronogramaItems.filter((item) =>
    isClienteSeatingRelatedHito(item.descripcion),
  );
}

/** Hito marcado completado en cronograma (campo `completado`), no el estado derivado del portal. */
export function isClienteSeatingHitoCompletado(
  cronogramaItems: Pick<CronogramaItemRow, "descripcion" | "completado">[],
): boolean {
  return getClienteSeatingRelatedHitos(cronogramaItems).some(
    (item) => item.completado,
  );
}

const DIAS_ANTES_BODA_SIN_HITO = 30;

export function shouldShowClienteSeatingPlan(
  cronogramaItems: Pick<CronogramaItemRow, "descripcion" | "completado">[],
  fechaBoda: string,
  fromDate = new Date(),
): boolean {
  const seatingHitos = getClienteSeatingRelatedHitos(cronogramaItems);

  if (seatingHitos.length > 0) {
    return isClienteSeatingHitoCompletado(cronogramaItems);
  }

  return getDaysUntil(fechaBoda, fromDate) <= DIAS_ANTES_BODA_SIN_HITO;
}
