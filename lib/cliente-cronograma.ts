import type { CronogramaItemRow } from "@/app/data/cronograma";
import type { ProviderStatus } from "@/app/data/providers";
import { normalizeProviderCategory } from "@/lib/provider-categories";

export type ClienteCronogramaProveedor = {
  nombre: string;
  categoria: string;
  estado: ProviderStatus;
};

export type ClienteCronogramaHitoEstado = "confirmado" | "en_proceso" | "pendiente";

export type ClienteCronogramaHito = {
  id: string;
  categoria: string;
  estado: ClienteCronogramaHitoEstado;
  estadoLabel: "Confirmado" | "En proceso" | "Pendiente";
  proveedorNombre: string | null;
};

export type ClienteCronogramaResumen = {
  hitos: ClienteCronogramaHito[];
  completados: ClienteCronogramaHito[];
  enProceso: ClienteCronogramaHito[];
  pendientes: ClienteCronogramaHito[];
  porcentajeCompletado: number;
  mensajeAliento: string;
  total: number;
};

const EN_PROCESO_ESTADOS: ProviderStatus[] = [
  "cotizacion_solicitada",
  "en_negociacion",
];

export function getClienteCronogramaMensajeAliento(
  porcentaje: number,
): string {
  if (porcentaje >= 100) {
    return "¡Todo confirmado! Su cronograma está completo y listo para celebrar 🌸";
  }
  if (porcentaje >= 67) {
    return "¡Casi listos! Solo faltan algunos detalles por confirmar 🌸";
  }
  if (porcentaje >= 34) {
    return "¡Van muy bien! Su boda está tomando forma paso a paso 🌸";
  }
  if (porcentaje > 0) {
    return "¡Buen comienzo! Cada categoría confirmada los acerca a su gran día 🌸";
  }
  return "¡Estamos aquí para acompañarlos! Pronto verán avances en cada categoría 🌸";
}

function findProveedoresForHito(
  hito: Pick<CronogramaItemRow, "descripcion">,
  proveedores: ClienteCronogramaProveedor[],
): ClienteCronogramaProveedor[] {
  return proveedores.filter(
    (p) =>
      p.estado !== "descartado" &&
      normalizeProviderCategory(p.categoria) ===
        normalizeProviderCategory(hito.descripcion),
  );
}

function resolveHitoEstado(
  hito: CronogramaItemRow,
  matched: ClienteCronogramaProveedor[],
): ClienteCronogramaHito {
  const contratado = matched.find((p) => p.estado === "contratado");

  if (contratado || hito.completado) {
    return {
      id: hito.id,
      categoria: hito.descripcion,
      estado: "confirmado",
      estadoLabel: "Confirmado",
      proveedorNombre: contratado?.nombre ?? null,
    };
  }

  const enProceso = matched.find((p) =>
    EN_PROCESO_ESTADOS.includes(p.estado),
  );

  if (enProceso) {
    return {
      id: hito.id,
      categoria: hito.descripcion,
      estado: "en_proceso",
      estadoLabel: "En proceso",
      proveedorNombre: null,
    };
  }

  return {
    id: hito.id,
    categoria: hito.descripcion,
    estado: "pendiente",
    estadoLabel: "Pendiente",
    proveedorNombre: null,
  };
}

export function buildClienteCronogramaResumen(
  cronogramaItems: CronogramaItemRow[],
  proveedores: ClienteCronogramaProveedor[],
): ClienteCronogramaResumen {
  const activos = proveedores.filter((p) => p.estado !== "descartado");
  const ordenados = [...cronogramaItems].sort((a, b) =>
    a.fecha_limite.localeCompare(b.fecha_limite),
  );

  const hitos = ordenados.map((item) =>
    resolveHitoEstado(item, findProveedoresForHito(item, activos)),
  );

  const completados = hitos.filter((h) => h.estado === "confirmado");
  const enProceso = hitos.filter((h) => h.estado === "en_proceso");
  const pendientes = hitos.filter((h) => h.estado === "pendiente");
  const total = hitos.length;
  const porcentajeCompletado =
    total > 0 ? Math.round((completados.length / total) * 100) : 0;

  return {
    hitos,
    completados,
    enProceso,
    pendientes,
    porcentajeCompletado,
    mensajeAliento: getClienteCronogramaMensajeAliento(porcentajeCompletado),
    total,
  };
}
