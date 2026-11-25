"use client";

import { useState } from "react";
import { PDFDocument } from "pdf-lib";
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
import { downloadBytes, downloadBlob, fileBytes, formatBytes, loadPdf, parseRanges } from "@/lib/pdf-utils";

interface Result {
  bytes: Uint8Array | Blob;
  filename: string;
  detail: string;
  warning?: string;
  isBlob?: boolean;
}

function useResult() {
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const download = () => {
    if (!result) return;
    if (result.isBlob) downloadBlob(result.bytes as Blob, result.filename);
    else downloadBytes(result.bytes as Uint8Array, result.filename);
  };
  return { result, setResult, error, setError, busy, setBusy, download };
}

function useFiles(multiple: boolean) {
  const [files, setFiles] = useState<File[]>([]);
  const add = (incoming: File[]) => {
    setFiles((prev) => (multiple ? [...prev, ...incoming] : incoming.slice(0, 1)));
  };
  const remove = (i: number) => setFiles((prev) => prev.filter((_, x) => x !== i));
  const move = (i: number, dir: -1 | 1) => {
    setFiles((prev) => {
      const next = [...prev];
      const j = i + dir;
      if (j < 0 || j >= next.length) return prev;
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });
  };
  return { files, setFiles, add, remove, move };
}

// ---------------------------------------------------------------- Merge
export function MergeTool() {
  const { files, add, remove, move } = useFiles(true);
  const r = useResult();

  const run = async () => {
    r.setError(null);
    r.setResult(null);
    if (files.length < 2) {
      r.setError("Choose at least two PDF files to merge.");
      return;
    }
    r.setBusy(true);
    try {
      const out = await PDFDocument.create();
      let totalPages = 0;
      for (const f of files) {
        if (f.type !== "application/pdf" && !f.name.toLowerCase().endsWith(".pdf")) {
          throw new Error(`"${f.name}" does not look like a PDF file.`);
        }
        const src = await loadPdf(await fileBytes(f));
        const pages = await out.copyPages(src, src.getPageIndices());
        pages.forEach((p) => out.addPage(p));
        totalPages += pages.length;
      }
      const bytes = await out.save();
      r.setResult({
        bytes,
        filename: "merged.pdf",
        detail: `${files.length} files merged into one PDF with ${totalPages} pages (${formatBytes(bytes.length)}).`,
      });
    } catch (e) {
      r.setError(e instanceof Error ? e.message : "Merging failed. One of the files may be damaged or password-protected.");
    } finally {
      r.setBusy(false);
    }
  };

  return (
    <div>
      <Dropzone accept="application/pdf,.pdf" multiple onFiles={add} hint="PDF files only — add two or more" />
      <FileList files={files} onRemove={remove} onMove={move} />
      <p className="mt-3 text-sm text-slate-500">Use the arrows to change the order pages appear in the merged file.</p>
      <ProcessButton busy={r.busy} disabled={files.length < 2} label="Merge PDFs" busyLabel="Merging…" onClick={run} />
      <ErrorNote message={r.error} />
      {r.result && <ResultCard title="Your merged PDF is ready" detail={r.result.detail} filename={r.result.filename} onDownload={r.download} />}
    </div>
  );
}

// ---------------------------------------------------------------- Split
export function SplitTool() {
  const { files, add, remove } = useFiles(false);
  const r = useResult();
  const [mode, setMode] = useState<"ranges" | "every">("ranges");
  const [ranges, setRanges] = useState("1-3, 5");

  const run = async () => {
    r.setError(null);
    r.setResult(null);
    if (files.length === 0) {
      r.setError("Choose a PDF file to split.");
      return;
    }
    r.setBusy(true);
    try {
      const src = await loadPdf(await fileBytes(files[0]));
      const total = src.getPageCount();
      if (mode === "every") {
        const zip = new JSZip();
        const base = files[0].name.replace(/\.pdf$/i, "");
        for (let i = 0; i < total; i++) {
          const one = await PDFDocument.create();
          const [p] = await one.copyPages(src, [i]);
          one.addPage(p);
          zip.file(`${base}-page-${i + 1}.pdf`, await one.save());
        }
        const blob = await zip.generateAsync({ type: "blob" });
        r.setResult({
          bytes: blob,
          isBlob: true,
          filename: `${base}-split.zip`,
          detail: `Split into ${total} one-page PDFs, downloaded as a ZIP (${formatBytes(blob.size)}).`,
        });
      } else {
        const pages = parseRanges(ranges, total);
        if (pages.length === 0) throw new Error(`No valid pages in "${ranges}". Use ranges like 1-3, 5 for a ${total}-page PDF.`);
        const out = await PDFDocument.create();
        const copied = await out.copyPages(src, pages.map((p) => p - 1));
        copied.forEach((p) => out.addPage(p));
        const bytes = await out.save();
        r.setResult({
          bytes,
          filename: "split.pdf",
          detail: `Extracted ${pages.length} page(s) (${pages.join(", ")}) from a ${total}-page PDF (${formatBytes(bytes.length)}).`,
        });
      }
    } catch (e) {
      r.setError(e instanceof Error ? e.message : "Splitting failed. The file may be damaged or password-protected.");
    } finally {
      r.setBusy(false);
    }
  };

  return (
    <div>
      <Dropzone accept="application/pdf,.pdf" onFiles={add} hint="One PDF file" />
      <FileList files={files} onRemove={remove} />
      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <div>
          <OptionLabel>Split mode</OptionLabel>
          <select className={selectCls} value={mode} onChange={(e) => setMode(e.target.value as "ranges" | "every")}>
            <option value="ranges">By page ranges</option>
            <option value="every">Every page as its own file (ZIP)</option>
          </select>
        </div>
        {mode === "ranges" && (
          <div>
            <OptionLabel>Page ranges (e.g. 1-3, 5, 8-10)</OptionLabel>
            <input className={inputCls} value={ranges} onChange={(e) => setRanges(e.target.value)} placeholder="1-3, 5" />
          </div>
        )}
      </div>
      <ProcessButton busy={r.busy} disabled={files.length === 0} label="Split PDF" busyLabel="Splitting…" onClick={run} />
      <ErrorNote message={r.error} />
      {r.result && <ResultCard title="Your split file is ready" detail={r.result.detail} filename={r.result.filename} onDownload={r.download} />}
    </div>
  );
}

// ---------------------------------------------------------------- Compress
export function CompressTool() {
  const { files, add, remove } = useFiles(false);
  const r = useResult();
  const [level, setLevel] = useState<"light" | "medium" | "strong">("medium");

  const run = async () => {
    r.setError(null);
    r.setResult(null);
    if (files.length === 0) {
      r.setError("Choose a PDF file to compress.");
      return;
    }
    r.setBusy(true);
    try {
      const original = await fileBytes(files[0]);
      const originalSize = original.length;
      let bytes: Uint8Array;
      let note: string;
      if (level === "light") {
        const doc = await loadPdf(original);
        bytes = await doc.save({ useObjectStreams: true });
        note = "Light mode re-saves the file with tighter internal storage. Text stays selectable.";
      } else {
        // Rebuild pages as JPEG images at a lower quality.
        const { openPdfjs, renderPageToJpeg } = await import("@/lib/pdf-utils");
        const { doc, numPages } = await openPdfjs(original);
        const quality = level === "medium" ? 0.65 : 0.4;
        const scale = level === "medium" ? 1.5 : 1.1;
        const out = await PDFDocument.create();
        for (let i = 1; i <= numPages; i++) {
          const blob = await renderPageToJpeg(doc, i, scale, quality);
          const img = await out.embedJpg(new Uint8Array(await blob.arrayBuffer()));
          const page = out.addPage([img.width, img.height]);
          page.drawImage(img, { x: 0, y: 0, width: img.width, height: img.height });
        }
        bytes = await out.save({ useObjectStreams: true });
        note =
          level === "medium"
            ? "Medium mode rebuilt each page as an image (JPEG quality 65%). Text in the result is not selectable."
            : "Strong mode rebuilt each page as a smaller image (JPEG quality 40%). Text in the result is not selectable.";
      }
      const saved = originalSize - bytes.length;
      const pct = Math.round((saved / originalSize) * 100);
      const warning =
        bytes.length >= originalSize
          ? `The compressed file (${formatBytes(bytes.length)}) is not smaller than the original (${formatBytes(originalSize)}). This can happen with files that are already tightly packed — the result is still a valid PDF.`
          : undefined;
      r.setResult({
        bytes,
        filename: "compressed.pdf",
        detail: `${note} Original ${formatBytes(originalSize)} → ${formatBytes(bytes.length)}${saved > 0 ? ` (${pct}% smaller)` : ""}.`,
        warning,
      });
    } catch (e) {
      r.setError(e instanceof Error ? e.message : "Compression failed. The file may be damaged or password-protected.");
    } finally {
      r.setBusy(false);
    }
  };

  return (
    <div>
      <Dropzone accept="application/pdf,.pdf" onFiles={add} hint="One PDF file" />
      <FileList files={files} onRemove={remove} />
      <div className="mt-5 max-w-sm">
        <OptionLabel>Compression level</OptionLabel>
        <select className={selectCls} value={level} onChange={(e) => setLevel(e.target.value as "light" | "medium" | "strong")}>
          <option value="light">Light — re-save, keeps text selectable</option>
          <option value="medium">Medium — rebuild pages as images, good balance</option>
          <option value="strong">Strong — smallest file, lower image quality</option>
        </select>
        <p className="mt-2 text-sm text-slate-500">
          Medium and Strong rebuild pages as images, so text stops being selectable. How much a
          file shrinks depends on what is inside it — scanned pages shrink a lot, text-only files
          barely shrink at all.
        </p>
      </div>
      <ProcessButton busy={r.busy} disabled={files.length === 0} label="Compress PDF" busyLabel="Compressing…" onClick={run} />
      <ErrorNote message={r.error} />
      {r.result && (
        <ResultCard
          title={r.result.warning ? "Compressed file ready — but it did not get smaller" : "Your compressed PDF is ready"}
          detail={r.result.detail}
          warning={r.result.warning}
          downloadLabel={r.result.warning ? "Download anyway" : undefined}
          filename={r.result.filename}
          onDownload={r.download}
        />
      )}
    </div>
  );
}
