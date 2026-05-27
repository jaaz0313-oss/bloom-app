import { supabase } from "@/lib/supabase";

export async function syncBodaProveedoresContratados(bodaId: string) {
  if (!supabase) return;

  const { count, error: countError } = await supabase
    .from("proveedores")
    .select("*", { count: "exact", head: true })
    .eq("boda_id", bodaId)
    .eq("estado", "contratado");

  if (countError) {
    console.error(countError);
    return;
  }

  const { error: updateError } = await supabase
    .from("bodas")
    .update({ proveedores_contratados: count ?? 0 })
    .eq("id", bodaId);

  if (updateError) {
    console.error(updateError);
  }
}
