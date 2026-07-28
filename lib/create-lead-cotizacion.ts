import type { LeadRow } from "@/app/data/leads";
import { PROVIDER_CATEGORIES } from "@/lib/provider-categories";
import type { SupabaseClient } from "@supabase/supabase-js";

export async function createCotizacionForLead(
  supabase: SupabaseClient,
  lead: LeadRow,
  createdBy?: string | null,
): Promise<{ id: string } | { error: string }> {
  const { data: cotizacion, error: cotError } = await supabase
    .from("cotizaciones")
    .insert({
      lead_id: lead.id,
      numero_invitados: lead.cantidad_invitados,
      ciudad: lead.ciudad ?? null,
      fecha_estimada: lead.fecha_tentativa ?? null,
      estado: "borrador",
      created_by: createdBy ?? null,
    })
    .select("id")
    .single();

  if (cotError || !cotizacion) {
    return { error: cotError?.message ?? "No se pudo crear la cotización." };
  }

  const items = PROVIDER_CATEGORIES.map((categoria) => ({
    cotizacion_id: cotizacion.id,
    categoria,
    incluido: true,
  }));

  const { error: itemsError } = await supabase
    .from("cotizacion_items")
    .insert(items);

  if (itemsError) {
    await supabase.from("cotizaciones").delete().eq("id", cotizacion.id);
    return { error: itemsError.message };
  }

  return { id: cotizacion.id };
}
