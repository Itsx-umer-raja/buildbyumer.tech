// Single source of truth for this site's public URL.
//
// Set it with the NEXT_PUBLIC_SITE_URL environment variable (e.g. in
// Vercel: Project -> Settings -> Environment Variables). The fallback below
// is the site's real domain, https://www.builtbyumer.tech. If the site ever
// moves, set NEXT_PUBLIC_SITE_URL instead of editing this file.
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? "")
  .trim()
  .replace(/\/$/, "") || "https://www.builtbyumer.tech";

/**
 * Kept for backwards compatibility. The fallback above is the site's real
 * domain, so there is no placeholder URL any more — this is always false.
 */
export const SITE_URL_IS_PLACEHOLDER = false;
