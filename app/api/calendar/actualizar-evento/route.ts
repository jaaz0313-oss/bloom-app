import { NextResponse } from "next/server";
import { getCurrentAuthUser } from "@/lib/auth/user-profiles";
import { loadCitaForCalendar } from "@/lib/calendar-cita-loader";
import { updateCalendarEvent } from "@/lib/google-calendar";
import { createServerSupabaseClient } from "@/lib/supabase-server";

export async function POST(request: Request) {
  const user = await getCurrentAuthUser();
  if (!user) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  let citaId: string | undefined;
  try {
    const body = (await request.json()) as { citaId?: string };
    citaId = body.citaId?.trim();
  } catch {
    return NextResponse.json({ error: "Cuerpo inválido" }, { status: 400 });
  }

  if (!citaId) {
    return NextResponse.json({ error: "Falta citaId" }, { status: 400 });
  }

  try {
    const loaded = await loadCitaForCalendar(citaId);
    if (!loaded) {
      return NextResponse.json({ error: "Cita no encontrada" }, { status: 404 });
    }

    const { cita, bodaNombre } = loaded;

    if (!cita.google_event_id) {
      return NextResponse.json(
        { error: "La cita no tiene un evento de Google Calendar vinculado." },
        { status: 400 },
      );
    }

    await updateCalendarEvent(cita.google_event_id, cita, bodaNombre);

    const supabase = await createServerSupabaseClient();
    const { error: updateError } = await supabase
      .from("citas")
      .update({
        google_meet_link: null,
      })
      .eq("id", citaId);

    if (updateError) {
      throw new Error(updateError.message);
    }

    return NextResponse.json({
      eventId: cita.google_event_id,
      meetLink: null,
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "No se pudo actualizar el evento en Google Calendar.",
      },
      { status: 500 },
    );
  }
}
