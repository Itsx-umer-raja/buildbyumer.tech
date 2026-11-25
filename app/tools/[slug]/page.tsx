import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, ShieldCheck } from "lucide-react";
import { TOOLS, TOOL_MAP } from "@/lib/tools";
import { LimitsNote } from "@/components/tool-ui";
import { MergeTool, SplitTool, CompressTool } from "@/components/tools/group-organise";
import { JpgToPdfTool, PdfToJpgTool, RotateTool } from "@/components/tools/group-convert";
import { OrganizeTool, WatermarkTool, PageNumbersTool } from "@/components/tools/group-edit";
import { ProtectTool, UnlockTool } from "@/components/tools/group-secure";
import {
  PdfToWordTool,
  PdfToPptxTool,
  PdfToExcelTool,
  WordToPdfTool,
  PptxToPdfTool,
  ExcelToPdfTool,
  PdfToMarkdownTool,
  HtmlToPdfTool,
  ScanToPdfTool,
} from "@/components/tools/group-convert2";
import {
  OcrTool,
  EditPdfTool,
  CompareTool,
  RedactTool,
  CropTool,
  FormsTool,
  RepairTool,
  PdfATool,
  SignTool,
} from "@/components/tools/group-edit2";
import { AiSummarizerTool, TranslatePdfTool } from "@/components/tools/group-ai";

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
  if (!tool) return {};
  return {
    title: `${tool.title} — PageForge`,
    description: tool.description,
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

export default async function ToolPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const tool = TOOL_MAP[slug];
  if (!tool) notFound();
  const ToolComponent = TOOL_COMPONENTS[slug];
  const Icon = tool.icon;
  const related = TOOLS.filter((t) => t.category === tool.category && t.slug !== slug).slice(0, 4);

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
      <Link href="/#tools" className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-teal-700">
        <ArrowLeft className="h-4 w-4" /> All tools
      </Link>

      <div className="mt-6 flex items-start gap-4">
        <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-teal-700 text-white">
          <Icon className="h-7 w-7" />
        </span>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-teal-700">{tool.category}</p>
          <h1 className="font-display text-3xl font-bold text-slate-900 sm:text-4xl">{tool.title}</h1>
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
                  className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 hover:border-teal-600"
                >
                  <RelIcon className="h-5 w-5 shrink-0 text-teal-700" />
                  <span className="text-sm font-semibold text-slate-900">{t.title}</span>
                </Link>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}
