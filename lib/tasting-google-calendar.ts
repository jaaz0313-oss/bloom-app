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

export async function actualizarEventoCalendarTasting(
  tastingId: string,
): Promise<TastingCalendarSyncResult> {
  const response = await fetch("/api/calendar/actualizar-evento-tasting", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ tastingId }),
  });

  return parseCalendarApiResponse(response);
}

export async function eliminarEventoCalendarTasting(
  tastingId: string,
): Promise<TastingCalendarSyncResult> {
  try {
    const response = await fetch("/api/calendar/eliminar-evento-tasting", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tastingId }),
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

export async function eliminarEventoCalendarTastingSiVinculado(tasting: {
  id: string;
  google_event_id: string | null;
}): Promise<void> {
  if (!tasting.google_event_id) return;

  const result = await eliminarEventoCalendarTasting(tasting.id);
  if (result.warning) {
    console.warn(result.warning);
  }
}
