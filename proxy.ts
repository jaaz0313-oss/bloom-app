import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

const LOGIN_PATH = "/login";

/** PDF de cotización compartido por WhatsApp — sin sesión. */
const LEAD_COTIZACION_PDF_PATH =
  /^\/api\/leads\/[^/]+\/cotizacion-pdf\/?$/;

function isLoginPath(pathname: string): boolean {
  return pathname === LOGIN_PATH || pathname.startsWith(`${LOGIN_PATH}/`);
}

function isPublicPath(pathname: string): boolean {
  if (isLoginPath(pathname)) return true;
  return LEAD_COTIZACION_PDF_PATH.test(pathname);
}

export async function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  if (LEAD_COTIZACION_PDF_PATH.test(pathname)) {
    return NextResponse.next({ request });
  }

  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session && !isPublicPath(pathname)) {
    const loginUrl = new URL(LOGIN_PATH, request.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (session && isLoginPath(pathname)) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|api/leads/[^/]+/cotizacion-pdf).*)",
  ],
};
