import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { withTimeout } from "./lib/timeout";

// Keeps the login session fresh and sends signed-out visitors to /login.
export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });

  const path = request.nextUrl.pathname;
  const isPublic = path === "/" || path.startsWith("/login") || path.startsWith("/auth") || path.startsWith("/welcome") || path.startsWith("/landing/") || path.startsWith("/api/checkout") || path.startsWith("/api/stripe/") || path === "/terms" || path === "/privacy";
  const toLogin = (down = false) => {
    if (path === "/" && !down) return response; // the landing page
    if (path.startsWith("/api/")) return NextResponse.json(down ? { code: "auth_down", message: "Evee can’t reach the sign-in service right now. Try again in a minute." } : { code: "unauthorized", message: "Sign in again." }, { status: down ? 503 : 401 });
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = down ? "?down=1" : "";
    return NextResponse.redirect(url);
  };

  // Signed out: no need to ask Supabase anything.
  const hasSession = request.cookies.getAll().some((c) => c.name.startsWith("sb-") && c.name.includes("auth-token"));
  if (!hasSession) return isPublic ? response : toLogin();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        },
      },
    }
  );

  const res = await withTimeout(supabase.auth.getUser(), 6000);
  if (res === "timeout") return isPublic ? response : toLogin(true);
  const user = res.data.user;

  if (!user && !isPublic) return toLogin();
  if (user && path === "/login") {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    return NextResponse.redirect(url);
  }
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icons/|manifest.webmanifest|sw.js|offline.html|robots.txt).*)"],
};
