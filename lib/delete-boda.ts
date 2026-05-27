import type { SupabaseClient } from "@supabase/supabase-js";

/** Elimina la boda; proveedores, pagos y cronograma_items se borran por cascade en Supabase. */
export async function eliminarBoda(
  client: SupabaseClient,
  bodaId: string,
): Promise<{ ok: true } | { ok: false; message: string }> {
  const { error } = await client.from("bodas").delete().eq("id", bodaId);

  if (error) {
    return { ok: false, message: error.message };
  }

  return { ok: true };
}
