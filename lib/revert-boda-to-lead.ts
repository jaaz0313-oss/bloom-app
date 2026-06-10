import type { BodaRow } from "@/app/data/weddings";
import { eliminarBoda } from "@/lib/delete-boda";
import { insertLeadRow } from "@/lib/leads-mutations";
import type { SupabaseClient } from "@supabase/supabase-js";

export type RevertBodaPayload = Pick<
  BodaRow,
  | "id"
  | "lead_id"
  | "nombre_pareja"
  | "fecha_boda"
  | "ciudad"
  | "telefono_novia"
  | "email_novia"
  | "honorarios"
  | "anticipo_honorarios"
  | "lugar_venue"
>;

export async function revertirBodaALead(
  client: SupabaseClient,
  boda: RevertBodaPayload,
): Promise<{ ok: true; leadId: string } | { ok: false; message: string }> {
  let leadId = boda.lead_id;

  if (leadId) {
    const { error: updateError } = await client
      .from("leads")
      .update({ estado: "activo" })
      .eq("id", leadId);

    if (updateError) {
      return { ok: false, message: updateError.message };
    }
  } else {
    const insertResult = await insertLeadRow(client, {
      nombre_pareja: boda.nombre_pareja,
      fecha_tentativa: boda.fecha_boda,
      ciudad: boda.ciudad,
      presupuesto_estimado: null,
      cantidad_invitados: null,
      tipo_ceremonia: null,
      pais_origen_novios: null,
      ciudad_residencia_actual: null,
      concepto_boda: null,
      prioridades: null,
      estado_seguimiento: "en_conversacion",
      notas: null,
      telefono: boda.telefono_novia,
      email: boda.email_novia,
      honorarios_acordados: boda.honorarios,
      anticipo_acordado: boda.anticipo_honorarios,
      lugar_venue: boda.lugar_venue,
    });

    if (insertResult.error || !insertResult.data?.id) {
      return {
        ok: false,
        message: insertResult.error?.message ?? "No se pudo crear el lead.",
      };
    }

    leadId = insertResult.data.id;
  }

  const deleteResult = await eliminarBoda(client, boda.id);
  if (!deleteResult.ok) {
    return deleteResult;
  }

  if (!leadId) {
    return { ok: false, message: "No se pudo resolver el lead asociado." };
  }

  return { ok: true, leadId };
}
