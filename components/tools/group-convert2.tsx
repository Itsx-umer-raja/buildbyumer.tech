"use client";

import { useState } from "react";
import JSZip from "jszip";
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
  extractPagesText,
  splitLines,
  looksLikeHeading,
  renderTextPagesToPdf,
  htmlToPlainText,
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

// ---------------------------------------------------------------- PDF to Word
export function PdfToWordTool() {
  const { files, add, remove } = useFiles(false);
  const r = useResult();

  const run = async () => {
    r.setError(null);
    r.setResult(null);
    if (!files.length) return r.setError("Choose a PDF file.");
    r.setBusy(true);
    try {
      const pages = await extractPagesText(await fileBytes(files[0]));
      const { Document, Packer, Paragraph, TextRun, HeadingLevel, PageBreak } = await import("docx");
      const children: (InstanceType<typeof Paragraph>)[] = [];
      pages.forEach((text, pi) => {
        if (pi > 0) children.push(new Paragraph({ children: [new PageBreak()] }));
        for (const line of splitLines(text)) {
          if (looksLikeHeading(line)) {
            children.push(new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun(line)] }));
          } else {
            children.push(new Paragraph({ children: [new TextRun(line)] }));
          }
        }
        if (!text.trim()) children.push(new Paragraph({ children: [new TextRun("")] }));
      });
      const doc = new Document({ sections: [{ children }] });
      const blob = await Packer.toBlob(doc);
      r.setResult({
        bytes: blob,
        isBlob: true,
        filename: `${baseName(files[0])}.docx`,
        detail: `Converted ${pages.length} page(s) of text into a Word document (${formatBytes(blob.size)}). Layout, images and tables are not preserved — text reflows.`,
      });
    } catch (e) {
      r.setError(e instanceof Error ? e.message : "Conversion failed. The file may be damaged or password-protected.");
    } finally {
      r.setBusy(false);
    }
  };

  return (
    <div>
      <Dropzone accept="application/pdf,.pdf" onFiles={add} hint="One PDF file" />
      <FileList files={files} onRemove={remove} />
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

  const run = async () => {
    r.setError(null);
    r.setResult(null);
    if (!files.length) return r.setError("Choose a PDF file.");
    r.setBusy(true);
    try {
      const pages = await extractPagesText(await fileBytes(files[0]));
      const PptxGenJS = (await import("pptxgenjs")).default;
      const pptx = new PptxGenJS();
      pptx.defineLayout({ name: "WIDE", width: 13.33, height: 7.5 });
      pptx.layout = "WIDE";
      for (const text of pages) {
        const slide = pptx.addSlide();
        const lines = splitLines(text);
        const heading = lines.find(looksLikeHeading);
        const body = lines.filter((l) => l !== heading).join("\n");
        if (heading) {
          slide.addText(heading, { x: 0.5, y: 0.3, w: 12.33, h: 0.7, fontSize: 28, bold: true, color: "0F766E" });
        }
        slide.addText(body || "(no extractable text on this page)", {
          x: 0.5,
          y: heading ? 1.1 : 0.5,
          w: 12.33,
          h: heading ? 6.0 : 6.5,
          fontSize: 14,
          color: "1F2937",
          valign: "top",
        });
      }
      const blob = (await pptx.write({ outputType: "blob" })) as Blob;
      r.setResult({
        bytes: blob,
        isBlob: true,
        filename: `${baseName(files[0])}.pptx`,
        detail: `Converted ${pages.length} page(s) of text into a PowerPoint deck (${formatBytes(blob.size)}), one slide per page. Layout, images and charts are not preserved — text reflows.`,
      });
    } catch (e) {
      r.setError(e instanceof Error ? e.message : "Conversion failed. The file may be damaged or password-protected.");
    } finally {
      r.setBusy(false);
    }
  };

  return (
    <div>
      <Dropzone accept="application/pdf,.pdf" onFiles={add} hint="One PDF file" />
      <FileList files={files} onRemove={remove} />
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

  const run = async () => {
    r.setError(null);
    r.setResult(null);
    if (!files.length) return r.setError("Choose a PDF file.");
    r.setBusy(true);
    try {
      const pages = await extractPagesText(await fileBytes(files[0]));
      const XLSX = await import("xlsx");
      const wb = XLSX.utils.book_new();
      pages.forEach((text, i) => {
        const rows = splitLines(text).map((line) => {
          const cells = line.split(/\s{2,}|\t/).map((c) => c.trim()).filter(Boolean);
          return cells.length > 1 ? cells : [line];
        });
        const ws = XLSX.utils.aoa_to_sheet(rows.length ? rows : [["(no extractable text on this page)"]]);
        ws["!cols"] = [{ wch: 60 }];
        XLSX.utils.book_append_sheet(wb, ws, `Page ${i + 1}`.slice(0, 31));
      });
      const buf = XLSX.write(wb, { type: "array", bookType: "xlsx" }) as ArrayBuffer;
      const blob = new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
      r.setResult({
        bytes: blob,
        isBlob: true,
        filename: `${baseName(files[0])}.xlsx`,
        detail: `Converted ${pages.length} page(s) into a spreadsheet (${formatBytes(blob.size)}), one sheet per page. Tables are approximated from text spacing — check the columns before relying on them.`,
      });
    } catch (e) {
      r.setError(e instanceof Error ? e.message : "Conversion failed. The file may be damaged or password-protected.");
    } finally {
      r.setBusy(false);
    }
  };

  return (
    <div>
      <Dropzone accept="application/pdf,.pdf" onFiles={add} hint="One PDF file" />
      <FileList files={files} onRemove={remove} />
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

  const run = async () => {
    r.setError(null);
    r.setResult(null);
    if (!files.length) return r.setError("Choose a .docx file.");
    r.setBusy(true);
    try {
      const mammoth = await import("mammoth");
      const { value, messages } = await mammoth.extractRawText({ arrayBuffer: await files[0].arrayBuffer() });
      const lines = splitLines(value);
      if (!lines.length) throw new Error("No text could be extracted from this Word file. It may be empty or image-only.");
      const bytes = await renderTextPagesToPdf([{ lines }], { title: baseName(files[0]) });
      const warn = messages.length ? " Some Word features were skipped during extraction." : "";
      r.setResult({
        bytes,
        filename: `${baseName(files[0])}.pdf`,
        detail: `Converted ${lines.length} line(s) of text into a PDF (${formatBytes(bytes.length)}).${warn} Original Word layout, images and tables are not preserved — text reflows.`,
      });
    } catch (e) {
      r.setError(e instanceof Error ? e.message : "Conversion failed. Only .docx files are supported.");
    } finally {
      r.setBusy(false);
    }
  };

  return (
    <div>
      <Dropzone accept="application/vnd.openxmlformats-officedocument.wordprocessingml.document,.docx" onFiles={add} hint="One .docx file" />
      <FileList files={files} onRemove={remove} />
      <ProcessButton busy={r.busy} disabled={!files.length} label="Convert to PDF" busyLabel="Converting…" onClick={run} />
      <ErrorNote message={r.error} />
      {r.result && <ResultCard title="Your PDF is ready" detail={r.result.detail} filename={r.result.filename} onDownload={r.download} />}
    </div>
  );
}

// ---------------------------------------------------------------- PowerPoint to PDF
export function PptxToPdfTool() {
  const { files, add, remove } = useFiles(false);
  const r = useResult();

  const run = async () => {
    r.setError(null);
    r.setResult(null);
    if (!files.length) return r.setError("Choose a .pptx file.");
    r.setBusy(true);
    try {
      const zip = await JSZip.loadAsync(await files[0].arrayBuffer());
      const slideNames = Object.keys(zip.files)
        .filter((n) => /^ppt\/slides\/slide\d+\.xml$/.test(n))
        .sort((a, b) => {
          const na = parseInt(a.match(/slide(\d+)\.xml$/)?.[1] ?? "0", 10);
          const nb = parseInt(b.match(/slide(\d+)\.xml$/)?.[1] ?? "0", 10);
          return na - nb;
        });
      if (!slideNames.length) throw new Error("No slides found in this file. Only .pptx presentations are supported.");
      const pages: { heading?: string; lines: string[] }[] = [];
      for (const name of slideNames) {
        const xml = await zip.files[name].async("string");
        const texts = [...xml.matchAll(/<a:t>([^<]*)<\/a:t>/g)].map((m) => m[1].trim()).filter(Boolean);
        const heading = texts.find(looksLikeHeading);
        pages.push({ heading, lines: texts.filter((t) => t !== heading) });
      }
      const bytes = await renderTextPagesToPdf(pages, { title: baseName(files[0]) });
      r.setResult({
        bytes,
        filename: `${baseName(files[0])}.pdf`,
        detail: `Converted ${pages.length} slide(s) of text into a PDF (${formatBytes(bytes.length)}). Slide designs, images, charts and animations are not preserved — text reflows.`,
      });
    } catch (e) {
      r.setError(e instanceof Error ? e.message : "Conversion failed. Only .pptx files are supported.");
    } finally {
      r.setBusy(false);
    }
  };

  return (
    <div>
      <Dropzone accept="application/vnd.openxmlformats-officedocument.presentationml.presentation,.pptx" onFiles={add} hint="One .pptx file" />
      <FileList files={files} onRemove={remove} />
      <ProcessButton busy={r.busy} disabled={!files.length} label="Convert to PDF" busyLabel="Converting…" onClick={run} />
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
      const wb = XLSX.read(await files[0].arrayBuffer(), { type: "array" });
      if (!wb.SheetNames.length) throw new Error("No sheets found in this workbook.");
      const { PDFDocument, StandardFonts, rgb } = await import("pdf-lib");
      const doc = await PDFDocument.create();
      const font = await doc.embedFont(StandardFonts.Helvetica);
      const bold = await doc.embedFont(StandardFonts.HelveticaBold);
      const margin = 40;
      const pageW = 595.28;
      const pageH = 841.89;
      const rowH = 18;
      let totalRows = 0;
      for (const name of wb.SheetNames) {
        const ws = wb.Sheets[name];
        const rows = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, raw: false, defval: "" }) as unknown[][];
        const data = rows.filter((row) => row.some((c) => String(c ?? "").trim() !== ""));
        totalRows += data.length;
        if (!data.length) continue;
        const cols = Math.max(...data.map((row) => row.length));
        const colW = (pageW - margin * 2) / cols;
        let page = doc.addPage([pageW, pageH]);
        let y = pageH - margin;
        page.drawText(name, { x: margin, y, size: 14, font: bold, color: rgb(0.1, 0.1, 0.1) });
        y -= 24;
        data.forEach((row, ri) => {
          if (y < margin + rowH) {
            page = doc.addPage([pageW, pageH]);
            y = pageH - margin;
          }
          const f = ri === 0 ? bold : font;
          for (let ci = 0; ci < cols; ci++) {
            const cell = String(row[ci] ?? "");
            const shown = cell.length > 40 ? `${cell.slice(0, 37)}…` : cell;
            page.drawText(shown, { x: margin + ci * colW + 4, y: y - 13, size: 9, font: f, color: rgb(0.15, 0.15, 0.15), maxWidth: colW - 8 });
            page.drawRectangle({ x: margin + ci * colW, y: y - rowH, width: colW, height: rowH, borderColor: rgb(0.8, 0.8, 0.8), borderWidth: 0.5 });
          }
          y -= rowH;
        });
      }
      if (totalRows === 0) throw new Error("No data found in any sheet of this workbook.");
      const bytes = await doc.save();
      r.setResult({
        bytes,
        filename: `${baseName(files[0])}.pdf`,
        detail: `Converted ${wb.SheetNames.length} sheet(s), ${totalRows} row(s) of data into a PDF (${formatBytes(bytes.length)}). Long cell text is truncated at 40 characters; charts and formulas are rendered as their values.`,
      });
    } catch (e) {
      r.setError(e instanceof Error ? e.message : "Conversion failed. Only .xlsx / .xls / .csv files are supported.");
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

  const run = async () => {
    r.setError(null);
    r.setResult(null);
    setPreviewHtml(null);
    if (!files.length) return r.setError("Choose a PDF file.");
    r.setBusy(true);
    try {
      const pages = await extractPagesText(await fileBytes(files[0]));
      const mdParts: string[] = [];
      pages.forEach((text, i) => {
        mdParts.push(`<!-- Page ${i + 1} -->`);
        for (const line of splitLines(text)) {
          mdParts.push(looksLikeHeading(line) ? `## ${line}` : line);
        }
        mdParts.push("");
      });
      const md = mdParts.join("\n");
      const blob = new Blob([md], { type: "text/markdown" });
      const { marked } = await import("marked");
      setPreviewHtml(await marked.parse(md.slice(0, 8000)));
      r.setResult({
        bytes: blob,
        isBlob: true,
        mime: "text/markdown",
        filename: `${baseName(files[0])}.md`,
        detail: `Extracted text from ${pages.length} page(s) into Markdown (${formatBytes(blob.size)}). Headings are guessed from short lines — this is text extraction plus reflow, not a perfect conversion.`,
      });
    } catch (e) {
      r.setError(e instanceof Error ? e.message : "Conversion failed. The file may be damaged or password-protected.");
    } finally {
      r.setBusy(false);
    }
  };

  return (
    <div>
      <Dropzone accept="application/pdf,.pdf" onFiles={add} hint="One PDF file" />
      <FileList files={files} onRemove={remove} />
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
    "<h1>Hello, PDF</h1>\n<p>Paste your HTML here, or upload an .html file. Use your browser's print dialog and choose “Save as PDF”.</p>",
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
      const text = htmlToPlainText(html);
      const lines = splitLines(text);
      if (!lines.length) throw new Error("No readable text found in this HTML.");
      const bytes = await renderTextPagesToPdf([{ lines }], { title: fileName });
      r.setResult({
        bytes,
        filename: `${fileName}.pdf`,
        detail: `Basic text-only PDF created (${formatBytes(bytes.length)}). For the styled version, use “Print / Save as PDF” above.`,
      });
    } catch (e) {
      r.setError(e instanceof Error ? e.message : "Could not build the PDF.");
    } finally {
      r.setBusy(false);
    }
  };

  return (
    <div>
      <Dropzone accept="text/html,.html,.htm" onFiles={loadFile} hint="Optional: upload an .html file to load it into the editor" />
      <div className="mt-5">
        <OptionLabel>Your HTML</OptionLabel>
        <textarea
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
        <ProcessButton busy={r.busy} label="Download basic text PDF" busyLabel="Building…" onClick={downloadBasic} />
      </div>
      <p className="mt-3 text-sm text-slate-500">
        “Print / Save as PDF” opens your browser's print dialog — choose “Save as PDF” there. External images, fonts and scripts are not loaded; only basic styling is kept.
      </p>
      <ErrorNote message={r.error} />
      {r.result && <ResultCard title="Your basic PDF is ready" detail={r.result.detail} filename={r.result.filename} onDownload={r.download} />}
    </div>
  );
}

// ---------------------------------------------------------------- Scan to PDF
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
        const w = pageSize === "a4" ? 595.28 : img.width;
        const h = pageSize === "a4" ? 841.89 : img.height;
        const page = out.addPage([w, h]);
        const margin = 36;
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
      r.setError(e instanceof Error ? e.message : "Conversion failed. Only JPG and PNG images are supported.");
    } finally {
      r.setBusy(false);
    }
  };

  return (
    <div>
      <Dropzone accept="image/jpeg,image/png,.jpg,.jpeg,.png" multiple onFiles={add} hint="JPG and PNG images — photos of pages work well" />
      <FileList files={files} onRemove={remove} />
      <div className="mt-5">
        <OptionLabel>Page size</OptionLabel>
        <select className={selectCls} value={pageSize} onChange={(e) => setPageSize(e.target.value as "a4" | "fit")}>
          <option value="a4">A4</option>
          <option value="fit">Fit each image</option>
        </select>
      </div>
      <ProcessButton busy={r.busy} disabled={!files.length} label="Create PDF" busyLabel="Creating…" onClick={run} />
      <ErrorNote message={r.error} />
      {r.result && <ResultCard title="Your scanned PDF is ready" detail={r.result.detail} filename={r.result.filename} onDownload={r.download} />}
    </div>
  );
}
