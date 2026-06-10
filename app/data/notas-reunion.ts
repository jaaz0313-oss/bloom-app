import type { SupabaseClient } from "@supabase/supabase-js";

export type NotaReunionRow = {
  id: string;
  boda_id: string;
  fecha: string;
  con_quien: string;
  resumen: string;
  creado_por: string | null;
  creado_por_nombre: string | null;
  created_at: string;
};

export type NotaReunionConQuienTipo = "cliente" | "proveedor" | "equipo";

function isMissingNotasReunionTable(message: string): boolean {
  const lower = message.toLowerCase();
  return (
    lower.includes("notas_reunion") &&
    (lower.includes("does not exist") ||
      lower.includes("schema cache") ||
      lower.includes("could not find"))
  );
}

export async function fetchNotasReunionForBoda(
  client: SupabaseClient,
  bodaId: string,
): Promise<NotaReunionRow[]> {
  const { data, error } = await client
    .from("notas_reunion")
    .select("*")
    .eq("boda_id", bodaId)
    .order("fecha", { ascending: false });

  if (error) {
    if (isMissingNotasReunionTable(error.message)) {
      console.warn(
        "[notas_reunion] Tabla no encontrada. Ejecuta supabase/migrations/create_notas_reunion.sql",
      );
      return [];
    }
    console.error("[notas_reunion]", error);
    return [];
  }

  return (data ?? []) as NotaReunionRow[];
}
