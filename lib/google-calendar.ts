import { google } from "googleapis";
import type { calendar_v3 } from "googleapis";
import type { CitaRow } from "@/app/data/citas";
import { CITA_TIPO_LABELS } from "@/app/data/citas";
import { citaTimeFromDb } from "@/lib/cita-time-slots";
import { getTastingEventTitle, getTastingTipoLabel } from "@/lib/tastings";
import { normalizeCitaFecha } from "@/lib/citas";
import {
  createGoogleJwtAuth,
  createGoogleJwtAuthWithDelegation,
  hasGoogleWorkspaceDelegation,
  logGoogleApiError,
} from "@/lib/google-service-account";

export type CalendarEventResult = {
  eventId: string;
  htmlLink: string | null;
  meetLink: string | null;
};

export type CitaForCalendar = Pick<
  CitaRow,
  | "titulo"
  | "fecha"
  | "hora_inicio"
  | "hora_fin"
  | "tipo"
  | "notas"
  | "lugar"
  | "link_meet"
  | "boda_id"
  | "lead_id"
  | "emails_involucrados"
>;

const DEFAULT_TIMEZONE = "America/Bogota";
const DEFAULT_DURATION_MINUTES = 60;
const CALENDAR_SCOPE = "https://www.googleapis.com/auth/calendar";

/** Cliente sin subject — crear / actualizar / eliminar eventos. */
export function getCalendarClient() {
  const auth = createGoogleJwtAuth([CALENDAR_SCOPE]);
  return google.calendar({ version: "v3", auth });
}

const CITA_OAUTH_SCOPE = "https://www.googleapis.com/auth/calendar.events";

type CalendarClient = ReturnType<typeof getCalendarClient>;

/**
 * Citas: si hay refresh token, el evento se crea como celestiaandevents@gmail.com.
 * Sin token, se sigue usando la cuenta de servicio.
 */
function resolveCitaCalendar(): { calendar: CalendarClient; oauth: boolean } {
  const refreshToken = process.env.GOOGLE_CALENDAR_REFRESH_TOKEN?.trim();
  if (!refreshToken) {
    return { calendar: getCalendarClient(), oauth: false };
  }

  const clientId = process.env.GOOGLE_CALENDAR_OAUTH_CLIENT_ID?.trim();
  const clientSecret = process.env.GOOGLE_CALENDAR_OAUTH_CLIENT_SECRET?.trim();
  if (!clientId || !clientSecret) {
    throw new Error(
      "Hay GOOGLE_CALENDAR_REFRESH_TOKEN, pero faltan GOOGLE_CALENDAR_OAUTH_CLIENT_ID o GOOGLE_CALENDAR_OAUTH_CLIENT_SECRET.",
    );
  }

  const auth = new google.auth.OAuth2(clientId, clientSecret);
  auth.setCredentials({ refresh_token: refreshToken, scope: CITA_OAUTH_SCOPE });
  return {
    calendar: google.calendar({ version: "v3", auth }),
    oauth: true,
  };
}

/** Cliente con Domain-Wide Delegation — solo attendees. */
export function getCalendarClientWithDelegation() {
  const auth = createGoogleJwtAuthWithDelegation([CALENDAR_SCOPE]);
  return google.calendar({ version: "v3", auth });
}

function getCalendarId(): string {
  const calendarId = process.env.GOOGLE_CALENDAR_ID?.trim();
  if (!calendarId) {
    throw new Error("Falta GOOGLE_CALENDAR_ID en las variables de entorno.");
  }
  return calendarId;
}

function getCalendarTimezone(): string {
  return process.env.GOOGLE_CALENDAR_TIMEZONE?.trim() || DEFAULT_TIMEZONE;
}

function addMinutesToTime(hhmm: string, minutes: number): string {
  const match = hhmm.match(/^(\d{1,2}):(\d{2})/);
  if (!match) return hhmm;

  const totalMinutes = Number(match[1]) * 60 + Number(match[2]) + minutes;
  const hours = Math.floor(totalMinutes / 60) % 24;
  const mins = totalMinutes % 60;

  return `${String(hours).padStart(2, "0")}:${String(mins).padStart(2, "0")}`;
}

function buildDateTime(fecha: string, hora: string): string {
  const date = normalizeCitaFecha(fecha);
  const time = citaTimeFromDb(hora);
  return `${date}T${time}:00`;
}

function buildEventTimes(cita: CitaForCalendar) {
  const startDateTime = buildDateTime(cita.fecha, cita.hora_inicio);
  const endDateTime = cita.hora_fin
    ? buildDateTime(cita.fecha, cita.hora_fin)
    : buildDateTime(
        cita.fecha,
        addMinutesToTime(
          citaTimeFromDb(cita.hora_inicio),
          DEFAULT_DURATION_MINUTES,
        ),
      );

  return { startDateTime, endDateTime };
}

function buildEventDescription(
  cita: CitaForCalendar,
  relacionNombre: string | null,
): string {
  const lines: string[] = [];

  if (cita.boda_id) {
    lines.push(
      relacionNombre?.trim()
        ? `Boda: ${relacionNombre.trim()}`
        : `Boda ID: ${cita.boda_id}`,
    );
  } else if (cita.lead_id) {
    lines.push(
      relacionNombre?.trim()
        ? `Lead: ${relacionNombre.trim()}`
        : `Lead ID: ${cita.lead_id}`,
    );
  }

  lines.push(`Tipo de cita: ${CITA_TIPO_LABELS[cita.tipo]}`);

  if (cita.lugar?.trim()) {
    lines.push(`Lugar: ${cita.lugar.trim()}`);
  }

  if (cita.link_meet?.trim()) {
    lines.push(`Meet: ${cita.link_meet.trim()}`);
  }

  if (cita.notas?.trim()) {
    lines.push("", "Notas:", cita.notas.trim());
  }

  return lines.join("\n");
}

function collectUniqueEmails(
  emails: Array<string | null | undefined>,
): string[] {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const raw of emails) {
    const trimmed = raw?.trim();
    if (!trimmed) continue;
    const key = trimmed.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(trimmed);
  }

  return result;
}

function getTastingAttendeeEmails(tasting: TastingForCalendar): string[] {
  return collectUniqueEmails([
    tasting.email_invitado,
    tasting.email_novia,
    tasting.email_novio,
  ]);
}

function extractMeetLink(event: calendar_v3.Schema$Event): string | null {
  const hangout = event.hangoutLink?.trim();
  if (hangout) return hangout;

  const entryPoints = event.conferenceData?.entryPoints ?? [];
  const video = entryPoints.find((ep) => ep.entryPointType === "video");
  if (video?.uri?.trim()) return video.uri.trim();

  const meetEntry = entryPoints.find((ep) =>
    ep.uri?.toLowerCase().includes("meet.google.com"),
  );
  return meetEntry?.uri?.trim() || null;
}

function buildEventResource(
  cita: CitaForCalendar,
  bodaNombre: string | null,
): calendar_v3.Schema$Event {
  const timeZone = getCalendarTimezone();
  const { startDateTime, endDateTime } = buildEventTimes(cita);

  return {
    summary: cita.titulo.trim() || "Cita Celestia",
    description: buildEventDescription(cita, bodaNombre),
    location: cita.lugar?.trim() || undefined,
    start: { dateTime: startDateTime, timeZone },
    end: { dateTime: endDateTime, timeZone },
  };
}

function clockKey(dateTime: string | null | undefined): string | null {
  if (!dateTime) return null;
  const match = dateTime.match(/^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2})/);
  return match ? `${match[1]}T${match[2]}` : null;
}

function attendeeEmailsFromEvent(event: calendar_v3.Schema$Event): string[] {
  const emails: string[] = [];
  const seen = new Set<string>();
  for (const attendee of event.attendees ?? []) {
    if (attendee.self || attendee.resource) continue;
    const email = attendee.email?.trim().toLowerCase();
    if (!email || seen.has(email)) continue;
    seen.add(email);
    emails.push(email);
  }
  return emails;
}

function sameEmailList(left: string[], right: string[]): boolean {
  if (left.length !== right.length) return false;
  const seen = new Set(left);
  return right.every((email) => seen.has(email));
}

function citaScheduleOrPlaceChanged(
  existing: calendar_v3.Schema$Event,
  cita: CitaForCalendar,
): boolean {
  const next = buildEventTimes(cita);
  const timeChanged =
    clockKey(existing.start?.dateTime) !== clockKey(next.startDateTime) ||
    clockKey(existing.end?.dateTime) !== clockKey(next.endDateTime);
  const placeChanged =
    (existing.location ?? "").trim() !== (cita.lugar ?? "").trim();
  return timeChanged || placeChanged;
}

function mapEventResult(event: calendar_v3.Schema$Event): CalendarEventResult {
  const eventId = event.id;
  if (!eventId) {
    throw new Error("Google Calendar no devolvió el ID del evento.");
  }

  return {
    eventId,
    htmlLink: event.htmlLink ?? null,
    meetLink: extractMeetLink(event),
  };
}

/**
 * Paso 2: agrega invitados con el cliente DWD (subject).
 * Si falla por cualquier razón, se ignora en silencio — el evento ya quedó creado/actualizado.
 */
async function patchEventAttendees(
  eventId: string,
  emails: string[],
): Promise<void> {
  if (emails.length === 0) return;
  if (!hasGoogleWorkspaceDelegation()) return;

  try {
    const calendar = getCalendarClientWithDelegation();
    const calendarId = getCalendarId();

    await calendar.events.patch({
      calendarId,
      eventId,
      sendUpdates: "all",
      requestBody: {
        attendees: emails.map((email) => ({ email })),
      },
    });
  } catch {
    // Silencioso: el evento principal ya se guardó sin invitados.
  }
}

export async function createCalendarEvent(
  cita: CitaForCalendar,
  bodaNombre: string | null,
  invitados: string[] = [],
): Promise<CalendarEventResult> {
  try {
    const { calendar, oauth } = resolveCitaCalendar();
    const calendarId = getCalendarId();
    const eventResource = buildEventResource(cita, bodaNombre);
    const guests = oauth ? invitados : [];

    const response = await calendar.events.insert({
      calendarId,
      sendUpdates: guests.length > 0 ? "all" : "none",
      requestBody: {
        ...eventResource,
        ...(guests.length > 0
          ? { attendees: guests.map((email) => ({ email })) }
          : {}),
      },
    });

    return mapEventResult(response.data);
  } catch (error) {
    logGoogleApiError("calendar.createCalendarEvent", error);
    throw error;
  }
}

export async function updateCalendarEvent(
  googleEventId: string,
  cita: CitaForCalendar,
  bodaNombre: string | null,
  invitados: string[] = [],
): Promise<CalendarEventResult> {
  try {
    const { calendar, oauth } = resolveCitaCalendar();
    const calendarId = getCalendarId();
    const eventResource = buildEventResource(cita, bodaNombre);

    if (!oauth) {
      const response = await calendar.events.patch({
        calendarId,
        eventId: googleEventId,
        sendUpdates: "none",
        requestBody: eventResource,
      });
      return mapEventResult(response.data);
    }

    const existing = await calendar.events.get({
      calendarId,
      eventId: googleEventId,
    });
    const previousGuests = attendeeEmailsFromEvent(existing.data);
    const attendeesChanged = !sameEmailList(previousGuests, invitados);
    const scheduleChanged = citaScheduleOrPlaceChanged(existing.data, cita);
    const someoneToNotify =
      previousGuests.length > 0 || invitados.length > 0;
    const sendUpdates =
      someoneToNotify && (attendeesChanged || scheduleChanged) ? "all" : "none";

    const response = await calendar.events.patch({
      calendarId,
      eventId: googleEventId,
      sendUpdates,
      requestBody: {
        ...eventResource,
        ...(attendeesChanged
          ? { attendees: invitados.map((email) => ({ email })) }
          : {}),
      },
    });

    return mapEventResult(response.data);
  } catch (error) {
    logGoogleApiError("calendar.updateCalendarEvent", error);
    throw error;
  }
}

export async function deleteCalendarEvent(
  googleEventId: string,
  options?: { notifyAttendees?: boolean },
): Promise<void> {
  try {
    const notify = Boolean(options?.notifyAttendees);
    const { calendar, oauth } = notify
      ? resolveCitaCalendar()
      : { calendar: getCalendarClient(), oauth: false };
    const calendarId = getCalendarId();

    await calendar.events.delete({
      calendarId,
      eventId: googleEventId,
      sendUpdates: notify && oauth ? "all" : "none",
    });
  } catch (error) {
    logGoogleApiError("calendar.deleteCalendarEvent", error);
    throw error;
  }
}

export type TastingForCalendar = {
  proveedor_id?: string | null;
  nombre_proveedor: string;
  categoria: string | null;
  tipo_cita?: string | null;
  fecha: string;
  hora_inicio: string;
  hora_fin: string | null;
  direccion: string | null;
  notas: string | null;
  asignado_nombre: string | null;
  email_invitado?: string | null;
  email_novia?: string | null;
  email_novio?: string | null;
};

function buildTastingEventTimes(tasting: TastingForCalendar) {
  const startDateTime = buildDateTime(tasting.fecha, tasting.hora_inicio);
  const endDateTime = tasting.hora_fin
    ? buildDateTime(tasting.fecha, tasting.hora_fin)
    : buildDateTime(
        tasting.fecha,
        addMinutesToTime(
          citaTimeFromDb(tasting.hora_inicio),
          DEFAULT_DURATION_MINUTES,
        ),
      );

  return { startDateTime, endDateTime };
}

function buildTastingEventDescription(
  tasting: TastingForCalendar,
  bodaNombre: string | null,
): string {
  const lines: string[] = [`Tipo: ${getTastingTipoLabel(tasting.tipo_cita)}`];

  if (bodaNombre?.trim()) {
    lines.push(`Boda: ${bodaNombre.trim()}`);
  }

  if (tasting.categoria?.trim()) {
    lines.push(`Categoría: ${tasting.categoria.trim()}`);
  }

  if (tasting.asignado_nombre?.trim()) {
    lines.push(`Asignado a: ${tasting.asignado_nombre.trim()}`);
  }

  if (tasting.direccion?.trim()) {
    lines.push(`Dirección: ${tasting.direccion.trim()}`);
  }

  if (tasting.notas?.trim()) {
    lines.push("", "Notas:", tasting.notas.trim());
  }

  return lines.join("\n");
}

function buildTastingEventResource(
  tasting: TastingForCalendar,
  bodaNombre: string | null,
): calendar_v3.Schema$Event {
  const timeZone = getCalendarTimezone();
  const { startDateTime, endDateTime } = buildTastingEventTimes(tasting);
  const summary = getTastingEventTitle(tasting);

  return {
    summary,
    description: buildTastingEventDescription(tasting, bodaNombre),
    location: tasting.direccion?.trim() || undefined,
    start: { dateTime: startDateTime, timeZone },
    end: { dateTime: endDateTime, timeZone },
  };
}

export async function createTastingCalendarEvent(
  tasting: TastingForCalendar,
  bodaNombre: string | null,
): Promise<CalendarEventResult> {
  try {
    const calendar = getCalendarClient();
    const calendarId = getCalendarId();

    const response = await calendar.events.insert({
      calendarId,
      sendUpdates: "none",
      requestBody: buildTastingEventResource(tasting, bodaNombre),
    });

    const result = mapEventResult(response.data);
    await patchEventAttendees(
      result.eventId,
      getTastingAttendeeEmails(tasting),
    );

    return result;
  } catch (error) {
    logGoogleApiError("calendar.createTastingCalendarEvent", error);
    throw error;
  }
}

export async function updateTastingCalendarEvent(
  googleEventId: string,
  tasting: TastingForCalendar,
  bodaNombre: string | null,
): Promise<CalendarEventResult> {
  try {
    const calendar = getCalendarClient();
    const calendarId = getCalendarId();

    const response = await calendar.events.patch({
      calendarId,
      eventId: googleEventId,
      sendUpdates: "none",
      requestBody: buildTastingEventResource(tasting, bodaNombre),
    });

    const result = mapEventResult(response.data);
    await patchEventAttendees(
      result.eventId,
      getTastingAttendeeEmails(tasting),
    );

    return result;
  } catch (error) {
    logGoogleApiError("calendar.updateTastingCalendarEvent", error);
    throw error;
  }
}

function normalizeBodaFecha(fecha: string): string {
  const trimmed = fecha.trim();
  const match = trimmed.match(/^(\d{4}-\d{2}-\d{2})/);
  if (!match) {
    throw new Error("La fecha de la boda no tiene un formato válido (YYYY-MM-DD).");
  }
  return match[1];
}

function addDaysToIsoDate(isoDate: string, days: number): string {
  const [year, month, day] = isoDate.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day + days));
  return date.toISOString().slice(0, 10);
}

export async function createBodaFechaConfirmadaEvent(
  fechaBoda: string,
  nombrePareja: string,
): Promise<CalendarEventResult> {
  try {
    const calendar = getCalendarClient();
    const calendarId = getCalendarId();
    const fecha = normalizeBodaFecha(fechaBoda);
    const nombre = nombrePareja.trim() || "Boda";

    const response = await calendar.events.insert({
      calendarId,
      sendUpdates: "none",
      requestBody: {
        summary: `🔒 Boda - ${nombre}`,
        description: `Fecha confirmada - Boda de ${nombre}`,
        start: { date: fecha },
        end: { date: addDaysToIsoDate(fecha, 1) },
      },
    });

    return mapEventResult(response.data);
  } catch (error) {
    logGoogleApiError("calendar.createBodaFechaConfirmadaEvent", error);
    throw error;
  }
}

export async function deleteCalendarEventIfExists(
  googleEventId: string | null | undefined,
): Promise<void> {
  if (!googleEventId?.trim()) return;

  try {
    await deleteCalendarEvent(googleEventId.trim());
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (!message.includes("404") && !message.toLowerCase().includes("not found")) {
      throw err;
    }
  }
}
