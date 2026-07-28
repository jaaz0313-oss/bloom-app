export function getGoogleServiceAccountCredentials(): {
  email: string;
  key: string;
  /** Email de Workspace a impersonar (Domain-Wide Delegation). */
  subject: string | undefined;
} {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL?.trim();
  const rawKey = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY;
  const key = rawKey?.replace(/\\n/g, "\n");
  const subject = process.env.GOOGLE_WORKSPACE_ADMIN_EMAIL?.trim() || undefined;

  console.log(
    "Service account email:",
    email ? "definido" : "undefined",
  );
  console.log(
    "Private key:",
    rawKey
      ? `definido (primeros 50 chars: ${rawKey.substring(0, 50)})`
      : "undefined",
  );
  console.log(
    "Workspace subject:",
    subject ? "definido" : "undefined",
  );

  if (!email || !key) {
    throw new Error(
      "Faltan GOOGLE_SERVICE_ACCOUNT_EMAIL o GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY en las variables de entorno.",
    );
  }

  return { email, key, subject };
}
