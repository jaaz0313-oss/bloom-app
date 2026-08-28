import type { CronogramaItemRow } from "@/app/data/cronograma";
import {
  getProveedorGrupoPrimaryId,
  isProveedorGrupoPrimario,
  type ProveedorRow,
} from "@/app/data/providers";
import { normalizeProviderCategory } from "@/lib/provider-categories";

export type PresupuestoEstimadoCategoriaRow = {
  id: string;
  boda_id: string;
  categoria: string;
  valor_estimado: number | null;
  notas: string | null;
  incluido_en_proveedor_id?: string | null;
  orden?: number | null;
  created_at: string;
  updated_at: string;
};

export type PresupuestoCategoriaEstado =
  | "contratado"
  | "en_evaluacion"
  | "estimado";

export type PresupuestoCategoriaLinea = {
  categoria: string;
  estado: PresupuestoCategoriaEstado;
  valor: number;
  /** Si false, no suma al total (p. ej. categoría secundaria de un grupo). */
  cuentaEnTotal: boolean;
  editable: boolean;
  estimadoId: string | null;
  notas: string | null;
  proveedorNombre: string | null;
  incluidoEn: string | null;
  incluidoEnProveedorId: string | null;
  /** Categoría creada a mano (no viene del cronograma). */
  esPersonalizado: boolean;
};

function categoryKey(categoria: string): string {
  return normalizeProviderCategory(categoria).trim().toLowerCase();
}

/** Categorías del cronograma (descripcion ≈ categoría de proveedor), únicas y en orden. */
export function getCategoriasPresupuestoFromCronograma(
  items: CronogramaItemRow[],
): string[] {
  const seen = new Set<string>();
  const result: string[] = [];

  const sorted = [...items].sort((a, b) => {
    const byFecha = a.fecha_limite.localeCompare(b.fecha_limite);
    if (byFecha !== 0) return byFecha;
    return a.descripcion.localeCompare(b.descripcion, "es");
  });

  for (const item of sorted) {
    const raw = item.descripcion?.trim() || item.categoria?.trim() || "";
    if (!raw) continue;
    const label = normalizeProviderCategory(raw);
    const key = categoryKey(label);
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(label);
  }

  return result;
}

/**
 * Categorías del cronograma + estimados personalizados que no están en el cronograma.
 * Ordenadas por `orden` del estimado cuando existe.
 */
export function collectPresupuestoCategorias(
  cronogramaItems: CronogramaItemRow[],
  estimados: PresupuestoEstimadoCategoriaRow[],
): { categorias: string[]; personalizadasKeys: Set<string> } {
  const categorias = getCategoriasPresupuestoFromCronograma(cronogramaItems);
  const keys = new Set(categorias.map(categoryKey));
  const personalizadasKeys = new Set<string>();

  for (const row of estimados) {
    const raw = row.categoria?.trim() || "";
    if (!raw) continue;
    const label = normalizeProviderCategory(raw) || raw;
    const key = categoryKey(label);
    if (keys.has(key)) continue;
    keys.add(key);
    personalizadasKeys.add(key);
    categorias.push(label);
  }

  const ordenByKey = new Map<string, number>();
  for (const row of estimados) {
    const key = categoryKey(row.categoria);
    const orden = Number(row.orden);
    if (Number.isFinite(orden)) {
      ordenByKey.set(key, orden);
    }
  }

  const hasAnyOrden = ordenByKey.size > 0;
  if (hasAnyOrden) {
    categorias.sort((a, b) => {
      const ao = ordenByKey.get(categoryKey(a)) ?? Number.MAX_SAFE_INTEGER;
      const bo = ordenByKey.get(categoryKey(b)) ?? Number.MAX_SAFE_INTEGER;
      if (ao !== bo) return ao - bo;
      return a.localeCompare(b, "es");
    });
  }

  return { categorias, personalizadasKeys };
}

function providersForCategoria(
  providers: ProveedorRow[],
  categoria: string,
): ProveedorRow[] {
  const key = categoryKey(categoria);
  return providers.filter(
    (p) =>
      p.estado !== "descartado" &&
      categoryKey(p.categoria) === key,
  );
}

function valorCotizado(provider: ProveedorRow): number {
  const cotizado = Number(provider.monto_cotizado ?? 0);
  if (Number.isFinite(cotizado) && cotizado > 0) return Math.round(cotizado);
  const total = Number(provider.valor_total ?? 0);
  return Number.isFinite(total) && total > 0 ? Math.round(total) : 0;
}

function valorContratado(provider: ProveedorRow): number {
  const total = Number(provider.valor_total ?? 0);
  return Number.isFinite(total) && total > 0 ? Math.round(total) : 0;
}

function pickPreferredProvider(
  list: ProveedorRow[],
  allProviders: ProveedorRow[],
): ProveedorRow | null {
  if (list.length === 0) return null;
  return (
    [...list].sort((a, b) => {
      const aPrimary = isProveedorGrupoPrimario(allProviders, a) ? 0 : 1;
      const bPrimary = isProveedorGrupoPrimario(allProviders, b) ? 0 : 1;
      if (aPrimary !== bPrimary) return aPrimary - bPrimary;
      return a.created_at.localeCompare(b.created_at);
    })[0] ?? null
  );
}

function resolveIncluidoProveedor(
  estimado: PresupuestoEstimadoCategoriaRow | null,
  activeProviders: ProveedorRow[],
): ProveedorRow | null {
  const id = estimado?.incluido_en_proveedor_id?.trim() || null;
  if (!id) return null;
  return activeProviders.find((p) => p.id === id) ?? null;
}

/**
 * Arma una línea por categoría del cronograma (+ personalizadas):
 * contratado > en evaluación > estimado editable.
 */
export function buildPresupuestoEstimadoLineas(
  categorias: string[],
  providers: ProveedorRow[],
  estimados: PresupuestoEstimadoCategoriaRow[],
  personalizadasKeys: Set<string> = new Set(),
): PresupuestoCategoriaLinea[] {
  const estimadosByKey = new Map<string, PresupuestoEstimadoCategoriaRow>();
  for (const row of estimados) {
    estimadosByKey.set(categoryKey(row.categoria), row);
  }

  const activeProviders = providers.filter((p) => p.estado !== "descartado");

  return categorias.map((categoria) => {
    const matching = providersForCategoria(activeProviders, categoria);
    const contratados = matching.filter((p) => p.estado === "contratado");
    const enEvaluacion = matching.filter((p) => p.estado === "en_negociacion");
    const estimado = estimadosByKey.get(categoryKey(categoria)) ?? null;
    const esPersonalizado = personalizadasKeys.has(categoryKey(categoria));
    const incluidoProvider = resolveIncluidoProveedor(
      estimado,
      activeProviders,
    );

    if (contratados.length > 0) {
      const provider = pickPreferredProvider(contratados, activeProviders)!;
      const isPrimary = isProveedorGrupoPrimario(activeProviders, provider);
      if (!isPrimary && provider.grupo_id) {
        const primaryId = getProveedorGrupoPrimaryId(
          activeProviders,
          provider.grupo_id,
        );
        const primary =
          activeProviders.find((p) => p.id === primaryId) ?? provider;
        return {
          categoria,
          estado: "contratado" as const,
          valor: 0,
          cuentaEnTotal: false,
          editable: false,
          estimadoId: estimado?.id ?? null,
          notas: estimado?.notas ?? null,
          proveedorNombre: provider.nombre,
          incluidoEn: primary.nombre,
          incluidoEnProveedorId: primary.id,
          esPersonalizado,
        };
      }
      return {
        categoria,
        estado: "contratado" as const,
        valor: valorContratado(provider),
        cuentaEnTotal: true,
        editable: false,
        estimadoId: estimado?.id ?? null,
        notas: estimado?.notas ?? null,
        proveedorNombre: provider.nombre,
        incluidoEn: null,
        incluidoEnProveedorId: null,
        esPersonalizado,
      };
    }

    if (enEvaluacion.length > 0) {
      const provider = pickPreferredProvider(enEvaluacion, activeProviders)!;
      const isPrimary = isProveedorGrupoPrimario(activeProviders, provider);
      if (!isPrimary && provider.grupo_id) {
        const primaryId = getProveedorGrupoPrimaryId(
          activeProviders,
          provider.grupo_id,
        );
        const primary =
          activeProviders.find((p) => p.id === primaryId) ?? provider;
        return {
          categoria,
          estado: "en_evaluacion" as const,
          valor: 0,
          cuentaEnTotal: false,
          editable: false,
          estimadoId: estimado?.id ?? null,
          notas: estimado?.notas ?? null,
          proveedorNombre: provider.nombre,
          incluidoEn: primary.nombre,
          incluidoEnProveedorId: primary.id,
          esPersonalizado,
        };
      }
      return {
        categoria,
        estado: "en_evaluacion" as const,
        valor: valorCotizado(provider),
        cuentaEnTotal: true,
        editable: false,
        estimadoId: estimado?.id ?? null,
        notas: estimado?.notas ?? null,
        proveedorNombre: provider.nombre,
        incluidoEn: null,
        incluidoEnProveedorId: null,
        esPersonalizado,
      };
    }

    if (incluidoProvider) {
      return {
        categoria,
        estado: "estimado" as const,
        valor: 0,
        cuentaEnTotal: false,
        editable: true,
        estimadoId: estimado?.id ?? null,
        notas: estimado?.notas ?? null,
        proveedorNombre: null,
        incluidoEn: incluidoProvider.nombre,
        incluidoEnProveedorId: incluidoProvider.id,
        esPersonalizado,
      };
    }

    const valorEstimado = Number(estimado?.valor_estimado ?? 0);
    return {
      categoria,
      estado: "estimado" as const,
      valor: Number.isFinite(valorEstimado) ? Math.round(valorEstimado) : 0,
      cuentaEnTotal: true,
      editable: true,
      estimadoId: estimado?.id ?? null,
      notas: estimado?.notas ?? null,
      proveedorNombre: null,
      incluidoEn: null,
      incluidoEnProveedorId: null,
      esPersonalizado,
    };
  });
}

export function sumPresupuestoEstimadoTotal(
  lineas: PresupuestoCategoriaLinea[],
): number {
  return lineas.reduce(
    (sum, line) => sum + (line.cuentaEnTotal ? line.valor : 0),
    0,
  );
}

export function sumPresupuestoPorEstado(
  lineas: PresupuestoCategoriaLinea[],
): {
  contratado: number;
  enEvaluacion: number;
  estimado: number;
  total: number;
} {
  let contratado = 0;
  let enEvaluacion = 0;
  let estimado = 0;
  for (const line of lineas) {
    if (!line.cuentaEnTotal) continue;
    if (line.estado === "contratado") contratado += line.valor;
    else if (line.estado === "en_evaluacion") enEvaluacion += line.valor;
    else estimado += line.valor;
  }
  return {
    contratado,
    enEvaluacion,
    estimado,
    total: contratado + enEvaluacion + estimado,
  };
}
