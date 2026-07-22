import type { SupabaseClient } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";

import { CITA_TIPO_LABELS, type CitaRow } from "@/app/data/citas";
import {
  PROVIDER_STATUS_LABELS,
  type ProviderStatus,
} from "@/app/data/providers";
import { formatShortDateStable } from "@/lib/format";

export const AUDITORIA_ACCIONES = {
  BODA_CREADA: "Boda creada",
  BODA_ELIMINADA: "Boda eliminada",
  PROVEEDOR_AGREGADO: "Proveedor agregado",
  PROVEEDOR_ELIMINADO: "Proveedor eliminado",
  ESTADO_PROVEEDOR: "Estado proveedor actualizado",
  PAGO_REGISTRADO: "Pago registrado",
  PAGO_ELIMINADO: "Pago eliminado",
  COTIZACION_REGISTRADA: "Cotización registrada",
  CITA_CREADA: "Cita creada",
  CITA_EDITADA: "Cita editada",
  CITA_CANCELADA: "Cita cancelada",
  DRIVE_CARPETA_CREADA: "Carpeta Drive creada",
  DRIVE_CARPETA_RECREADA: "Carpeta Drive recreada",
  CONTRATO_GENERADO: "Contrato generado",
  BRIEF_GUARDADO: "Brief guardado",
  NOTA_REUNION_AGREGADA: "Nota de reunión agregada",
  NOTA_REUNION_EDITADA: "Nota de reunión editada",
  TASTING_AGREGADO: "Tasting agregado",
  TASTING_EDITADO: "Tasting editado",
  PROVEEDOR_SUGERIDO_AGREGADO: "Proveedor sugerido agregado",
  LEAD_CREADO: "Lead creado",
  LEAD_CONVERTIDO: "Lead convertido a boda",
  LEAD_DESCARTADO: "Lead descartado",
  BODA_REVERTIDA_A_LEAD: "Boda revertida a lead",
  COMISION_RECIBIDA: "Comisión marcada como recibida",
} as const;

export function buildCitaAuditoriaDetalle(
  cita: Pick<CitaRow, "titulo" | "tipo" | "fecha">,
): string {
  return `${cita.titulo} · ${CITA_TIPO_LABELS[cita.tipo]} · ${formatShortDateStable(cita.fecha)}`;
}

export function resolveCitaBodaNombre(
  cita: Pick<CitaRow, "boda_id" | "lead_id">,
  bodasById: Record<string, { nombre_pareja: string }>,
  leadsById: Record<string, { nombre_pareja: string }> = {},
): string | null {
  if (cita.boda_id && bodasById[cita.boda_id]) {
    return bodasById[cita.boda_id].nombre_pareja;
  }
  if (cita.lead_id && leadsById[cita.lead_id]) {
    return leadsById[cita.lead_id].nombre_pareja;
  }
  return null;
}

export function buildProveedorEstadoAuditoriaDetalle(
  nombre: string,
  estado: ProviderStatus | string,
): string {
  const label =
    estado in PROVIDER_STATUS_LABELS
      ? PROVIDER_STATUS_LABELS[estado as ProviderStatus]
      : estado;
  return `${nombre}: ${label}`;
}

export type RegistrarAccionParams = {
  usuarioId: string | null;
  usuarioNombre: string;
  accion: string;
  entidad: string;
  entidadId?: string | null;
  detalle?: string | null;
  bodaNombre?: string | null;
  client?: SupabaseClient;
};

export async function getAuditoriaUsuario(
  client: SupabaseClient = supabase,
): Promise<{ usuarioId: string; usuarioNombre: string } | null> {
  const {
    data: { user },
    error: authError,
  } = await client.auth.getUser();

  if (authError || !user) return null;

  const { data: profile } = await client
    .from("user_profiles")
    .select("nombre")
    .eq("id", user.id)
    .maybeSingle();

  return {
    usuarioId: user.id,
    usuarioNombre:
      (profile as { nombre?: string } | null)?.nombre?.trim() ||
      user.email ||
      "Usuario",
  };
}

export async function registrarAccion({
  usuarioId,
  usuarioNombre,
  accion,
  entidad,
  entidadId = null,
  detalle = null,
  bodaNombre = null,
  client = supabase,
}: RegistrarAccionParams): Promise<void> {
  try {
    const { error } = await client.from("auditoria").insert({
      usuario_id: usuarioId,
      usuario_nombre: usuarioNombre,
      accion,
      entidad,
      entidad_id: entidadId,
      detalle,
      boda_nombre: bodaNombre,
    });

    if (error) {
      console.error("[auditoria]", error.message);
    }
  } catch (err) {
    console.error("[auditoria]", err);
  }
}

/** Registra auditoría resolviendo el usuario actual si no se pasa. */
export async function logAuditoria(
  params: Omit<RegistrarAccionParams, "usuarioId" | "usuarioNombre"> & {
    usuarioId?: string | null;
    usuarioNombre?: string;
  },
): Promise<void> {
  let usuarioId = params.usuarioId ?? null;
  let usuarioNombre = params.usuarioNombre?.trim() ?? "";

  if (!usuarioId || !usuarioNombre) {
    const user = await getAuditoriaUsuario(params.client);
    if (!user) return;
    usuarioId = user.usuarioId;
    usuarioNombre = user.usuarioNombre;
  }

  await registrarAccion({
    usuarioId,
    usuarioNombre,
    accion: params.accion,
    entidad: params.entidad,
    entidadId: params.entidadId,
    detalle: params.detalle,
    bodaNombre: params.bodaNombre,
    client: params.client,
  });
}
