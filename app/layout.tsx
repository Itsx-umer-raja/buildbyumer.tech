import type { Metadata } from "next";
import { Fraunces, Inter } from "next/font/google";
import Link from "next/link";
import { FileText, ShieldCheck } from "lucide-react";
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
  title: "PageForge — Free PDF tools that run in your browser",
  description:
    "Merge, split, compress, convert, rotate and secure PDF files. Every tool runs entirely in your browser — your files are never uploaded anywhere.",
};

const NAV = [
  { href: "/#tools", label: "All tools" },
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
        <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-[#faf9f6]/90 backdrop-blur">
          <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
            <Link href="/" className="flex items-center gap-2.5">
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-teal-700 text-white">
                <FileText className="h-5 w-5" strokeWidth={2.2} />
              </span>
              <span className="font-display text-[1.45rem] font-bold leading-none tracking-tight text-slate-900">
                PageForge
              </span>
            </Link>
            <nav className="hidden items-center gap-6 text-sm font-medium text-slate-600 md:flex">
              {NAV.map((item) => (
                <Link key={item.href} href={item.href} className="hover:text-teal-700">
                  {item.label}
                </Link>
              ))}
            </nav>
            <Link
              href="/#tools"
              className="rounded-full bg-teal-700 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-teal-800"
            >
              Use a tool
            </Link>
          </div>
        </header>

        <main className="flex-1">{children}</main>

        <footer className="border-t border-slate-200 bg-white">
          <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
            <div className="flex flex-col gap-8 md:flex-row md:justify-between">
              <div className="max-w-sm">
                <p className="font-display text-xl font-bold text-slate-900">PageForge</p>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">
                  Everyday PDF tools that run entirely in your browser. Your files are
                  processed on your own device and never uploaded to a server.
                </p>
                <p className="mt-3 flex items-start gap-2 text-sm text-slate-600">
                  <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-teal-700" />
                  No accounts. No uploads. No tracking of your documents.
                </p>
              </div>
              <nav className="grid grid-cols-2 gap-x-12 gap-y-2 text-sm text-slate-600">
                <Link href="/#tools" className="hover:text-teal-700">All tools</Link>
                <Link href="/resume" className="hover:text-teal-700">Resume Builder</Link>
                <Link href="/about" className="hover:text-teal-700">About</Link>
                <Link href="/privacy" className="hover:text-teal-700">Privacy</Link>
                <Link href="/terms" className="hover:text-teal-700">Terms</Link>
                <Link href="/contact" className="hover:text-teal-700">Contact</Link>
              </nav>
            </div>
            <p className="mt-8 border-t border-slate-100 pt-4 text-xs text-slate-500">
              © 2026 PageForge. Original code, released under the MIT License. PageForge
              is an independent project and is not affiliated with any other PDF tool
              provider.
            </p>
          </div>
        </footer>
      </body>
    </html>
  );
}
