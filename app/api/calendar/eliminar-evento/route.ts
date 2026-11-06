import { NextResponse } from "next/server";
import { getCurrentAuthUser } from "@/lib/auth/user-profiles";
import { loadCitaForCalendar } from "@/lib/calendar-cita-loader";
import {
  mensajeEliminarCita,
  mensajeEliminarSinEvento,
} from "@/lib/cita-calendar-mensajes";
import { limpiarEventoDeCita } from "@/lib/cita-calendar-store";
import { deleteCitaCalendarEvent } from "@/lib/google-calendar";
import {
  logGoogleApiError,
  readableGoogleCalendarError,
} from "@/lib/google-service-account";

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
    if (!cita.google_event_id) {
      return NextResponse.json(mensajeEliminarSinEvento());
    }

    const deleted = await deleteCitaCalendarEvent(cita.google_event_id);
    const result = mensajeEliminarCita({
      googleError: null,
      accesoConfigurado: deleted.accesoConfigurado,
      eventoEliminado: deleted.eventoEliminado,
      alreadyGone: deleted.alreadyGone,
      invitadosAvisados: deleted.invitadosAvisados,
      eventId: cita.google_event_id,
    });

    if (result.eventoEliminado) {
      await limpiarEventoDeCita(citaId);
    }

    return NextResponse.json(result);
  } catch (error) {
    logGoogleApiError("calendar.eliminar-evento", error);
    const motivo = readableGoogleCalendarError(error);
    return NextResponse.json(
      mensajeEliminarCita({
        googleError: motivo,
        accesoConfigurado: false,
        eventoEliminado: false,
        alreadyGone: false,
        invitadosAvisados: [],
        eventId: null,
      }),
    );
  }
}
