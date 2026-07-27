import type { LeadSeguimientoStatus } from "@/app/data/leads";
import type { SupabaseClient } from "@supabase/supabase-js";

export type LeadInsertPayload = {
  nombre_pareja: string;
  fecha_tentativa: string | null;
  ciudad: string | null;
  presupuesto_estimado: number | null;
  cantidad_invitados: number | null;
  tipo_ceremonia: string | null;
  pais_origen_novios: string | null;
  ciudad_residencia_actual: string | null;
  concepto_boda: string | null;
  prioridades: string | null;
  estado_seguimiento: LeadSeguimientoStatus;
  notas: string | null;
  telefono: string | null;
  email: string | null;
  honorarios_acordados?: number | null;
  anticipo_acordado?: number | null;
  lugar_venue?: string | null;
};

function isMissingColumnError(message: string, column: string): boolean {
  const lower = message.toLowerCase();
  return (
    lower.includes(column.toLowerCase()) &&
    (lower.includes("could not find") ||
      lower.includes("does not exist") ||
      lower.includes("schema cache"))
  );
}

function isEstadoListadoCheckError(message: string): boolean {
  return (
    message.includes("leads_estado_check") ||
    (message.toLowerCase().includes("estado") &&
      message.toLowerCase().includes("check"))
  );
}

/** Payload con columnas post-migración activo/descartado + estado_seguimiento. */
export function buildLeadInsertPayloadModern(
  payload: LeadInsertPayload,
): Record<string, unknown> {
  const {
    estado_seguimiento,
    honorarios_acordados,
    anticipo_acordado,
    lugar_venue,
    ...rest
  } = payload;

  return {
    ...rest,
    estado: "activo",
    estado_seguimiento,
    ...(honorarios_acordados !== undefined ? { honorarios_acordados } : {}),
    ...(anticipo_acordado !== undefined ? { anticipo_acordado } : {}),
    ...(lugar_venue !== undefined ? { lugar_venue } : {}),
  };
}

/** Payload legacy: una sola columna `estado` = seguimiento comercial. */
export function buildLeadInsertPayloadLegacy(
  payload: LeadInsertPayload,
): Record<string, unknown> {
  const { estado_seguimiento, ...rest } = payload;
  return {
    ...rest,
    estado: estado_seguimiento,
  };
}

export async function insertLeadRow(
  supabase: SupabaseClient,
  payload: LeadInsertPayload,
) {
  const modern = buildLeadInsertPayloadModern(payload);
  let result = await supabase.from("leads").insert(modern).select("id").single();

  if (
    result.error &&
    (isMissingColumnError(result.error.message, "estado_seguimiento") ||
      isEstadoListadoCheckError(result.error.message))
  ) {
    const legacy = buildLeadInsertPayloadLegacy(payload);
    result = await supabase.from("leads").insert(legacy).select("id").single();
  }

  return result;
}

export async function updateLeadSeguimiento(
  supabase: SupabaseClient,
  leadId: string,
  estadoSeguimiento: LeadSeguimientoStatus,
  extra: Record<string, unknown> = {},
) {
  let result = await supabase
    .from("leads")
    .update({
      estado_seguimiento: estadoSeguimiento,
      ...extra,
    })
    .eq("id", leadId);

  if (
    result.error &&
    isMissingColumnError(result.error.message, "estado_seguimiento")
  ) {
    result = await supabase
      .from("leads")
      .update({
        estado: estadoSeguimiento,
        ...extra,
      })
      .eq("id", leadId);
  }

  return result;
}
