import type { SupabaseClient } from "@supabase/supabase-js";
import type { LeadRow } from "@/app/data/leads";
import {
  buildDirectorioLookup,
  resolveDirectorioProveedorId,
} from "@/lib/proveedores-sugeridos-automaticos";
import { getBaseCategoria, normalizeProviderCategory } from "@/lib/provider-categories";

/** Tolerancia de similitud estándar (±30%). */
export const SIMILITUD_RATIO = 0.3;

/** Tolerancia relajada de fallback (±50%). */
export const SIMILITUD_RATIO_RELAJADO = 0.5;

/** Máximo de opciones por categoría (menor a mayor precio). */
export const MAX_PROVEEDORES_POR_CATEGORIA = 3;

/** Mínimo de bodas que deben coincidir antes de bajar de prioridad. */
export const MIN_BODAS_SIMILARES = 2;

export type CriterioSimilitud =
  | "ciudad_ambos"
  | "ciudad_parcial"
  | "ciudad_invitados"
  | "ciudad"
  | "nacional"
  | "relajado"
  | "invitados"
  | "presupuesto"
  | "ninguno";

export type IndicadorPresupuesto = "verde" | "amarillo" | "rojo";

export type SugerenciaBodaSimilarProveedor = {
  directorio_proveedor_id: string | null;
  nombre_proveedor: string;
  categoria: string;
  precio_historico: number;
  boda_referencia: string;
  instagram: string | null;
  /** Porcentaje del presupuesto del lead que representa este precio. */
  porcentaje_presupuesto: number | null;
  /** Semáforo vs promedio histórico; null si el lead no tiene presupuesto. */
  indicador: IndicadorPresupuesto | null;
};

export type SugerenciaBodaSimilarCategoria = {
  categoria: string;
  /** Promedio histórico de la categoría (para contexto del semáforo). */
  promedio_categoria: number;
  proveedores: SugerenciaBodaSimilarProveedor[];
};

export type SugerenciasBodasSimilaresResult = {
  categorias: SugerenciaBodaSimilarCategoria[];
  bodasSimilaresCount: number;
  criterio: CriterioSimilitud;
  /** Suma del precio más bajo de cada categoría. */
  estimadoTotal: number;
  presupuestoLead: number | null;
  /** Lead sin ciudad, invitados ni presupuesto para filtrar. */
  sinCriterios: boolean;
};

type BodaCandidata = {
  id: string;
  nombre_pareja: string;
  num_invitados: number | null;
  presupuesto: number;
  ciudad: string | null;
};

type ProveedorHistorial = {
  boda_id: string;
  nombre: string;
  categoria: string;
  valor_total: number;
  created_at: string;
};

type DirectorioLookupEntry = {
  id: string;
  nombre: string;
  categoria: string;
  instagram: string | null;
};

type PrecioOcurrencia = {
  valorTotal: number;
  createdAt: string;
  bodaNombre: string;
};

const EMPTY_RESULT: SugerenciasBodasSimilaresResult = {
  categorias: [],
  bodasSimilaresCount: 0,
  criterio: "ninguno",
  estimadoTotal: 0,
  presupuestoLead: null,
  sinCriterios: false,
};

function withinRange(value: number, target: number, ratio: number): boolean {
  if (target <= 0) return false;
  return value >= target * (1 - ratio) && value <= target * (1 + ratio);
}

function categoriaKey(categoria: string): string {
  return normalizeProviderCategory(getBaseCategoria(categoria)).trim().toLowerCase();
}

/** Normaliza ciudad para comparación (minúsculas, sin acentos, espacios colapsados). */
export function normalizeCiudad(ciudad: string | null | undefined): string {
  if (!ciudad?.trim()) return "";
  return ciudad
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

function sameCiudad(
  a: string | null | undefined,
  b: string | null | undefined,
): boolean {
  const na = normalizeCiudad(a);
  const nb = normalizeCiudad(b);
  return Boolean(na && nb && na === nb);
}

/**
 * Promedio ponderado por ranking de recencia: tras ordenar created_at DESC,
 * pesos N, N-1, …, 1. Si hay una sola ocurrencia, devuelve ese precio.
 */
export function promedioPonderadoPorRecencia(
  ocurrencias: Array<{ valorTotal: number; createdAt: string }>,
): number {
  if (ocurrencias.length === 0) return 0;
  if (ocurrencias.length === 1) return ocurrencias[0].valorTotal;

  const sorted = [...ocurrencias].sort((a, b) =>
    b.createdAt.localeCompare(a.createdAt),
  );
  const n = sorted.length;
  let weightedSum = 0;
  let weightSum = 0;

  for (let i = 0; i < n; i++) {
    const weight = n - i;
    weightedSum += sorted[i].valorTotal * weight;
    weightSum += weight;
  }

  return weightSum > 0 ? weightedSum / weightSum : 0;
}

/**
 * Verde: precio ≤ promedio histórico de la categoría.
 * Amarillo: supera el promedio hasta +20%.
 * Rojo: supera el promedio en más de 20%.
 */
export function calcularIndicadorPresupuesto(
  precio: number,
  promedioCategoria: number,
): IndicadorPresupuesto {
  if (!(promedioCategoria > 0) || !(precio > 0)) return "verde";
  const ratio = precio / promedioCategoria;
  if (ratio <= 1) return "verde";
  if (ratio <= 1.2) return "amarillo";
  return "rojo";
}

type Evaluada = {
  boda: BodaCandidata;
  matchInvitados: boolean;
  matchPresupuesto: boolean;
  matchCiudad: boolean;
};

function evaluarCandidatas(
  candidatas: BodaCandidata[],
  criterios: {
    invitados: number | null;
    presupuesto: number | null;
    ciudad: string | null;
  },
  ratio: number,
): Evaluada[] {
  const tieneInvitados = criterios.invitados != null && criterios.invitados > 0;
  const tienePresupuesto =
    criterios.presupuesto != null && criterios.presupuesto > 0;
  const ciudadTarget = normalizeCiudad(criterios.ciudad);

  return candidatas.map((boda) => {
    const matchInvitados =
      tieneInvitados &&
      boda.num_invitados != null &&
      withinRange(boda.num_invitados, criterios.invitados as number, ratio);
    const matchPresupuesto =
      tienePresupuesto &&
      withinRange(boda.presupuesto, criterios.presupuesto as number, ratio);
    const matchCiudad =
      Boolean(ciudadTarget) && sameCiudad(boda.ciudad, criterios.ciudad);
    return { boda, matchInvitados, matchPresupuesto, matchCiudad };
  });
}

type NivelSimilitud =
  | "ciudad_ambos"
  | "ciudad_parcial"
  | "ciudad_invitados"
  | "ciudad_solo"
  | "nacional"
  | "invitados"
  | "presupuesto";

function filtrarPorNivel(
  evaluadas: Evaluada[],
  nivel: NivelSimilitud,
  opciones: {
    tieneInvitados: boolean;
    tienePresupuesto: boolean;
    tieneCiudad: boolean;
  },
): BodaCandidata[] {
  const { tieneInvitados, tienePresupuesto, tieneCiudad } = opciones;

  switch (nivel) {
    case "ciudad_ambos":
      if (!tieneCiudad || !tieneInvitados || !tienePresupuesto) return [];
      return evaluadas
        .filter((e) => e.matchCiudad && e.matchInvitados && e.matchPresupuesto)
        .map((e) => e.boda);
    case "ciudad_parcial":
      if (!tieneCiudad) return [];
      return evaluadas
        .filter(
          (e) =>
            e.matchCiudad &&
            ((tieneInvitados && e.matchInvitados) ||
              (tienePresupuesto && e.matchPresupuesto)),
        )
        .map((e) => e.boda);
    case "ciudad_invitados":
      if (!tieneCiudad || !tieneInvitados) return [];
      return evaluadas
        .filter((e) => e.matchCiudad && e.matchInvitados)
        .map((e) => e.boda);
    case "ciudad_solo":
      if (!tieneCiudad) return [];
      return evaluadas.filter((e) => e.matchCiudad).map((e) => e.boda);
    case "nacional":
      if (!tieneInvitados || !tienePresupuesto) return [];
      return evaluadas
        .filter((e) => e.matchInvitados && e.matchPresupuesto)
        .map((e) => e.boda);
    case "invitados":
      if (!tieneInvitados) return [];
      return evaluadas.filter((e) => e.matchInvitados).map((e) => e.boda);
    case "presupuesto":
      if (!tienePresupuesto) return [];
      return evaluadas.filter((e) => e.matchPresupuesto).map((e) => e.boda);
    default:
      return [];
  }
}

function primerMatchSuficiente(
  evaluadas: Evaluada[],
  intentos: Array<{ nivel: NivelSimilitud; criterio: CriterioSimilitud }>,
  flags: {
    tieneInvitados: boolean;
    tienePresupuesto: boolean;
    tieneCiudad: boolean;
  },
  options?: { aceptarUno?: boolean; forzarCriterio?: CriterioSimilitud },
): { bodas: BodaCandidata[]; criterio: CriterioSimilitud } | null {
  for (const intento of intentos) {
    const bodas = filtrarPorNivel(evaluadas, intento.nivel, flags);
    if (bodas.length >= MIN_BODAS_SIMILARES) {
      return {
        bodas,
        criterio: options?.forzarCriterio ?? intento.criterio,
      };
    }
    if (options?.aceptarUno && bodas.length > 0) {
      return {
        bodas,
        criterio: options.forzarCriterio ?? intento.criterio,
      };
    }
  }
  return null;
}

/**
 * Determina qué bodas son similares al lead, priorizando misma ciudad y
 * relajando criterios (±50%) si no hay suficientes matches.
 * Sin presupuesto, usa solo ciudad e invitados.
 */
export function seleccionarBodasSimilares(
  candidatas: BodaCandidata[],
  criterios: {
    invitados: number | null;
    presupuesto: number | null;
    ciudad?: string | null;
  },
): { bodas: BodaCandidata[]; criterio: CriterioSimilitud } {
  const tieneInvitados = criterios.invitados != null && criterios.invitados > 0;
  const tienePresupuesto =
    criterios.presupuesto != null && criterios.presupuesto > 0;
  const tieneCiudad = Boolean(normalizeCiudad(criterios.ciudad ?? null));
  const flags = { tieneInvitados, tienePresupuesto, tieneCiudad };

  if (!tieneInvitados && !tienePresupuesto && !tieneCiudad) {
    return { bodas: [], criterio: "ninguno" };
  }

  const criteriosNorm = {
    invitados: criterios.invitados,
    presupuesto: criterios.presupuesto,
    ciudad: criterios.ciudad ?? null,
  };

  const evaluadasEstrictas = evaluarCandidatas(
    candidatas,
    criteriosNorm,
    SIMILITUD_RATIO,
  );
  const evaluadasRelajadas = evaluarCandidatas(
    candidatas,
    criteriosNorm,
    SIMILITUD_RATIO_RELAJADO,
  );

  // Sin presupuesto: solo ciudad + invitados (sin filtrar por presupuesto).
  if (!tienePresupuesto) {
    const sinPresupuesto: Array<{
      nivel: NivelSimilitud;
      criterio: CriterioSimilitud;
    }> = [
      { nivel: "ciudad_invitados", criterio: "ciudad_invitados" },
      { nivel: "ciudad_solo", criterio: "ciudad" },
      { nivel: "invitados", criterio: "invitados" },
    ];

    const estricto = primerMatchSuficiente(
      evaluadasEstrictas,
      sinPresupuesto,
      flags,
    );
    if (estricto) return estricto;

    const relajado = primerMatchSuficiente(
      evaluadasRelajadas,
      sinPresupuesto,
      flags,
      { aceptarUno: true, forzarCriterio: "relajado" },
    );
    if (relajado) return relajado;

    return { bodas: [], criterio: "ninguno" };
  }

  const intentosEstrictos: Array<{
    nivel: NivelSimilitud;
    criterio: CriterioSimilitud;
  }> = [
    { nivel: "ciudad_ambos", criterio: "ciudad_ambos" },
    { nivel: "ciudad_parcial", criterio: "ciudad_parcial" },
    { nivel: "nacional", criterio: "nacional" },
  ];

  const estricto = primerMatchSuficiente(
    evaluadasEstrictas,
    intentosEstrictos,
    flags,
  );
  if (estricto) return estricto;

  const relajado = primerMatchSuficiente(
    evaluadasRelajadas,
    intentosEstrictos,
    flags,
    { aceptarUno: true, forzarCriterio: "relajado" },
  );
  if (relajado) return relajado;

  // Último recurso: un solo criterio (invitados o presupuesto) al ±50%.
  if (tieneInvitados) {
    const invitados = filtrarPorNivel(evaluadasRelajadas, "invitados", flags);
    const presupuesto = filtrarPorNivel(
      evaluadasRelajadas,
      "presupuesto",
      flags,
    );
    const unidos = new Map<string, BodaCandidata>();
    for (const boda of [...invitados, ...presupuesto]) {
      unidos.set(boda.id, boda);
    }
    const bodas = Array.from(unidos.values());
    return { bodas, criterio: bodas.length > 0 ? "relajado" : "ninguno" };
  }

  const bodas = filtrarPorNivel(evaluadasRelajadas, "presupuesto", flags);
  if (bodas.length === 0) {
    const estrictas = filtrarPorNivel(evaluadasEstrictas, "presupuesto", flags);
    return {
      bodas: estrictas,
      criterio: estrictas.length > 0 ? "presupuesto" : "ninguno",
    };
  }
  return { bodas, criterio: "relajado" };
}

/**
 * Agrupa proveedores contratados de bodas similares por categoría.
 * Devuelve hasta 3 opciones por categoría, ordenadas de menor a mayor precio.
 */
export function construirSugerenciasPorCategoria(
  bodasSimilares: BodaCandidata[],
  proveedores: ProveedorHistorial[],
  directorio: DirectorioLookupEntry[],
  presupuestoLead: number | null = null,
): SugerenciaBodaSimilarCategoria[] {
  if (bodasSimilares.length === 0) return [];

  const bodasById = new Map(bodasSimilares.map((b) => [b.id, b]));
  const directorioLookup = buildDirectorioLookup(directorio);
  const presupuesto =
    presupuestoLead != null && presupuestoLead > 0 ? presupuestoLead : null;

  type Bucket = {
    nombre: string;
    categoria: string;
    ocurrencias: PrecioOcurrencia[];
  };

  const porCategoria = new Map<string, Map<string, Bucket>>();

  for (const proveedor of proveedores) {
    const boda = bodasById.get(proveedor.boda_id);
    if (!boda) continue;

    const valorTotal = Number(proveedor.valor_total ?? 0);
    if (valorTotal <= 0) continue;

    const catKey = categoriaKey(proveedor.categoria);
    const nombreKey = proveedor.nombre.trim().toLowerCase();
    const dedupeKey = `${catKey}|${nombreKey}`;

    const categoriaMap = porCategoria.get(catKey) ?? new Map();
    const existing = categoriaMap.get(dedupeKey);

    const ocurrencia: PrecioOcurrencia = {
      valorTotal,
      createdAt: proveedor.created_at || "",
      bodaNombre: boda.nombre_pareja,
    };

    if (existing) {
      existing.ocurrencias.push(ocurrencia);
    } else {
      categoriaMap.set(dedupeKey, {
        nombre: proveedor.nombre.trim(),
        categoria: getBaseCategoria(proveedor.categoria),
        ocurrencias: [ocurrencia],
      });
    }
    porCategoria.set(catKey, categoriaMap);
  }

  return Array.from(porCategoria.values())
    .map((map) => {
      const bucketsConPrecio = Array.from(map.values())
        .map((bucket) => {
          const precio = promedioPonderadoPorRecencia(bucket.ocurrencias);
          if (precio <= 0) return null;
          return { bucket, precio };
        })
        .filter(
          (item): item is { bucket: Bucket; precio: number } => item != null,
        );

      if (bucketsConPrecio.length === 0) {
        return null;
      }

      const promedioCategoria =
        bucketsConPrecio.reduce((sum, item) => sum + item.precio, 0) /
        bucketsConPrecio.length;

      const proveedoresGrupo: SugerenciaBodaSimilarProveedor[] = bucketsConPrecio
        .map(({ bucket, precio }) => {
          const precioRedondeado = Math.round(precio);
          const masReciente = [...bucket.ocurrencias].sort((a, b) =>
            b.createdAt.localeCompare(a.createdAt),
          )[0];

          const directorioMatch = resolveDirectorioProveedorId(
            {
              nombre: bucket.nombre,
              categoria: bucket.categoria,
              valor_total: precioRedondeado,
            },
            directorioLookup,
          );

          const porcentaje_presupuesto =
            presupuesto != null
              ? Math.round((precioRedondeado / presupuesto) * 1000) / 10
              : null;

          return {
            directorio_proveedor_id: directorioMatch?.id ?? null,
            nombre_proveedor: bucket.nombre,
            categoria: bucket.categoria,
            precio_historico: precioRedondeado,
            boda_referencia: masReciente?.bodaNombre ?? "",
            instagram: directorioMatch?.instagram ?? null,
            porcentaje_presupuesto,
            indicador:
              presupuesto != null
                ? calcularIndicadorPresupuesto(
                    precioRedondeado,
                    promedioCategoria,
                  )
                : null,
          } satisfies SugerenciaBodaSimilarProveedor;
        })
        .sort((a, b) => a.precio_historico - b.precio_historico)
        .slice(0, MAX_PROVEEDORES_POR_CATEGORIA);

      return {
        categoria: proveedoresGrupo[0]?.categoria ?? "",
        promedio_categoria: Math.round(promedioCategoria),
        proveedores: proveedoresGrupo,
      } satisfies SugerenciaBodaSimilarCategoria;
    })
    .filter((group): group is SugerenciaBodaSimilarCategoria => group != null)
    .filter((group) => group.proveedores.length > 0)
    .sort((a, b) => a.categoria.localeCompare(b.categoria, "es"));
}

/** Suma el precio más bajo de cada categoría. */
export function calcularEstimadoTotal(
  categorias: SugerenciaBodaSimilarCategoria[],
): number {
  return categorias.reduce((sum, categoria) => {
    const masBarato = categoria.proveedores[0];
    return sum + (masBarato?.precio_historico ?? 0);
  }, 0);
}

export async function fetchSugerenciasBodasSimilares(
  supabase: SupabaseClient,
  lead: Pick<LeadRow, "cantidad_invitados" | "presupuesto_estimado" | "ciudad">,
): Promise<SugerenciasBodasSimilaresResult> {
  const [{ data: bodasData }, { data: proveedoresData }, { data: directorioData }] =
    await Promise.all([
      supabase
        .from("bodas")
        .select("id, nombre_pareja, num_invitados, ciudad, estado")
        .neq("estado", "cancelada"),
      supabase
        .from("proveedores")
        .select("boda_id, nombre, categoria, valor_total, created_at")
        .eq("estado", "contratado")
        .gt("valor_total", 0)
        .order("created_at", { ascending: false }),
      supabase
        .from("directorio_proveedores")
        .select("id, nombre, categoria, instagram")
        .eq("activo", true),
    ]);

  const proveedores = (proveedoresData ?? []) as ProveedorHistorial[];

  const presupuestoPorBoda = new Map<string, number>();
  for (const proveedor of proveedores) {
    presupuestoPorBoda.set(
      proveedor.boda_id,
      (presupuestoPorBoda.get(proveedor.boda_id) ?? 0) +
        Number(proveedor.valor_total ?? 0),
    );
  }

  const candidatas: BodaCandidata[] = (
    (bodasData ?? []) as {
      id: string;
      nombre_pareja: string;
      num_invitados: number | null;
      ciudad: string | null;
    }[]
  ).map((boda) => ({
    id: boda.id,
    nombre_pareja: boda.nombre_pareja,
    num_invitados: boda.num_invitados,
    presupuesto: presupuestoPorBoda.get(boda.id) ?? 0,
    ciudad: boda.ciudad ?? null,
  }));

  const presupuestoLead =
    lead.presupuesto_estimado != null && lead.presupuesto_estimado > 0
      ? lead.presupuesto_estimado
      : null;
  const tieneInvitados =
    lead.cantidad_invitados != null && lead.cantidad_invitados > 0;
  const tieneCiudad = Boolean(normalizeCiudad(lead.ciudad));
  const sinCriterios =
    !presupuestoLead && !tieneInvitados && !tieneCiudad;

  if (sinCriterios) {
    return { ...EMPTY_RESULT, presupuestoLead, sinCriterios: true };
  }

  const { bodas: bodasSimilares, criterio } = seleccionarBodasSimilares(
    candidatas,
    {
      invitados: lead.cantidad_invitados,
      presupuesto: presupuestoLead,
      ciudad: lead.ciudad ?? null,
    },
  );

  if (bodasSimilares.length === 0) {
    return { ...EMPTY_RESULT, presupuestoLead, sinCriterios: false };
  }

  const categorias = construirSugerenciasPorCategoria(
    bodasSimilares,
    proveedores,
    (directorioData ?? []) as DirectorioLookupEntry[],
    presupuestoLead,
  );

  if (categorias.length === 0) {
    return { ...EMPTY_RESULT, presupuestoLead, sinCriterios: false };
  }

  return {
    categorias,
    bodasSimilaresCount: bodasSimilares.length,
    criterio,
    estimadoTotal: calcularEstimadoTotal(categorias),
    presupuestoLead,
    sinCriterios: false,
  };
}

/** Aplana el resultado en filas listas para insertar en proveedores_sugeridos. */
export function sugerenciasBodasSimilaresToInsertItems(
  result: SugerenciasBodasSimilaresResult,
): Array<{
  directorio_proveedor_id: string | null;
  nombre_proveedor: string;
  categoria: string;
  instagram: string | null;
  orden: number;
}> {
  const items: Array<{
    directorio_proveedor_id: string | null;
    nombre_proveedor: string;
    categoria: string;
    instagram: string | null;
    orden: number;
  }> = [];

  for (const categoria of result.categorias) {
    categoria.proveedores.forEach((proveedor, index) => {
      items.push({
        directorio_proveedor_id: proveedor.directorio_proveedor_id,
        nombre_proveedor: proveedor.nombre_proveedor,
        categoria: proveedor.categoria,
        instagram: proveedor.instagram,
        orden: index,
      });
    });
  }

  return items;
}
