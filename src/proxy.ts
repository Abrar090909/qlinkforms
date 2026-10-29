import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";
import { clientEnv } from "@/lib/env";
import { DEFAULT_AFTER_LOGIN, isAuthPage, isProtectedPath } from "@/lib/routes";

// Runs before every page request: refreshes the Supabase session cookie and
// does optimistic redirects. Pages still verify the user themselves.
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    clientEnv.NEXT_PUBLIC_SUPABASE_URL,
    clientEnv.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll(cookiesToSet, headers) {
          // Pass refreshed tokens to this request's pages and back to the browser.
          for (const { name, value } of cookiesToSet)
            request.cookies.set(name, value);
          response = NextResponse.next({ request });
          for (const { name, value, options } of cookiesToSet) {
            response.cookies.set(name, value, options);
          }
          for (const [key, value] of Object.entries(headers))
            response.headers.set(key, value);
        },
      },
    },
  );

  // Verifies the JWT and refreshes it if expired. Keep this right after
  // createServerClient so every request gets a fresh session.
  const { data } = await supabase.auth.getClaims();
  const signedIn = Boolean(data?.claims);
  const { pathname, search } = request.nextUrl;

  if (!signedIn && isProtectedPath(pathname)) {
    const url = new URL("/login", request.url);
    url.searchParams.set("next", `${pathname}${search}`);
    return redirectWithCookies(url, response);
  }
  if (signedIn && isAuthPage(pathname)) {
    return redirectWithCookies(
      new URL(DEFAULT_AFTER_LOGIN, request.url),
      response,
    );
  }
  return response;
}

function redirectWithCookies(url: URL, from: NextResponse) {
  const redirect = NextResponse.redirect(url);
  for (const cookie of from.cookies.getAll()) redirect.cookies.set(cookie);
  return redirect;
}

export const config = {
  // Skip static files and images.
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
