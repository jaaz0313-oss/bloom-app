import type { DirectorioProveedorRow } from "@/app/data/directorio";
import type { ProveedorRow } from "@/app/data/providers";
import {
  getMaxProveedorSugeridoRonda,
  type ProveedorSugeridoRow,
} from "@/app/data/proveedores-sugeridos";
import { getClienteCotizacionContext } from "@/lib/cliente-cotizacion";
import {
  getBaseCategoria,
  normalizeProviderCategory,
} from "@/lib/provider-categories";
import type { SupabaseClient } from "@supabase/supabase-js";

export type CategoriaPresupuestoInput = {
  categoria: string;
  precio_estimado: number;
};

export type SugerenciaAutomaticaProveedor = {
  directorio_proveedor_id: string;
  nombre_proveedor: string;
  categoria: string;
  instagram: string | null;
  valor_promedio: number;
  veces_usado: number;
};

export type SugerenciaAutomaticaCategoria = {
  categoria: string;
  precio_estimado: number;
  sugerencias: SugerenciaAutomaticaProveedor[];
  sin_historial: boolean;
};

export type SugerenciasAutomaticasResult = {
  categorias: SugerenciaAutomaticaCategoria[];
  ronda_propuesta: number;
};

export type SugerenciaPreviewItem = {
  key: string;
  directorio_proveedor_id: string | null;
  nombre_proveedor: string;
  categoria: string;
  instagram: string | null;
  valor_promedio: number | null;
  veces_usado: number | null;
};

type DirectorioLookup = Pick<
  DirectorioProveedorRow,
  "id" | "nombre" | "categoria" | "instagram"
>;

type HistorialProveedor = Pick<
  ProveedorRow,
  "nombre" | "categoria" | "valor_total"
>;

const PRESUPUESTO_MIN_RATIO = 0.7;
const PRESUPUESTO_MAX_RATIO = 1.3;
const MAX_SUGERENCIAS_POR_CATEGORIA = 3;

function normalizeCategoriaKey(categoria: string): string {
  return normalizeProviderCategory(getBaseCategoria(categoria)).trim().toLowerCase();
}

function buildDirectorioKey(nombre: string, categoria: string): string {
  return `${normalizeCategoriaKey(categoria)}|${nombre.trim().toLowerCase()}`;
}

export function buildDirectorioLookup(
  directorio: DirectorioLookup[],
): Map<string, DirectorioLookup> {
  const map = new Map<string, DirectorioLookup>();

  for (const proveedor of directorio) {
    const key = buildDirectorioKey(proveedor.nombre, proveedor.categoria);
    if (!map.has(key)) {
      map.set(key, proveedor);
    }
  }

  return map;
}

export function resolveDirectorioProveedorId(
  proveedor: HistorialProveedor,
  directorioLookup: Map<string, DirectorioLookup>,
): DirectorioLookup | null {
  const exactKey = buildDirectorioKey(proveedor.nombre, proveedor.categoria);
  const exact = directorioLookup.get(exactKey);
  if (exact) return exact;

  const targetCategory = normalizeCategoriaKey(proveedor.categoria);
  const nombre = proveedor.nombre.trim().toLowerCase();

  for (const [key, entry] of directorioLookup.entries()) {
    if (
      key === `${targetCategory}|${nombre}` ||
      (key.endsWith(`|${nombre}`) &&
        normalizeCategoriaKey(entry.categoria) === targetCategory)
    ) {
      return entry;
    }
  }

  return null;
}

type ProveedorHistorialStats = {
  directorio_proveedor_id: string;
  nombre_proveedor: string;
  categoria: string;
  instagram: string | null;
  valor_total_sum: number;
  veces_usado: number;
};

export function generarSugerenciasAutomaticas(
  categorias: CategoriaPresupuestoInput[],
  historial: HistorialProveedor[],
  directorio: DirectorioLookup[],
): SugerenciaAutomaticaCategoria[] {
  const directorioLookup = buildDirectorioLookup(directorio);

  return categorias.map((categoriaInput) => {
    const categoriaKey = normalizeCategoriaKey(categoriaInput.categoria);
    const presupuesto = Number(categoriaInput.precio_estimado ?? 0);
    const minValor = presupuesto * PRESUPUESTO_MIN_RATIO;
    const maxValor = presupuesto * PRESUPUESTO_MAX_RATIO;

    const stats = new Map<string, ProveedorHistorialStats>();

    for (const proveedor of historial) {
      if (normalizeCategoriaKey(proveedor.categoria) !== categoriaKey) {
        continue;
      }

      const valorTotal = Number(proveedor.valor_total ?? 0);
      if (valorTotal <= 0) continue;

      const directorioMatch = resolveDirectorioProveedorId(
        proveedor,
        directorioLookup,
      );
      if (!directorioMatch) continue;

      const current = stats.get(directorioMatch.id) ?? {
        directorio_proveedor_id: directorioMatch.id,
        nombre_proveedor: directorioMatch.nombre,
        categoria: categoriaInput.categoria,
        instagram: directorioMatch.instagram,
        valor_total_sum: 0,
        veces_usado: 0,
      };

      current.valor_total_sum += valorTotal;
      current.veces_usado += 1;
      stats.set(directorioMatch.id, current);
    }

    const sugerencias = Array.from(stats.values())
      .map((entry) => ({
        directorio_proveedor_id: entry.directorio_proveedor_id,
        nombre_proveedor: entry.nombre_proveedor,
        categoria: categoriaInput.categoria,
        instagram: entry.instagram,
        valor_promedio: entry.valor_total_sum / entry.veces_usado,
        veces_usado: entry.veces_usado,
      }))
      .filter(
        (entry) =>
          presupuesto <= 0 ||
          (entry.valor_promedio >= minValor && entry.valor_promedio <= maxValor),
      )
      .sort((a, b) => {
        if (b.veces_usado !== a.veces_usado) {
          return b.veces_usado - a.veces_usado;
        }
        return a.valor_promedio - b.valor_promedio;
      })
      .slice(0, MAX_SUGERENCIAS_POR_CATEGORIA);

    return {
      categoria: categoriaInput.categoria,
      precio_estimado: presupuesto,
      sugerencias,
      sin_historial: sugerencias.length === 0,
    };
  });
}

export function sugerenciasAutomaticasToPreview(
  result: SugerenciasAutomaticasResult,
): Array<{
  categoria: string;
  precio_estimado: number;
  sin_historial: boolean;
  items: SugerenciaPreviewItem[];
}> {
  return result.categorias.map((categoria) => ({
    categoria: categoria.categoria,
    precio_estimado: categoria.precio_estimado,
    sin_historial: categoria.sin_historial,
    items: categoria.sugerencias.map((sugerencia) => ({
      key: crypto.randomUUID(),
      directorio_proveedor_id: sugerencia.directorio_proveedor_id,
      nombre_proveedor: sugerencia.nombre_proveedor,
      categoria: sugerencia.categoria,
      instagram: sugerencia.instagram,
      valor_promedio: sugerencia.valor_promedio,
      veces_usado: sugerencia.veces_usado,
    })),
  }));
}

export async function fetchSugerenciasAutomaticasParaBoda(
  supabase: SupabaseClient,
  bodaId: string,
  existingSugeridos: Pick<ProveedorSugeridoRow, "ronda">[] = [],
): Promise<SugerenciasAutomaticasResult | { error: string }> {
  const cotizacionContext = await getClienteCotizacionContext(supabase, bodaId);

  if (!cotizacionContext) {
    return {
      error:
        "No hay cotización vinculada a esta boda. Agrega una cotización al lead para sugerir proveedores.",
    };
  }

  const categorias: CategoriaPresupuestoInput[] = cotizacionContext.items
    .filter((item) => item.incluido)
    .map((item) => ({
      categoria: item.categoria,
      precio_estimado: Number(item.precio_estimado ?? 0),
    }));

  if (categorias.length === 0) {
    return {
      error: "La cotización no tiene categorías incluidas para sugerir proveedores.",
    };
  }

  const [{ data: historialData }, { data: directorioData }] = await Promise.all([
    supabase
      .from("proveedores")
      .select("nombre, categoria, valor_total")
      .neq("boda_id", bodaId)
      .eq("estado", "contratado")
      .gt("valor_total", 0),
    supabase
      .from("directorio_proveedores")
      .select("id, nombre, categoria, instagram")
      .eq("activo", true),
  ]);

  const categoriasResult = generarSugerenciasAutomaticas(
    categorias,
    (historialData ?? []) as HistorialProveedor[],
    (directorioData ?? []) as DirectorioLookup[],
  );

  const rondaBase = getMaxProveedorSugeridoRonda(existingSugeridos);
  const ronda_propuesta =
    existingSugeridos.length > 0 ? rondaBase + 1 : rondaBase;

  return {
    categorias: categoriasResult,
    ronda_propuesta,
  };
}
