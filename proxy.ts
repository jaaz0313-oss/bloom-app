import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

const LOGIN_PATH = "/login";
const CLIENTE_PATH_PREFIX = "/cliente/";
const CLIENTE_API_PREFIX = "/api/cliente/";

function isLoginPath(pathname: string): boolean {
  return pathname === LOGIN_PATH || pathname.startsWith(`${LOGIN_PATH}/`);
}

function isClientePath(pathname: string): boolean {
  return pathname === "/cliente" || pathname.startsWith(CLIENTE_PATH_PREFIX);
}

function isClienteApiPath(pathname: string): boolean {
  return pathname.startsWith(CLIENTE_API_PREFIX);
}

/** Rutas accesibles sin sesión (link compartido o login). */
function isPublicPath(pathname: string): boolean {
  return (
    isLoginPath(pathname) ||
    isClientePath(pathname) ||
    isClienteApiPath(pathname)
  );
}

export async function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  if (isClientePath(pathname) || isClienteApiPath(pathname)) {
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
    "/api/cliente/:path*",
    /*
     * Excluye estáticos, /api/* (auth en cada handler), /cliente/* (vista pública)
     * y deja /login en el proxy solo para redirigir usuarios ya autenticados.
     * /api/cliente/* se incluye arriba como ruta pública del portal.
     */
    "/((?!_next/static|_next/image|favicon.ico|api/|cliente/).*)",
  ],
};
