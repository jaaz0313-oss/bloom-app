import type { CotizacionItemRow } from "@/app/data/cotizaciones";
import type { DirectorioProveedorRow } from "@/app/data/directorio";
import type { SupabaseClient } from "@supabase/supabase-js";

export type ImportCotizacionResult =
  | { ok: true; imported: number }
  | { ok: false; message: string };

export async function importarCotizacionLeadABoda(
  supabase: SupabaseClient,
  leadId: string,
  bodaId: string,
): Promise<ImportCotizacionResult> {
  const { data: cotizacion, error: cotError } = await supabase
    .from("cotizaciones")
    .select("id")
    .eq("lead_id", leadId)
    .neq("estado", "rechazada")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (cotError) {
    return { ok: false, message: cotError.message };
  }

  if (!cotizacion) {
    return { ok: true, imported: 0 };
  }

  const { data: items, error: itemsError } = await supabase
    .from("cotizacion_items")
    .select("*")
    .eq("cotizacion_id", cotizacion.id)
    .eq("incluido", true);

  if (itemsError) {
    return { ok: false, message: itemsError.message };
  }

  const typedItems = (items ?? []) as CotizacionItemRow[];
  if (typedItems.length === 0) {
    return { ok: true, imported: 0 };
  }

  const directorioIds = [
    ...new Set(
      typedItems
        .map((item) => item.proveedor_sugerido_id)
        .filter((id): id is string => Boolean(id)),
    ),
  ];

  const directorioMap = new Map<string, DirectorioProveedorRow>();

  if (directorioIds.length > 0) {
    const { data: directorio, error: dirError } = await supabase
      .from("directorio_proveedores")
      .select("*")
      .in("id", directorioIds);

    if (dirError) {
      return { ok: false, message: dirError.message };
    }

    for (const proveedor of (directorio ?? []) as DirectorioProveedorRow[]) {
      directorioMap.set(proveedor.id, proveedor);
    }
  }

  const proveedoresPayload = typedItems.map((item) => {
    const dir = item.proveedor_sugerido_id
      ? directorioMap.get(item.proveedor_sugerido_id)
      : null;

    const nombre = dir?.nombre?.trim() || `Por definir - ${item.categoria}`;
    const valorTotal =
      item.precio_estimado != null && item.precio_estimado >= 0
        ? item.precio_estimado
        : 0;

    const base = {
      boda_id: bodaId,
      nombre,
      categoria: item.categoria,
      valor_total: valorTotal,
      anticipo: 0,
      estado: "pendiente" as const,
      notas: item.notas_internas?.trim() || null,
    };

    if (!dir) {
      return base;
    }

    return {
      ...base,
      banco: dir.banco,
      tipo_cuenta: dir.tipo_cuenta,
      numero_cuenta: dir.numero_cuenta,
      titular_cuenta: dir.titular,
      telefono: dir.telefono,
      email: dir.email,
    };
  });

  const { error: insertError } = await supabase
    .from("proveedores")
    .insert(proveedoresPayload);

  if (insertError) {
    return { ok: false, message: insertError.message };
  }

  return { ok: true, imported: proveedoresPayload.length };
}
