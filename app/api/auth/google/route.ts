import { randomBytes } from "crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getCurrentAuthUser } from "@/lib/auth/user-profiles";
import {
  createGoogleOAuthClient,
  getGoogleOAuthCookieOptions,
  GOOGLE_DRIVE_SCOPES,
  OAUTH_NEXT_COOKIE,
  OAUTH_STATE_COOKIE,
  OAUTH_USER_COOKIE,
} from "@/lib/google-oauth";

export async function GET(request: Request) {
  try {
    const user = await getCurrentAuthUser();
    if (!user) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    const requestUrl = new URL(request.url);
    const nextPath = requestUrl.searchParams.get("next") || "/";
    const origin = requestUrl.origin;
    const state = randomBytes(32).toString("hex");
    const cookieOptions = getGoogleOAuthCookieOptions();
    const cookieStore = await cookies();

    cookieStore.set(OAUTH_STATE_COOKIE, state, cookieOptions);
    cookieStore.set(OAUTH_NEXT_COOKIE, nextPath, cookieOptions);
    cookieStore.set(OAUTH_USER_COOKIE, user.id, cookieOptions);

    const oauth2Client = createGoogleOAuthClient(origin);
    const authUrl = oauth2Client.generateAuthUrl({
      access_type: "offline",
      prompt: "consent",
      scope: GOOGLE_DRIVE_SCOPES,
      include_granted_scopes: true,
      state,
    });

    return NextResponse.redirect(authUrl);
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "No se pudo iniciar la conexión con Google.",
      },
      { status: 500 },
    );
  }
}
