export type CitaCalendarSyncResult = {
  eventId?: string;
  meetLink?: string;
  warning?: string;
};

async function parseCalendarApiResponse(
  response: Response,
): Promise<CitaCalendarSyncResult> {
  const data = (await response.json().catch(() => ({}))) as {
    eventId?: string;
    meetLink?: string;
    error?: string;
  };

  if (!response.ok) {
    return {
      warning:
        data.error ??
        "No se pudo sincronizar la cita con Google Calendar.",
    };
  }

  return {
    eventId: data.eventId,
    meetLink: data.meetLink,
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

  return parseCalendarApiResponse(response);
}

export async function actualizarEventoCalendar(
  citaId: string,
): Promise<CitaCalendarSyncResult> {
  const response = await fetch("/api/calendar/actualizar-evento", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ citaId }),
  });

  return parseCalendarApiResponse(response);
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

    return parseCalendarApiResponse(response);
  } catch (error) {
    return {
      warning:
        error instanceof Error
          ? error.message
          : "No se pudo eliminar el evento en Google Calendar.",
    };
  }
}

export async function eliminarEventoCalendarSiVinculado(cita: {
  id: string;
  google_event_id: string | null;
}): Promise<void> {
  if (!cita.google_event_id) return;

  const result = await eliminarEventoCalendar(cita.id);
  if (result.warning) {
    console.warn(result.warning);
  }
}
