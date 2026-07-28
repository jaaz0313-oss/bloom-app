import { google } from "googleapis";

export type GoogleServiceAccountCredentials = {
  email: string;
  key: string;
  /** Email de Workspace a impersonar (Domain-Wide Delegation). */
  subject: string | undefined;
};

/**
 * Credenciales del Service Account.
 * La private key normaliza `\n` literales a saltos de línea reales.
 */
export function getGoogleServiceAccountCredentials(): GoogleServiceAccountCredentials {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL?.trim();
  const privateKey = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY?.replace(
    /\\n/g,
    "\n",
  );
  const subject =
    process.env.GOOGLE_WORKSPACE_ADMIN_EMAIL?.trim() || undefined;

  if (!email || !privateKey) {
    throw new Error(
      "Faltan GOOGLE_SERVICE_ACCOUNT_EMAIL o GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY en las variables de entorno.",
    );
  }

  return { email, key: privateKey, subject };
}

/**
 * JWT para Google APIs.
 * Solo incluye `subject` cuando GOOGLE_WORKSPACE_ADMIN_EMAIL está definido.
 *
 * new google.auth.JWT({
 *   email,
 *   key: privateKey,
 *   scopes,
 *   subject: process.env.GOOGLE_WORKSPACE_ADMIN_EMAIL || undefined
 * })
 */
export function createGoogleJwtAuth(scopes: string[]) {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL?.trim();
  const privateKey = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY?.replace(
    /\\n/g,
    "\n",
  );
  const subject =
    process.env.GOOGLE_WORKSPACE_ADMIN_EMAIL?.trim() || undefined;

  if (!email || !privateKey) {
    throw new Error(
      "Faltan GOOGLE_SERVICE_ACCOUNT_EMAIL o GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY en las variables de entorno.",
    );
  }

  if (subject) {
    return new google.auth.JWT({
      email,
      key: privateKey,
      scopes,
      subject,
    });
  }

  return new google.auth.JWT({
    email,
    key: privateKey,
    scopes,
  });
}

/** Log detallado de errores de Google APIs / Auth para diagnóstico en servidor. */
export function logGoogleApiError(context: string, error: unknown): void {
  const err = error as {
    message?: string;
    code?: string | number;
    errors?: unknown;
    config?: { url?: string; method?: string };
    response?: {
      status?: number;
      statusText?: string;
      data?: unknown;
    };
  };

  console.error(`[google:${context}] error exacto:`, {
    message:
      err?.message ??
      (error instanceof Error ? error.message : String(error)),
    code: err?.code,
    errors: err?.errors,
    method: err?.config?.method,
    url: err?.config?.url,
    status: err?.response?.status,
    statusText: err?.response?.statusText,
    responseData: err?.response?.data,
    stack: error instanceof Error ? error.stack : undefined,
    hasWorkspaceSubject: Boolean(
      process.env.GOOGLE_WORKSPACE_ADMIN_EMAIL?.trim(),
    ),
  });
}
