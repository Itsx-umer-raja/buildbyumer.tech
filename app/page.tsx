"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Search, ShieldCheck, Zap, FolderLock, ArrowRight, FileText, Merge, Scissors, FileArchive } from "lucide-react";
import { TOOLS, CATEGORIES, searchTools, type ToolCategory } from "@/lib/tools";
import { SITE_URL } from "@/lib/site";
import { Reveal } from "@/components/reveal";

export default function Home() {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<ToolCategory | "All">("All");

  const results = useMemo(() => {
    const ranked = searchTools(query);
    return category === "All" ? ranked : ranked.filter((t) => t.category === category);
  }, [query, category]);

  return (
    <div>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@graph": [
              {
                "@type": "WebSite",
                name: "PDF World",
                url: `${SITE_URL}/`,
                description:
                  "Free PDF tools that run in your browser, plus a free resume builder and student calculators. Merge, split, compress, convert and secure PDF files without uploading them anywhere.",
              },
              {
                "@type": "SoftwareApplication",
                name: "PDF World",
                applicationCategory: "UtilitiesApplication",
                operatingSystem: "Web browser",
                offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
                description:
                  "Free PDF tools (merge, split, compress, convert, protect, OCR and more), a resume builder and student calculators, all running in the browser.",
              },
            ],
          }),
        }}
      />
      {/* Hero */}
      <section className="relative overflow-hidden border-b border-slate-200 bg-gradient-to-b from-teal-50 via-[#f4fbf9] to-[#faf9f6]">
        {/* Animated background accents */}
        <div aria-hidden="true" className="pointer-events-none absolute inset-0">
          <div className="hero-blob absolute -left-20 top-10 h-72 w-72 rounded-full bg-teal-300/50" />
          <div className="hero-blob hero-blob--slow absolute right-0 top-40 h-80 w-80 rounded-full bg-emerald-200/60" />
          <div className="hero-blob absolute left-1/2 top-64 h-56 w-56 rounded-full bg-cyan-200/50" style={{ animationDelay: "-5s" }} />
        </div>
        <div className="relative mx-auto max-w-6xl px-4 py-14 text-center sm:px-6 sm:py-20">
          <p className="rise-in text-xs font-bold uppercase tracking-[0.18em] text-teal-700">
            Free PDF tools · No sign-up
          </p>
          <h1 className="rise-in rise-in--1 mx-auto mt-4 max-w-3xl font-display text-4xl font-bold leading-tight text-slate-900 sm:text-5xl">
            Free PDF tools — get your PDFs done,{" "}
            <span className="text-gradient-animated">without sending them anywhere.</span>
          </h1>
          <p className="rise-in rise-in--2 mx-auto mt-4 max-w-2xl text-lg leading-relaxed text-slate-600">
            Merge, split, compress, convert and secure your PDF files. Every tool runs
            entirely in your browser — your documents never leave your device.
          </p>

          {/* Floating 3D document cards */}
          <div aria-hidden="true" className="pointer-events-none relative mx-auto mt-2 hidden h-24 max-w-xl sm:block">
            <div className="float-3d absolute left-6 top-2 flex h-16 w-12 items-center justify-center rounded-lg bg-white shadow-xl ring-1 ring-slate-200">
              <Merge className="h-6 w-6 text-teal-700" />
            </div>
            <div className="float-3d float-3d--slow absolute right-6 top-0 flex h-16 w-12 items-center justify-center rounded-lg bg-white shadow-xl ring-1 ring-slate-200">
              <Scissors className="h-6 w-6 text-teal-700" />
            </div>
            <div className="float-3d absolute left-1/2 top-6 flex h-16 w-12 items-center justify-center rounded-lg bg-teal-700 shadow-xl" style={{ marginLeft: "-24px", animationDelay: "-4s" }}>
              <FileArchive className="h-6 w-6 text-white" />
            </div>
          </div>

          <div className="rise-in rise-in--3 mx-auto mt-8 max-w-xl">
            <div className="flex items-center gap-2 rounded-full border border-slate-300 bg-white/90 px-4 py-3 shadow-lg shadow-teal-900/5 backdrop-blur transition focus-within:border-teal-600 focus-within:shadow-teal-900/10">
              <Search className="h-5 w-5 shrink-0 text-slate-400" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search tools — try “merge”, “jpg”, or “password”…"
                aria-label="Search PDF tools"
                className="w-full bg-transparent text-base text-slate-900 outline-none placeholder:text-slate-400"
              />
            </div>
          </div>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-sm text-slate-600">
            <span className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-teal-700" /> Files never uploaded
            </span>
            <span className="flex items-center gap-2">
              <Zap className="h-4 w-4 text-teal-700" /> No waiting in a queue
            </span>
            <span className="flex items-center gap-2">
              <FolderLock className="h-4 w-4 text-teal-700" /> Nothing stored afterwards
            </span>
          </div>
        </div>
      </section>

      {/* Featured: Resume builder */}
      <section className="mx-auto max-w-6xl px-4 pt-12 sm:px-6">
        <Reveal>
          <Link
            href="/resume"
            className="panel-gradient group flex flex-col gap-5 rounded-2xl p-6 text-white shadow-lg shadow-teal-900/20 transition hover:-translate-y-1 hover:shadow-xl sm:flex-row sm:items-center sm:p-8"
          >
            <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white/15 text-white transition group-hover:scale-110">
              <FileText className="h-7 w-7" />
            </span>
            <span className="flex-1">
              <span className="inline-block rounded-full bg-white/20 px-2.5 py-0.5 text-xs font-bold uppercase tracking-wider">
                Featured · New
              </span>
              <span className="mt-2 block font-display text-2xl font-bold">Resume Builder</span>
              <span className="mt-1 block text-sm leading-relaxed text-teal-100">
                Fourteen original templates, including an ATS-friendly one, with a live preview and PDF &amp;
                Word export. Your details stay in your browser — nothing is uploaded.
              </span>
            </span>
            <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-teal-900 transition group-hover:gap-2">
              Build my resume <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
            </span>
          </Link>
        </Reveal>
      </section>

      {/* Tool grid */}
      <section id="tools" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-12 sm:px-6">
        <Reveal>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <h2 className="font-display text-2xl font-bold text-slate-900 sm:text-3xl">
              {query ? `Results for “${query}”` : "All tools"}
            </h2>
            <div className="flex flex-wrap gap-2" role="group" aria-label="Filter by category">
              {(["All", ...CATEGORIES] as const).map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setCategory(c)}
                  aria-pressed={category === c}
                  className={`rounded-full px-3.5 py-1.5 text-sm font-medium transition ${
                    category === c
                      ? "btn-animated text-white shadow-sm"
                      : "border border-slate-300 bg-white text-slate-600 hover:-translate-y-0.5 hover:border-teal-600 hover:text-teal-700 hover:shadow-sm"
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>
        </Reveal>

        {results.length === 0 ? (
          <p className="mt-10 rounded-2xl border border-slate-200 bg-white px-6 py-10 text-center text-slate-600">
            No tools match “{query}”. Try a different word — for example “merge”, “rotate” or
            “password”.
          </p>
        ) : (
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {results.map((tool, i) => {
              const Icon = tool.icon;
              return (
                <Reveal key={tool.slug} delay={Math.min(i % 6, 5) * 60}>
                  <Link
                    href={`/tools/${tool.slug}`}
                    className="tilt-card group flex h-full flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm hover:border-teal-600"
                  >
                    <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-teal-50 text-teal-700 transition group-hover:bg-teal-700 group-hover:text-white">
                      <Icon className="h-6 w-6" />
                    </span>
                    <span className="mt-4 text-sm font-semibold text-teal-700">{tool.category}</span>
                    <span className="mt-1 font-display text-xl font-bold text-slate-900">
                      {tool.title}
                    </span>
                    <span className="mt-2 flex-1 text-sm leading-relaxed text-slate-600">
                      {tool.description}
                    </span>
                    <span className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-teal-700">
                      Open tool <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
                    </span>
                  </Link>
                </Reveal>
              );
            })}
          </div>
        )}
      </section>

      {/* Privacy promise */}
      <section className="mx-auto max-w-6xl px-4 pb-16 sm:px-6">
        <Reveal>
          <div className="panel-gradient rounded-2xl px-6 py-10 text-white shadow-lg shadow-teal-900/20 sm:px-10">
            <h2 className="font-display text-2xl font-bold sm:text-3xl">How your privacy works here</h2>
            <p className="mt-3 max-w-3xl leading-relaxed text-teal-100">
              Most PDF websites upload your files to their servers to do the work. PDF World does
              the opposite: the tools run in your browser, on your own device. Your files are read
              from your disk, processed in memory, and the result is downloaded straight back to
              you. We never see your documents, and there is nothing to delete afterwards — nothing
              was ever stored.
            </p>
            <Link href="/privacy" className="mt-5 inline-block rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-teal-900 transition hover:-translate-y-0.5 hover:bg-teal-50 hover:shadow-md">
              Read the privacy page
            </Link>
          </div>
        </Reveal>
      </section>
    </div>
  );
}
