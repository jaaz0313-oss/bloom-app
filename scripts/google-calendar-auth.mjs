import { exec } from "node:child_process";
import { readFileSync } from "node:fs";
import http from "node:http";
import { google } from "googleapis";

const REDIRECT_PORT = 8787;
const REDIRECT_PATH = "/callback";
const REDIRECT_URI = `http://127.0.0.1:${REDIRECT_PORT}${REDIRECT_PATH}`;
const SCOPE = "https://www.googleapis.com/auth/calendar.events";

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

function openBrowser(url) {
  const command =
    process.platform === "darwin"
      ? `open ${JSON.stringify(url)}`
      : process.platform === "win32"
        ? `start "" ${JSON.stringify(url)}`
        : `xdg-open ${JSON.stringify(url)}`;

  exec(command, (error) => {
    if (error) {
      console.log("No pude abrir el navegador. Copia esta dirección:");
      console.log(url);
    }
  });
}

const env = { ...readEnvFile(".env.local"), ...process.env };
const clientId = env.GOOGLE_CALENDAR_OAUTH_CLIENT_ID?.trim();
const clientSecret = env.GOOGLE_CALENDAR_OAUTH_CLIENT_SECRET?.trim();

if (!clientId || !clientSecret) {
  console.log("Faltan datos para autorizar el calendario.\n");
  console.log("En .env.local agrega estas dos líneas (el secreto no se imprime aquí):");
  console.log("  GOOGLE_CALENDAR_OAUTH_CLIENT_ID");
  console.log("  GOOGLE_CALENDAR_OAUTH_CLIENT_SECRET");
  console.log("");
  console.log(
    "GOOGLE_CLIENT_ID y GOOGLE_CLIENT_SECRET están en el entorno, pero la app no los usa. No los reutilizo para no mezclarlos con otro cliente de Google. Si ese cliente es el del calendario, copia sus valores a los nombres de arriba.",
  );
  console.log("");
  console.log("En Google Cloud, el cliente OAuth debe permitir esta dirección de retorno:");
  console.log(`  ${REDIRECT_URI}`);
  process.exit(1);
}

const oauth = new google.auth.OAuth2(clientId, clientSecret, REDIRECT_URI);
const authUrl = oauth.generateAuthUrl({
  access_type: "offline",
  prompt: "consent",
  scope: [SCOPE],
});

console.log("Autorización del calendario de Celestia");
console.log("");
console.log("1. Se va a abrir Google. Entra con celestiaandevents@gmail.com.");
console.log("2. Si dice que la app no está verificada: Avanzado → Continuar.");
console.log("3. Acepta el permiso de eventos del calendario.");
console.log("4. El token aparece una sola vez en esta terminal. Pégalo en .env.local.");
console.log("");
console.log("Dirección de retorno que debe existir en el cliente OAuth:");
console.log(`  ${REDIRECT_URI}`);
console.log("");

const server = http.createServer(async (request, response) => {
  const url = new URL(request.url ?? "/", REDIRECT_URI);
  if (url.pathname !== REDIRECT_PATH) {
    response.writeHead(404);
    response.end("No encontrado");
    return;
  }

  const error = url.searchParams.get("error");
  const code = url.searchParams.get("code");

  if (error || !code) {
    response.writeHead(400, { "Content-Type": "text/html; charset=utf-8" });
    response.end(
      "<p>No se autorizó. Puedes cerrar esta ventana y volver a la terminal.</p>",
    );
    console.error(error ? `Google canceló la autorización: ${error}` : "No llegó el código.");
    server.close();
    process.exit(1);
  }

  try {
    const { tokens } = await oauth.getToken(code);
    response.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    response.end(
      "<p>Listo. Vuelve a la terminal, copia el token y cierra esta ventana.</p>",
    );

    if (!tokens.refresh_token) {
      console.error(
        "Google no devolvió un refresh token. Quita el acceso de la app en https://myaccount.google.com/permissions y vuelve a correr este comando.",
      );
      server.close();
      process.exit(1);
    }

    console.log("Pega esta línea en .env.local:\n");
    console.log(`GOOGLE_CALENDAR_REFRESH_TOKEN=${tokens.refresh_token}`);
    console.log("\nNo la compartas ni la subas al repositorio.");
    server.close();
    process.exit(0);
  } catch (tokenError) {
    response.writeHead(500, { "Content-Type": "text/html; charset=utf-8" });
    response.end("<p>No se pudo completar. Revisa la terminal.</p>");
    console.error(
      tokenError instanceof Error ? tokenError.message : tokenError,
    );
    server.close();
    process.exit(1);
  }
});

server.listen(REDIRECT_PORT, "127.0.0.1", () => {
  openBrowser(authUrl);
});

setTimeout(() => {
  console.error("Pasaron 5 minutos sin respuesta. Vuelve a correr el comando.");
  server.close();
  process.exit(1);
}, 5 * 60 * 1000).unref();
