export type TastingCalendarSyncResult = {
  eventId?: string;
  warning?: string;
};

async function parseCalendarApiResponse(
  response: Response,
): Promise<TastingCalendarSyncResult> {
  const data = (await response.json().catch(() => ({}))) as {
    eventId?: string;
    error?: string;
  };

  if (!response.ok) {
    return {
      warning:
        data.error ??
        "No se pudo sincronizar el tasting con Google Calendar.",
    };
  }

  return { eventId: data.eventId };
}

export async function crearEventoCalendarTasting(
  tastingId: string,
): Promise<TastingCalendarSyncResult> {
  const response = await fetch("/api/calendar/crear-evento-tasting", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ tastingId }),
  });

  return parseCalendarApiResponse(response);
}
