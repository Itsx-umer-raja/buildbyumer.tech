import type { NextConfig } from "next";

// Content-Security-Policy. Nonce-based CSP would force every page to render
// dynamically (see node_modules/next/dist/docs/01-app/02-guides/
// content-security-policy.md), which would kill static prerendering and CDN
// caching, so this site uses the no-nonce form with 'unsafe-inline' (required
// by Next.js inline scripts and by the site's own inline styles).
// Every external host below is one the code actually uses — verified by grep:
//  - pagead2.googlesyndication.com / googletagservices / adservice.google.com
//    = Google AdSense script (app/layout.tsx). The frame/img/connect entries
//    for *.googlesyndication.com / *.doubleclick.net are for ad units when
//    they go live; the script alone only needs pagead2.
//  - cdn.jsdelivr.net = Tesseract.js worker + core (components/tools/
//    group-edit2.tsx) and fontkit (lib/text-tools.ts). The Tesseract core is
//    WebAssembly, which needs 'wasm-unsafe-eval' to compile.
//  - tessdata.projectnaptha.com = Tesseract language data.
//  - api.mymemory.translated.net = Translate PDF (lib/edit-ai-helpers.ts).
//  - github.com / raw.githubusercontent.com = fonts fetched by
//    lib/text-tools.ts (fontkit +esm loader).
// HSTS is NOT set here — Vercel already sends Strict-Transport-Security and
// a duplicate header would be invalid. Access-Control-Allow-Origin is also
// left to Vercel: it is harmless on a public static site with no credentials.
const cspHeader = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval' https://pagead2.googlesyndication.com https://www.googletagservices.com https://adservice.google.com https://cdn.jsdelivr.net",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  "connect-src 'self' blob: https://api.mymemory.translated.net https://cdn.jsdelivr.net https://tessdata.projectnaptha.com https://github.com https://raw.githubusercontent.com https://pagead2.googlesyndication.com https://*.googlesyndication.com https://googleads.g.doubleclick.net",
  "frame-src 'self' blob: https://*.googlesyndication.com https://googleads.g.doubleclick.net https://tpc.googlesyndication.com https://*.doubleclick.net",
  "child-src 'self' blob: https://*.googlesyndication.com https://googleads.g.doubleclick.net https://tpc.googlesyndication.com https://*.doubleclick.net",
  "worker-src 'self' blob: https://cdn.jsdelivr.net",
  "media-src 'self' blob: data:",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'self'",
  "manifest-src 'self'",
  "upgrade-insecure-requests",
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: cspHeader },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), payment=(), usb=()",
  },
];

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  partialPrefetching: true,
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: securityHeaders,
      },
    ];
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
