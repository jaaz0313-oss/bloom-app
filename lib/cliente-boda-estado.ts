import { getDaysUntil } from "@/app/data/payment-alerts";
import { computeClientePorcentajePagado } from "@/lib/cliente-pagos";

export type ClienteCronogramaEstadoInput = {
  completado: boolean;
};

/** Cuenta ítems completados del cronograma de la boda. */
export function computeClienteProveedoresResumen(
  cronogramaItems: ClienteCronogramaEstadoInput[],
): { itemsCompletados: number; totalItems: number } {
  return {
    itemsCompletados: cronogramaItems.filter((item) => item.completado).length,
    totalItems: cronogramaItems.length,
  };
}

export type ClienteBodaEstadoResumen = {
  diasParaBoda: number;
  diasLabel: string;
  diasDisplay: number;
  porcentajeCronograma: number;
  itemsCompletados: number;
  totalCronogramaItems: number;
  porcentajePagos: number;
  mensajeMotivacional: string;
};

export function getClienteMensajeMotivacional(diasParaBoda: number): string {
  if (diasParaBoda > 180) {
    return "¡Están en el inicio de esta aventura! Todo va marchando bien 🌸";
  }
  if (diasParaBoda >= 90) {
    return "¡Van a buen ritmo! Estamos trabajando para que todo sea perfecto 🌸";
  }
  if (diasParaBoda >= 30) {
    return "¡Ya casi! Los detalles finales están tomando forma 🌸";
  }
  return "¡Su gran día está muy cerca! Todo está listo para celebrar 🌸";
}

export function computePorcentajeCronogramaCompletado(
  completados: number,
  totalItems: number,
): number {
  if (totalItems <= 0) return 0;
  return Math.min(100, Math.round((completados / totalItems) * 100));
}

export function formatDiasParaBoda(dias: number): {
  display: number;
  label: string;
} {
  if (dias === 0) {
    return { display: 0, label: "¡Hoy es su gran día!" };
  }
  if (dias < 0) {
    return { display: 0, label: "Su boda ya fue celebrada" };
  }
  if (dias === 1) {
    return { display: 1, label: "día para su boda" };
  }
  return { display: dias, label: "días para su boda" };
}

export function buildClienteBodaEstadoResumen(params: {
  fechaBoda: string;
  itemsCompletados: number;
  totalCronogramaItems: number;
  totalContratado: number;
  totalPagado: number;
  fromDate?: Date;
}): ClienteBodaEstadoResumen {
  const diasParaBoda = getDaysUntil(params.fechaBoda, params.fromDate);
  const { display, label } = formatDiasParaBoda(diasParaBoda);

  return {
    diasParaBoda,
    diasDisplay: display,
    diasLabel: label,
    porcentajeCronograma: computePorcentajeCronogramaCompletado(
      params.itemsCompletados,
      params.totalCronogramaItems,
    ),
    itemsCompletados: params.itemsCompletados,
    totalCronogramaItems: params.totalCronogramaItems,
    porcentajePagos: computeClientePorcentajePagado(
      params.totalContratado,
      params.totalPagado,
    ),
    mensajeMotivacional: getClienteMensajeMotivacional(diasParaBoda),
  };
}
