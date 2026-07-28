import { NextResponse } from "next/server";
import { getCurrentAuthUser } from "@/lib/auth/user-profiles";
import { canManageTastings } from "@/lib/tastings";
import { createTastingCalendarEvent } from "@/lib/google-calendar";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import type { TastingRow } from "@/app/data/tastings";

export async function POST(request: Request) {
  const user = await getCurrentAuthUser();
  if (!user) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  if (!canManageTastings(user.rol)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  let tastingId: string | undefined;
  try {
    const body = (await request.json()) as { tastingId?: string };
    tastingId = body.tastingId?.trim();
  } catch {
    return NextResponse.json({ error: "Cuerpo inválido" }, { status: 400 });
  }

  if (!tastingId) {
    return NextResponse.json({ error: "Falta tastingId" }, { status: 400 });
  }

  try {
    const supabase = await createServerSupabaseClient();
    const { data: tastingData, error: tastingError } = await supabase
      .from("tastings")
      .select("*")
      .eq("id", tastingId)
      .maybeSingle();

    if (tastingError || !tastingData) {
      return NextResponse.json({ error: "Tasting no encontrado" }, { status: 404 });
    }

    const tasting = tastingData as TastingRow;
    if (tasting.google_event_id) {
      return NextResponse.json({ eventId: tasting.google_event_id });
    }

    const { data: bodaData } = await supabase
      .from("bodas")
      .select("nombre_pareja, email_novia, email_novio")
      .eq("id", tasting.boda_id)
      .maybeSingle();

    const boda = bodaData as {
      nombre_pareja: string;
      email_novia: string | null;
      email_novio: string | null;
    } | null;

    const event = await createTastingCalendarEvent(
      {
        nombre_proveedor: tasting.nombre_proveedor,
        categoria: tasting.categoria,
        tipo_cita: tasting.tipo_cita,
        fecha: tasting.fecha,
        hora_inicio: tasting.hora_inicio,
        hora_fin: tasting.hora_fin,
        direccion: tasting.direccion,
        notas: tasting.notas,
        asignado_nombre: tasting.asignado_nombre,
        email_invitado: tasting.email_invitado,
        email_novia: boda?.email_novia ?? null,
        email_novio: boda?.email_novio ?? null,
      },
      boda?.nombre_pareja ?? null,
    );

    const { error: updateError } = await supabase
      .from("tastings")
      .update({ google_event_id: event.eventId })
      .eq("id", tastingId);

    if (updateError) {
      throw new Error(updateError.message);
    }

    return NextResponse.json({
      eventId: event.eventId,
    });
  } catch (error) {
    console.error("[api/calendar/crear-evento-tasting] error exacto:", error);
    if (error instanceof Error) {
      console.error(
        "[api/calendar/crear-evento-tasting] message:",
        error.message,
      );
      console.error("[api/calendar/crear-evento-tasting] stack:", error.stack);
    }
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "No se pudo crear el evento en Google Calendar.",
      },
      { status: 500 },
    );
  }
}
