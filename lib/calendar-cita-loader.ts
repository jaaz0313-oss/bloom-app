import type { CitaRow } from "@/app/data/citas";
import { buildCitaClienteInvitados } from "@/lib/cita-cliente-invitados";
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
  let invitados: string[] = [];

  if (row.boda_id) {
    const { data: boda } = await supabase
      .from("bodas")
      .select("nombre_pareja, email_novia, email_novio")
      .eq("id", row.boda_id)
      .maybeSingle();

    const bodaRow = boda as {
      nombre_pareja: string;
      email_novia: string | null;
      email_novio: string | null;
    } | null;
    bodaNombre = bodaRow?.nombre_pareja ?? null;
    invitados = buildCitaClienteInvitados({
      emailNovia: bodaRow?.email_novia,
      emailNovio: bodaRow?.email_novio,
    });
  } else if (row.lead_id) {
    const { data: lead } = await supabase
      .from("leads")
      .select("nombre_pareja, email")
      .eq("id", row.lead_id)
      .maybeSingle();

    const leadRow = lead as {
      nombre_pareja: string;
      email: string | null;
    } | null;
    bodaNombre = leadRow?.nombre_pareja ?? null;
    invitados = buildCitaClienteInvitados({ leadEmail: leadRow?.email });
  }

  return { cita: row, bodaNombre, invitados };
}
