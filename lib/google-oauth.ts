import { google } from "googleapis";

export const GOOGLE_DRIVE_SCOPES = [
  "https://www.googleapis.com/auth/drive.file",
  "https://www.googleapis.com/auth/userinfo.email",
  "https://www.googleapis.com/auth/userinfo.profile",
];

const OAUTH_STATE_COOKIE = "bloom_google_oauth_state";
const OAUTH_NEXT_COOKIE = "bloom_google_oauth_next";
const OAUTH_USER_COOKIE = "bloom_google_oauth_user";

export { OAUTH_NEXT_COOKIE, OAUTH_STATE_COOKIE, OAUTH_USER_COOKIE };

function requireGoogleEnv() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error(
      "Faltan GOOGLE_CLIENT_ID o GOOGLE_CLIENT_SECRET en las variables de entorno.",
    );
  }

  return { clientId, clientSecret };
}

export function getGoogleRedirectUri(origin?: string): string {
  if (process.env.GOOGLE_REDIRECT_URI) {
    return process.env.GOOGLE_REDIRECT_URI.replace(/\/$/, "");
  }

  const base =
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ??
    origin?.replace(/\/$/, "") ??
    "http://localhost:3000";

  return `${base}/api/auth/google/callback`;
}

export function createGoogleOAuthClient(origin?: string) {
  const { clientId, clientSecret } = requireGoogleEnv();

  return new google.auth.OAuth2(
    clientId,
    clientSecret,
    getGoogleRedirectUri(origin),
  );
}

export type GoogleOAuthCookieOptions = {
  httpOnly: true;
  secure: boolean;
  sameSite: "lax";
  maxAge: number;
  path: string;
};

export function getGoogleOAuthCookieOptions(): GoogleOAuthCookieOptions {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 600,
    path: "/",
  };
}
