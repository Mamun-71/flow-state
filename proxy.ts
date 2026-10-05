import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { SESSION_MAX_AGE_SECONDS, capCookieMaxAge, signedInAtFromClaims } from "@/lib/auth-config";

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (cookiesToSet) => {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, capCookieMaxAge(options)),
          );
        },
      },
    },
  );

  // Refreshes the session if needed and verifies the JWT.
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;
  const { pathname } = request.nextUrl;
  const isLoginPage = pathname.startsWith("/login");
  const isAuthRoute = pathname.startsWith("/auth/");

  if (!claims) {
    if (isLoginPage || isAuthRoute) return response;
    return redirectWithCookies(request, response, "/login");
  }

  // 15 days after the real sign-in, sign out on this device.
  const signedInAt = signedInAtFromClaims(claims);
  const expired = !signedInAt || Date.now() / 1000 - signedInAt > SESSION_MAX_AGE_SECONDS;

  if (expired) {
    await supabase.auth.signOut({ scope: "local" });
    return redirectWithCookies(request, response, "/login?expired=1");
  }

  if (isLoginPage) return redirectWithCookies(request, response, "/");
  return response;
}

/** Redirect while carrying over any cookies Supabase set (refreshed or cleared). */
function redirectWithCookies(request: NextRequest, from: NextResponse, to: string) {
  const redirect = NextResponse.redirect(new URL(to, request.url));
  from.cookies.getAll().forEach((cookie) => redirect.cookies.set(cookie));
  return redirect;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest|.*\\.(?:svg|png|jpg|jpeg|webp|ico)$).*)",
  ],
};
