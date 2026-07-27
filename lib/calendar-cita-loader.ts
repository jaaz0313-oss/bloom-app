import type { CitaRow } from "@/app/data/citas";
import { createServerSupabaseClient } from "@/lib/supabase-server";

export async function loadCitaForCalendar(citaId: string) {
  const supabase = await createServerSupabaseClient();

  const { data: cita, error } = await supabase
    .from("citas")
    .select("*")
    .eq("id", citaId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!cita) return null;

  const row = cita as CitaRow;
  let bodaNombre: string | null = null;

  if (row.boda_id) {
    const { data: boda } = await supabase
      .from("bodas")
      .select("nombre_pareja")
      .eq("id", row.boda_id)
      .maybeSingle();

    bodaNombre =
      (boda as { nombre_pareja: string } | null)?.nombre_pareja ?? null;
  } else if (row.lead_id) {
    const { data: lead } = await supabase
      .from("leads")
      .select("nombre_pareja")
      .eq("id", row.lead_id)
      .maybeSingle();

    bodaNombre =
      (lead as { nombre_pareja: string } | null)?.nombre_pareja ?? null;
  }

  return { cita: row, bodaNombre };
}
