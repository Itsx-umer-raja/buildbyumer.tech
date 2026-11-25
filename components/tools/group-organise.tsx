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
import { downloadBytes, downloadBlob, fileBytes, formatBytes, loadPdf, parseRanges, countFormFields } from "@/lib/pdf-utils";

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
      let formFieldsLost = 0;
      const formFiles: string[] = [];
      for (const f of files) {
        if (f.type !== "application/pdf" && !f.name.toLowerCase().endsWith(".pdf")) {
          throw new Error(`"${f.name}" does not look like a PDF file.`);
        }
        const src = await loadPdf(await fileBytes(f));
        // B-01: copyPages does not copy the AcroForm dictionary, so fillable
        // fields are lost. Count them here so the user is warned, not surprised.
        const fields = countFormFields(src);
        if (fields > 0) {
          formFieldsLost += fields;
          formFiles.push(f.name);
        }
        const pages = await out.copyPages(src, src.getPageIndices());
        pages.forEach((p) => out.addPage(p));
        totalPages += pages.length;
      }
      if (totalPages === 0) throw new Error("None of the chosen files contain any pages to merge.");
      const bytes = await out.save();
      r.setResult({
        bytes,
        filename: "merged.pdf",
        detail: `${files.length} files merged into one PDF with ${totalPages} pages (${formatBytes(bytes.length)}).`,
        warning:
          formFieldsLost > 0
            ? `${formFieldsLost} fillable form field(s) from ${formFiles.join(", ")} were lost — merging copies pages but not form fields, so the merged file has no fillable fields. The filled-in values are gone too.`
            : undefined,
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
      {r.result && <ResultCard title="Your merged PDF is ready" detail={r.result.detail} warning={r.result.warning} filename={r.result.filename} onDownload={r.download} />}
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
      if (total === 0) throw new Error("This PDF has no pages to split.");
      // B-01: splitting copies pages, not the AcroForm — warn up front.
      const formFields = countFormFields(src);
      const formWarning =
        formFields > 0
          ? `${formFields} fillable form field(s) in this file were lost — splitting copies pages but not form fields, so the output has no fillable fields.`
          : undefined;
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
          warning: formWarning,
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
          detail: `Extracted ${pages.length} page(s) (${pages.join(", ")}) from a ${total}-page PDF (${formatBytes(bytes.length)}). Pages are in the order you listed them.`,
          warning: formWarning,
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
      {r.result && <ResultCard title="Your split file is ready" detail={r.result.detail} warning={r.result.warning} filename={r.result.filename} onDownload={r.download} />}
    </div>
  );
}

// ---------------------------------------------------------------- Compress
export function CompressTool() {
  const { files, add, remove } = useFiles(false);
  const r = useResult();
  const [level, setLevel] = useState<"light" | "medium" | "strong">("light");

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
      let warning: string | undefined;
      const lightSave = async () => {
        const doc = await loadPdf(original);
        if (doc.getPageCount() === 0) throw new Error("This PDF has no pages to compress.");
        return doc.save({ useObjectStreams: true });
      };
      if (level === "light") {
        bytes = await lightSave();
        note = "Light mode re-saves the file with tighter internal storage. Text stays selectable.";
      } else {
        // Rebuild pages as JPEG images at a lower quality.
        const { openPdfjs, renderPageToJpeg } = await import("@/lib/pdf-utils");
        const { doc, numPages } = await openPdfjs(original);
        if (numPages === 0) throw new Error("This PDF has no pages to compress.");
        const quality = level === "medium" ? 0.65 : 0.4;
        const scale = level === "medium" ? 1.5 : 1.1;
        const out = await PDFDocument.create();
        for (let i = 1; i <= numPages; i++) {
          const blob = await renderPageToJpeg(doc, i, scale, quality);
          const img = await out.embedJpg(new Uint8Array(await blob.arrayBuffer()));
          // B-04: the rendered image is `scale`× the page in pixels — using
          // its pixel size as the page size made pages 1.5×/1.1× too big.
          // Keep the ORIGINAL page size (viewport at scale 1, which also
          // accounts for page rotation) and draw the image into that box.
          const page = await doc.getPage(i);
          const vp = page.getViewport({ scale: 1 });
          const pageSize: [number, number] = [vp.width, vp.height];
          const newPage = out.addPage(pageSize);
          newPage.drawImage(img, { x: 0, y: 0, width: pageSize[0], height: pageSize[1] });
        }
        const rasterBytes = await out.save({ useObjectStreams: true });
        if (rasterBytes.length >= originalSize) {
          // B-03: rasterising a text-heavy PDF makes it MUCH bigger
          // (measured: 2,639 B → 44,788 B, +1,597%) and destroys the
          // selectable text — the worst outcome for the most common input.
          // Never hand that back as a "compression". Fall back to Light
          // (keeps the text and the size) and say so plainly.
          bytes = await lightSave();
          note = `The ${level} image rebuild would have made this file bigger (${formatBytes(rasterBytes.length)} instead of ${formatBytes(originalSize)}) and removed all selectable text, so it was not used. The file was re-saved with Light instead — text stays selectable.`;
          warning = `The ${level} rebuild would have produced a larger file (${formatBytes(rasterBytes.length)} vs the original ${formatBytes(originalSize)}) and turned every page into an image, so all selectable text would have been lost. You received the smaller Light re-save instead. Medium/Strong only help scanned or photo-heavy PDFs.`;
        } else {
          bytes = rasterBytes;
          note =
            level === "medium"
              ? "Medium mode rebuilt each page as an image (JPEG quality 65%). Text in the result is not selectable, but each page kept its original size."
              : "Strong mode rebuilt each page as a smaller image (JPEG quality 40%). Text in the result is not selectable, but each page kept its original size.";
        }
      }
      const saved = originalSize - bytes.length;
      const pct = Math.round((saved / originalSize) * 100);
      if (!warning && bytes.length >= originalSize) {
        warning = `The compressed file (${formatBytes(bytes.length)}) is not smaller than the original (${formatBytes(originalSize)}), and — for Medium/Strong — its text is no longer selectable. This can happen with files that are already tightly packed.`;
      }
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
          <option value="light">Light — re-save, keeps text selectable (recommended)</option>
          <option value="medium">Medium — rebuild pages as images, good balance</option>
          <option value="strong">Strong — smallest file, lower image quality</option>
        </select>
        <p className="mt-2 text-sm text-slate-500">
          Medium and Strong rebuild pages as images, so text stops being selectable. They only
          shrink scanned or photo-heavy PDFs — on a text-only PDF they can make the file much
          bigger, so if that happens you will get the Light re-save instead, with a warning.
          Light is the default because it never makes a file bigger or removes text.
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
