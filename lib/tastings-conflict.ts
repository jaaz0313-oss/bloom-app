import type { SupabaseClient } from "@supabase/supabase-js";
import type { CitaRow } from "@/app/data/citas";
import type { TastingRow } from "@/app/data/tastings";
import {
  computeTastingScheduleWarnings,
  formatTastingConflictMessage,
  tastingTimesOverlap,
  type TastingScheduleConflict,
  type TastingScheduleEntry,
  type TastingScheduleWarning,
} from "@/lib/tastings";

type CheckTastingConflictParams = {
  asignadoId: string;
  asignadoNombre: string;
  fecha: string;
  horaInicio: string;
  horaFin: string | null;
  excludeTastingId?: string | null;
};

type CheckTastingScheduleWarningParams = {
  fecha: string;
  horaInicio: string;
  horaFin: string | null;
  excludeTastingId?: string | null;
};

type TastingWithBodaRow = Pick<
  TastingRow,
  "id" | "boda_id" | "hora_inicio" | "hora_fin"
> & {
  bodas: { nombre_pareja: string } | { nombre_pareja: string }[] | null;
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

function resolveTastingBodaNombre(row: TastingWithBodaRow): string {
  const bodas = row.bodas;
  if (Array.isArray(bodas)) {
    return bodas[0]?.nombre_pareja?.trim() || "otra boda";
  }
  return bodas?.nombre_pareja?.trim() || "otra boda";
}

async function fetchTastingsOnDate(
  client: SupabaseClient,
  fecha: string,
): Promise<TastingScheduleEntry[]> {
  const { data, error } = await client
    .from("tastings")
    .select("id, boda_id, hora_inicio, hora_fin, bodas(nombre_pareja)")
    .eq("fecha", fecha);

  if (error) {
    throw new Error(error.message);
  }

  return ((data ?? []) as TastingWithBodaRow[]).map((row) => ({
    id: row.id,
    bodaNombre: resolveTastingBodaNombre(row),
    hora_inicio: row.hora_inicio,
    hora_fin: row.hora_fin,
  }));
}

export async function checkTastingScheduleWarnings(
  client: SupabaseClient,
  params: CheckTastingScheduleWarningParams,
): Promise<TastingScheduleWarning[]> {
  if (!params.fecha.trim() || !params.horaInicio.trim()) {
    return [];
  }

  const tastings = await fetchTastingsOnDate(client, params.fecha);
  return computeTastingScheduleWarnings(
    tastings,
    params.horaInicio,
    params.horaFin,
    params.excludeTastingId,
  );
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
