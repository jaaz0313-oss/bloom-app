import { PROVIDER_CATEGORIES } from "@/lib/provider-categories";
import { getDaysUntil } from "@/app/data/payment-alerts";
import { computeClientePorcentajePagado } from "@/lib/cliente-pagos";

export type ClienteBodaEstadoResumen = {
  diasParaBoda: number;
  diasLabel: string;
  diasDisplay: number;
  porcentajeProveedores: number;
  proveedoresContratados: number;
  totalCategorias: number;
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

export function computePorcentajeProveedoresContratados(
  contratados: number,
  totalCategorias: number,
): number {
  if (totalCategorias <= 0) return 0;
  return Math.min(100, Math.round((contratados / totalCategorias) * 100));
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
  proveedoresContratados: number;
  totalProveedores: number;
  totalContratado: number;
  totalPagado: number;
  fromDate?: Date;
}): ClienteBodaEstadoResumen {
  const diasParaBoda = getDaysUntil(params.fechaBoda, params.fromDate);
  const { display, label } = formatDiasParaBoda(diasParaBoda);
  const totalCategorias =
    params.totalProveedores > 0
      ? params.totalProveedores
      : PROVIDER_CATEGORIES.length;
  const proveedoresContratados = params.proveedoresContratados;

  return {
    diasParaBoda,
    diasDisplay: display,
    diasLabel: label,
    porcentajeProveedores: computePorcentajeProveedoresContratados(
      proveedoresContratados,
      totalCategorias,
    ),
    proveedoresContratados,
    totalCategorias,
    porcentajePagos: computeClientePorcentajePagado(
      params.totalContratado,
      params.totalPagado,
    ),
    mensajeMotivacional: getClienteMensajeMotivacional(diasParaBoda),
  };
}
