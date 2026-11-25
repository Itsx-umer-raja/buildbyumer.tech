import dynamic from "next/dynamic";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, ShieldCheck } from "lucide-react";
import { TOOLS, TOOL_MAP } from "@/lib/tools";
import { TOOL_SEO } from "@/lib/seo";
import { SITE_URL } from "@/lib/site";
import { LimitsNote } from "@/components/tool-ui";

// Tool implementations are lazy-loaded per group so a tool page only ships
// the code for the tool being used, not all 31 tools.
const MergeTool = dynamic(() => import("@/components/tools/group-organise").then((m) => m.MergeTool));
const SplitTool = dynamic(() => import("@/components/tools/group-organise").then((m) => m.SplitTool));
const CompressTool = dynamic(() => import("@/components/tools/group-organise").then((m) => m.CompressTool));
const JpgToPdfTool = dynamic(() => import("@/components/tools/group-convert").then((m) => m.JpgToPdfTool));
const PdfToJpgTool = dynamic(() => import("@/components/tools/group-convert").then((m) => m.PdfToJpgTool));
const RotateTool = dynamic(() => import("@/components/tools/group-convert").then((m) => m.RotateTool));
const OrganizeTool = dynamic(() => import("@/components/tools/group-edit").then((m) => m.OrganizeTool));
const WatermarkTool = dynamic(() => import("@/components/tools/group-edit").then((m) => m.WatermarkTool));
const PageNumbersTool = dynamic(() => import("@/components/tools/group-edit").then((m) => m.PageNumbersTool));
const ProtectTool = dynamic(() => import("@/components/tools/group-secure").then((m) => m.ProtectTool));
const UnlockTool = dynamic(() => import("@/components/tools/group-secure").then((m) => m.UnlockTool));
const PdfToWordTool = dynamic(() => import("@/components/tools/group-convert2").then((m) => m.PdfToWordTool));
const PdfToPptxTool = dynamic(() => import("@/components/tools/group-convert2").then((m) => m.PdfToPptxTool));
const PdfToExcelTool = dynamic(() => import("@/components/tools/group-convert2").then((m) => m.PdfToExcelTool));
const WordToPdfTool = dynamic(() => import("@/components/tools/group-convert2").then((m) => m.WordToPdfTool));
const PptxToPdfTool = dynamic(() => import("@/components/tools/group-convert2").then((m) => m.PptxToPdfTool));
const ExcelToPdfTool = dynamic(() => import("@/components/tools/group-convert2").then((m) => m.ExcelToPdfTool));
const PdfToMarkdownTool = dynamic(() => import("@/components/tools/group-convert2").then((m) => m.PdfToMarkdownTool));
const HtmlToPdfTool = dynamic(() => import("@/components/tools/group-convert2").then((m) => m.HtmlToPdfTool));
const ScanToPdfTool = dynamic(() => import("@/components/tools/group-convert2").then((m) => m.ScanToPdfTool));
const OcrTool = dynamic(() => import("@/components/tools/group-edit2").then((m) => m.OcrTool));
const EditPdfTool = dynamic(() => import("@/components/tools/group-edit2").then((m) => m.EditPdfTool));
const CompareTool = dynamic(() => import("@/components/tools/group-edit2").then((m) => m.CompareTool));
const RedactTool = dynamic(() => import("@/components/tools/group-edit2").then((m) => m.RedactTool));
const CropTool = dynamic(() => import("@/components/tools/group-edit2").then((m) => m.CropTool));
const FormsTool = dynamic(() => import("@/components/tools/group-edit2").then((m) => m.FormsTool));
const RepairTool = dynamic(() => import("@/components/tools/group-edit2").then((m) => m.RepairTool));
const PdfATool = dynamic(() => import("@/components/tools/group-edit2").then((m) => m.PdfATool));
const SignTool = dynamic(() => import("@/components/tools/group-edit2").then((m) => m.SignTool));
const AiSummarizerTool = dynamic(() => import("@/components/tools/group-ai").then((m) => m.AiSummarizerTool));
const TranslatePdfTool = dynamic(() => import("@/components/tools/group-ai").then((m) => m.TranslatePdfTool));

export function generateStaticParams() {
  return TOOLS.map((t) => ({ slug: t.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const tool = TOOL_MAP[slug];
  const seo = TOOL_SEO[slug];
  if (!tool || !seo) return {};
  const url = `/tools/${slug}`;
  return {
    // Absolute: seoTitle already carries the "| PDF World" suffix, so the
    // layout's title template must not append it a second time.
    title: { absolute: seo.seoTitle },
    description: seo.description,
    keywords: [seo.primaryKeyword, ...seo.secondaryKeywords],
    alternates: { canonical: url },
    openGraph: {
      type: "website",
      url,
      siteName: "PDF World",
      title: seo.seoTitle,
      description: seo.description,
      images: [{ url: "/pdf-world-icon-512.png", width: 512, height: 512, alt: "PDF World logo" }],
    },
    twitter: {
      card: "summary_large_image",
      title: seo.seoTitle,
      description: seo.description,
      images: ["/pdf-world-icon-512.png"],
    },
  };
}

const TOOL_COMPONENTS: Record<string, React.ComponentType> = {
  "merge-pdf": MergeTool,
  "split-pdf": SplitTool,
  "compress-pdf": CompressTool,
  "jpg-to-pdf": JpgToPdfTool,
  "pdf-to-jpg": PdfToJpgTool,
  "rotate-pdf": RotateTool,
  "organize-pdf": OrganizeTool,
  watermark: WatermarkTool,
  "page-numbers": PageNumbersTool,
  "protect-pdf": ProtectTool,
  "unlock-pdf": UnlockTool,
  "pdf-to-word": PdfToWordTool,
  "pdf-to-pptx": PdfToPptxTool,
  "pdf-to-excel": PdfToExcelTool,
  "word-to-pdf": WordToPdfTool,
  "pptx-to-pdf": PptxToPdfTool,
  "excel-to-pdf": ExcelToPdfTool,
  "ocr-pdf": OcrTool,
  "edit-pdf": EditPdfTool,
  "pdf-to-markdown": PdfToMarkdownTool,
  "compare-pdf": CompareTool,
  "redact-pdf": RedactTool,
  "crop-pdf": CropTool,
  "pdf-forms": FormsTool,
  "repair-pdf": RepairTool,
  "pdf-to-pdfa": PdfATool,
  "html-to-pdf": HtmlToPdfTool,
  "sign-pdf": SignTool,
  "scan-to-pdf": ScanToPdfTool,
  "ai-summarizer": AiSummarizerTool,
  "translate-pdf": TranslatePdfTool,
};

const HOW_TO_STEPS = [
  {
    title: "Choose your file",
    text: "Select the file — or files — the tool asks for from your device. Nothing is uploaded; the file is read in your browser.",
  },
  {
    title: "Adjust the settings",
    text: "Pick your options, such as page ranges, quality or layout, if the tool offers them. Defaults work fine for most jobs.",
  },
  {
    title: "Download the result",
    text: "Run the tool and download the finished file straight to your device. Nothing is stored afterwards.",
  },
];

export default async function ToolPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const tool = TOOL_MAP[slug];
  const seo = TOOL_SEO[slug];
  if (!tool || !seo) notFound();
  const ToolComponent = TOOL_COMPONENTS[slug];
  const Icon = tool.icon;
  const related = TOOLS.filter((t) => t.category === tool.category && t.slug !== slug).slice(0, 4);
  const pageUrl = `${SITE_URL}/tools/${slug}`;

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "SoftwareApplication",
        name: seo.seoTitle.replace(" | PDF World", ""),
        applicationCategory: "UtilitiesApplication",
        operatingSystem: "Web browser",
        url: pageUrl,
        offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
        description: seo.description,
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Home", item: `${SITE_URL}/` },
          { "@type": "ListItem", position: 2, name: "All PDF tools", item: `${SITE_URL}/tools` },
          { "@type": "ListItem", position: 3, name: tool.title, item: pageUrl },
        ],
      },
      {
        "@type": "FAQPage",
        mainEntity: seo.faqs.map((f) => ({
          "@type": "Question",
          name: f.q,
          acceptedAnswer: { "@type": "Answer", text: f.a },
        })),
      },
    ],
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
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
          <li>
            <Link href="/tools" className="hover:text-teal-700">All tools</Link>
          </li>
          <li aria-hidden="true">/</li>
          <li aria-current="page" className="font-medium text-slate-700">{tool.title}</li>
        </ol>
      </nav>

      <div className="mt-6 flex items-start gap-4">
        <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-teal-600 to-teal-800 text-white shadow-lg shadow-teal-900/25">
          <Icon className="h-7 w-7" />
        </span>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-teal-700">{tool.category}</p>
          <h1 className="font-display text-3xl font-bold text-slate-900 sm:text-4xl">{seo.h1}</h1>
          <p className="mt-2 max-w-2xl leading-relaxed text-slate-600">{tool.description}</p>
        </div>
      </div>

      <p className="mt-5 flex items-start gap-2 rounded-xl bg-teal-50 px-4 py-3 text-sm text-teal-900">
        <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-teal-700" />
        <span>
          {tool.remoteNote ? (
            <>
              <strong>Partly remote:</strong> {tool.remoteNote.replace(/^Partly remote: /, "")}
            </>
          ) : (
            <>
              <strong>Private by design:</strong> this tool runs entirely in your browser. Your files
              are never uploaded to a server, and nothing is stored after you leave the page.
            </>
          )}
        </span>
      </p>

      <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <ToolComponent />
      </div>

      <LimitsNote text={tool.limits} />

      <section className="mt-12">
        <h2 className="font-display text-xl font-bold text-slate-900">How to use {tool.title}</h2>
        <ol className="mt-4 space-y-3">
          {HOW_TO_STEPS.map((step, i) => (
            <li key={step.title} className="flex gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-teal-700 text-sm font-bold text-white">
                {i + 1}
              </span>
              <span className="text-sm leading-relaxed text-slate-700">
                <strong className="text-slate-900">{step.title}.</strong> {step.text}
              </span>
            </li>
          ))}
        </ol>
      </section>

      <section className="mt-12">
        <h2 className="font-display text-xl font-bold text-slate-900">Frequently asked questions</h2>
        <div className="mt-4 space-y-3">
          {seo.faqs.map((f) => (
            <div key={f.q} className="rounded-xl border border-slate-200 bg-white px-4 py-3">
              <h3 className="text-sm font-semibold text-slate-900">{f.q}</h3>
              <p className="mt-1 text-sm leading-relaxed text-slate-700">{f.a}</p>
            </div>
          ))}
        </div>
      </section>

      {related.length > 0 && (
        <section className="mt-12">
          <h2 className="font-display text-xl font-bold text-slate-900">More {tool.category.toLowerCase()} tools</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {related.map((t) => {
              const RelIcon = t.icon;
              return (
                <Link
                  key={t.slug}
                  href={`/tools/${t.slug}`}
                  className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 transition hover:-translate-y-0.5 hover:border-teal-600 hover:shadow-md"
                >
                  <RelIcon className="h-5 w-5 shrink-0 text-teal-700" />
                  <span className="text-sm font-semibold text-slate-900">{t.title}</span>
                </Link>
              );
            })}
          </div>
          <p className="mt-4 text-sm">
            <Link href="/tools" className="inline-flex items-center gap-1.5 font-medium text-teal-700 hover:underline">
              <ArrowLeft className="h-4 w-4" /> Browse all 31 PDF tools
            </Link>
          </p>
        </section>
      )}
    </div>
  );
}
