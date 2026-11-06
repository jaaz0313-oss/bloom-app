import { google } from "googleapis";

export type GoogleServiceAccountCredentials = {
  email: string;
  key: string;
  /** Email de Workspace para Domain-Wide Delegation (opcional). */
  subject: string | undefined;
};

function readServiceAccountEmailAndKey(): { email: string; key: string } {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL?.trim();
  const privateKey = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY?.replace(
    /\\n/g,
    "\n",
  );

  if (!email || !privateKey) {
    throw new Error(
      "Faltan GOOGLE_SERVICE_ACCOUNT_EMAIL o GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY en las variables de entorno.",
    );
  }

  return { email, key: privateKey };
}

/**
 * Credenciales del Service Account.
 * La private key normaliza `\n` literales a saltos de línea reales.
 */
export function getGoogleServiceAccountCredentials(): GoogleServiceAccountCredentials {
  const { email, key } = readServiceAccountEmailAndKey();
  const subject =
    process.env.GOOGLE_WORKSPACE_ADMIN_EMAIL?.trim() || undefined;
  return { email, key, subject };
}

/**
 * JWT sin impersonación — contexto original del Service Account.
 * Usar para crear / editar / eliminar eventos y Drive.
 */
export function createGoogleJwtAuth(scopes: string[]) {
  const { email, key } = readServiceAccountEmailAndKey();
  return new google.auth.JWT({
    email,
    key,
    scopes,
  });
}

/**
 * JWT con Domain-Wide Delegation (`subject`).
 * Usar SOLO para agregar attendees a Calendar.
 */
export function createGoogleJwtAuthWithDelegation(scopes: string[]) {
  const { email, key } = readServiceAccountEmailAndKey();
  const subject = process.env.GOOGLE_WORKSPACE_ADMIN_EMAIL?.trim();

  if (!subject) {
    throw new Error(
      "Falta GOOGLE_WORKSPACE_ADMIN_EMAIL para Domain-Wide Delegation.",
    );
  }

  return new google.auth.JWT({
    email,
    key,
    scopes,
    subject,
  });
}

export function hasGoogleWorkspaceDelegation(): boolean {
  return Boolean(process.env.GOOGLE_WORKSPACE_ADMIN_EMAIL?.trim());
}

const SECRET_ASSIGNMENT =
  /((?:access_token|refresh_token|id_token|client_secret|private_key|authorization|bearer)\s*[=:]\s*)([^\s,&]+)/gi;

/** Quita tokens y secretos de un texto antes de escribirlo en logs o en pantalla. */
export function redactSecrets(value: string): string {
  return value
    .replace(SECRET_ASSIGNMENT, "$1[redactado]")
    .replace(/ya29\.[A-Za-z0-9_-]+/g, "[redactado]")
    .replace(/1\/\/[A-Za-z0-9_-]+/g, "[redactado]");
}

type GoogleErrorDetails = {
  status: number | null;
  code: string | number | null;
  message: string;
  reason: string | null;
};

export function readGoogleErrorDetails(error: unknown): GoogleErrorDetails {
  const err = error as {
    message?: string;
    code?: string | number;
    response?: {
      status?: number;
      data?: {
        error?:
          | string
          | {
              code?: string | number;
              message?: string;
              status?: string;
              errors?: Array<{ reason?: string; message?: string }>;
            };
        error_description?: string;
      };
    };
  };

  const dataError = err.response?.data?.error;
  const apiMessage =
    typeof dataError === "string"
      ? dataError
      : dataError?.message || err.response?.data?.error_description;
  const reason =
    typeof dataError === "object" && dataError
      ? dataError.errors?.[0]?.reason ?? dataError.status ?? null
      : null;
  const raw =
    apiMessage ||
    err.message ||
    (error instanceof Error ? error.message : String(error));

  return {
    status: err.response?.status ?? null,
    code: (typeof dataError === "object" && dataError ? dataError.code : null) ?? err.code ?? null,
    message: redactSecrets(String(raw)),
    reason,
  };
}

function isAppCalendarMessage(message: string): boolean {
  return (
    message.startsWith("Falta ") ||
    message.startsWith("Hay GOOGLE_") ||
    message.startsWith("Google Calendar no devolvió") ||
    message.startsWith("Google no confirmó") ||
    message.startsWith("Falta aplicar la migración")
  );
}

/** Motivo corto para mostrar en la app. No incluye tokens. */
export function readableGoogleCalendarError(error: unknown): string {
  if (error instanceof Error && isAppCalendarMessage(error.message)) {
    return redactSecrets(error.message);
  }

  const details = readGoogleErrorDetails(error);
  const blob = `${details.message} ${details.reason ?? ""}`;
  if (
    details.status === 401 ||
    /invalid_grant|unauthorized|authError/i.test(blob)
  ) {
    return "El acceso de Google fue rechazado.";
  }
  if (details.status === 403 || /forbidden|insufficient/i.test(blob)) {
    return "Google no permitió modificar el calendario.";
  }
  if (details.status === 404) {
    return "No se encontró el evento en el calendario.";
  }
  if (details.status === 429) {
    return "Google está ocupado. Intenta de nuevo.";
  }

  const clean = details.message.replace(/\s+/g, " ").trim();
  if (clean && clean.length <= 160 && !/[{}]/.test(clean)) return clean;
  return "Google Calendar no respondió.";
}

/** Código y mensaje de Google, sin tokens, secretos ni access tokens. */
export function logGoogleApiError(context: string, error: unknown): void {
  const details = readGoogleErrorDetails(error);
  console.error(`[google:${context}]`, {
    code: details.code,
    status: details.status,
    reason: details.reason,
    message: details.message,
  });
}
