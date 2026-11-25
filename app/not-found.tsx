import type { Metadata } from "next";
import Link from "next/link";
import { TOOLS } from "@/lib/tools";

export const metadata: Metadata = {
  title: "Page Not Found",
  description:
    "That page does not exist on PDF World. Browse the free PDF tools or build a resume instead.",
  robots: { index: false, follow: true },
};

export default function NotFound() {
  const popular = ["merge-pdf", "compress-pdf", "pdf-to-word", "protect-pdf"];
  return (
    <div className="mx-auto max-w-3xl px-4 py-16 text-center sm:px-6">
      <p className="text-6xl font-bold text-teal-700">404</p>
      <h1 className="mt-4 font-display text-3xl font-bold text-slate-900 sm:text-4xl">
        That page is not here
      </h1>
      <p className="mx-auto mt-3 max-w-xl leading-relaxed text-slate-600">
        The address may have been typed wrong, or the page may have moved. The tools below
        are a good place to start instead.
      </p>
      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        <Link
          href="/tools"
          className="btn-animated rounded-full px-5 py-2.5 text-sm font-semibold text-white shadow-sm"
        >
          Browse all PDF tools
        </Link>
        <Link
          href="/"
          className="rounded-full border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-teal-600 hover:text-teal-700"
        >
          Go to the homepage
        </Link>
      </div>
      <h2 className="mt-12 font-display text-xl font-bold text-slate-900">Try one of these instead</h2>
      <div className="mx-auto mt-4 grid max-w-xl gap-3 text-left sm:grid-cols-2">
        {popular.map((slug) => {
          const tool = TOOLS.find((t) => t.slug === slug)!;
          return (
            <Link
              key={slug}
              href={`/tools/${slug}`}
              className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-900 transition hover:-translate-y-0.5 hover:border-teal-600 hover:shadow-md"
            >
              {tool.title}
              <span className="mt-1 block text-xs font-normal leading-relaxed text-slate-600">
                {tool.description}
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
