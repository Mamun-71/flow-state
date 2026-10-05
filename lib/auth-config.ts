export const SESSION_MAX_AGE_DAYS = 15;
export const SESSION_MAX_AGE_SECONDS = SESSION_MAX_AGE_DAYS * 24 * 60 * 60;

type CookieOptions = { maxAge?: number; [key: string]: unknown };

/**
 * @supabase/ssr always writes auth cookies with a 400-day lifetime, ignoring
 * `cookieOptions.maxAge`. Cap it here so the browser drops them after 15 days too.
 * (The hard limit — 15 days after sign-in — is enforced in proxy.ts.)
 */
export function capCookieMaxAge<T extends CookieOptions>(options: T): T {
  if (options.maxAge && options.maxAge > SESSION_MAX_AGE_SECONDS) {
    return { ...options, maxAge: SESSION_MAX_AGE_SECONDS };
  }
  return options;
}

/** Whole days left before this device's session ends, or null if unknown. */
export function sessionDaysLeft(claims: { amr?: unknown } | undefined): number | null {
  const signedInAt = claims ? signedInAtFromClaims(claims) : null;
  if (!signedInAt) return null;
  return Math.max(0, Math.ceil((signedInAt + SESSION_MAX_AGE_SECONDS - Date.now() / 1000) / 86400));
}

/** Time of the real sign-in (seconds) from the JWT `amr` claim, unchanged by token refreshes. */
export function signedInAtFromClaims(claims: { amr?: unknown }): number | null {
  const amr = Array.isArray(claims.amr) ? claims.amr : [];
  const timestamps = amr
    .map((a) => (a && typeof a === "object" && "timestamp" in a ? Number(a.timestamp) : NaN))
    .filter((t) => Number.isFinite(t));
  return timestamps.length ? Math.max(...timestamps) : null;
}
