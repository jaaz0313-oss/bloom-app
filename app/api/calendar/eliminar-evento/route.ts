import { NextResponse } from "next/server";
import { getCurrentAuthUser } from "@/lib/auth/user-profiles";
import { loadCitaForCalendar } from "@/lib/calendar-cita-loader";
import { deleteCalendarEvent } from "@/lib/google-calendar";
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

    const { cita } = loaded;

    if (cita.google_event_id) {
      try {
        await deleteCalendarEvent(cita.google_event_id);
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        if (!message.includes("404") && !message.toLowerCase().includes("not found")) {
          throw err;
        }
      }
    }

    const supabase = await createServerSupabaseClient();
    const { error: updateError } = await supabase
      .from("citas")
      .update({
        google_event_id: null,
        google_meet_link: null,
      })
      .eq("id", citaId);

    if (updateError) {
      throw new Error(updateError.message);
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "No se pudo eliminar el evento en Google Calendar.",
      },
      { status: 500 },
    );
  }
}
