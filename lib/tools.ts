import type { LucideIcon } from "lucide-react";
import {
  Combine,
  Scissors,
  Minimize2,
  ImagePlus,
  ImageDown,
  RotateCw,
  LayoutGrid,
  Droplets,
  Hash,
  Lock,
  LockOpen,
  FileText,
  FileSpreadsheet,
  Presentation,
  FileDown,
  ScanSearch,
  PenLine,
  FileCode2,
  Diff,
  Eraser,
  Crop,
  ClipboardList,
  Wrench,
  BadgeCheck,
  Code2,
  PenTool,
  ScanLine,
  AlignLeft,
  Languages,
  GraduationCap,
  Sigma,
  Percent,
  Award,
  ArrowLeftRight,
  Scale,
  Target,
  BookOpen,
  TrendingUp,
} from "lucide-react";

export type ToolCategory = "Organize" | "Convert" | "Edit" | "Secure" | "AI" | "Calculators";

export interface ToolDef {
  id: string;
  slug: string;
  title: string;
  shortTitle: string;
  description: string;
  keywords: string[];
  category: ToolCategory;
  icon: LucideIcon;
  /** Short honest note about limits, shown on the tool page. */
  limits: string;
  /** If set, replaces the "runs entirely in your browser" banner (remote processing). */
  remoteNote?: string;
  /**
   * False when the tool has no settings to adjust (just choose a file and
   * run it), so the "Adjust the settings" how-to step is left out.
   * Defaults to true.
   */
  hasSettings?: boolean;
}

export const TOOLS: ToolDef[] = [
  {
    id: "merge-pdf",
    slug: "merge-pdf",
    title: "Merge PDF",
    shortTitle: "Merge",
    description:
      "Combine several PDF files into one document, in the order you choose. Use the up and down arrows to put the files in the order you want before you merge.",
    keywords: ["combine", "join", "join pdf", "merge pdf files", "append", "bind pdf"],
    category: "Organize",
    icon: Combine,
    limits: "Merges the pages of each file in order. Encrypted PDFs cannot be merged unless unlocked first.",
    hasSettings: false,
  },
  {
    id: "split-pdf",
    slug: "split-pdf",
    title: "Split PDF",
    shortTitle: "Split",
    description:
      "Pull pages out of a PDF by page range, or split every page into its own file, downloaded as a ZIP.",
    keywords: ["split", "extract pages", "separate pdf", "divide pdf", "page ranges"],
    category: "Organize",
    icon: Scissors,
    limits: "Page ranges use 1-based page numbers, e.g. 1-3, 5, 8-10. Out-of-range pages are ignored.",
  },
  {
    id: "compress-pdf",
    slug: "compress-pdf",
    title: "Compress PDF",
    shortTitle: "Compress",
    description:
      "Shrink a PDF to a smaller file size. Light mode re-saves the file; stronger modes rebuild pages as images.",
    keywords: ["compress", "reduce pdf size", "shrink pdf", "smaller pdf", "optimise pdf"],
    category: "Organize",
    icon: Minimize2,
    limits:
      "Compression is approximate and depends on the file. Stronger modes rebuild pages as images, so text is no longer selectable. If the result is larger than the original, we say so plainly.",
  },
  {
    id: "jpg-to-pdf",
    slug: "jpg-to-pdf",
    title: "JPG to PDF",
    shortTitle: "JPG → PDF",
    description:
      "Turn JPG and PNG images into a PDF, one image per page. Choose A4, Letter, or a page that fits each image.",
    keywords: ["jpg to pdf", "image to pdf", "png to pdf", "photo to pdf", "convert image"],
    category: "Convert",
    icon: ImagePlus,
    limits: "Accepts JPG and PNG images. Images are embedded as-is; no OCR is performed.",
  },
  {
    id: "pdf-to-jpg",
    slug: "pdf-to-jpg",
    title: "PDF to JPG",
    shortTitle: "PDF → JPG",
    description:
      "Convert every page of a PDF into a JPG image, downloaded together as a ZIP file.",
    keywords: ["pdf to jpg", "pdf to image", "pdf to png", "convert pdf pages", "export pages"],
    category: "Convert",
    icon: ImageDown,
    limits: "Pages are rendered as images, so the text in the JPGs is not selectable. Quality depends on the resolution you pick.",
  },
  {
    id: "rotate-pdf",
    slug: "rotate-pdf",
    title: "Rotate PDF",
    shortTitle: "Rotate",
    description:
      "Rotate pages 90°, 180° or 270°. Rotate the whole document at once, or pick individual pages.",
    keywords: ["rotate pdf", "turn pdf pages", "flip pdf", "rotate pages", "landscape"],
    category: "Edit",
    icon: RotateCw,
    limits: "Rotation is applied to the page itself, so it stays rotated in every reader.",
  },
  {
    id: "organize-pdf",
    slug: "organize-pdf",
    title: "Organize PDF",
    shortTitle: "Organize",
    description:
      "See every page as a thumbnail, move pages into a new order with the arrow buttons, and delete the pages you do not need.",
    keywords: ["organize pdf", "reorder pages", "rearrange pdf", "delete pdf pages", "sort pages"],
    category: "Organize",
    icon: LayoutGrid,
    limits: "Thumbnails are rendered in your browser from the file itself. Very large PDFs may take a moment to preview.",
    hasSettings: false,
  },
  {
    id: "watermark",
    slug: "watermark",
    title: "Watermark",
    shortTitle: "Watermark",
    description:
      "Stamp text across your PDF pages — a draft mark, a name, or a notice — with control over position and opacity.",
    keywords: ["watermark pdf", "stamp pdf", "add text to pdf", "draft mark", "confidential"],
    category: "Edit",
    icon: Droplets,
    limits: "The watermark is drawn onto each page as text. It is visible in any reader, but it is not a security feature.",
  },
  {
    id: "page-numbers",
    slug: "page-numbers",
    title: "Page Numbers",
    shortTitle: "Page Numbers",
    description:
      "Add page numbers to every page of a PDF — bottom centre, corners, or top — in a clean, readable style.",
    keywords: ["page numbers", "number pdf pages", "add page numbers", "paginate pdf", "folio"],
    category: "Edit",
    icon: Hash,
    limits: "Numbers are drawn near the page edge. Existing page numbers in the original are not removed.",
  },
  {
    id: "protect-pdf",
    slug: "protect-pdf",
    title: "Protect PDF",
    shortTitle: "Protect",
    description:
      "Add a password to a PDF so it can only be opened by someone who knows it. Uses standard 40-bit RC4 encryption.",
    keywords: ["protect pdf", "password pdf", "encrypt pdf", "lock pdf", "secure pdf"],
    category: "Secure",
    icon: Lock,
    limits:
      "Uses the standard PDF security handler with 40-bit RC4 encryption (the widely compatible basic level). It stops casual opening without the password, but 40-bit encryption is not strong by modern standards — do not rely on it for highly sensitive documents.",
  },
  {
    id: "unlock-pdf",
    slug: "unlock-pdf",
    title: "Unlock PDF",
    shortTitle: "Unlock",
    description:
      "Remove the password from a PDF you already know the password for. Enter the password; the unlocked copy has no password.",
    keywords: ["unlock pdf", "remove pdf password", "decrypt pdf", "open locked pdf"],
    category: "Secure",
    icon: LockOpen,
    limits:
      "Only works with a password you already know — this tool never guesses or cracks passwords. A wrong password shows an error. The unlocked copy is rebuilt from rendered pages, so its text is not selectable.",
  },
  {
    id: "pdf-to-word",
    slug: "pdf-to-word",
    title: "PDF to Word",
    shortTitle: "PDF → Word",
    description:
      "Turn a PDF into an editable Word (.docx) document, one page at a time. Text is extracted and rebuilt as a real Word file.",
    keywords: ["pdf to word", "pdf to docx", "convert pdf to word", "pdf to editable"],
    category: "Convert",
    icon: FileText,
    limits:
      "Preserves text, font sizes, colours and headings; tables are rebuilt where columns can be detected and images are kept where possible. Bold/italic from PDFs are not preserved, and exact page layout may shift. Password-protected PDFs need their password entered on the tool page.",
  },
  {
    id: "pdf-to-pptx",
    slug: "pdf-to-pptx",
    title: "PDF to PowerPoint",
    shortTitle: "PDF → PPT",
    description:
      "Turn a PDF into a PowerPoint (.pptx) deck, one slide per page. Text is extracted and placed on real slides.",
    keywords: ["pdf to powerpoint", "pdf to pptx", "pdf to slides", "convert pdf to ppt"],
    category: "Convert",
    icon: Presentation,
    limits:
      "Preserves text, font sizes and colours, with each line on its own text box; tables and images are kept where possible. Bold/italic from PDFs are not preserved, and exact page layout may shift. Password-protected PDFs need their password entered on the tool page.",
  },
  {
    id: "pdf-to-excel",
    slug: "pdf-to-excel",
    title: "PDF to Excel",
    shortTitle: "PDF → Excel",
    description:
      "Turn a PDF into a spreadsheet (.xlsx), one sheet per page. Text is extracted and split into rows and columns.",
    keywords: ["pdf to excel", "pdf to xlsx", "pdf to spreadsheet", "extract pdf tables"],
    category: "Convert",
    icon: FileSpreadsheet,
    limits:
      "Columns are detected from text positions, not guessed from spaces — check them before relying on them. Rows the PDF stores as a single text run stay in one cell. Password-protected PDFs need their password entered on the tool page.",
  },
  {
    id: "word-to-pdf",
    slug: "word-to-pdf",
    title: "Word to PDF",
    shortTitle: "Word → PDF",
    description:
      "Turn a Word (.docx) document into a PDF. The text is extracted and rendered into a clean PDF.",
    keywords: ["word to pdf", "docx to pdf", "convert word to pdf", "doc to pdf"],
    category: "Convert",
    icon: FileDown,
    limits:
      "Preserves text, fonts, sizes, colours, bold/italic, headings, lists, tables, links and images where possible; exact Word pagination may shift. Urdu, Arabic, Chinese and other non-Latin text uses a downloaded Unicode font in the basic PDF — if that download fails, use “Print / Save as PDF”, which uses your browser's fonts.",
  },
  {
    id: "pptx-to-pdf",
    slug: "pptx-to-pdf",
    title: "PowerPoint to PDF",
    shortTitle: "PPT → PDF",
    description:
      "Turn a PowerPoint (.pptx) presentation into a PDF, one slide per page. The text on each slide is extracted and rendered.",
    keywords: ["powerpoint to pdf", "pptx to pdf", "ppt to pdf", "slides to pdf"],
    category: "Convert",
    icon: FileDown,
    limits:
      "Slides stay in presentation order and text keeps its size, colour and bold/italic; slide designs, charts and animations are not preserved, and exact slide layout may shift. Urdu, Arabic, Chinese and other non-Latin text uses a downloaded Unicode font in the basic PDF — if that download fails, use “Print / Save as PDF”.",
  },
  {
    id: "excel-to-pdf",
    slug: "excel-to-pdf",
    title: "Excel to PDF",
    shortTitle: "Excel → PDF",
    description:
      "Turn a spreadsheet (.xlsx, .xls or .csv) into a PDF, with each sheet rendered as a table.",
    keywords: ["excel to pdf", "xlsx to pdf", "spreadsheet to pdf", "csv to pdf"],
    category: "Convert",
    icon: FileDown,
    limits:
      "Sheet data is rendered as tables with content-aware column widths; long cells wrap instead of being cut off, and dates are shown as YYYY-MM-DD. Formulas appear as their values, charts are not preserved, and cell fonts/colours from the spreadsheet are not preserved.",
  },
  {
    id: "ocr-pdf",
    slug: "ocr-pdf",
    title: "OCR PDF",
    shortTitle: "OCR",
    description:
      "Read the text in scanned or image-based PDFs and rebuild them as searchable text PDFs, using OCR in your browser.",
    keywords: ["ocr pdf", "scan pdf text", "searchable pdf", "recognise text pdf", "ocr scanned pdf"],
    category: "Edit",
    icon: ScanSearch,
    limits:
      "Slow on long documents, English only, and accuracy varies with scan quality. The OCR engine loads from a CDN the first time you use it.",
    hasSettings: false,
  },
  {
    id: "edit-pdf",
    slug: "edit-pdf",
    title: "Edit PDF",
    shortTitle: "Edit",
    description:
      "Add a text note or a highlight band to any page of your PDF. A quick way to annotate without other software.",
    keywords: ["edit pdf", "annotate pdf", "add text to pdf", "highlight pdf", "pdf annotation"],
    category: "Edit",
    icon: PenLine,
    limits:
      "Annotations only: this adds new text or a highlight on top of a page. It cannot change or delete the document's existing text.",
  },
  {
    id: "pdf-to-markdown",
    slug: "pdf-to-markdown",
    title: "PDF to Markdown",
    shortTitle: "PDF → MD",
    description:
      "Extract the text from a PDF into a Markdown (.md) file, with headings guessed from short lines.",
    keywords: ["pdf to markdown", "pdf to md", "extract pdf text", "pdf to text"],
    category: "Convert",
    icon: FileCode2,
    limits:
      "Headings are detected from font size, not guessed from the words; tables are rebuilt where columns can be detected. Exact layout and images are not preserved. Password-protected PDFs need their password entered on the tool page.",
  },
  {
    id: "compare-pdf",
    slug: "compare-pdf",
    title: "Compare PDF",
    shortTitle: "Compare",
    description:
      "Compare two PDFs line by line and see which pages differ, with a downloadable report of the added and removed lines.",
    keywords: ["compare pdf", "diff pdf", "pdf difference", "compare two pdfs", "pdf changes"],
    category: "Edit",
    icon: Diff,
    limits:
      "Compares extracted text only. Differences in images, fonts or layout are not detected, and scanned PDFs need OCR first.",
    hasSettings: false,
  },
  {
    id: "redact-pdf",
    slug: "redact-pdf",
    title: "Redact PDF",
    shortTitle: "Redact",
    description:
      "Black out words or whole pages in a PDF. The redacted text is genuinely removed, and the result is verified by re-reading the file.",
    keywords: ["redact pdf", "black out pdf", "remove text pdf", "hide pdf text", "censor pdf"],
    category: "Edit",
    icon: Eraser,
    limits:
      "Redacted pages are rebuilt as text-only, so images and vector graphics on those pages are not preserved. Always check the verification note after redacting.",
  },
  {
    id: "crop-pdf",
    slug: "crop-pdf",
    title: "Crop PDF",
    shortTitle: "Crop",
    description:
      "Trim the margins off your PDF pages by percentage — all pages, or just the ones you pick. The page boxes are genuinely changed.",
    keywords: ["crop pdf", "trim pdf margins", "cut pdf pages", "pdf crop box"],
    category: "Edit",
    icon: Crop,
    limits:
      "Cropping changes the page boxes; the trimmed area is hidden, not deleted from the file's content stream.",
  },
  {
    id: "pdf-forms",
    slug: "pdf-forms",
    title: "PDF Forms",
    shortTitle: "Forms",
    description:
      "Fill in the fields of a PDF form — text boxes, checkboxes and dropdowns — and save a filled copy.",
    keywords: ["fill pdf form", "pdf form filler", "fillable pdf", "complete pdf form"],
    category: "Edit",
    icon: ClipboardList,
    limits:
      "Only works with PDFs that already have fillable AcroForm fields. If the PDF has no form fields, the tool says so — it cannot turn a flat PDF into a form.",
  },
  {
    id: "repair-pdf",
    slug: "repair-pdf",
    title: "Repair PDF",
    shortTitle: "Repair",
    description:
      "Try to fix a damaged or misbehaving PDF by re-saving it cleanly in your browser.",
    keywords: ["repair pdf", "fix pdf", "corrupt pdf", "damaged pdf", "recover pdf"],
    category: "Edit",
    icon: Wrench,
    limits:
      "Fixes some corruption only — re-saving repairs structural problems, but badly damaged files may still fail. Not a guaranteed repair.",
    hasSettings: false,
  },
  {
    id: "pdf-to-pdfa",
    slug: "pdf-to-pdfa",
    title: "PDF to PDF/A",
    shortTitle: "PDF/A",
    description:
      "Add PDF/A-style archival metadata to a PDF, including an XMP metadata packet and document information.",
    keywords: ["pdf to pdfa", "pdf/a", "archive pdf", "pdfa converter", "pdf metadata"],
    category: "Convert",
    icon: BadgeCheck,
    limits:
      "Metadata only: this adds PDF/A-style XMP metadata and document info. It is NOT a certified PDF/A file — fonts are not embedded or validated.",
  },
  {
    id: "html-to-pdf",
    slug: "html-to-pdf",
    title: "HTML to PDF",
    shortTitle: "HTML → PDF",
    description:
      "Paste HTML or upload an .html file, preview it, and print it to PDF with your browser — or download a basic text PDF.",
    keywords: ["html to pdf", "webpage to pdf", "convert html to pdf", "html file to pdf"],
    category: "Convert",
    icon: Code2,
    limits:
      "The downloaded PDF preserves headings, bold/italic, colours, sizes, lists and tables from your HTML; exact browser layout may shift. The styled PDF comes from your browser's print dialog (“Save as PDF”). External images, fonts and scripts are not loaded.",
  },
  {
    id: "sign-pdf",
    slug: "sign-pdf",
    title: "Sign PDF",
    shortTitle: "Sign",
    description:
      "Draw or type a signature and place it on the page of your choice. A quick, visible signature for everyday documents.",
    keywords: ["sign pdf", "signature pdf", "add signature to pdf", "draw signature pdf"],
    category: "Edit",
    icon: PenTool,
    limits:
      "A simple placed signature image — not a certified digital signature. It does not prove who signed or protect the document from changes.",
  },
  {
    id: "scan-to-pdf",
    slug: "scan-to-pdf",
    title: "Scan to PDF",
    shortTitle: "Scan → PDF",
    description:
      "Combine photos of pages into a single PDF, one image per page. Upload JPG or PNG images of your documents.",
    keywords: ["scan to pdf", "photos to pdf", "scanner pdf", "images to pdf", "scan documents"],
    category: "Convert",
    icon: ScanLine,
    limits:
      "Image upload only: this works from image files you upload. It cannot use your phone camera or a scanner directly.",
  },
  {
    id: "ai-summarizer",
    slug: "ai-summarizer",
    title: "AI Summarizer",
    shortTitle: "Summarise",
    description:
      "Get the key sentences of a PDF as a short summary. Template-based and extractive — no AI model is used.",
    keywords: ["summarise pdf", "summarize pdf", "pdf summary", "key points pdf", "extractive summary"],
    category: "AI",
    icon: AlignLeft,
    limits:
      "Template-based — no AI model. It scores the document's own sentences by word frequency and keeps the best ones; it cannot write new insights, and it needs at least 40 words of extractable text. Scanned PDFs need OCR first.",
  },
  {
    id: "translate-pdf",
    slug: "translate-pdf",
    title: "Translate PDF",
    shortTitle: "Translate",
    description:
      "Translate a PDF's text into another language using the free, no-key MyMemory service. Honest limits stated on the page.",
    keywords: ["translate pdf", "pdf translator", "translate document", "pdf translation", "translate pdf to spanish"],
    category: "AI",
    icon: Languages,
    limits:
      "Free MyMemory service, no key needed: about 5,000 characters per document and per day on the shared anonymous quota, in chunks of ~450 characters. Machine translation is approximate — check important wording. The extracted text is sent to MyMemory's servers for translation; the rest of the work stays in your browser.",
    remoteNote:
      "Partly remote: the PDF's text is extracted in your browser, then sent to the free MyMemory translation service (api.mymemory.translated.net) so it can be translated. Only the extracted text leaves your device — the file itself is never uploaded.",
  },
  {
    id: "gpa-calculator",
    slug: "gpa-calculator",
    title: "GPA Calculator",
    shortTitle: "GPA",
    description:
      "Work out your GPA on the 4.0 scale from your course grades and credit hours. Credit-weighted, with a worked example.",
    keywords: ["gpa calculator", "calculate gpa", "grade point average", "gpa calculator 4.0", "college gpa calculator"],
    category: "Calculators",
    icon: GraduationCap,
    limits:
      "Uses the standard US 4.0 grade-point table (A+ and A both count as 4.0). Schools use different tables — check yours if the exact value matters.",
  },
  {
    id: "cgpa-calculator",
    slug: "cgpa-calculator",
    title: "CGPA Calculator",
    shortTitle: "CGPA",
    description:
      "Work out your CGPA from your semester GPAs, weighted by each semester's credits. Works on the 4.0 and 10.0 scales.",
    keywords: ["cgpa calculator", "calculate cgpa", "cumulative gpa", "cgpa calculator 10 point", "semester gpa to cgpa"],
    category: "Calculators",
    icon: Sigma,
    limits:
      "Weights each semester by its credits, so a heavier semester counts more. Enter the GPA your university awarded for each semester.",
  },
  {
    id: "percentage-calculator",
    slug: "percentage-calculator",
    title: "Percentage Calculator",
    shortTitle: "Percentage",
    description:
      "Turn marks into a percentage, find X% of a number, or find what percentage one number is of another.",
    keywords: ["percentage calculator", "marks percentage calculator", "calculate percentage", "percent calculator", "marks to percentage"],
    category: "Calculators",
    icon: Percent,
    limits:
      "For marks, the obtained marks cannot be more than the total marks. Results are rounded to two decimal places.",
  },
  {
    id: "grade-calculator",
    slug: "grade-calculator",
    title: "Grade Calculator",
    shortTitle: "Grade",
    description:
      "Enter a percentage and see the letter grade and grade points on the standard US +/− scale, with the full grade table.",
    keywords: ["grade calculator", "percentage to grade", "letter grade calculator", "grade calculator percentage", "what grade is 85 percent"],
    category: "Calculators",
    icon: Award,
    limits:
      "Uses the standard US +/− scale (A+ 97–100 down to F below 60). Grading scales differ by school — check yours if the boundary matters.",
  },
  {
    id: "cgpa-to-percentage",
    slug: "cgpa-to-percentage",
    title: "CGPA to Percentage",
    shortTitle: "CGPA → %",
    description:
      "Convert a CGPA on the 10-point scale into a percentage, with the widely used ×9.5 formula or the direct ×10 conversion.",
    keywords: ["cgpa to percentage", "convert cgpa to percentage", "cgpa to percentage calculator", "cgpa percentage converter"],
    category: "Calculators",
    icon: ArrowLeftRight,
    limits:
      "The ×9.5 formula is the widely used Indian-university convention; ×10 is the direct scale conversion. Universities differ — use the formula your university publishes when it matters.",
  },
  {
    id: "percentage-to-gpa",
    slug: "percentage-to-gpa",
    title: "Percentage to GPA",
    shortTitle: "% → GPA",
    description:
      "Convert a percentage into a GPA on the 4.0 or 10.0 scale. A quick, honest approximation — schools convert differently.",
    keywords: ["percentage to gpa", "convert percentage to gpa", "percentage to gpa calculator", "marks percentage to gpa"],
    category: "Calculators",
    icon: Scale,
    limits:
      "An approximation: percentage ÷ 100 × 4 on the 4.0 scale, percentage ÷ 10 on the 10-point scale. Schools convert percentages to GPA in different ways.",
  },
  {
    id: "final-grade-calculator",
    slug: "final-grade-calculator",
    title: "Final Grade Calculator",
    shortTitle: "Final Grade",
    description:
      "Find out what score you need on your final exam to finish with the grade you want, given your current grade and the exam's weight.",
    keywords: ["final grade calculator", "final exam calculator", "what do i need on my final", "final exam grade calculator", "calculate final grade"],
    category: "Calculators",
    icon: Target,
    limits:
      "If the answer is over 100%, the target grade is not reachable with this exam alone. The exam weight must be between 1% and 99%.",
  },
  {
    id: "sgpa-calculator",
    slug: "sgpa-calculator",
    title: "SGPA Calculator",
    shortTitle: "SGPA",
    description:
      "Work out your SGPA for one semester on the 10-point scale (O, A+, A, B+, B, C, P, F), credit-weighted by subject.",
    keywords: ["sgpa calculator", "calculate sgpa", "semester gpa calculator", "sgpa calculator 10 point", "sgpa to cgpa"],
    category: "Calculators",
    icon: BookOpen,
    limits:
      "Uses the 10-point scale used in India and Pakistan (O = 10, A+ = 9, A = 8, B+ = 7, B = 6, C = 5, P = 4, F = 0).",
  },
  {
    id: "weighted-grade-calculator",
    slug: "weighted-grade-calculator",
    title: "Weighted Grade Calculator",
    shortTitle: "Weighted",
    description:
      "Combine homework, quizzes and exams into one weighted grade. Enter each part's score and weight — the weights must total 100%.",
    keywords: ["weighted grade calculator", "weighted average calculator", "grade weight calculator", "weighted score calculator", "calculate weighted grade"],
    category: "Calculators",
    icon: Scale,
    limits:
      "Weights must add up to exactly 100% — the tool tells you the current total if they do not. Scores must be between 0 and 100.",
  },
  {
    id: "gpa-to-percentage",
    slug: "gpa-to-percentage",
    title: "GPA to Percentage",
    shortTitle: "GPA → %",
    description:
      "Convert a GPA into a percentage on the 4.0 or 10.0 scale. A quick, honest approximation — schools convert differently.",
    keywords: ["gpa to percentage", "convert gpa to percentage", "gpa to percentage calculator", "4.0 gpa to percentage"],
    category: "Calculators",
    icon: TrendingUp,
    limits:
      "An approximation: GPA ÷ 4 × 100 on the 4.0 scale, GPA × 10 on the 10-point scale. Schools convert GPA to percentage in different ways.",
  },
];

export const TOOL_MAP: Record<string, ToolDef> = Object.fromEntries(
  TOOLS.map((t) => [t.slug, t]),
);

/** Ranked search: title-starts-with first, then title-contains, then description/keywords. */
export function searchTools(query: string): ToolDef[] {
  const q = query.trim().toLowerCase();
  if (!q) return TOOLS;
  const scored: { tool: ToolDef; rank: number }[] = [];
  for (const tool of TOOLS) {
    const title = tool.title.toLowerCase();
    const desc = tool.description.toLowerCase();
    const keys = tool.keywords.join(" ").toLowerCase();
    if (title.startsWith(q)) scored.push({ tool, rank: 0 });
    else if (title.includes(q)) scored.push({ tool, rank: 1 });
    else if (desc.includes(q) || keys.includes(q)) scored.push({ tool, rank: 2 });
  }
  scored.sort((a, b) => a.rank - b.rank || a.tool.title.localeCompare(b.tool.title));
  return scored.map((s) => s.tool);
}

export const CATEGORIES: ToolCategory[] = ["Organize", "Convert", "Edit", "Secure", "AI", "Calculators"];
