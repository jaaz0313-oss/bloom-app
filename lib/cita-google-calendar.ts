import type { CitaRow } from "@/app/data/citas";
import type { CitaCalendarSyncResult } from "@/lib/cita-calendar-mensajes";

export type { CitaCalendarSyncResult };

function mensajePorAccion(
  accion: CitaCalendarSyncResult["accion"],
  motivo: string,
): string {
  if (accion === "crear") {
    return `La cita se guardó, pero no se pudo crear el evento en el calendario: ${motivo}`;
  }
  if (accion === "actualizar") {
    return `La cita se guardó, pero no se pudo actualizar el evento en el calendario: ${motivo}`;
  }
  return `No se pudo eliminar el evento en el calendario: ${motivo}`;
}

function emptyResult(
  accion: CitaCalendarSyncResult["accion"],
  mensaje: string,
): CitaCalendarSyncResult {
  return {
    accion,
    citaGuardada: accion !== "eliminar",
    eventoCreado: false,
    eventoActualizado: false,
    eventoEliminado: false,
    invitados: [],
    htmlLink: null,
    eventId: null,
    meetLink: null,
    organizerEmail: null,
    accesoConfigurado: false,
    error: mensaje,
    mensaje,
    puedeReintentar: true,
  };
}

async function parseCalendarApiResponse(
  response: Response,
  accion: CitaCalendarSyncResult["accion"],
): Promise<CitaCalendarSyncResult> {
  const data = (await response.json().catch(() => ({}))) as Partial<CitaCalendarSyncResult> & {
    error?: string;
  };

  if (typeof data.mensaje === "string") {
    return {
      accion,
      citaGuardada: data.citaGuardada ?? accion !== "eliminar",
      eventoCreado: Boolean(data.eventoCreado),
      eventoActualizado: Boolean(data.eventoActualizado),
      eventoEliminado: Boolean(data.eventoEliminado),
      invitados: Array.isArray(data.invitados) ? data.invitados : [],
      htmlLink: data.htmlLink ?? null,
      eventId: data.eventId ?? null,
      meetLink: data.meetLink ?? null,
      organizerEmail: data.organizerEmail ?? null,
      accesoConfigurado: Boolean(data.accesoConfigurado),
      error: data.error ?? null,
      mensaje: data.mensaje,
      puedeReintentar: Boolean(data.puedeReintentar),
    };
  }

  const motivo =
    (typeof data.error === "string" && data.error) ||
    "Google Calendar no respondió.";
  return emptyResult(accion, mensajePorAccion(accion, motivo));
}

export function aplicarResultadoCalendarACita(
  cita: CitaRow,
  result: CitaCalendarSyncResult,
): CitaRow {
  return {
    ...cita,
    google_event_id: result.eventId ?? cita.google_event_id,
    google_meet_link: result.meetLink ?? cita.google_meet_link ?? null,
    google_event_link: result.htmlLink ?? cita.google_event_link ?? null,
  };
}

export async function crearEventoCalendar(
  citaId: string,
): Promise<CitaCalendarSyncResult> {
  const response = await fetch("/api/calendar/crear-evento", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ citaId }),
  });

  return parseCalendarApiResponse(response, "crear");
}

export async function actualizarEventoCalendar(
  citaId: string,
): Promise<CitaCalendarSyncResult> {
  const response = await fetch("/api/calendar/actualizar-evento", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ citaId }),
  });

  return parseCalendarApiResponse(response, "actualizar");
}

export async function eliminarEventoCalendar(
  citaId: string,
): Promise<CitaCalendarSyncResult> {
  try {
    const response = await fetch("/api/calendar/eliminar-evento", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ citaId }),
    });

    return parseCalendarApiResponse(response, "eliminar");
  } catch (error) {
    const motivo =
      error instanceof Error
        ? error.message
        : "No se pudo eliminar el evento en Google Calendar.";
    return emptyResult("eliminar", mensajePorAccion("eliminar", motivo));
  }
}

export async function eliminarEventoCalendarSiVinculado(cita: {
  id: string;
  google_event_id: string | null;
}): Promise<CitaCalendarSyncResult | null> {
  if (!cita.google_event_id) return null;
  return eliminarEventoCalendar(cita.id);
}
