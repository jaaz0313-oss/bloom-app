import { google } from "googleapis";

export type GoogleServiceAccountCredentials = {
  email: string;
  key: string;
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
  return readServiceAccountEmailAndKey();
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
  });
}
