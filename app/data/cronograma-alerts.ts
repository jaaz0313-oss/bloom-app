export type CronogramaAlert = {
  id: string;
  bodaId: string;
  nombrePareja: string;
  hito: string;
  fechaLimite: string;
};

type CronogramaItemWithBoda = {
  id: string;
  boda_id: string;
  descripcion: string;
  fecha_limite: string;
  completado: boolean;
  bodas: { nombre_pareja: string } | { nombre_pareja: string }[] | null;
};

export function buildCronogramaAlerts(
  items: CronogramaItemWithBoda[],
): CronogramaAlert[] {
  const alerts: CronogramaAlert[] = [];

  for (const item of items) {
    if (item.completado) continue;

    const boda = Array.isArray(item.bodas) ? item.bodas[0] : item.bodas;
    if (!boda?.nombre_pareja) continue;

    alerts.push({
      id: item.id,
      bodaId: item.boda_id,
      nombrePareja: boda.nombre_pareja,
      hito: item.descripcion,
      fechaLimite: item.fecha_limite,
    });
  }

  return alerts.sort((a, b) => a.fechaLimite.localeCompare(b.fechaLimite));
}
