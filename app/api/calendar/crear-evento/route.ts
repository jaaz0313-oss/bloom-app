import { NextResponse } from "next/server";
import { getCurrentAuthUser } from "@/lib/auth/user-profiles";
import { loadCitaForCalendar } from "@/lib/calendar-cita-loader";
import { createCalendarEvent } from "@/lib/google-calendar";
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

    if (cita.google_event_id) {
      return NextResponse.json({
        eventId: cita.google_event_id,
        meetLink: null,
      });
    }

    const event = await createCalendarEvent(cita, bodaNombre);

    const supabase = await createServerSupabaseClient();
    const { error: updateError } = await supabase
      .from("citas")
      .update({
        google_event_id: event.eventId,
        google_meet_link: null,
      })
      .eq("id", citaId);

    if (updateError) {
      throw new Error(updateError.message);
    }

    return NextResponse.json({
      eventId: event.eventId,
      meetLink: null,
    });
  } catch (error) {
    console.error("[api/calendar/crear-evento] error exacto:", error);
    if (error instanceof Error) {
      console.error("[api/calendar/crear-evento] message:", error.message);
      console.error("[api/calendar/crear-evento] stack:", error.stack);
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
