import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Use — PDF World Free PDF Tools",
  description:
    "The terms for using PDF World's free PDF tools: use files you have the right to use, keep backups, and note the honest limits stated on each tool page.",
  alternates: { canonical: "/terms" },
  openGraph: {
    type: "website",
    url: "/terms",
    siteName: "PDF World",
    title: "Terms of Use — PDF World Free PDF Tools | PDF World",
    description:
      "The terms for using PDF World's free PDF tools: use files you have the right to use, keep backups, and note the honest limits stated on each tool page.",
    images: [{ url: "/pdf-world-icon-512.png", width: 512, height: 512, alt: "PDF World logo" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Terms of Use — PDF World Free PDF Tools | PDF World",
    description:
      "The terms for using PDF World's free PDF tools: use files you have the right to use, keep backups, and note the honest limits stated on each tool page.",
    images: ["/pdf-world-icon-512.png"],
  },
};

export default function TermsPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <h1 className="font-display text-3xl font-bold text-slate-900 sm:text-4xl">Terms of Use</h1>
      <p className="mt-2 text-sm text-slate-500">Last updated: 24 November 2026</p>
      <div className="mt-6 space-y-5 leading-relaxed text-slate-700">
        <p>
          PDF World provides free PDF tools that run in your browser. By using the site, you
          agree to these terms.
        </p>
        <h2 className="pt-2 font-display text-2xl font-bold text-slate-900">Use the tools lawfully</h2>
        <p>
          <strong>Use the tools lawfully.</strong> Only process files you have the right to
          use. Do not use the tools to infringe copyright, to handle material you are not
          entitled to handle, or to try to open a password-protected file whose password you
          do not know. The Unlock tool only works with a password you already know, and it
          never guesses or cracks passwords.
        </p>
        <h2 className="font-display text-2xl font-bold text-slate-900">Your files are your responsibility</h2>
        <p>
          <strong>Your files are your responsibility.</strong> Processing happens on your own
          device. Keep a backup of important files before using any tool, and check the result
          before relying on it.
        </p>
        <h2 className="font-display text-2xl font-bold text-slate-900">No warranty</h2>
        <p>
          <strong>No warranty.</strong> The tools are provided &ldquo;as is&rdquo;, without
          warranties of any kind. In particular, compression results are approximate, and the
          Protect tool uses the basic 40-bit RC4 encryption level, which is not strong by
          modern standards — do not rely on it for highly sensitive documents.
        </p>
        <h2 className="font-display text-2xl font-bold text-slate-900">Liability</h2>
        <p>
          <strong>Liability.</strong> To the fullest extent allowed by law, PDF World is not
          liable for any loss or damage arising from the use of the site or its tools,
          including loss of files.
        </p>
        <h2 className="font-display text-2xl font-bold text-slate-900">Availability</h2>
        <p>
          <strong>Availability.</strong> The site and its tools may change, or stop being
          available, at any time without notice.
        </p>
        <p>
          <strong>Code licence.</strong> The site&apos;s original code is released under the
          MIT License, which is included with the project.
        </p>
      </div>
    </div>
  );
}
