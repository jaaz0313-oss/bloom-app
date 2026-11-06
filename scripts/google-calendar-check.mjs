import { readFileSync } from "node:fs";
import { google } from "googleapis";

const EXPECTED_ORGANIZER = "celestiaandevents@gmail.com";
const TEST_TITLE = "PRUEBA Bloom (borrar)";

function readEnvFile(path) {
  const values = {};
  let text = "";
  try {
    text = readFileSync(path, "utf8");
  } catch {
    return values;
  }

  for (const line of text.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) continue;
    const index = trimmed.indexOf("=");
    const key = trimmed.slice(0, index).trim();
    let value = trimmed.slice(index + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    values[key] = value;
  }

  return values;
}

function readable(error) {
  const status = error?.response?.status;
  const apiError = error?.response?.data?.error;
  const message =
    (typeof apiError === "object" && apiError?.message) ||
    error?.response?.data?.error_description ||
    error?.message ||
    "Google Calendar no respondió.";
  const clean = String(message)
    .replace(/ya29\.[A-Za-z0-9_-]+/g, "[redactado]")
    .replace(/1\/\/[A-Za-z0-9_-]+/g, "[redactado]")
    .replace(/\s+/g, " ")
    .trim();
  if (status === 401 || /invalid_grant/i.test(clean)) {
    return "El acceso de Google fue rechazado.";
  }
  if (status === 403) return "Google no permitió modificar el calendario.";
  if (clean.length <= 160 && !/access_token|refresh_token|client_secret/i.test(clean)) {
    return clean;
  }
  return "Google Calendar no respondió.";
}

const env = { ...readEnvFile(".env.local"), ...process.env };
const clientId = env.GOOGLE_CALENDAR_OAUTH_CLIENT_ID?.trim();
const clientSecret = env.GOOGLE_CALENDAR_OAUTH_CLIENT_SECRET?.trim();
const refreshToken = env.GOOGLE_CALENDAR_REFRESH_TOKEN?.trim();
const calendarId = env.GOOGLE_CALENDAR_ID?.trim();
const timeZone = env.GOOGLE_CALENDAR_TIMEZONE?.trim() || "America/Bogota";

if (!refreshToken) {
  console.log("El refresh del token no está configurado. No se creó ningún evento.");
  process.exit(1);
}
if (!clientId || !clientSecret) {
  console.log("Faltan el id o el secreto del cliente OAuth del calendario.");
  process.exit(1);
}
if (!calendarId) {
  console.log("Falta GOOGLE_CALENDAR_ID.");
  process.exit(1);
}

const oauth = new google.auth.OAuth2(clientId, clientSecret);
oauth.setCredentials({ refresh_token: refreshToken });

try {
  const access = await oauth.getAccessToken();
  if (!access?.token) {
    console.log("El refresh del token falló: Google no devolvió acceso.");
    process.exit(1);
  }
  console.log("El refresh del token funcionó.");
} catch (error) {
  console.log(`El refresh del token falló: ${readable(error)}`);
  process.exit(1);
}

const calendar = google.calendar({ version: "v3", auth: oauth });
const start = new Date(Date.now() + 24 * 60 * 60 * 1000);
const end = new Date(start.getTime() + 30 * 60 * 1000);
let eventId = null;

try {
  const inserted = await calendar.events.insert({
    calendarId,
    sendUpdates: "none",
    requestBody: {
      summary: TEST_TITLE,
      start: { dateTime: start.toISOString(), timeZone },
      end: { dateTime: end.toISOString(), timeZone },
    },
  });

  eventId = inserted.data.id ?? null;
  if (!eventId) {
    console.log("Google no devolvió el id del evento de prueba.");
    process.exit(1);
  }

  const organizer =
    inserted.data.organizer?.email?.trim().toLowerCase() || "(sin organizador)";
  console.log(`Organizador: ${organizer}`);
  if (organizer === EXPECTED_ORGANIZER) {
    console.log("El organizador es celestiaandevents@gmail.com.");
  } else {
    console.log(`El organizador es otra cuenta: ${organizer}.`);
  }

  const found = await calendar.events.get({ calendarId, eventId });
  const onConfiguredCalendar = found.data.id === eventId;
  const calendarIsCelestia =
    calendarId.toLowerCase() === EXPECTED_ORGANIZER;
  if (onConfiguredCalendar && calendarIsCelestia) {
    console.log(
      "El evento quedó en el calendario correcto: celestiaandevents@gmail.com.",
    );
  } else if (onConfiguredCalendar) {
    console.log(
      "El evento se leyó en GOOGLE_CALENDAR_ID, pero ese calendario no es celestiaandevents@gmail.com.",
    );
  } else {
    console.log("El evento no quedó en el calendario configurado.");
  }
} catch (error) {
  console.log(`No se pudo crear el evento de prueba: ${readable(error)}`);
  process.exitCode = 1;
} finally {
  if (eventId) {
    try {
      await calendar.events.delete({
        calendarId,
        eventId,
        sendUpdates: "none",
      });
      console.log("El evento de prueba se borró.");
    } catch (error) {
      console.log(
        `No se pudo borrar el evento de prueba "${TEST_TITLE}". Bórralo a mano en el calendario. ${readable(error)}`,
      );
      process.exitCode = 1;
    }
  }
}
