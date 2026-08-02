import { parseInputCurrency } from "@/lib/format";

export type ProviderStatus =
  | "pendiente"
  | "cotizacion_solicitada"
  | "en_negociacion"
  | "contratado"
  | "descartado";

export type ProveedorRow = {
  id: string;
  boda_id: string;
  nombre: string;
  categoria: string;
  valor_total: number;
  anticipo: number;
  fecha_saldo: string | null;
  banco: string | null;
  numero_cuenta: string | null;
  tipo_cuenta: string | null;
  titular_cuenta: string | null;
  documento_nit: string | null;
  email: string | null;
  telefono: string | null;
  direccion: string | null;
  link_pago: string | null;
  descripcion_servicio: string | null;
  notas: string | null;
  estado: ProviderStatus;
  cotizacion_solicitada_at: string | null;
  cotizacion_recibida_at: string | null;
  monto_cotizado: number | null;
  notas_cotizacion: string | null;
  cotizacion_drive_url: string | null;
  da_comision: boolean;
  porcentaje_comision: number | null;
  comision_recibida: boolean;
  comision_recibida_at: string | null;
  orden: number | null;
  sin_costo: boolean;
  deposito_reembolsable: number | null;
  /**
   * Agrupa filas del mismo proveedor con varias categorías (valor compartido).
   * Anticipo/pagos/depósito viven en el registro primario del grupo
   * (el de menor `created_at`).
   */
  grupo_id: string | null;
  created_at: string;
};

export function isProveedorSinCosto(
  provider: Pick<ProveedorRow, "sin_costo">,
): boolean {
  return Boolean(provider.sin_costo);
}

export function hasProveedorValorDefinido(
  valorTotal: number | null | undefined,
): boolean {
  const valor = Number(valorTotal ?? 0);
  return Number.isFinite(valor) && valor > 0;
}

export function getDepositoReembolsableMonto(
  provider: Pick<ProveedorRow, "deposito_reembolsable">,
): number {
  const monto = Number(provider.deposito_reembolsable ?? 0);
  return Number.isFinite(monto) && monto > 0 ? monto : 0;
}

export function hasDepositoReembolsable(
  provider: Pick<ProveedorRow, "deposito_reembolsable">,
): boolean {
  return getDepositoReembolsableMonto(provider) > 0;
}

export type DepositoReembolsableLine = {
  proveedorId: string;
  proveedorNombre: string;
  categoria: string;
  monto: number;
};

function compareProveedoresPorCreacion(
  a: ProveedorRow,
  b: ProveedorRow,
): number {
  const byDate = a.created_at.localeCompare(b.created_at);
  if (byDate !== 0) return byDate;
  return a.id.localeCompare(b.id);
}

/** Id del registro primario de un grupo (más antiguo / id estable). */
export function getProveedorGrupoPrimaryId(
  providers: ProveedorRow[],
  grupoId: string,
): string | null {
  const members = providers
    .filter((p) => p.grupo_id === grupoId)
    .sort(compareProveedoresPorCreacion);
  return members[0]?.id ?? null;
}

export function isProveedorGrupoPrimario(
  providers: ProveedorRow[],
  provider: ProveedorRow,
): boolean {
  if (!provider.grupo_id) return true;
  return (
    getProveedorGrupoPrimaryId(providers, provider.grupo_id) === provider.id
  );
}

/** Categorías hermanas (otras filas del mismo grupo), en orden de creación. */
export function getProveedorGrupoCategoriasCompaneras(
  providers: ProveedorRow[],
  provider: ProveedorRow,
): string[] {
  if (!provider.grupo_id) return [];
  return providers
    .filter((p) => p.grupo_id === provider.grupo_id && p.id !== provider.id)
    .sort(compareProveedoresPorCreacion)
    .map((p) => p.categoria);
}

/** Todas las categorías del grupo, en orden (útil para PDF / etiquetas). */
export function getProveedorGrupoCategorias(
  providers: ProveedorRow[],
  provider: ProveedorRow,
): string[] {
  if (!provider.grupo_id) return [provider.categoria];
  return providers
    .filter((p) => p.grupo_id === provider.grupo_id)
    .sort(compareProveedoresPorCreacion)
    .map((p) => p.categoria);
}

/**
 * Agrupa proveedores del mismo `grupo_id` de forma contigua:
 * al encontrar el primer miembro de un grupo, emite primario y luego secundarios.
 * Los proveedores sin grupo mantienen su posición relativa en la lista original.
 */
export function sortProveedoresContiguosPorGrupo(
  providers: ProveedorRow[],
): ProveedorRow[] {
  const membersByGrupo = new Map<string, ProveedorRow[]>();
  for (const provider of providers) {
    if (!provider.grupo_id) continue;
    const list = membersByGrupo.get(provider.grupo_id) ?? [];
    list.push(provider);
    membersByGrupo.set(provider.grupo_id, list);
  }
  for (const [grupoId, members] of membersByGrupo) {
    membersByGrupo.set(grupoId, [...members].sort(compareProveedoresPorCreacion));
  }

  const emitted = new Set<string>();
  const result: ProveedorRow[] = [];

  for (const provider of providers) {
    if (emitted.has(provider.id)) continue;

    if (!provider.grupo_id) {
      result.push(provider);
      emitted.add(provider.id);
      continue;
    }

    const members = membersByGrupo.get(provider.grupo_id) ?? [provider];
    for (const member of members) {
      if (emitted.has(member.id)) continue;
      result.push(member);
      emitted.add(member.id);
    }
  }

  return result;
}

/**
 * Una fila por proveedor individual o por grupo (el primario).
 * Evita sumar `valor_total` varias veces en proyecciones / presupuesto.
 */
export function dedupeProveedoresPorGrupo(
  providers: ProveedorRow[],
): ProveedorRow[] {
  const seenGrupos = new Set<string>();
  const result: ProveedorRow[] = [];
  const sorted = [...providers].sort(compareProveedoresPorCreacion);

  for (const provider of sorted) {
    if (provider.grupo_id) {
      if (seenGrupos.has(provider.grupo_id)) continue;
      seenGrupos.add(provider.grupo_id);
    }
    result.push(provider);
  }
  return result;
}

/** Depósitos registrados (monto > 0). No forman parte del total contratado. */
export function listDepositosReembolsables(
  providers: ProveedorRow[],
): DepositoReembolsableLine[] {
  return dedupeProveedoresPorGrupo(providers)
    .filter((provider) => hasDepositoReembolsable(provider))
    .map((provider) => ({
      proveedorId: provider.id,
      proveedorNombre: provider.nombre,
      categoria: getProveedorGrupoCategorias(providers, provider).join(", "),
      monto: getDepositoReembolsableMonto(provider),
    }));
}

export function parseProveedorValorInput(value: string): number {
  return parseInputCurrency(value);
}

export function proveedorContribuyeAlPresupuesto(
  provider: Pick<ProveedorRow, "estado" | "sin_costo" | "valor_total">,
): boolean {
  return (
    provider.estado === "contratado" &&
    !isProveedorSinCosto(provider) &&
    hasProveedorValorDefinido(provider.valor_total)
  );
}

export const PROVIDER_STATUS_LABELS: Record<ProviderStatus, string> = {
  pendiente: "Pendiente",
  cotizacion_solicitada: "Cotización solicitada",
  en_negociacion: "En negociación",
  contratado: "Contratado",
  descartado: "Descartado",
};

export const PROVIDER_STATUS_STYLES: Record<ProviderStatus, string> = {
  pendiente: "bg-gray-200 text-gray-700",
  cotizacion_solicitada: "bg-orange-100 text-orange-800",
  en_negociacion: "bg-yellow-100 text-yellow-800",
  contratado: "bg-green-100 text-green-800",
  descartado: "bg-red-100 text-red-700",
};

export function getProviderSaldoPendiente(provider: ProveedorRow): number {
  if (isProveedorSinCosto(provider)) return 0;
  return provider.valor_total - provider.anticipo;
}

export function getProviderSaldoPendienteConPagos(
  provider: ProveedorRow,
  pagos: { monto: number }[] = [],
): number {
  if (isProveedorSinCosto(provider)) return 0;
  const pagosRegistrados = pagos.reduce(
    (sum, pago) => sum + Number(pago.monto),
    0,
  );
  return Math.max(
    0,
    provider.valor_total - (provider.anticipo + pagosRegistrados),
  );
}

/** Monto del pago más reciente registrado, o el anticipo si no hay pagos. */
export function getUltimoMontoPagoRegistrado(
  provider: ProveedorRow,
  pagos: { monto: number; fecha_pago: string }[] = [],
): number {
  if (pagos.length > 0) {
    const sorted = [...pagos].sort((a, b) =>
      b.fecha_pago.localeCompare(a.fecha_pago),
    );
    return Number(sorted[0].monto);
  }
  if (provider.anticipo > 0) return provider.anticipo;
  return 0;
}

export function computePaymentProjection(
  providers: ProveedorRow[],
  pagosByProveedor: Record<string, { monto: number }[]> = {},
) {
  const contratados = dedupeProveedoresPorGrupo(
    providers.filter((p) => proveedorContribuyeAlPresupuesto(p)),
  );
  const totalContratado = contratados.reduce((sum, p) => sum + p.valor_total, 0);
  const totalPagado = contratados.reduce((sum, p) => {
    const pagos = pagosByProveedor[p.id] ?? [];
    const pagosRegistrados = pagos.reduce((acc, pago) => acc + Number(pago.monto), 0);
    return sum + p.anticipo + pagosRegistrados;
  }, 0);
  const saldoPendiente = contratados.reduce(
    (sum, p) => {
      const pagos = pagosByProveedor[p.id] ?? [];
      const pagosRegistrados = pagos.reduce((acc, pago) => acc + Number(pago.monto), 0);
      const pendiente = p.valor_total - (p.anticipo + pagosRegistrados);
      return sum + Math.max(0, pendiente);
    },
    0,
  );

  return { totalContratado, totalPagado, saldoPendiente };
}
