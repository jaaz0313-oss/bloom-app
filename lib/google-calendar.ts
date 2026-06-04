import { google } from "googleapis";
import type { calendar_v3 } from "googleapis";
import type { CitaRow } from "@/app/data/citas";
import { CITA_TIPO_LABELS } from "@/app/data/citas";
import { citaTimeFromDb } from "@/lib/cita-time-slots";
import { normalizeCitaFecha } from "@/lib/citas";

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

function requireServiceAccountEnv() {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const key = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY?.replace(
    /\\n/g,
    "\n",
  );

  if (!email || !key) {
    throw new Error(
      "Faltan GOOGLE_SERVICE_ACCOUNT_EMAIL o GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY en las variables de entorno.",
    );
  }

  return { email, key };
}

export function getCalendarClient() {
  const { email, key } = requireServiceAccountEnv();

  const auth = new google.auth.JWT({
    email,
    key,
    scopes: ["https://www.googleapis.com/auth/calendar"],
  });

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

function normalizeAttendeeEmails(emails: string[] | null | undefined): string[] {
  if (!emails?.length) return [];

  const seen = new Set<string>();
  const result: string[] = [];

  for (const raw of emails) {
    const email = raw.trim().toLowerCase();
    if (!email || !email.includes("@") || seen.has(email)) continue;
    seen.add(email);
    result.push(email);
  }

  return result;
}

function buildEventDescription(
  cita: CitaForCalendar,
  bodaNombre: string | null,
): string {
  const lines: string[] = [];

  if (bodaNombre?.trim()) {
    lines.push(`Boda: ${bodaNombre.trim()}`);
  } else if (cita.boda_id) {
    lines.push(`Boda ID: ${cita.boda_id}`);
  } else if (cita.lead_id) {
    lines.push(`Lead ID: ${cita.lead_id}`);
  }

  lines.push(`Tipo de cita: ${CITA_TIPO_LABELS[cita.tipo]}`);

  if (cita.lugar?.trim()) {
    lines.push(`Lugar: ${cita.lugar.trim()}`);
  }

  if (cita.notas?.trim()) {
    lines.push("", "Notas:", cita.notas.trim());
  }

  return lines.join("\n");
}

function extractMeetLink(event: calendar_v3.Schema$Event): string | null {
  const videoEntry = event.conferenceData?.entryPoints?.find(
    (entry) =>
      entry.entryPointType === "video" ||
      entry.uri?.includes("meet.google.com"),
  );

  return (
    videoEntry?.uri?.trim() ||
    event.hangoutLink?.trim() ||
    null
  );
}

function buildConferenceData(requestId: string): calendar_v3.Schema$ConferenceData {
  return {
    createRequest: {
      requestId,
      conferenceSolutionKey: { type: "hangoutsMeet" },
    },
  };
}

function buildEventResource(
  cita: CitaForCalendar,
  bodaNombre: string | null,
  attendeeEmails: string[],
  options?: { includeConference?: boolean; conferenceRequestId?: string },
): calendar_v3.Schema$Event {
  const timeZone = getCalendarTimezone();
  const { startDateTime, endDateTime } = buildEventTimes(cita);

  const resource: calendar_v3.Schema$Event = {
    summary: cita.titulo.trim() || "Cita Celestia",
    description: buildEventDescription(cita, bodaNombre),
    location: cita.lugar?.trim() || undefined,
    start: { dateTime: startDateTime, timeZone },
    end: { dateTime: endDateTime, timeZone },
    attendees: attendeeEmails.map((email) => ({ email })),
  };

  if (options?.includeConference) {
    resource.conferenceData = buildConferenceData(
      options.conferenceRequestId ?? `bloom-${Date.now()}`,
    );
  }

  return resource;
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

export async function createCalendarEvent(
  cita: CitaForCalendar,
  bodaNombre: string | null,
  attendeeEmails: string[] = [],
): Promise<CalendarEventResult> {
  const calendar = getCalendarClient();
  const calendarId = getCalendarId();
  const emails = normalizeAttendeeEmails(attendeeEmails);

  const response = await calendar.events.insert({
    calendarId,
    conferenceDataVersion: 1,
    sendUpdates: emails.length > 0 ? "all" : "none",
    requestBody: buildEventResource(cita, bodaNombre, emails, {
      includeConference: true,
      conferenceRequestId: `bloom-create-${Date.now()}`,
    }),
  });

  return mapEventResult(response.data);
}

export async function updateCalendarEvent(
  googleEventId: string,
  cita: CitaForCalendar,
  bodaNombre: string | null,
  attendeeEmails: string[] = [],
): Promise<CalendarEventResult> {
  const calendar = getCalendarClient();
  const calendarId = getCalendarId();
  const emails = normalizeAttendeeEmails(attendeeEmails);

  const response = await calendar.events.patch({
    calendarId,
    eventId: googleEventId,
    sendUpdates: emails.length > 0 ? "all" : "none",
    requestBody: buildEventResource(cita, bodaNombre, emails),
  });

  return mapEventResult(response.data);
}

export async function deleteCalendarEvent(googleEventId: string): Promise<void> {
  const calendar = getCalendarClient();
  const calendarId = getCalendarId();

  await calendar.events.delete({
    calendarId,
    eventId: googleEventId,
    sendUpdates: "all",
  });
}
