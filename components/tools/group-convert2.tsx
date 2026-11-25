"use client";

import { useState } from "react";
import {
  Dropzone,
  FileList,
  ProcessButton,
  ResultCard,
  ErrorNote,
  OptionLabel,
  selectCls,
  inputCls,
} from "@/components/tool-ui";
import {
  downloadBytes,
  downloadBlob,
  fileBytes,
  formatBytes,
} from "@/lib/pdf-utils";
import {
  extractStyledPages,
  extractTableRows,
  visualRows,
  renderStyledBlocksToPdf,
  htmlToStyledBlocks,
  styledBlocksToHtml,
  parseDocxStyled,
  parsePptxStyled,
  pdfImageToDataUrl,
  friendlyConversionError,
  escapeMarkdown,
  type StyledBlock,
  type StyledRun,
  type StyledPage,
} from "@/lib/text-tools";

interface Result {
  bytes: Uint8Array | Blob;
  filename: string;
  detail: string;
  isBlob?: boolean;
  mime?: string;
}

function useResult() {
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const download = () => {
    if (!result) return;
    if (result.isBlob) downloadBlob(result.bytes as Blob, result.filename);
    else downloadBytes(result.bytes as Uint8Array, result.filename, result.mime ?? "application/pdf");
  };
  return { result, setResult, error, setError, busy, setBusy, download };
}

function useFiles(multiple: boolean) {
  const [files, setFiles] = useState<File[]>([]);
  const add = (incoming: File[]) => {
    setFiles((prev) => (multiple ? [...prev, ...incoming] : incoming.slice(0, 1)));
  };
  const remove = (i: number) => setFiles((prev) => prev.filter((_, x) => x !== i));
  return { files, add, remove };
}

function baseName(f: File) {
  return f.name.replace(/\.[^.]+$/, "");
}

/** Password field for the PDF tools (B-08). Shown always; blank = unprotected. */
function PasswordField({ password, setPassword }: { password: string; setPassword: (v: string) => void }) {
  return (
    <div className="mt-5">
      <OptionLabel htmlFor="convert2-pdf-password-only-if-the-file-is-protected">PDF password (only if the file is protected)</OptionLabel>
      <input id="convert2-pdf-password-only-if-the-file-is-protected"
        className={inputCls}
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="Leave blank for unprotected PDFs"
        autoComplete="off"
      />
    </div>
  );
}

/** Open styled HTML in a new window and trigger the browser print dialog. */
function printStyledHtml(html: string, title: string, setError: (m: string | null) => void) {
  const w = window.open("", "_blank", "width=800,height=900");
  if (!w) {
    setError("Your browser blocked the print window. Allow pop-ups for this site and try again.");
    return;
  }
  w.document.write(html);
  w.document.close();
  w.focus();
  setTimeout(() => w.print(), 300);
  void title;
}

/** Link runs render blue + underlined in the basic PDF (colour may already be set). */
function linkRuns(runs: StyledRun[]): StyledRun[] {
  return runs.map((r) => (r.link ? { ...r, color: r.color ?? "#2563EB", underline: true } : r));
}

function blocksWithLinkStyle(blocks: StyledBlock[]): StyledBlock[] {
  return blocks.map((b) => {
    if (b.runs) return { ...b, runs: linkRuns(b.runs) };
    if (b.rows) return { ...b, rows: b.rows.map((row) => row.map((cell) => linkRuns(cell))) };
    return b;
  });
}

/** Convert a styled page's images into docx ImageRun paragraphs (browser). */
async function pageImageParagraphs(page: StyledPage) {
  const { Paragraph, ImageRun } = await import("docx");
  const out: InstanceType<typeof Paragraph>[] = [];
  for (const img of page.images) {
    const dataUrl = pdfImageToDataUrl(img);
    if (!dataUrl) continue;
    try {
      const buf = await (await fetch(dataUrl)).arrayBuffer();
      const maxW = 450;
      const scale = Math.min(1, maxW / img.width);
      out.push(new Paragraph({
        children: [new ImageRun({ type: "png", data: buf, transformation: { width: Math.round(img.width * scale), height: Math.round(img.height * scale) } })],
      }));
    } catch { /* image is optional */ }
  }
  return out;
}

// ---------------------------------------------------------------- PDF to Word
export function PdfToWordTool() {
  const { files, add, remove } = useFiles(false);
  const r = useResult();
  const [password, setPassword] = useState("");

  const run = async () => {
    r.setError(null);
    r.setResult(null);
    if (!files.length) return r.setError("Choose a PDF file.");
    r.setBusy(true);
    try {
      const pages = await extractStyledPages(await fileBytes(files[0]), password || undefined);
      const { Document, Packer, Paragraph, TextRun, HeadingLevel, PageBreak, Table, TableRow, TableCell, WidthType, ExternalHyperlink } = await import("docx");
      const children: InstanceType<typeof Paragraph>[] = [];
      let tablesBuilt = 0;
      let imagesKept = 0;
      let blankPages = 0;
      for (let pi = 0; pi < pages.length; pi++) {
        const page = pages[pi];
        if (pi > 0) children.push(new Paragraph({ children: [new PageBreak()] }));
        if (!page.hasText && !page.images.length) {
          blankPages++;
          children.push(new Paragraph({ spacing: { after: 0 }, children: [new TextRun({ text: "(No extractable text on this page — it may be scanned or image-only.)", italics: true, color: "6B7280" })] }));
          continue;
        }
        const vrows = visualRows(page);
        let i = 0;
        while (i < vrows.length) {
          const vr = vrows[i];
          // Consecutive table rows become a real Word table.
          if (vr.isTable) {
            const tableRows: InstanceType<typeof TableRow>[] = [];
            while (i < vrows.length && vrows[i].isTable) {
              const cur = vrows[i];
              tableRows.push(new TableRow({
                children: cur.cells.map((cellRuns) => new TableCell({
                  width: { size: Math.round(100 / cur.cells.length), type: WidthType.PERCENTAGE },
                  children: [new Paragraph({
                    spacing: { after: 0 },
                    children: cellRuns.map((run) => {
                      const tr = new TextRun({ text: run.str, size: Math.round(run.fontSize * 2), color: run.color?.replace("#", ""), bold: run.bold, italics: run.italic });
                      return run.link ? new ExternalHyperlink({ children: [tr], link: run.link }) : tr;
                    }) as never,
                  })],
                })),
              }));
              i++;
            }
            tablesBuilt++;
            children.push(new Table({ rows: tableRows, width: { size: 100, type: WidthType.PERCENTAGE } }) as unknown as InstanceType<typeof Paragraph>);
            continue;
          }
          for (const line of vr.lines) {
            const runs = line.runs.map((run) => {
              const tr = new TextRun({
                text: run.str,
                size: Math.round(run.fontSize * 2),
                color: run.color?.replace("#", ""),
                bold: run.bold,
                italics: run.italic,
              });
              return run.link ? new ExternalHyperlink({ children: [tr], link: run.link }) : tr;
            });
            if (line.isHeading) {
              children.push(new Paragraph({ heading: line.fontSize >= 1.8 * page.medianSize ? HeadingLevel.HEADING_1 : HeadingLevel.HEADING_2, spacing: { after: 0 }, children: runs as never }));
            } else {
              children.push(new Paragraph({ spacing: { after: 0 }, children: runs as never }));
            }
          }
          i++;
        }
        const imgParas = await pageImageParagraphs(page);
        imagesKept += imgParas.length;
        children.push(...imgParas);
      }
      const doc = new Document({ sections: [{ children }] });
      const blob = await Packer.toBlob(doc);
      const notes: string[] = [];
      if (tablesBuilt) notes.push(`${tablesBuilt} table(s) rebuilt as real Word tables`);
      if (imagesKept) notes.push(`${imagesKept} image(s) kept`);
      if (blankPages) notes.push(`${blankPages} page(s) had no extractable text`);
      r.setResult({
        bytes: blob,
        isBlob: true,
        filename: `${baseName(files[0])}.docx`,
        detail: `Converted ${pages.length} page(s) into a Word document (${formatBytes(blob.size)}). Preserves text, font sizes, colours and headings; exact page layout may shift. Bold/italic from PDFs are not preserved (PDFs do not expose them to the extractor).${notes.length ? ` ${notes.join("; ")}.` : ""}`,
      });
    } catch (e) {
      r.setError(friendlyConversionError(e, "Conversion failed. The file may be damaged or password-protected."));
    } finally {
      r.setBusy(false);
    }
  };

  return (
    <div>
      <Dropzone accept="application/pdf,.pdf" onFiles={add} hint="One PDF file" />
      <FileList files={files} onRemove={remove} />
      <PasswordField password={password} setPassword={setPassword} />
      <ProcessButton busy={r.busy} disabled={!files.length} label="Convert to Word" busyLabel="Converting…" onClick={run} />
      <ErrorNote message={r.error} />
      {r.result && <ResultCard title="Your Word document is ready" detail={r.result.detail} filename={r.result.filename} onDownload={r.download} />}
    </div>
  );
}

// ---------------------------------------------------------------- PDF to PowerPoint
export function PdfToPptxTool() {
  const { files, add, remove } = useFiles(false);
  const r = useResult();
  const [password, setPassword] = useState("");

  const run = async () => {
    r.setError(null);
    r.setResult(null);
    if (!files.length) return r.setError("Choose a PDF file.");
    r.setBusy(true);
    try {
      const pages = await extractStyledPages(await fileBytes(files[0]), password || undefined);
      const PptxGenJS = (await import("pptxgenjs")).default;
      const pptx = new PptxGenJS();
      pptx.defineLayout({ name: "WIDE", width: 13.33, height: 7.5 });
      pptx.layout = "WIDE";
      let imagesKept = 0;
      let tablesBuilt = 0;
      for (const page of pages) {
        const slide = pptx.addSlide();
        let y = 0.4;
        if (!page.hasText && !page.images.length) {
          slide.addText("(No extractable text on this page — it may be scanned or image-only.)", { x: 0.5, y: 0.5, w: 12.33, h: 0.6, fontSize: 14, italic: true, color: "6B7280" });
        }
        const vrows = visualRows(page);
        let i = 0;
        while (i < vrows.length) {
          const vr = vrows[i];
          if (vr.isTable) {
            const tableRows: string[][] = [];
            while (i < vrows.length && vrows[i].isTable) { tableRows.push(vrows[i].texts); i++; }
            tablesBuilt++;
            slide.addTable(tableRows.map((tr) => tr.map((c) => ({ text: c, options: { fontSize: 12, color: "1F2937" } }))), {
              x: 0.5, y, w: 12.33, colW: Array.from({ length: tableRows[0].length }, () => 12.33 / tableRows[0].length),
              border: { pt: 0.5, color: "D1D5DB" },
            });
            y += tableRows.length * 0.35 + 0.2;
            continue;
          }
          for (const line of vr.lines) {
            const size = Math.min(32, Math.max(10, Math.round(line.fontSize)));
            const h = size * 1.5 / 72 + 0.08;
            slide.addText(line.text, {
              x: 0.5, y, w: 12.33, h,
              fontSize: size,
              bold: line.isHeading,
              color: (line.color ?? (line.isHeading ? "0F766E" : "1F2937")).replace("#", ""),
              valign: "top",
            });
            y += h;
          }
          i++;
        }
        for (const img of page.images) {
          const dataUrl = pdfImageToDataUrl(img);
          if (!dataUrl) continue;
          try {
            const wIn = Math.min(6, img.width / 96);
            slide.addImage({ data: dataUrl, x: 0.5, y: Math.min(y + 0.1, 6.2), w: wIn, h: (wIn * img.height) / img.width });
            imagesKept++;
          } catch { /* image is optional */ }
        }
      }
      const blob = (await pptx.write({ outputType: "blob" })) as Blob;
      r.setResult({
        bytes: blob,
        isBlob: true,
        filename: `${baseName(files[0])}.pptx`,
        detail: `Converted ${pages.length} page(s) into a PowerPoint deck (${formatBytes(blob.size)}), one slide per page. Preserves text, font sizes and colours, with each line on its own text box; exact page layout may shift. Bold/italic from PDFs are not preserved.${tablesBuilt ? ` ${tablesBuilt} table(s) rebuilt as real tables.` : ""}${imagesKept ? ` ${imagesKept} image(s) kept.` : ""}`,
      });
    } catch (e) {
      r.setError(friendlyConversionError(e, "Conversion failed. The file may be damaged or password-protected."));
    } finally {
      r.setBusy(false);
    }
  };

  return (
    <div>
      <Dropzone accept="application/pdf,.pdf" onFiles={add} hint="One PDF file" />
      <FileList files={files} onRemove={remove} />
      <PasswordField password={password} setPassword={setPassword} />
      <ProcessButton busy={r.busy} disabled={!files.length} label="Convert to PowerPoint" busyLabel="Converting…" onClick={run} />
      <ErrorNote message={r.error} />
      {r.result && <ResultCard title="Your presentation is ready" detail={r.result.detail} filename={r.result.filename} onDownload={r.download} />}
    </div>
  );
}

// ---------------------------------------------------------------- PDF to Excel
export function PdfToExcelTool() {
  const { files, add, remove } = useFiles(false);
  const r = useResult();
  const [password, setPassword] = useState("");

  const run = async () => {
    r.setError(null);
    r.setResult(null);
    if (!files.length) return r.setError("Choose a PDF file.");
    r.setBusy(true);
    try {
      const pages = await extractStyledPages(await fileBytes(files[0]), password || undefined);
      const XLSX = await import("xlsx");
      const wb = XLSX.utils.book_new();
      let warnedSingleColumn = 0;
      let warnedUnsplit = 0;
      pages.forEach((page, i) => {
        const { rows, columnsDetected, unsplitRows } = extractTableRows(page);
        const finalRows = rows.length ? rows : [["(no extractable text on this page)"]];
        if (!columnsDetected) warnedSingleColumn++;
        warnedUnsplit += unsplitRows;
        const ws = XLSX.utils.aoa_to_sheet(finalRows);
        const cols = Math.max(...finalRows.map((row) => row.length));
        ws["!cols"] = Array.from({ length: cols }, (_, ci) => {
          const maxLen = Math.max(...finalRows.map((row) => (row[ci] ?? "").length), 8);
          return { wch: Math.min(50, Math.max(10, maxLen + 2)) };
        });
        XLSX.utils.book_append_sheet(wb, ws, `Page ${i + 1}`.slice(0, 31));
      });
      const buf = XLSX.write(wb, { type: "array", bookType: "xlsx" }) as ArrayBuffer;
      const blob = new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
      const notes: string[] = [];
      if (warnedSingleColumn) notes.push(`${warnedSingleColumn} page(s) had no detectable table columns, so their text went into a single column`);
      if (warnedUnsplit) notes.push(`${warnedUnsplit} row(s) were stored as one cell because the PDF stores them as a single text run`);
      r.setResult({
        bytes: blob,
        isBlob: true,
        filename: `${baseName(files[0])}.xlsx`,
        detail: `Converted ${pages.length} page(s) into a spreadsheet (${formatBytes(blob.size)}), one sheet per page. Columns are detected from text positions, not guessed from spaces — check them before relying on them.${notes.length ? ` ${notes.join("; ")}.` : ""}`,
      });
    } catch (e) {
      r.setError(friendlyConversionError(e, "Conversion failed. The file may be damaged or password-protected."));
    } finally {
      r.setBusy(false);
    }
  };

  return (
    <div>
      <Dropzone accept="application/pdf,.pdf" onFiles={add} hint="One PDF file" />
      <FileList files={files} onRemove={remove} />
      <PasswordField password={password} setPassword={setPassword} />
      <ProcessButton busy={r.busy} disabled={!files.length} label="Convert to Excel" busyLabel="Converting…" onClick={run} />
      <ErrorNote message={r.error} />
      {r.result && <ResultCard title="Your spreadsheet is ready" detail={r.result.detail} filename={r.result.filename} onDownload={r.download} />}
    </div>
  );
}

// ---------------------------------------------------------------- Word to PDF
export function WordToPdfTool() {
  const { files, add, remove } = useFiles(false);
  const r = useResult();
  const [parsed, setParsed] = useState<StyledBlock[] | null>(null);

  const parse = async () => {
    if (!files.length) throw new Error("Choose a .docx file.");
    const { blocks } = await parseDocxStyled(await files[0].arrayBuffer());
    if (!blocks.some((b) => (b.runs && b.runs.some((run) => run.text.trim())) || b.type === "table" || b.type === "image")) {
      throw new Error("No text could be extracted from this Word file. It may be empty or image-only.");
    }
    setParsed(blocks);
    return blocks;
  };

  const run = async () => {
    r.setError(null);
    r.setResult(null);
    if (!files.length) return r.setError("Choose a .docx file.");
    r.setBusy(true);
    try {
      const blocks = await parse();
      const bytes = await renderStyledBlocksToPdf(blocksWithLinkStyle(blocks), { title: baseName(files[0]) });
      r.setResult({
        bytes,
        filename: `${baseName(files[0])}.pdf`,
        detail: `Converted into a PDF (${formatBytes(bytes.length)}). Preserves text, fonts, sizes, colours, bold/italic, headings, lists, tables, links and images where possible; exact Word pagination may shift. Urdu, Arabic, Chinese and other non-Latin text uses a downloaded Unicode font — if that download fails, use “Print / Save as PDF” instead.`,
      });
    } catch (e) {
      r.setError(friendlyConversionError(e, "Conversion failed. Only .docx files are supported."));
    } finally {
      r.setBusy(false);
    }
  };

  const printPdf = async () => {
    r.setError(null);
    if (!files.length) return r.setError("Choose a .docx file.");
    try {
      const blocks = parsed ?? (await parse());
      printStyledHtml(styledBlocksToHtml(blocks, baseName(files[0])), baseName(files[0]), r.setError);
    } catch (e) {
      r.setError(friendlyConversionError(e, "Could not build the styled PDF."));
    }
  };

  return (
    <div>
      <Dropzone accept="application/vnd.openxmlformats-officedocument.wordprocessingml.document,.docx" onFiles={add} hint="One .docx file" />
      <FileList files={files} onRemove={remove} />
      <div className="mt-5 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={printPdf}
          className="inline-flex items-center justify-center gap-2 rounded-full bg-teal-700 px-6 py-3.5 text-base font-semibold text-white hover:bg-teal-800"
        >
          Print / Save as PDF (styled)
        </button>
        <ProcessButton busy={r.busy} disabled={!files.length} label="Download basic PDF" busyLabel="Converting…" onClick={run} />
      </div>
      <p className="mt-3 text-sm text-slate-500">
        “Print / Save as PDF” keeps the full styling through your browser’s print dialog — choose “Save as PDF” there. It is the best option for Urdu, Arabic, Chinese or emoji text. The basic download preserves fonts, sizes, colours, headings, tables and lists, but exact Word pagination may shift.
      </p>
      <ErrorNote message={r.error} />
      {r.result && <ResultCard title="Your PDF is ready" detail={r.result.detail} filename={r.result.filename} onDownload={r.download} />}
    </div>
  );
}

// ---------------------------------------------------------------- PowerPoint to PDF
export function PptxToPdfTool() {
  const { files, add, remove } = useFiles(false);
  const r = useResult();
  const [parsed, setParsed] = useState<StyledBlock[] | null>(null);

  const parse = async () => {
    if (!files.length) throw new Error("Choose a .pptx file.");
    const { slides } = await parsePptxStyled(await files[0].arrayBuffer());
    const blocks: StyledBlock[] = [];
    slides.forEach((slide, i) => {
      if (i > 0) blocks.push({ type: "spacer" });
      if (!slide.blocks.some((b) => b.type === "heading")) {
        blocks.push({ type: "heading", level: 2, runs: [{ text: `Slide ${i + 1}` }] });
      }
      blocks.push(...slide.blocks);
    });
    if (!blocks.some((b) => (b.runs && b.runs.some((run) => run.text.trim())) || b.type === "table" || b.type === "image")) {
      throw new Error("No text found in this presentation. It may be empty or image-only.");
    }
    setParsed(blocks);
    return blocks;
  };

  const run = async () => {
    r.setError(null);
    r.setResult(null);
    if (!files.length) return r.setError("Choose a .pptx file.");
    r.setBusy(true);
    try {
      const blocks = await parse();
      const bytes = await renderStyledBlocksToPdf(blocksWithLinkStyle(blocks), { title: baseName(files[0]) });
      r.setResult({
        bytes,
        filename: `${baseName(files[0])}.pdf`,
        detail: `Converted into a PDF (${formatBytes(bytes.length)}). Slides stay in presentation order and text keeps its size, colour and bold/italic; slide designs, charts and animations are not preserved, and exact slide layout may shift. Urdu, Arabic, Chinese and other non-Latin text uses a downloaded Unicode font — if that download fails, use “Print / Save as PDF” instead.`,
      });
    } catch (e) {
      r.setError(friendlyConversionError(e, "Conversion failed. Only .pptx files are supported."));
    } finally {
      r.setBusy(false);
    }
  };

  const printPdf = async () => {
    r.setError(null);
    if (!files.length) return r.setError("Choose a .pptx file.");
    try {
      const blocks = parsed ?? (await parse());
      printStyledHtml(styledBlocksToHtml(blocks, baseName(files[0])), baseName(files[0]), r.setError);
    } catch (e) {
      r.setError(friendlyConversionError(e, "Could not build the styled PDF."));
    }
  };

  return (
    <div>
      <Dropzone accept="application/vnd.openxmlformats-officedocument.presentationml.presentation,.pptx" onFiles={add} hint="One .pptx file" />
      <FileList files={files} onRemove={remove} />
      <div className="mt-5 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={printPdf}
          className="inline-flex items-center justify-center gap-2 rounded-full bg-teal-700 px-6 py-3.5 text-base font-semibold text-white hover:bg-teal-800"
        >
          Print / Save as PDF (styled)
        </button>
        <ProcessButton busy={r.busy} disabled={!files.length} label="Download basic PDF" busyLabel="Converting…" onClick={run} />
      </div>
      <p className="mt-3 text-sm text-slate-500">
        “Print / Save as PDF” keeps the full styling through your browser’s print dialog. The basic download preserves slide order, text sizes, colours and bold/italic, but slide designs and exact layout are not preserved.
      </p>
      <ErrorNote message={r.error} />
      {r.result && <ResultCard title="Your PDF is ready" detail={r.result.detail} filename={r.result.filename} onDownload={r.download} />}
    </div>
  );
}

// ---------------------------------------------------------------- Excel to PDF
export function ExcelToPdfTool() {
  const { files, add, remove } = useFiles(false);
  const r = useResult();

  const run = async () => {
    r.setError(null);
    r.setResult(null);
    if (!files.length) return r.setError("Choose a spreadsheet file.");
    r.setBusy(true);
    try {
      const XLSX = await import("xlsx");
      const wb = XLSX.read(await files[0].arrayBuffer(), { type: "array", cellDates: true });
      if (!wb.SheetNames.length) throw new Error("No sheets found in this workbook.");
      const blocks: StyledBlock[] = [];
      let totalRows = 0;
      const emptySheets: string[] = [];
      const formatCell = (v: unknown): string => {
        if (v === null || v === undefined) return "";
        if (v instanceof Date) {
          const p = (n: number) => String(n).padStart(2, "0");
          return `${v.getFullYear()}-${p(v.getMonth() + 1)}-${p(v.getDate())}`;
        }
        return String(v);
      };
      for (const name of wb.SheetNames) {
        const ws = wb.Sheets[name];
        const rows = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, raw: true, defval: "" }) as unknown[][];
        const data = rows.filter((row) => row.some((c) => String(c ?? "").trim() !== ""));
        totalRows += data.length;
        if (!data.length) { emptySheets.push(name); continue; }
        const cols = Math.max(...data.map((row) => row.length));
        // Content-aware column widths from the longest cell in each column.
        const colChars = Array.from({ length: cols }, (_, ci) =>
          Math.min(42, Math.max(6, ...data.map((row) => formatCell(row[ci]).length))));
        const charSum = colChars.reduce((a, b) => a + b, 0) || 1;
        const colWidths = colChars.map((c) => c / charSum);
        blocks.push({ type: "heading", level: 2, runs: [{ text: name }] });
        blocks.push({
          type: "table",
          colWidths,
          rows: data.map((row, ri) =>
            Array.from({ length: cols }, (_, ci) => [{ text: formatCell(row[ci]), bold: ri === 0 }] as StyledRun[]),
          ),
        });
        blocks.push({ type: "spacer" });
      }
      if (totalRows === 0) throw new Error("No data found in any sheet of this workbook.");
      const bytes = await renderStyledBlocksToPdf(blocks, { title: baseName(files[0]) });
      r.setResult({
        bytes,
        filename: `${baseName(files[0])}.pdf`,
        detail: `Converted ${wb.SheetNames.length} sheet(s), ${totalRows} row(s) of data into a PDF (${formatBytes(bytes.length)}). Long cells wrap instead of being cut off, column widths follow the content, and dates are shown as YYYY-MM-DD. Formulas appear as their values and charts are not preserved.${emptySheets.length ? ` Empty sheets skipped: ${emptySheets.join(", ")}.` : ""}`,
      });
    } catch (e) {
      r.setError(friendlyConversionError(e, "Conversion failed. Only .xlsx / .xls / .csv files are supported."));
    } finally {
      r.setBusy(false);
    }
  };

  return (
    <div>
      <Dropzone accept="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,text/csv,.xlsx,.xls,.csv" onFiles={add} hint="One .xlsx, .xls or .csv file" />
      <FileList files={files} onRemove={remove} />
      <ProcessButton busy={r.busy} disabled={!files.length} label="Convert to PDF" busyLabel="Converting…" onClick={run} />
      <ErrorNote message={r.error} />
      {r.result && <ResultCard title="Your PDF is ready" detail={r.result.detail} filename={r.result.filename} onDownload={r.download} />}
    </div>
  );
}

// ---------------------------------------------------------------- PDF to Markdown
export function PdfToMarkdownTool() {
  const { files, add, remove } = useFiles(false);
  const r = useResult();
  const [previewHtml, setPreviewHtml] = useState<string | null>(null);
  const [password, setPassword] = useState("");

  const run = async () => {
    r.setError(null);
    r.setResult(null);
    setPreviewHtml(null);
    if (!files.length) return r.setError("Choose a PDF file.");
    r.setBusy(true);
    try {
      const pages = await extractStyledPages(await fileBytes(files[0]), password || undefined);
      const mdParts: string[] = [];
      let tablesBuilt = 0;
      for (let pi = 0; pi < pages.length; pi++) {
        const page = pages[pi];
        mdParts.push(`<!-- Page ${pi + 1} -->`);
        if (!page.hasText) {
          mdParts.push("_No extractable text on this page — it may be scanned or image-only._");
          mdParts.push("");
          continue;
        }
        const vrows = visualRows(page);
        let i = 0;
        while (i < vrows.length) {
          const vr = vrows[i];
          if (vr.isTable) {
            const tableRows: string[][] = [];
            while (i < vrows.length && vrows[i].isTable) { tableRows.push(vrows[i].texts.map((c) => escapeMarkdown(c))); i++; }
            tablesBuilt++;
            mdParts.push(`| ${tableRows[0].join(" | ")} |`);
            mdParts.push(`| ${tableRows[0].map(() => "---").join(" | ")} |`);
            for (const tr of tableRows.slice(1)) mdParts.push(`| ${tr.join(" | ")} |`);
            continue;
          }
          for (const line of vr.lines) {
            const lineMd = line.runs.map((run) => {
              const t = escapeMarkdown(run.str);
              return run.link ? `[${t}](${run.link})` : t;
            }).join(" ");
            mdParts.push(line.isHeading ? `${line.fontSize >= 1.8 * page.medianSize ? "# " : "## "}${lineMd}` : lineMd);
          }
          i++;
        }
        mdParts.push("");
      }
      const md = mdParts.join("\n");
      const blob = new Blob([md], { type: "text/markdown" });
      const { marked } = await import("marked");
      setPreviewHtml(await marked.parse(md.slice(0, 8000)));
      r.setResult({
        bytes: blob,
        isBlob: true,
        mime: "text/markdown",
        filename: `${baseName(files[0])}.md`,
        detail: `Extracted text from ${pages.length} page(s) into Markdown (${formatBytes(blob.size)}). Headings are detected from font size, not guessed from the words; tables are rebuilt where columns could be detected${tablesBuilt ? ` (${tablesBuilt} table(s))` : ""}; exact layout and images are not preserved.`,
      });
    } catch (e) {
      r.setError(friendlyConversionError(e, "Conversion failed. The file may be damaged or password-protected."));
    } finally {
      r.setBusy(false);
    }
  };

  return (
    <div>
      <Dropzone accept="application/pdf,.pdf" onFiles={add} hint="One PDF file" />
      <FileList files={files} onRemove={remove} />
      <PasswordField password={password} setPassword={setPassword} />
      <ProcessButton busy={r.busy} disabled={!files.length} label="Convert to Markdown" busyLabel="Converting…" onClick={run} />
      <ErrorNote message={r.error} />
      {r.result && <ResultCard title="Your Markdown file is ready" detail={r.result.detail} filename={r.result.filename} onDownload={r.download} />}
      {previewHtml && (
        <div className="mt-6">
          <OptionLabel>Preview (first part, rendered)</OptionLabel>
          <div className="prose-sm max-h-72 overflow-auto rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-800" dangerouslySetInnerHTML={{ __html: previewHtml }} />
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------- HTML to PDF
export function HtmlToPdfTool() {
  const [html, setHtml] = useState(
    "<h1>Hello, PDF</h1>\n<p>Paste your HTML here, or upload an .html file. Use your browser’s print dialog and choose “Save as PDF”.</p>",
  );
  const [fileName, setFileName] = useState("document");
  const r = useResult();

  const loadFile = (incoming: File[]) => {
    const f = incoming[0];
    if (!f) return;
    setFileName(baseName(f));
    const reader = new FileReader();
    reader.onload = () => setHtml(String(reader.result ?? ""));
    reader.readAsText(f);
  };

  const printPdf = () => {
    const w = window.open("", "_blank", "width=800,height=900");
    if (!w) {
      r.setError("Your browser blocked the print window. Allow pop-ups for this site and try again.");
      return;
    }
    w.document.write(`<!doctype html><html><head><title>${fileName}</title></head><body>${html}</body></html>`);
    w.document.close();
    w.focus();
    setTimeout(() => w.print(), 300);
  };

  const downloadBasic = async () => {
    r.setError(null);
    r.setResult(null);
    r.setBusy(true);
    try {
      const blocks = htmlToStyledBlocks(html);
      if (!blocks.some((b) => (b.runs && b.runs.some((run) => run.text.trim())) || b.type === "table" || b.type === "image")) {
        throw new Error("No readable text found in this HTML.");
      }
      const bytes = await renderStyledBlocksToPdf(blocksWithLinkStyle(blocks), { title: fileName });
      r.setResult({
        bytes,
        filename: `${fileName}.pdf`,
        detail: `Styled PDF created (${formatBytes(bytes.length)}). Preserves headings, bold/italic, colours, sizes, lists and tables from your HTML; exact browser layout may shift. For pixel-perfect output, use “Print / Save as PDF” above.`,
      });
    } catch (e) {
      r.setError(friendlyConversionError(e, "Could not build the PDF."));
    } finally {
      r.setBusy(false);
    }
  };

  return (
    <div>
      <Dropzone accept="text/html,.html,.htm" onFiles={loadFile} hint="Optional: upload an .html file to load it into the editor" />
      <div className="mt-5">
        <OptionLabel htmlFor="convert2-your-html">Your HTML</OptionLabel>
        <textarea id="convert2-your-html"
          className={`${inputCls} h-44 font-mono text-xs`}
          value={html}
          onChange={(e) => setHtml(e.target.value)}
          spellCheck={false}
        />
      </div>
      <div className="mt-5">
        <OptionLabel>Live preview</OptionLabel>
        <iframe
          title="HTML preview"
          sandbox=""
          srcDoc={html}
          className="h-64 w-full rounded-xl border border-slate-300 bg-white"
        />
      </div>
      <div className="mt-5 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={printPdf}
          className="inline-flex items-center justify-center gap-2 rounded-full bg-teal-700 px-6 py-3.5 text-base font-semibold text-white hover:bg-teal-800"
        >
          Print / Save as PDF
        </button>
        <ProcessButton busy={r.busy} label="Download styled PDF" busyLabel="Building…" onClick={downloadBasic} />
      </div>
      <p className="mt-3 text-sm text-slate-500">
        “Print / Save as PDF” opens your browser’s print dialog — choose “Save as PDF” there. External images, fonts and scripts are not loaded; only basic styling is kept.
      </p>
      <ErrorNote message={r.error} />
      {r.result && <ResultCard title="Your PDF is ready" detail={r.result.detail} filename={r.result.filename} onDownload={r.download} />}
    </div>
  );
}

// ---------------------------------------------------------------- Scan to PDF
// Same sizing as JPG to PDF (group-convert.tsx): "Fit" converts px to pt at
// 96 dpi and clamps the page to A4 bounds, keeping aspect and margin, never
// upscaling. Raw px as pt would make a 1200x800 px photo a 1200x800 pt page.
const FIT_MAX_W = 595; // A4 width in pt
const FIT_MAX_H = 842; // A4 height in pt
function fitImagePageSize(imgW: number, imgH: number, margin: number): [number, number] {
  const ptW = (imgW * 72) / 96;
  const ptH = (imgH * 72) / 96;
  const availW = Math.max(72, FIT_MAX_W - margin * 2);
  const availH = Math.max(72, FIT_MAX_H - margin * 2);
  const scale = Math.min(availW / ptW, availH / ptH, 1);
  return [ptW * scale + margin * 2, ptH * scale + margin * 2];
}

export function ScanToPdfTool() {
  const { files, add, remove } = useFiles(true);
  const r = useResult();
  const [pageSize, setPageSize] = useState<"a4" | "fit">("a4");

  const run = async () => {
    r.setError(null);
    r.setResult(null);
    if (!files.length) return r.setError("Choose at least one image.");
    r.setBusy(true);
    try {
      const { PDFDocument } = await import("pdf-lib");
      const out = await PDFDocument.create();
      for (const f of files) {
        const bytes = await fileBytes(f);
        const isPng = f.type === "image/png" || f.name.toLowerCase().endsWith(".png");
        const img = isPng ? await out.embedPng(bytes) : await out.embedJpg(bytes);
        const margin = 36;
        let w: number;
        let h: number;
        if (pageSize === "a4") {
          w = 595;
          h = 842;
        } else {
          [w, h] = fitImagePageSize(img.width, img.height, margin);
        }
        const page = out.addPage([w, h]);
        const scale = Math.min((w - margin * 2) / img.width, (h - margin * 2) / img.height, 1);
        const dw = img.width * scale;
        const dh = img.height * scale;
        page.drawImage(img, { x: (w - dw) / 2, y: (h - dh) / 2, width: dw, height: dh });
      }
      const bytes = await out.save();
      r.setResult({
        bytes,
        filename: "scanned.pdf",
        detail: `${files.length} image(s) combined into a ${files.length}-page PDF (${formatBytes(bytes.length)}). This tool works from image files you upload — it cannot use your phone camera.`,
      });
    } catch (e) {
      r.setError(friendlyConversionError(e, "Conversion failed. Only JPG and PNG images are supported."));
    } finally {
      r.setBusy(false);
    }
  };

  return (
    <div>
      <Dropzone accept="image/jpeg,image/png,.jpg,.jpeg,.png" multiple onFiles={add} hint="JPG and PNG images — photos of pages work well" />
      <FileList files={files} onRemove={remove} />
      <div className="mt-5">
        <OptionLabel htmlFor="convert2-page-size">Page size</OptionLabel>
        <select id="convert2-page-size" className={selectCls} value={pageSize} onChange={(e) => setPageSize(e.target.value as "a4" | "fit")}>
          <option value="a4">A4</option>
          <option value="fit">Fit each image (page = image size)</option>
        </select>
      </div>
      <ProcessButton busy={r.busy} disabled={!files.length} label="Create PDF" busyLabel="Creating…" onClick={run} />
      <ErrorNote message={r.error} />
      {r.result && <ResultCard title="Your scanned PDF is ready" detail={r.result.detail} filename={r.result.filename} onDownload={r.download} />}
    </div>
  );
}
