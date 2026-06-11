import { NextResponse } from "next/server";
import { getCurrentAuthUser } from "@/lib/auth/user-profiles";
import { createTastingCalendarEvent } from "@/lib/google-calendar";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import type { TastingRow } from "@/app/data/tastings";

export async function POST(request: Request) {
  const user = await getCurrentAuthUser();
  if (!user) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
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
      .select("nombre_pareja")
      .eq("id", tasting.boda_id)
      .maybeSingle();

    const bodaNombre =
      (bodaData as { nombre_pareja: string } | null)?.nombre_pareja ?? null;

    const event = await createTastingCalendarEvent(
      {
        nombre_proveedor: tasting.nombre_proveedor,
        categoria: tasting.categoria,
        fecha: tasting.fecha,
        hora_inicio: tasting.hora_inicio,
        hora_fin: tasting.hora_fin,
        direccion: tasting.direccion,
        notas: tasting.notas,
        asignado_nombre: tasting.asignado_nombre,
      },
      bodaNombre,
    );

    const { error: updateError } = await supabase
      .from("tastings")
      .update({ google_event_id: event.eventId })
      .eq("id", tastingId);

    if (updateError) {
      throw new Error(updateError.message);
    }

    return NextResponse.json({ eventId: event.eventId });
  } catch (error) {
    console.error(error);
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
