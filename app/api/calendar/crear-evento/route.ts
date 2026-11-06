import { NextResponse } from "next/server";
import { getCurrentAuthUser } from "@/lib/auth/user-profiles";
import { loadCitaForCalendar } from "@/lib/calendar-cita-loader";
import {
  mensajeCrearCita,
  type CitaCalendarSyncResult,
} from "@/lib/cita-calendar-mensajes";
import { guardarEventoDeCita } from "@/lib/cita-calendar-store";
import {
  createCalendarEvent,
  updateCalendarEvent,
  type CitaCalendarEventResult,
} from "@/lib/google-calendar";
import {
  logGoogleApiError,
  readableGoogleCalendarError,
} from "@/lib/google-service-account";

function resultadoDeEvento(
  written: CitaCalendarEventResult,
  invitados: string[],
  meetLinkGuardado: string | null,
): CitaCalendarSyncResult {
  return mensajeCrearCita({
    googleError: null,
    accesoConfigurado: written.accesoConfigurado,
    eventId: written.eventId,
    htmlLink: written.htmlLink,
    meetLink: written.meetLink ?? meetLinkGuardado,
    organizerEmail: written.organizerEmail,
    esperados: written.accesoConfigurado ? invitados : [],
    confirmados: written.invitadosConfirmados,
    avisoSolicitado: written.avisoSolicitado,
  });
}

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
    const written = cita.google_event_id
      ? await updateCalendarEvent(
          cita.google_event_id,
          cita,
          bodaNombre,
          invitados,
        )
      : await createCalendarEvent(cita, bodaNombre, invitados);

    const result = resultadoDeEvento(
      written,
      invitados,
      cita.google_meet_link,
    );
    const stored = await guardarEventoDeCita(citaId, {
      google_event_id: written.eventId,
      google_meet_link: result.meetLink,
      google_event_link: written.htmlLink,
    });

    if (stored.columnMissing) {
      const mensaje =
        "La cita se guardó y el evento se creó, pero falta aplicar la migración add_cita_google_event_link.sql para guardar el enlace.";
      return NextResponse.json({
        ...result,
        error: mensaje,
        mensaje,
        puedeReintentar: false,
      });
    }

    return NextResponse.json(result);
  } catch (error) {
    logGoogleApiError("calendar.crear-evento", error);
    const motivo = readableGoogleCalendarError(error);
    return NextResponse.json(
      mensajeCrearCita({
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
