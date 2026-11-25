"use client";

import { useState } from "react";
import { PDFDocument } from "pdf-lib";
import JSZip from "jszip";
import imageCompression from "browser-image-compression";
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

// ---------------------------------------------------------------- JPG to PDF
// BUG-11 (QA-C): "Fit" used raw pixel counts as points, so a 1200x800 px
// photo became a 1200x800 pt page (~16.7x11.1 in). Pixels are not points:
// convert at 96 dpi (px * 72/96) and clamp the page to A4 bounds, keeping
// the image aspect and the requested margin. Scan-to-PDF
// (group-convert2.tsx) has its own copy of this sizing and should match
// this helper; that file is owned by another fixer.
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

export function JpgToPdfTool() {
  const { files, add, remove, move } = useFiles(true);
  const r = useResult();
  const [pageSize, setPageSize] = useState<"a4" | "letter" | "fit">("a4");
  const [margin, setMargin] = useState(36);

  const run = async () => {
    r.setError(null);
    r.setResult(null);
    if (files.length === 0) {
      r.setError("Choose at least one image.");
      return;
    }
    r.setBusy(true);
    try {
      const out = await PDFDocument.create();
      for (const f of files) {
        // Downscale very large photos so the PDF stays a sensible size.
        let bytes = await fileBytes(f);
        let imgFile: File | Blob = f;
        if (f.size > 2 * 1024 * 1024) {
          imgFile = await imageCompression(f, { maxWidthOrHeight: 2400, useWebWorker: true });
          bytes = new Uint8Array(await imgFile.arrayBuffer());
        }
        const isPng = f.type === "image/png" || f.name.toLowerCase().endsWith(".png");
        const img = isPng ? await out.embedPng(bytes) : await out.embedJpg(bytes);
        let w: number;
        let h: number;
        if (pageSize === "a4") {
          w = 595;
          h = 842;
        } else if (pageSize === "letter") {
          w = 612;
          h = 792;
        } else {
          [w, h] = fitImagePageSize(img.width, img.height, margin);
        }
        const page = out.addPage([w, h]);
        const availW = w - margin * 2;
        const availH = h - margin * 2;
        const scale = Math.min(availW / img.width, availH / img.height, 1);
        const dw = img.width * scale;
        const dh = img.height * scale;
        page.drawImage(img, { x: (w - dw) / 2, y: (h - dh) / 2, width: dw, height: dh });
      }
      const bytes = await out.save();
      r.setResult({
        bytes,
        filename: "images.pdf",
        detail: `${files.length} image(s) converted into a ${files.length}-page PDF (${formatBytes(bytes.length)}). Photos over 2 MB were downscaled to keep the file a sensible size.`,
      });
    } catch (e) {
      r.setError(e instanceof Error ? e.message : "Conversion failed. Only JPG and PNG images are supported.");
    } finally {
      r.setBusy(false);
    }
  };

  return (
    <div>
      <Dropzone accept="image/jpeg,image/png,.jpg,.jpeg,.png" multiple onFiles={add} hint="JPG and PNG images" />
      <FileList files={files} onRemove={remove} onMove={move} />
      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <div>
          <OptionLabel>Page size</OptionLabel>
          <select className={selectCls} value={pageSize} onChange={(e) => setPageSize(e.target.value as "a4" | "letter" | "fit")}>
            <option value="a4">A4</option>
            <option value="letter">Letter (US)</option>
            <option value="fit">Fit each image (page fits the image, max A4)</option>
          </select>
        </div>
        <div>
          <OptionLabel>Margin (points)</OptionLabel>
          <input className={inputCls} type="number" min={0} max={100} value={margin} onChange={(e) => setMargin(Math.max(0, Number(e.target.value) || 0))} />
        </div>
      </div>
      <ProcessButton busy={r.busy} disabled={files.length === 0} label="Convert to PDF" busyLabel="Converting…" onClick={run} />
      <ErrorNote message={r.error} />
      {r.result && <ResultCard title="Your PDF is ready" detail={r.result.detail} filename={r.result.filename} onDownload={r.download} />}
    </div>
  );
}

// ---------------------------------------------------------------- PDF to JPG
export function PdfToJpgTool() {
  const { files, add, remove } = useFiles(false);
  const r = useResult();
  const [quality, setQuality] = useState<"standard" | "high">("standard");
  const [pages, setPages] = useState("");

  const run = async () => {
    r.setError(null);
    r.setResult(null);
    if (files.length === 0) {
      r.setError("Choose a PDF file to convert.");
      return;
    }
    r.setBusy(true);
    try {
      const { openPdfjs, renderPageToJpeg } = await import("@/lib/pdf-utils");
      const original = await fileBytes(files[0]);
      const { doc, numPages } = await openPdfjs(original);
      const wanted = pages.trim() ? parseRanges(pages, numPages) : Array.from({ length: numPages }, (_, i) => i + 1);
      if (wanted.length === 0) throw new Error(`No valid pages in "${pages}" for a ${numPages}-page PDF.`);
      const scale = quality === "high" ? 3 : 2;
      const jpegQuality = quality === "high" ? 0.92 : 0.85;
      const zip = new JSZip();
      const base = files[0].name.replace(/\.pdf$/i, "");
      for (const p of wanted) {
        const blob = await renderPageToJpeg(doc, p, scale, jpegQuality);
        zip.file(`${base}-page-${p}.jpg`, blob);
      }
      const zipBlob = await zip.generateAsync({ type: "blob" });
      r.setResult({
        bytes: zipBlob,
        isBlob: true,
        filename: `${base}-images.zip`,
        detail: `${wanted.length} page(s) converted to JPG at ${quality === "high" ? "high" : "standard"} resolution, downloaded as a ZIP (${formatBytes(zipBlob.size)}).`,
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
      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <div>
          <OptionLabel>Image quality</OptionLabel>
          <select className={selectCls} value={quality} onChange={(e) => setQuality(e.target.value as "standard" | "high")}>
            <option value="standard">Standard (good for sharing)</option>
            <option value="high">High (better for printing)</option>
          </select>
        </div>
        <div>
          <OptionLabel>Pages (optional — leave blank for all)</OptionLabel>
          <input className={inputCls} value={pages} onChange={(e) => setPages(e.target.value)} placeholder="e.g. 1-3, 5" />
        </div>
      </div>
      <ProcessButton busy={r.busy} disabled={files.length === 0} label="Convert to JPG" busyLabel="Converting…" onClick={run} />
      <ErrorNote message={r.error} />
      {r.result && <ResultCard title="Your images are ready" detail={r.result.detail} filename={r.result.filename} onDownload={r.download} />}
    </div>
  );
}

// ---------------------------------------------------------------- Rotate
export function RotateTool() {
  const { files, add, remove } = useFiles(false);
  const r = useResult();
  const [degrees, setDegrees] = useState<90 | 180 | 270>(90);
  const [scope, setScope] = useState<"all" | "pages">("all");
  const [pages, setPages] = useState("1");

  const run = async () => {
    r.setError(null);
    r.setResult(null);
    if (files.length === 0) {
      r.setError("Choose a PDF file to rotate.");
      return;
    }
    r.setBusy(true);
    try {
      const { degrees: deg } = await import("pdf-lib");
      const doc = await loadPdf(await fileBytes(files[0]));
      const total = doc.getPageCount();
      // B-05 (QA-B): same 0-page guard Fixer 2 added to Compress/Unlock.
      // Without it, load + save turns a true 0-page PDF into a 1-page blank
      // PDF (pdf-lib's save() emits a blank page for an empty document).
      if (total === 0) throw new Error("This PDF has no pages to rotate.");
      const targets =
        scope === "all"
          ? Array.from({ length: total }, (_, i) => i)
          : parseRanges(pages, total).map((p) => p - 1);
      if (targets.length === 0) throw new Error(`No valid pages in "${pages}" for a ${total}-page PDF.`);
      for (const idx of targets) {
        const page = doc.getPage(idx);
        const current = page.getRotation().angle;
        page.setRotation(deg((current + degrees) % 360));
      }
      const bytes = await doc.save();
      r.setResult({
        bytes,
        filename: "rotated.pdf",
        detail: `Rotated ${targets.length} page(s) by ${degrees}° in a ${total}-page PDF (${formatBytes(bytes.length)}).`,
      });
    } catch (e) {
      r.setError(e instanceof Error ? e.message : "Rotation failed. The file may be damaged or password-protected.");
    } finally {
      r.setBusy(false);
    }
  };

  return (
    <div>
      <Dropzone accept="application/pdf,.pdf" onFiles={add} hint="One PDF file" />
      <FileList files={files} onRemove={remove} />
      <div className="mt-5 grid gap-4 sm:grid-cols-3">
        <div>
          <OptionLabel>Rotate by</OptionLabel>
          <select className={selectCls} value={degrees} onChange={(e) => setDegrees(Number(e.target.value) as 90 | 180 | 270)}>
            <option value={90}>90° clockwise</option>
            <option value={180}>180°</option>
            <option value={270}>270° clockwise</option>
          </select>
        </div>
        <div>
          <OptionLabel>Apply to</OptionLabel>
          <select className={selectCls} value={scope} onChange={(e) => setScope(e.target.value as "all" | "pages")}>
            <option value="all">All pages</option>
            <option value="pages">Specific pages</option>
          </select>
        </div>
        {scope === "pages" && (
          <div>
            <OptionLabel>Pages (e.g. 1, 3-5)</OptionLabel>
            <input className={inputCls} value={pages} onChange={(e) => setPages(e.target.value)} placeholder="1, 3-5" />
          </div>
        )}
      </div>
      <ProcessButton busy={r.busy} disabled={files.length === 0} label="Rotate PDF" busyLabel="Rotating…" onClick={run} />
      <ErrorNote message={r.error} />
      {r.result && <ResultCard title="Your rotated PDF is ready" detail={r.result.detail} filename={r.result.filename} onDownload={r.download} />}
    </div>
  );
}
