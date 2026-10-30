import {
  getProviderSaldoPendienteConPagos,
  getProviderTotalAbonado,
  hasProveedorValorDefinido,
  isPagoDirectoCliente,
  isProveedorSinCosto,
  type ProveedorRow,
  type ProviderStatus,
} from "@/app/data/providers";

/** Columnas que el portal puede leer. Sin notas, comisiones ni simulación. */
export const CLIENTE_PROVEEDOR_SELECT =
  "id, nombre, categoria, descripcion_servicio, estado, valor_total, anticipo, fecha_saldo, sin_costo, pago_directo_cliente, excluido_simulacion, grupo_id, orden, created_at, monto_cotizado, banco, tipo_cuenta, numero_cuenta, titular_cuenta, documento_nit, direccion, telefono, email";

export type ClienteProveedorTablaFila = {
  id: string;
  categoria: string;
  nombre: string;
  descripcion: string | null;
  estado: Exclude<ProviderStatus, "descartado">;
  valor: number | null;
  abonado: number | null;
  saldo: number | null;
  pagoDirecto: boolean;
};

export type ClienteProveedorEvaluacion = {
  id: string;
  nombre: string;
  categoria: string;
  descripcion: string | null;
  montoCotizado: number | null;
  grupoId: string | null;
  createdAt: string;
};

type PortalProveedor = Pick<
  ProveedorRow,
  | "id"
  | "nombre"
  | "categoria"
  | "descripcion_servicio"
  | "estado"
  | "valor_total"
  | "anticipo"
  | "sin_costo"
  | "pago_directo_cliente"
  | "grupo_id"
  | "orden"
  | "created_at"
  | "monto_cotizado"
>;

export function sortPortalProveedores<T extends PortalProveedor>(rows: T[]): T[] {
  const visible = rows.filter((provider) => provider.estado !== "descartado");
  const hasOrden = visible.some((provider) => provider.orden != null);
  if (hasOrden) {
    return [...visible].sort((a, b) => {
      const ao = a.orden ?? Number.MAX_SAFE_INTEGER;
      const bo = b.orden ?? Number.MAX_SAFE_INTEGER;
      if (ao !== bo) return ao - bo;
      return a.created_at.localeCompare(b.created_at);
    });
  }
  return [...visible].sort((a, b) => a.created_at.localeCompare(b.created_at));
}

export function toClienteProveedorTablaFila(
  provider: PortalProveedor,
  pagos: { monto: number }[],
): ClienteProveedorTablaFila {
  const sinCosto = isProveedorSinCosto(provider);
  const pagoDirecto = !sinCosto && isPagoDirectoCliente(provider);
  const valor = sinCosto || !hasProveedorValorDefinido(provider.valor_total)
    ? null
    : provider.valor_total;

  if (sinCosto || pagoDirecto) {
    return {
      id: provider.id,
      categoria: provider.categoria,
      nombre: provider.nombre,
      descripcion: provider.descripcion_servicio,
      estado: provider.estado as ClienteProveedorTablaFila["estado"],
      valor: sinCosto ? null : valor,
      abonado: null,
      saldo: null,
      pagoDirecto,
    };
  }

  const abonado = getProviderTotalAbonado(provider, pagos);
  const saldo = hasProveedorValorDefinido(provider.valor_total)
    ? getProviderSaldoPendienteConPagos(provider as ProveedorRow, pagos)
    : 0;

  return {
    id: provider.id,
    categoria: provider.categoria,
    nombre: provider.nombre,
    descripcion: provider.descripcion_servicio,
    estado: provider.estado as ClienteProveedorTablaFila["estado"],
    valor,
    abonado,
    saldo,
    pagoDirecto: false,
  };
}

export function toClienteProveedorEvaluacion(
  provider: PortalProveedor,
): ClienteProveedorEvaluacion {
  const monto = Number(provider.monto_cotizado ?? 0);
  return {
    id: provider.id,
    nombre: provider.nombre,
    categoria: provider.categoria,
    descripcion: provider.descripcion_servicio,
    montoCotizado: Number.isFinite(monto) && monto > 0 ? monto : null,
    grupoId: provider.grupo_id,
    createdAt: provider.created_at,
  };
}
