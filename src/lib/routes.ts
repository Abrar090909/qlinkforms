// Route rules shared by the proxy, auth actions and pages. Pure, no server imports.

export const DEFAULT_AFTER_LOGIN = "/dashboard";

// Everything under these paths needs a signed-in user. Keep in sync with src/app/(app).
const PROTECTED_PREFIXES = ["/dashboard", "/forms", "/settings"];

// Signed-in users are sent away from these to the dashboard.
const AUTH_PAGES = ["/login", "/signup"];

function matchesPrefix(path: string, prefix: string) {
  return path === prefix || path.startsWith(`${prefix}/`);
}

export function isProtectedPath(path: string) {
  return PROTECTED_PREFIXES.some((prefix) => matchesPrefix(path, prefix));
}

export function isAuthPage(path: string) {
  return AUTH_PAGES.includes(path);
}

/**
 * Turn an untrusted "next" value into a same-site path. Anything that could
 * leave the site (absolute URLs, "//host", "/\host") falls back to the default.
 */
export function safeNextPath(
  value: unknown,
  fallback = DEFAULT_AFTER_LOGIN,
): string {
  if (typeof value !== "string" || !value.startsWith("/")) return fallback;
  // Browsers treat "\" like "/", so "/\evil.com" is protocol-relative too.
  if (value.startsWith("//") || value.startsWith("/\\")) return fallback;
  // Control characters (tabs, newlines) are stripped by URL parsers and can hide "//".
  if (/[\u0000-\u001f\u007f]/.test(value)) return fallback;
  const base = "http://same-site.invalid";
  const url = new URL(value, base);
  if (url.origin !== base) return fallback;
  return `${url.pathname}${url.search}${url.hash}`;
}
