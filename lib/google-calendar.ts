import { google } from "googleapis";
import type { calendar_v3 } from "googleapis";
import type { CitaRow } from "@/app/data/citas";
import { CITA_TIPO_LABELS } from "@/app/data/citas";
import { citaTimeFromDb } from "@/lib/cita-time-slots";
import { getTastingEventTitle, getTastingTipoLabel } from "@/lib/tastings";
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
  | "emails_involucrados"
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

  const emails = (cita.emails_involucrados ?? [])
    .map((email) => email.trim())
    .filter(Boolean);
  if (emails.length > 0) {
    lines.push(`Email: ${emails.join(", ")}`);
  }

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

function buildTastingClientesLine(
  emailNovia: string | null | undefined,
  emailNovio: string | null | undefined,
): string | null {
  const novia = emailNovia?.trim() || "";
  const novio = emailNovio?.trim() || "";
  if (!novia && !novio) return null;
  if (novia && novio) return `Clientes: ${novia} / ${novio}`;
  return `Clientes: ${novia || novio}`;
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

  const emailInvitado = tasting.email_invitado?.trim();
  if (emailInvitado) {
    lines.push(`Proveedor: ${emailInvitado}`);
  }

  const clientesLine = buildTastingClientesLine(
    tasting.email_novia,
    tasting.email_novio,
  );
  if (clientesLine) {
    lines.push(clientesLine);
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
  const calendar = getCalendarClient();
  const calendarId = getCalendarId();

  const response = await calendar.events.insert({
    calendarId,
    sendUpdates: "none",
    requestBody: buildTastingEventResource(tasting, bodaNombre),
  });

  return mapEventResult(response.data);
}

export async function updateTastingCalendarEvent(
  googleEventId: string,
  tasting: TastingForCalendar,
  bodaNombre: string | null,
): Promise<CalendarEventResult> {
  const calendar = getCalendarClient();
  const calendarId = getCalendarId();

  const response = await calendar.events.patch({
    calendarId,
    eventId: googleEventId,
    sendUpdates: "none",
    requestBody: buildTastingEventResource(tasting, bodaNombre),
  });

  return mapEventResult(response.data);
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
