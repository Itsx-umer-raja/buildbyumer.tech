// Single source of truth for this site's public URL.
//
// Set it with the NEXT_PUBLIC_SITE_URL environment variable (e.g. in
// Vercel: Project -> Settings -> Environment Variables). The fallback below
// is a PLACEHOLDER, not a real domain: "https://buildbyumer.vercel.app" is
// only a guess at the Vercel address this project will get. The owner MUST
// replace it with the site's real domain — see HOW-TO-DEPLOY.md. Do not
// treat the placeholder as the site's address.
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? "")
  .trim()
  .replace(/\/$/, "") || "https://buildbyumer.vercel.app";

/** True when the owner has set a real site URL (i.e. not the placeholder). */
export const SITE_URL_IS_PLACEHOLDER =
  SITE_URL === "https://buildbyumer.vercel.app";
