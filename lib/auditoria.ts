import type { SupabaseClient } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";

export const AUDITORIA_ACCIONES = {
  BODA_CREADA: "Boda creada",
  BODA_ELIMINADA: "Boda eliminada",
  PROVEEDOR_AGREGADO: "Proveedor agregado",
  PROVEEDOR_ELIMINADO: "Proveedor eliminado",
  ESTADO_PROVEEDOR: "Estado proveedor actualizado",
  PAGO_REGISTRADO: "Pago registrado",
  PAGO_ELIMINADO: "Pago eliminado",
  COTIZACION_REGISTRADA: "Cotización registrada",
  LEAD_CREADO: "Lead creado",
  LEAD_CONVERTIDO: "Lead convertido a boda",
  COMISION_RECIBIDA: "Comisión marcada como recibida",
} as const;

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
