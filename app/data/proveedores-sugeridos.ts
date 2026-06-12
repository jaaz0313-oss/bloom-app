import type { SupabaseClient } from "@supabase/supabase-js";

export type ProveedorSugeridoRow = {
  id: string;
  boda_id: string;
  directorio_proveedor_id: string | null;
  nombre_proveedor: string;
  categoria: string;
  instagram: string | null;
  ronda: number;
  orden: number;
  created_by: string | null;
  created_at: string;
};

export type ProveedorSugeridoSeleccionRow = {
  id: string;
  proveedor_sugerido_id: string;
  boda_id: string;
  seleccionado: boolean;
  updated_at: string;
};

export type ProveedorSugeridoWithSelection = ProveedorSugeridoRow & {
  seleccionado: boolean;
};

export function normalizeProveedorSugeridoRow(
  row: ProveedorSugeridoRow,
): ProveedorSugeridoRow {
  return {
    ...row,
    ronda: Number(row.ronda ?? 1),
    orden: Number(row.orden ?? 0),
  };
}

export function mergeProveedoresSugeridosWithSeleccion(
  sugeridos: ProveedorSugeridoRow[],
  selecciones: ProveedorSugeridoSeleccionRow[],
): ProveedorSugeridoWithSelection[] {
  const seleccionByProveedor = new Map(
    selecciones.map((row) => [row.proveedor_sugerido_id, row.seleccionado]),
  );

  return sugeridos.map((row) => ({
    ...normalizeProveedorSugeridoRow(row),
    seleccionado: seleccionByProveedor.get(row.id) ?? false,
  }));
}

export function sortProveedoresSugeridos(
  items: ProveedorSugeridoWithSelection[],
): ProveedorSugeridoWithSelection[] {
  return [...items].sort((a, b) => {
    if (a.ronda !== b.ronda) return a.ronda - b.ronda;
    const categoryCompare = a.categoria.localeCompare(b.categoria, "es");
    if (categoryCompare !== 0) return categoryCompare;
    if (a.orden !== b.orden) return a.orden - b.orden;
    return a.nombre_proveedor.localeCompare(b.nombre_proveedor, "es");
  });
}

export function getMaxProveedorSugeridoRonda(
  items: Pick<ProveedorSugeridoRow, "ronda">[],
): number {
  if (items.length === 0) return 1;
  return Math.max(...items.map((item) => Number(item.ronda ?? 1)));
}

export function countProveedoresSugeridosSeleccionados(
  items: ProveedorSugeridoWithSelection[],
): number {
  return items.filter((item) => item.seleccionado).length;
}

export async function fetchProveedoresSugeridosForBoda(
  supabase: SupabaseClient,
  bodaId: string,
): Promise<ProveedorSugeridoWithSelection[]> {
  const [{ data: sugeridosData }, { data: seleccionesData }] = await Promise.all([
    supabase
      .from("proveedores_sugeridos")
      .select("*")
      .eq("boda_id", bodaId),
    supabase
      .from("proveedores_sugeridos_seleccion")
      .select("*")
      .eq("boda_id", bodaId),
  ]);

  return sortProveedoresSugeridos(
    mergeProveedoresSugeridosWithSeleccion(
      (sugeridosData ?? []) as ProveedorSugeridoRow[],
      (seleccionesData ?? []) as ProveedorSugeridoSeleccionRow[],
    ),
  );
}
