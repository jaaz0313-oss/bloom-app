import { NextResponse } from "next/server";
import { getCurrentAuthUser } from "@/lib/auth/user-profiles";
import { loadCitaForCalendar } from "@/lib/calendar-cita-loader";
import { mensajeActualizarCita } from "@/lib/cita-calendar-mensajes";
import { guardarEventoDeCita } from "@/lib/cita-calendar-store";
import { updateCalendarEvent } from "@/lib/google-calendar";
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

    const { cita, bodaNombre, invitados } = loaded;

    if (!cita.google_event_id) {
      const motivo = "La cita no tiene un evento de Google Calendar vinculado.";
      return NextResponse.json(
        mensajeActualizarCita({
          googleError: motivo,
          accesoConfigurado: false,
          eventId: null,
          htmlLink: null,
          meetLink: null,
          organizerEmail: null,
          esperados: [],
          confirmados: [],
          avisoSolicitado: false,
        }),
        { status: 400 },
      );
    }

    const written = await updateCalendarEvent(
      cita.google_event_id,
      cita,
      bodaNombre,
      invitados,
    );
    const result = mensajeActualizarCita({
      googleError: null,
      accesoConfigurado: written.accesoConfigurado,
      eventId: written.eventId,
      htmlLink: written.htmlLink,
      meetLink: written.meetLink ?? cita.google_meet_link,
      organizerEmail: written.organizerEmail,
      esperados: written.accesoConfigurado ? invitados : [],
      confirmados: written.invitadosConfirmados,
      avisoSolicitado: written.avisoSolicitado,
    });

    const stored = await guardarEventoDeCita(citaId, {
      google_event_id: written.eventId,
      google_meet_link: result.meetLink,
      google_event_link: written.htmlLink,
    });

    if (stored.columnMissing) {
      const mensaje =
        "La cita se guardó y el evento se actualizó, pero falta aplicar la migración add_cita_google_event_link.sql para guardar el enlace.";
      return NextResponse.json({
        ...result,
        error: mensaje,
        mensaje,
        puedeReintentar: false,
      });
    }

    return NextResponse.json(result);
  } catch (error) {
    logGoogleApiError("calendar.actualizar-evento", error);
    const motivo = readableGoogleCalendarError(error);
    return NextResponse.json(
      mensajeActualizarCita({
        googleError: motivo,
        accesoConfigurado: false,
        eventId: null,
        htmlLink: null,
        meetLink: null,
        organizerEmail: null,
        esperados: [],
        confirmados: [],
        avisoSolicitado: false,
      }),
    );
  }
}
