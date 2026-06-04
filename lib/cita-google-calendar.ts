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
  const response = await fetch("/api/calendar/eliminar-evento", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ citaId }),
  });

  return parseCalendarApiResponse(response);
}
