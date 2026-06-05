import { google } from "googleapis";
import type { calendar_v3 } from "googleapis";
import type { CitaRow } from "@/app/data/citas";
import { CITA_TIPO_LABELS } from "@/app/data/citas";
import { citaTimeFromDb } from "@/lib/cita-time-slots";
import { normalizeCitaFecha } from "@/lib/citas";
import { getGoogleServiceAccountCredentials } from "@/lib/google-service-account";

export type CalendarEventResult = {
  eventId: string;
  htmlLink: string | null;
  meetLink: null;
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
>;

const DEFAULT_TIMEZONE = "America/Bogota";
const DEFAULT_DURATION_MINUTES = 60;

function requireServiceAccountEnv() {
  return getGoogleServiceAccountCredentials();
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

  if (cita.link_meet?.trim()) {
    lines.push(`Meet: ${cita.link_meet.trim()}`);
  }

  if (cita.notas?.trim()) {
    lines.push("", "Notas:", cita.notas.trim());
  }

  return lines.join("\n");
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

function mapEventResult(event: calendar_v3.Schema$Event): CalendarEventResult {
  const eventId = event.id;
  if (!eventId) {
    throw new Error("Google Calendar no devolvió el ID del evento.");
  }

  return {
    eventId,
    htmlLink: event.htmlLink ?? null,
    meetLink: null,
  };
}

export async function createCalendarEvent(
  cita: CitaForCalendar,
  bodaNombre: string | null,
): Promise<CalendarEventResult> {
  const calendar = getCalendarClient();
  const calendarId = getCalendarId();
  const eventResource = buildEventResource(cita, bodaNombre);

  const response = await calendar.events.insert({
    calendarId,
    sendUpdates: "none",
    requestBody: eventResource,
  });

  return mapEventResult(response.data);
}

export async function updateCalendarEvent(
  googleEventId: string,
  cita: CitaForCalendar,
  bodaNombre: string | null,
): Promise<CalendarEventResult> {
  const calendar = getCalendarClient();
  const calendarId = getCalendarId();

  const response = await calendar.events.patch({
    calendarId,
    eventId: googleEventId,
    sendUpdates: "none",
    requestBody: buildEventResource(cita, bodaNombre),
  });

  return mapEventResult(response.data);
}

export async function deleteCalendarEvent(googleEventId: string): Promise<void> {
  const calendar = getCalendarClient();
  const calendarId = getCalendarId();

  await calendar.events.delete({
    calendarId,
    eventId: googleEventId,
    sendUpdates: "none",
  });
}
