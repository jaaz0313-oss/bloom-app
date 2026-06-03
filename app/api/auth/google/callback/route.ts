import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { saveGoogleTokensForUser } from "@/lib/google-drive";
import {
  createGoogleOAuthClient,
  getGoogleOAuthCookieOptions,
  OAUTH_NEXT_COOKIE,
  OAUTH_STATE_COOKIE,
  OAUTH_USER_COOKIE,
} from "@/lib/google-oauth";

function redirectWithStatus(baseUrl: string, nextPath: string, status: string) {
  const safeNext = nextPath.startsWith("/") ? nextPath : "/";
  const url = new URL(safeNext, baseUrl);
  url.searchParams.set("google", status);
  return NextResponse.redirect(url);
}

function clearOAuthCookies(response: NextResponse) {
  const cookieOptions = getGoogleOAuthCookieOptions();
  response.cookies.set(OAUTH_STATE_COOKIE, "", { ...cookieOptions, maxAge: 0 });
  response.cookies.set(OAUTH_NEXT_COOKIE, "", { ...cookieOptions, maxAge: 0 });
  response.cookies.set(OAUTH_USER_COOKIE, "", { ...cookieOptions, maxAge: 0 });
  return response;
}

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const origin = requestUrl.origin;
  const cookieStore = await cookies();

  const savedState = cookieStore.get(OAUTH_STATE_COOKIE)?.value;
  const userId = cookieStore.get(OAUTH_USER_COOKIE)?.value;
  const nextPath = cookieStore.get(OAUTH_NEXT_COOKIE)?.value || "/";

  const oauthError = requestUrl.searchParams.get("error");
  if (oauthError) {
    const response = redirectWithStatus(origin, nextPath, "error");
    return clearOAuthCookies(response);
  }

  const code = requestUrl.searchParams.get("code");
  const state = requestUrl.searchParams.get("state");

  if (!code || !state || !savedState || state !== savedState || !userId) {
    const response = redirectWithStatus(origin, nextPath, "invalid");
    return clearOAuthCookies(response);
  }

  try {
    const oauth2Client = createGoogleOAuthClient(origin);
    const { tokens } = await oauth2Client.getToken(code);

    await saveGoogleTokensForUser(userId, {
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
    });

    const response = redirectWithStatus(origin, nextPath, "connected");
    return clearOAuthCookies(response);
  } catch (error) {
    console.error(error);
    const response = redirectWithStatus(origin, nextPath, "error");
    return clearOAuthCookies(response);
  }
}
