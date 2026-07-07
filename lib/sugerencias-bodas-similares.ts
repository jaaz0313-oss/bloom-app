import type { SupabaseClient } from "@supabase/supabase-js";
import type { LeadRow } from "@/app/data/leads";
import {
  buildDirectorioLookup,
  resolveDirectorioProveedorId,
} from "@/lib/proveedores-sugeridos-automaticos";
import { getBaseCategoria, normalizeProviderCategory } from "@/lib/provider-categories";

/** Tolerancia de similitud (±30%) para invitados y presupuesto. */
export const SIMILITUD_RATIO = 0.3;

/** Mínimo de bodas que deben coincidir con ambos criterios antes de relajar. */
export const MIN_BODAS_SIMILARES = 2;

export type CriterioSimilitud =
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
};

type ProveedorHistorial = {
  boda_id: string;
  nombre: string;
  categoria: string;
  valor_total: number;
};

type DirectorioLookupEntry = {
  id: string;
  nombre: string;
  categoria: string;
  instagram: string | null;
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

/**
 * Determina qué bodas son similares al lead. Si hay suficientes coincidencias
 * con ambos criterios se usan esas; de lo contrario se relaja a coincidir con
 * al menos uno de los dos.
 */
export function seleccionarBodasSimilares(
  candidatas: BodaCandidata[],
  criterios: { invitados: number | null; presupuesto: number | null },
): { bodas: BodaCandidata[]; criterio: CriterioSimilitud } {
  const tieneInvitados = criterios.invitados != null && criterios.invitados > 0;
  const tienePresupuesto = criterios.presupuesto != null && criterios.presupuesto > 0;

  if (!tieneInvitados && !tienePresupuesto) {
    return { bodas: [], criterio: "ninguno" };
  }

  const evaluadas = candidatas.map((boda) => {
    const matchInvitados =
      tieneInvitados &&
      boda.num_invitados != null &&
      withinRange(boda.num_invitados, criterios.invitados as number);
    const matchPresupuesto =
      tienePresupuesto && withinRange(boda.presupuesto, criterios.presupuesto as number);
    return { boda, matchInvitados, matchPresupuesto };
  });

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
 * Agrupa los proveedores contratados de las bodas similares por categoría,
 * evitando duplicados por (categoría, proveedor).
 */
export function construirSugerenciasPorCategoria(
  bodasSimilares: BodaCandidata[],
  proveedores: ProveedorHistorial[],
  directorio: DirectorioLookupEntry[],
): SugerenciaBodaSimilarCategoria[] {
  if (bodasSimilares.length === 0) return [];

  const bodasById = new Map(bodasSimilares.map((b) => [b.id, b]));
  const directorioLookup = buildDirectorioLookup(directorio);

  const porCategoria = new Map<string, Map<string, SugerenciaBodaSimilarProveedor>>();

  for (const proveedor of proveedores) {
    const boda = bodasById.get(proveedor.boda_id);
    if (!boda) continue;

    const valorTotal = Number(proveedor.valor_total ?? 0);
    if (valorTotal <= 0) continue;

    const catKey = categoriaKey(proveedor.categoria);
    const nombreKey = proveedor.nombre.trim().toLowerCase();
    const dedupeKey = `${catKey}|${nombreKey}`;

    const categoriaMap = porCategoria.get(catKey) ?? new Map();
    if (categoriaMap.has(dedupeKey)) {
      porCategoria.set(catKey, categoriaMap);
      continue;
    }

    const directorioMatch = resolveDirectorioProveedorId(
      { nombre: proveedor.nombre, categoria: proveedor.categoria, valor_total: valorTotal },
      directorioLookup,
    );

    categoriaMap.set(dedupeKey, {
      directorio_proveedor_id: directorioMatch?.id ?? null,
      nombre_proveedor: proveedor.nombre.trim(),
      categoria: getBaseCategoria(proveedor.categoria),
      precio_historico: valorTotal,
      boda_referencia: boda.nombre_pareja,
      instagram: directorioMatch?.instagram ?? null,
    });
    porCategoria.set(catKey, categoriaMap);
  }

  return Array.from(porCategoria.values())
    .map((map) => {
      const proveedores = Array.from(map.values()).sort((a, b) =>
        a.nombre_proveedor.localeCompare(b.nombre_proveedor, "es"),
      );
      return {
        categoria: proveedores[0]?.categoria ?? "",
        proveedores,
      };
    })
    .filter((group) => group.proveedores.length > 0)
    .sort((a, b) => a.categoria.localeCompare(b.categoria, "es"));
}

export async function fetchSugerenciasBodasSimilares(
  supabase: SupabaseClient,
  lead: Pick<LeadRow, "cantidad_invitados" | "presupuesto_estimado">,
): Promise<SugerenciasBodasSimilaresResult> {
  const [{ data: bodasData }, { data: proveedoresData }, { data: directorioData }] =
    await Promise.all([
      supabase
        .from("bodas")
        .select("id, nombre_pareja, num_invitados, estado")
        .neq("estado", "cancelada"),
      supabase
        .from("proveedores")
        .select("boda_id, nombre, categoria, valor_total")
        .eq("estado", "contratado")
        .gt("valor_total", 0),
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
    }[]
  ).map((boda) => ({
    id: boda.id,
    nombre_pareja: boda.nombre_pareja,
    num_invitados: boda.num_invitados,
    presupuesto: presupuestoPorBoda.get(boda.id) ?? 0,
  }));

  const { bodas: bodasSimilares, criterio } = seleccionarBodasSimilares(candidatas, {
    invitados: lead.cantidad_invitados,
    presupuesto: lead.presupuesto_estimado,
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
