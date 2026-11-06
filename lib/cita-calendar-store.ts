import { createServerSupabaseClient } from "@/lib/supabase-server";

export async function guardarEventoDeCita(
  citaId: string,
  fields: {
    google_event_id: string;
    google_meet_link: string | null;
    google_event_link: string | null;
  },
): Promise<{ columnMissing: boolean }> {
  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.from("citas").update(fields).eq("id", citaId);

  if (!error) return { columnMissing: false };
  if (!error.message.includes("google_event_link")) {
    throw new Error(error.message);
  }

  const { error: retryError } = await supabase
    .from("citas")
    .update({
      google_event_id: fields.google_event_id,
      google_meet_link: fields.google_meet_link,
    })
    .eq("id", citaId);

  if (retryError) throw new Error(retryError.message);
  return { columnMissing: true };
}

export async function limpiarEventoDeCita(citaId: string): Promise<void> {
  const supabase = await createServerSupabaseClient();
  const full = await supabase
    .from("citas")
    .update({
      google_event_id: null,
      google_meet_link: null,
      google_event_link: null,
    })
    .eq("id", citaId);

  if (!full.error) return;
  if (!full.error.message.includes("google_event_link")) {
    throw new Error(full.error.message);
  }

  const { error } = await supabase
    .from("citas")
    .update({
      google_event_id: null,
      google_meet_link: null,
    })
    .eq("id", citaId);

  if (error) throw new Error(error.message);
}
