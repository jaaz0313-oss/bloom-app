import type { SupabaseClient } from "@supabase/supabase-js";
import type { LeadRow } from "@/app/data/leads";
import {
  buildDirectorioLookup,
  resolveDirectorioProveedorId,
} from "@/lib/proveedores-sugeridos-automaticos";
import { getBaseCategoria, normalizeProviderCategory } from "@/lib/provider-categories";

/** Tolerancia de similitud (±30%) para invitados y presupuesto. */
export const SIMILITUD_RATIO = 0.3;

/** Mínimo de bodas que deben coincidir antes de relajar el criterio. */
export const MIN_BODAS_SIMILARES = 2;

export type CriterioSimilitud =
  | "ciudad_ambos"
  | "ciudad_parcial"
  | "ambos"
  | "invitados"
  | "presupuesto"
  | "ninguno";

export type SugerenciaBodaSimilarProveedor = {
  directorio_proveedor_id: string | null;
  nombre_proveedor: string;
  categoria: string;
  precio_historico: number;
  boda_referencia: string;
  instagram: string | null;
};

export type SugerenciaBodaSimilarCategoria = {
  categoria: string;
  proveedores: SugerenciaBodaSimilarProveedor[];
};

export type SugerenciasBodasSimilaresResult = {
  categorias: SugerenciaBodaSimilarCategoria[];
  bodasSimilaresCount: number;
  criterio: CriterioSimilitud;
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
};

function withinRange(value: number, target: number, ratio = SIMILITUD_RATIO): boolean {
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
): Evaluada[] {
  const tieneInvitados = criterios.invitados != null && criterios.invitados > 0;
  const tienePresupuesto = criterios.presupuesto != null && criterios.presupuesto > 0;
  const ciudadTarget = normalizeCiudad(criterios.ciudad);

  return candidatas.map((boda) => {
    const matchInvitados =
      tieneInvitados &&
      boda.num_invitados != null &&
      withinRange(boda.num_invitados, criterios.invitados as number);
    const matchPresupuesto =
      tienePresupuesto &&
      withinRange(boda.presupuesto, criterios.presupuesto as number);
    const matchCiudad = Boolean(ciudadTarget) && sameCiudad(boda.ciudad, criterios.ciudad);
    return { boda, matchInvitados, matchPresupuesto, matchCiudad };
  });
}

/**
 * Determina qué bodas son similares al lead, priorizando misma ciudad y
 * relajando criterios si no hay suficientes matches.
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
  const tienePresupuesto = criterios.presupuesto != null && criterios.presupuesto > 0;
  const tieneCiudad = Boolean(normalizeCiudad(criterios.ciudad ?? null));

  if (!tieneInvitados && !tienePresupuesto) {
    return { bodas: [], criterio: "ninguno" };
  }

  const evaluadas = evaluarCandidatas(candidatas, {
    invitados: criterios.invitados,
    presupuesto: criterios.presupuesto,
    ciudad: criterios.ciudad ?? null,
  });

  if (tieneCiudad) {
    // Prioridad 1: misma ciudad + invitados + presupuesto (si ambos están).
    if (tieneInvitados && tienePresupuesto) {
      const ciudadAmbos = evaluadas
        .filter((e) => e.matchCiudad && e.matchInvitados && e.matchPresupuesto)
        .map((e) => e.boda);

      if (ciudadAmbos.length >= MIN_BODAS_SIMILARES) {
        return { bodas: ciudadAmbos, criterio: "ciudad_ambos" };
      }
    }

    // Prioridad 2: misma ciudad + al menos uno de invitados/presupuesto.
    const ciudadParcial = evaluadas
      .filter(
        (e) =>
          e.matchCiudad &&
          ((tieneInvitados && e.matchInvitados) ||
            (tienePresupuesto && e.matchPresupuesto)),
      )
      .map((e) => e.boda);

    if (ciudadParcial.length >= MIN_BODAS_SIMILARES) {
      return { bodas: ciudadParcial, criterio: "ciudad_parcial" };
    }
  }

  // Prioridad 3 (fallback nacional): si no hay suficientes bodas en la misma ciudad.
  if (tieneInvitados && tienePresupuesto) {
    const ambos = evaluadas
      .filter((e) => e.matchInvitados && e.matchPresupuesto)
      .map((e) => e.boda);

    if (ambos.length >= MIN_BODAS_SIMILARES) {
      return { bodas: ambos, criterio: "ambos" };
    }

    const alguno = evaluadas
      .filter((e) => e.matchInvitados || e.matchPresupuesto)
      .map((e) => e.boda);

    return { bodas: alguno, criterio: alguno.length > 0 ? "ambos" : "ninguno" };
  }

  if (tieneInvitados) {
    const bodas = evaluadas.filter((e) => e.matchInvitados).map((e) => e.boda);
    return { bodas, criterio: bodas.length > 0 ? "invitados" : "ninguno" };
  }

  const bodas = evaluadas.filter((e) => e.matchPresupuesto).map((e) => e.boda);
  return { bodas, criterio: bodas.length > 0 ? "presupuesto" : "ninguno" };
}

/**
 * Agrupa proveedores contratados de bodas similares por categoría.
 * Si un proveedor aparece varias veces, el precio es el promedio ponderado
 * por recencia (más reciente = más peso).
 */
export function construirSugerenciasPorCategoria(
  bodasSimilares: BodaCandidata[],
  proveedores: ProveedorHistorial[],
  directorio: DirectorioLookupEntry[],
): SugerenciaBodaSimilarCategoria[] {
  if (bodasSimilares.length === 0) return [];

  const bodasById = new Map(bodasSimilares.map((b) => [b.id, b]));
  const directorioLookup = buildDirectorioLookup(directorio);

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
      const proveedoresGrupo: SugerenciaBodaSimilarProveedor[] = Array.from(
        map.values(),
      )
        .map((bucket) => {
          const precio = promedioPonderadoPorRecencia(bucket.ocurrencias);
          if (precio <= 0) return null;

          const masReciente = [...bucket.ocurrencias].sort((a, b) =>
            b.createdAt.localeCompare(a.createdAt),
          )[0];

          const directorioMatch = resolveDirectorioProveedorId(
            {
              nombre: bucket.nombre,
              categoria: bucket.categoria,
              valor_total: Math.round(precio),
            },
            directorioLookup,
          );

          return {
            directorio_proveedor_id: directorioMatch?.id ?? null,
            nombre_proveedor: bucket.nombre,
            categoria: bucket.categoria,
            precio_historico: Math.round(precio),
            boda_referencia: masReciente?.bodaNombre ?? "",
            instagram: directorioMatch?.instagram ?? null,
          } satisfies SugerenciaBodaSimilarProveedor;
        })
        .filter((p): p is SugerenciaBodaSimilarProveedor => p != null)
        .sort((a, b) => a.nombre_proveedor.localeCompare(b.nombre_proveedor, "es"));

      return {
        categoria: proveedoresGrupo[0]?.categoria ?? "",
        proveedores: proveedoresGrupo,
      };
    })
    .filter((group) => group.proveedores.length > 0)
    .sort((a, b) => a.categoria.localeCompare(b.categoria, "es"));
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
      (presupuestoPorBoda.get(proveedor.boda_id) ?? 0) + Number(proveedor.valor_total ?? 0),
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

  const { bodas: bodasSimilares, criterio } = seleccionarBodasSimilares(candidatas, {
    invitados: lead.cantidad_invitados,
    presupuesto: lead.presupuesto_estimado,
    ciudad: lead.ciudad ?? null,
  });

  if (bodasSimilares.length === 0) {
    return EMPTY_RESULT;
  }

  const categorias = construirSugerenciasPorCategoria(
    bodasSimilares,
    proveedores,
    (directorioData ?? []) as DirectorioLookupEntry[],
  );

  if (categorias.length === 0) {
    return EMPTY_RESULT;
  }

  return {
    categorias,
    bodasSimilaresCount: bodasSimilares.length,
    criterio,
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
