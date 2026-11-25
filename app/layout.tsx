import type { Metadata } from "next";
import Script from "next/script";
import { Fraunces, Inter } from "next/font/google";
import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import { Logo } from "@/components/logo";
import { MobileMenu } from "@/components/mobile-menu";
import { GithubIcon } from "@/components/github-icon";
import { SITE_URL } from "@/lib/site";
import "./globals.css";

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  weight: ["600", "700"],
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "PDF World — Free PDF Tools Online | Merge, Split, Compress, Convert",
    template: "%s | PDF World",
  },
  description:
    "PDF World — free PDF tools in your browser: merge, split, compress, convert and secure PDFs, plus a free resume builder. No sign-up, no uploads.",
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    siteName: "PDF World",
    locale: "en_US",
    url: "/",
    title: "PDF World — Free PDF Tools Online | Merge, Split, Compress, Convert",
    description:
      "PDF World — free PDF tools in your browser: merge, split, compress, convert and secure PDFs, plus a free resume builder. No sign-up, no uploads.",
    images: [{ url: "/pdf-world-icon-512.png", width: 512, height: 512, alt: "PDF World logo" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "PDF World — Free PDF Tools Online | Merge, Split, Compress, Convert",
    description:
      "PDF World — free PDF tools in your browser: merge, split, compress, convert and secure PDFs, plus a free resume builder. No sign-up, no uploads.",
    images: ["/pdf-world-icon-512.png"],
  },
  // AdSense account verification + ad script. No ad units yet, so no ads display.
  // Google Search Console site verification.
  other: {
    "google-adsense-account": "ca-pub-3234707846484197",
    "google-site-verification": "zmGNjTLRyuaCke1vxE94q4d8uypZruTRLVNN6KKT4nA",
  },
};

const NAV = [
  { href: "/tools", label: "All tools" },
  { href: "/resume", label: "Resume Builder" },
  { href: "/about", label: "About" },
  { href: "/privacy", label: "Privacy" },
  { href: "/terms", label: "Terms" },
  { href: "/contact", label: "Contact" },
];

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${fraunces.variable} ${inter.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <Script
          async
          src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-3234707846484197"
          crossOrigin="anonymous"
          strategy="afterInteractive"
        />
        <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-[#faf9f6]/90 backdrop-blur">
          <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
            <Link href="/" aria-label="PDF World — home">
              <Logo />
            </Link>
            <nav className="hidden items-center gap-6 text-sm font-medium text-slate-600 md:flex">
              {NAV.map((item) => (
                <Link key={item.href} href={item.href} className="hover:text-teal-700">
                  {item.label}
                </Link>
              ))}
            </nav>
            <div className="flex items-center gap-2 sm:gap-3">
              <MobileMenu />
              <a
                href="https://github.com/Itsx-umer-raja/buildbyumer.tech"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-full border border-slate-300 bg-white px-3.5 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:-translate-y-0.5 hover:border-slate-900 hover:text-slate-900 hover:shadow-md"
              >
                <GithubIcon className="h-4 w-4" />
                <span className="hidden sm:inline">View on GitHub</span>
                <span className="sm:hidden">GitHub</span>
              </a>
              <Link
                href="/tools"
                className="btn-animated rounded-full px-4 py-2 text-sm font-semibold text-white shadow-sm"
              >
                Use a tool
              </Link>
            </div>
          </div>
        </header>

        <main className="flex-1">{children}</main>

        <footer className="border-t border-slate-200 bg-white">
          <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
            <div className="flex flex-col gap-8 md:flex-row md:justify-between">
              <div className="max-w-sm">
                <Logo wordmarkClassName="font-display text-xl font-bold text-slate-900" />
                <p className="mt-3 text-sm leading-relaxed text-slate-600">
                  Free PDF tools that run in your browser. Your files are
                  processed on your own device and never uploaded to a server.
                </p>
                <p className="mt-3 flex items-start gap-2 text-sm text-slate-600">
                  <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-teal-700" />
                  No accounts. No uploads. No tracking of your documents.
                </p>
                <p className="mt-4">
                  <a
                    href="https://github.com/Itsx-umer-raja/buildbyumer.tech"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-sm font-semibold text-slate-700 transition hover:text-teal-700"
                  >
                    <GithubIcon className="h-4 w-4" />
                    View on GitHub
                  </a>
                </p>
              </div>
              <nav className="grid grid-cols-2 gap-x-12 gap-y-2 text-sm text-slate-600">
                <Link href="/tools" className="hover:text-teal-700">All tools</Link>
                <Link href="/resume" className="hover:text-teal-700">Resume Builder</Link>
                <Link href="/about" className="hover:text-teal-700">About</Link>
                <Link href="/privacy" className="hover:text-teal-700">Privacy</Link>
                <Link href="/terms" className="hover:text-teal-700">Terms</Link>
                <Link href="/contact" className="hover:text-teal-700">Contact</Link>
              </nav>
            </div>
            <p className="mt-8 border-t border-slate-100 pt-4 text-xs text-slate-500">
              © 2026 PDF World. Original code, released under the MIT License. PDF World
              is an independent project and is not affiliated with any other PDF tool
              provider.
            </p>
          </div>
        </footer>
      </body>
    </html>
  );
}
