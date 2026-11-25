import type { Metadata } from "next";
import Link from "next/link";
import { TOOLS, CATEGORIES } from "@/lib/tools";
import { SITE_URL } from "@/lib/site";

export const metadata: Metadata = {
  title: "All Tools — Free Online PDF Tools & Student Calculators",
  description:
    `Browse all ${TOOLS.length} free tools: PDF tools to merge, split, compress, convert, edit and protect, plus student calculators for GPA, CGPA and percentages. Every tool runs in your browser — no sign-up, no uploads.`,
  keywords: ["pdf tools", "pdf converter online free", "pdf world tools", "pdf converter", "gpa calculator", "cgpa calculator"],
  alternates: { canonical: "/tools" },
  openGraph: {
    type: "website",
    url: "/tools",
    siteName: "PDF World",
    title: "All Tools — Free Online PDF Tools & Student Calculators | PDF World",
    description:
      `Browse all ${TOOLS.length} free tools: PDF tools to merge, split, compress, convert, edit and protect, plus student calculators for GPA, CGPA and percentages. Every tool runs in your browser — no sign-up, no uploads.`,
    images: [{ url: "/pdf-world-icon-512.png", width: 512, height: 512, alt: "PDF World logo" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "All Tools — Free Online PDF Tools & Student Calculators | PDF World",
    description:
      `Browse all ${TOOLS.length} free tools: PDF tools to merge, split, compress, convert, edit and protect, plus student calculators for GPA, CGPA and percentages. Every tool runs in your browser — no sign-up, no uploads.`,
    images: ["/pdf-world-icon-512.png"],
  },
};

export default function ToolsHubPage() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebPage",
        name: "All Tools — Free Online PDF Tools & Student Calculators",
        url: `${SITE_URL}/tools`,
        description:
          `Browse all ${TOOLS.length} free tools: PDF tools to merge, split, compress, convert, edit and protect, plus student calculators for GPA, CGPA and percentages.`,
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Home", item: `${SITE_URL}/` },
          { "@type": "ListItem", position: 2, name: "All tools", item: `${SITE_URL}/tools` },
        ],
      },
    ],
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <nav aria-label="Breadcrumb" className="text-sm text-slate-500">
        <ol className="flex flex-wrap items-center gap-1.5">
          <li>
            <Link href="/" className="hover:text-teal-700">Home</Link>
          </li>
          <li aria-hidden="true">/</li>
          <li aria-current="page" className="font-medium text-slate-700">All tools</li>
        </ol>
      </nav>
      <h1 className="mt-4 font-display text-3xl font-bold text-slate-900 sm:text-4xl">All tools</h1>
      <p className="mt-3 max-w-2xl leading-relaxed text-slate-600">
        Every PDF World tool is free, with no account and no uploads — each one runs entirely
        in your browser. Pick a tool below, or{" "}
        <Link href="/resume" className="font-semibold text-teal-700 hover:underline">
          build a resume
        </Link>{" "}
        instead.
      </p>

      {CATEGORIES.map((category) => {
        const tools = TOOLS.filter((t) => t.category === category);
        return (
          <section key={category} className="mt-10">
            <h2 className="font-display text-2xl font-bold text-slate-900">{category}</h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {tools.map((tool) => {
                const Icon = tool.icon;
                return (
                  <Link
                    key={tool.slug}
                    href={`/tools/${tool.slug}`}
                    className="group flex h-full flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-teal-600 hover:shadow-md"
                  >
                    <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-teal-50 text-teal-700 transition group-hover:bg-teal-700 group-hover:text-white">
                      <Icon className="h-6 w-6" />
                    </span>
                    <span className="mt-4 font-display text-xl font-bold text-slate-900">{tool.title}</span>
                    <span className="mt-2 flex-1 text-sm leading-relaxed text-slate-600">{tool.description}</span>
                    <span className="mt-4 text-sm font-semibold text-teal-700">Open tool →</span>
                  </Link>
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
}
