import type { SupabaseClient } from "@supabase/supabase-js";
import type { CitaRow } from "@/app/data/citas";
import type { TastingRow } from "@/app/data/tastings";
import {
  formatTastingConflictMessage,
  tastingTimesOverlap,
  type TastingScheduleConflict,
} from "@/lib/tastings";

type CheckTastingConflictParams = {
  asignadoId: string;
  asignadoNombre: string;
  fecha: string;
  horaInicio: string;
  horaFin: string | null;
  excludeTastingId?: string | null;
};

async function resolveBodaNombre(
  client: SupabaseClient,
  bodaId: string | null,
): Promise<string | null> {
  if (!bodaId) return null;
  const { data } = await client
    .from("bodas")
    .select("nombre_pareja")
    .eq("id", bodaId)
    .maybeSingle();
  return (data as { nombre_pareja: string } | null)?.nombre_pareja ?? null;
}

async function resolveLeadNombre(
  client: SupabaseClient,
  leadId: string | null,
): Promise<string | null> {
  if (!leadId) return null;
  const { data } = await client
    .from("leads")
    .select("nombre_pareja")
    .eq("id", leadId)
    .maybeSingle();
  return (data as { nombre_pareja: string } | null)?.nombre_pareja ?? null;
}

async function resolveCitaParejaNombre(
  client: SupabaseClient,
  cita: Pick<CitaRow, "boda_id" | "lead_id" | "titulo">,
): Promise<string> {
  const bodaNombre = await resolveBodaNombre(client, cita.boda_id);
  if (bodaNombre?.trim()) return bodaNombre.trim();
  const leadNombre = await resolveLeadNombre(client, cita.lead_id);
  if (leadNombre?.trim()) return leadNombre.trim();
  return cita.titulo.trim() || "otra pareja";
}

export async function checkTastingScheduleConflict(
  client: SupabaseClient,
  params: CheckTastingConflictParams,
): Promise<{ conflict: TastingScheduleConflict | null; message: string | null }> {
  const asignadoId = params.asignadoId.trim();
  if (!asignadoId) {
    return { conflict: null, message: null };
  }

  const { data: tastingsData } = await client
    .from("tastings")
    .select("id, boda_id, hora_inicio, hora_fin")
    .eq("asignado_a", asignadoId)
    .eq("fecha", params.fecha);

  for (const row of (tastingsData ?? []) as Pick<
    TastingRow,
    "id" | "boda_id" | "hora_inicio" | "hora_fin"
  >[]) {
    if (params.excludeTastingId && row.id === params.excludeTastingId) continue;
    if (
      !tastingTimesOverlap(
        params.horaInicio,
        params.horaFin,
        row.hora_inicio,
        row.hora_fin,
      )
    ) {
      continue;
    }

    const parejaNombre =
      (await resolveBodaNombre(client, row.boda_id)) ?? "otra pareja";
    const conflict: TastingScheduleConflict = {
      parejaNombre,
      tipo: "tasting",
    };
    return {
      conflict,
      message: formatTastingConflictMessage(params.asignadoNombre, conflict),
    };
  }

  const { data: citasData } = await client
    .from("citas")
    .select("id, boda_id, lead_id, titulo, hora_inicio, hora_fin, estado")
    .eq("asignado_a", asignadoId)
    .eq("fecha", params.fecha)
    .neq("estado", "cancelada");

  for (const row of (citasData ?? []) as CitaRow[]) {
    if (
      !tastingTimesOverlap(
        params.horaInicio,
        params.horaFin,
        row.hora_inicio,
        row.hora_fin,
      )
    ) {
      continue;
    }

    const parejaNombre = await resolveCitaParejaNombre(client, row);
    const conflict: TastingScheduleConflict = {
      parejaNombre,
      tipo: "cita",
    };
    return {
      conflict,
      message: formatTastingConflictMessage(params.asignadoNombre, conflict),
    };
  }

  return { conflict: null, message: null };
}
