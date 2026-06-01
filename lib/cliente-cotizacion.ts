import type { CotizacionItemRow, CotizacionRow } from "@/app/data/cotizaciones";
import type { SupabaseClient } from "@supabase/supabase-js";

export type ClienteCotizacionBoda = {
  id: string;
  lead_id: string | null;
  nombre_pareja: string;
  fecha_boda: string;
  ciudad: string;
};

export type ClienteCotizacionContext = {
  boda: ClienteCotizacionBoda;
  cotizacion: CotizacionRow;
  items: CotizacionItemRow[];
};

export async function getClienteCotizacionContext(
  supabase: SupabaseClient,
  bodaId: string,
): Promise<ClienteCotizacionContext | null> {
  const { data: boda, error: bodaError } = await supabase
    .from("bodas")
    .select("id, lead_id, nombre_pareja, fecha_boda, ciudad")
    .eq("id", bodaId)
    .maybeSingle();

  if (bodaError || !boda?.lead_id) {
    return null;
  }

  const bodaRow = boda as ClienteCotizacionBoda;

  const { data: cotizacion, error: cotError } = await supabase
    .from("cotizaciones")
    .select("*")
    .eq("lead_id", bodaRow.lead_id)
    .neq("estado", "rechazada")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (cotError || !cotizacion) {
    return null;
  }

  const { data: items, error: itemsError } = await supabase
    .from("cotizacion_items")
    .select("id, cotizacion_id, categoria, descripcion, precio_estimado, incluido")
    .eq("cotizacion_id", cotizacion.id)
    .eq("incluido", true)
    .order("categoria", { ascending: true });

  if (itemsError || !items?.length) {
    return null;
  }

  return {
    boda: bodaRow,
    cotizacion: cotizacion as CotizacionRow,
    items: items as CotizacionItemRow[],
  };
}

export function hasClienteCotizacionDisponible(
  context: ClienteCotizacionContext | null,
): boolean {
  return context != null && context.items.length > 0;
}
