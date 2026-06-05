export function getGoogleServiceAccountCredentials(): {
  email: string;
  key: string;
} {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL?.trim();
  const rawKey = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY;
  const key = rawKey?.replace(/\\n/g, "\n");

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

  if (!email || !key) {
    throw new Error(
      "Faltan GOOGLE_SERVICE_ACCOUNT_EMAIL o GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY en las variables de entorno.",
    );
  }

  return { email, key };
}
