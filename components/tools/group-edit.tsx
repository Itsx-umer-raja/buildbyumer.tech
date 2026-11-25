"use client";

import { useState } from "react";
import { PDFDocument, StandardFonts, rgb, degrees } from "pdf-lib";
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
import { downloadBytes, fileBytes, formatBytes, loadPdf } from "@/lib/pdf-utils";

interface Result {
  bytes: Uint8Array;
  filename: string;
  detail: string;
}

function useResult() {
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const download = () => {
    if (result) downloadBytes(result.bytes, result.filename);
  };
  return { result, setResult, error, setError, busy, setBusy, download };
}

// ---------------------------------------------------------------- Organize
interface PageThumb {
  num: number;
  src: string;
}

export function OrganizeTool() {
  const [file, setFile] = useState<File | null>(null);
  const [thumbs, setThumbs] = useState<PageThumb[]>([]);
  const [loading, setLoading] = useState(false);
  const r = useResult();

  const load = async (incoming: File[]) => {
    const f = incoming[0];
    if (!f) return;
    setFile(f);
    setThumbs([]);
    r.setError(null);
    r.setResult(null);
    setLoading(true);
    try {
      const { openPdfjs, renderPageThumb } = await import("@/lib/pdf-utils");
      const { doc, numPages } = await openPdfjs(await fileBytes(f));
      const list: PageThumb[] = [];
      for (let i = 1; i <= numPages; i++) {
        list.push({ num: i, src: await renderPageThumb(doc, i) });
      }
      setThumbs(list);
    } catch (e) {
      r.setError(e instanceof Error ? e.message : "Could not preview this PDF. It may be damaged or password-protected.");
    } finally {
      setLoading(false);
    }
  };

  const move = (i: number, dir: -1 | 1) => {
    setThumbs((prev) => {
      const next = [...prev];
      const j = i + dir;
      if (j < 0 || j >= next.length) return prev;
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });
  };
  const remove = (i: number) => setThumbs((prev) => prev.filter((_, x) => x !== i));

  const run = async () => {
    r.setError(null);
    r.setResult(null);
    if (!file || thumbs.length === 0) {
      r.setError("Choose a PDF and wait for its pages to load.");
      return;
    }
    r.setBusy(true);
    try {
      const src = await loadPdf(await fileBytes(file));
      const out = await PDFDocument.create();
      const copied = await out.copyPages(src, thumbs.map((t) => t.num - 1));
      copied.forEach((p) => out.addPage(p));
      const bytes = await out.save();
      r.setResult({
        bytes,
        filename: "organized.pdf",
        detail: `Saved ${thumbs.length} page(s) in your new order (${formatBytes(bytes.length)}).`,
      });
    } catch (e) {
      r.setError(e instanceof Error ? e.message : "Could not save the reorganized PDF.");
    } finally {
      r.setBusy(false);
    }
  };

  return (
    <div>
      <Dropzone accept="application/pdf,.pdf" onFiles={load} hint="One PDF file" />
      {file && <FileList files={[file]} onRemove={() => { setFile(null); setThumbs([]); }} />}
      {loading && <p className="mt-4 text-sm text-slate-600">Rendering page previews…</p>}
      {thumbs.length > 0 && (
        <>
          <p className="mt-5 text-sm text-slate-600">
            {thumbs.length} page(s). Use the arrows to reorder, or remove pages you do not need.
          </p>
          <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
            {thumbs.map((t, i) => (
              <div key={`${t.num}-${i}`} className="rounded-xl border border-slate-200 bg-white p-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={t.src} alt={`Page ${t.num}`} className="mx-auto max-h-44 w-auto rounded border border-slate-100" />
                <p className="mt-2 text-center text-xs font-medium text-slate-700">Page {t.num}</p>
                <div className="mt-1 flex justify-center gap-1">
                  <button type="button" disabled={i === 0} onClick={() => move(i, -1)} className="rounded-md border border-slate-200 px-2 py-1 text-xs hover:bg-slate-50 disabled:opacity-30">← Move</button>
                  <button type="button" disabled={i === thumbs.length - 1} onClick={() => move(i, 1)} className="rounded-md border border-slate-200 px-2 py-1 text-xs hover:bg-slate-50 disabled:opacity-30">Move →</button>
                  <button type="button" onClick={() => remove(i)} className="rounded-md border border-red-200 px-2 py-1 text-xs text-red-600 hover:bg-red-50">Delete</button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
      <ProcessButton busy={r.busy} disabled={thumbs.length === 0} label="Save organized PDF" busyLabel="Saving…" onClick={run} />
      <ErrorNote message={r.error} />
      {r.result && <ResultCard title="Your organized PDF is ready" detail={r.result.detail} filename={r.result.filename} onDownload={r.download} />}
    </div>
  );
}

// ---------------------------------------------------------------- Watermark
export function WatermarkTool() {
  const [file, setFile] = useState<File | null>(null);
  const r = useResult();
  const [text, setText] = useState("DRAFT");
  const [position, setPosition] = useState<"center" | "diagonal" | "top" | "bottom">("diagonal");
  const [opacity, setOpacity] = useState(0.3);
  const [size, setSize] = useState(48);

  const run = async () => {
    r.setError(null);
    r.setResult(null);
    if (!file) {
      r.setError("Choose a PDF file to watermark.");
      return;
    }
    if (!text.trim()) {
      r.setError("Enter the watermark text.");
      return;
    }
    r.setBusy(true);
    try {
      const doc = await loadPdf(await fileBytes(file));
      const font = await doc.embedFont(StandardFonts.HelveticaBold);
      const total = doc.getPageCount();
      for (const page of doc.getPages()) {
        const { width, height } = page.getSize();
        const textWidth = font.widthOfTextAtSize(text, size);
        const opts = { size, font, color: rgb(0.55, 0.55, 0.55), opacity };
        if (position === "diagonal") {
          page.drawText(text, { ...opts, x: (width - textWidth) / 2, y: height / 2, rotate: degrees(-35) });
        } else if (position === "center") {
          page.drawText(text, { ...opts, x: (width - textWidth) / 2, y: height / 2 });
        } else if (position === "top") {
          page.drawText(text, { ...opts, x: (width - textWidth) / 2, y: height - 60 });
        } else {
          page.drawText(text, { ...opts, x: (width - textWidth) / 2, y: 40 });
        }
      }
      const bytes = await doc.save();
      r.setResult({
        bytes,
        filename: "watermarked.pdf",
        detail: `Added the watermark “${text}” to ${total} page(s) (${formatBytes(bytes.length)}).`,
      });
    } catch (e) {
      r.setError(e instanceof Error ? e.message : "Watermarking failed. The file may be damaged or password-protected.");
    } finally {
      r.setBusy(false);
    }
  };

  return (
    <div>
      <Dropzone accept="application/pdf,.pdf" onFiles={(fs) => setFile(fs[0] ?? null)} hint="One PDF file" />
      {file && <FileList files={[file]} onRemove={() => setFile(null)} />}
      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <div>
          <OptionLabel>Watermark text</OptionLabel>
          <input className={inputCls} value={text} onChange={(e) => setText(e.target.value)} placeholder="e.g. DRAFT" />
        </div>
        <div>
          <OptionLabel>Position</OptionLabel>
          <select className={selectCls} value={position} onChange={(e) => setPosition(e.target.value as "center" | "diagonal" | "top" | "bottom")}>
            <option value="diagonal">Diagonal across the page</option>
            <option value="center">Centre of the page</option>
            <option value="top">Top of the page</option>
            <option value="bottom">Bottom of the page</option>
          </select>
        </div>
        <div>
          <OptionLabel>Opacity ({Math.round(opacity * 100)}%)</OptionLabel>
          <input type="range" min={5} max={80} value={Math.round(opacity * 100)} onChange={(e) => setOpacity(Number(e.target.value) / 100)} className="w-full accent-teal-700" />
        </div>
        <div>
          <OptionLabel>Text size ({size} pt)</OptionLabel>
          <input type="range" min={18} max={96} value={size} onChange={(e) => setSize(Number(e.target.value))} className="w-full accent-teal-700" />
        </div>
      </div>
      <ProcessButton busy={r.busy} disabled={!file} label="Add watermark" busyLabel="Adding…" onClick={run} />
      <ErrorNote message={r.error} />
      {r.result && <ResultCard title="Your watermarked PDF is ready" detail={r.result.detail} filename={r.result.filename} onDownload={r.download} />}
    </div>
  );
}

// ---------------------------------------------------------------- Page numbers
export function PageNumbersTool() {
  const [file, setFile] = useState<File | null>(null);
  const r = useResult();
  const [position, setPosition] = useState<"bottom-center" | "bottom-right" | "bottom-left" | "top-center" | "top-right">("bottom-center");
  const [format, setFormat] = useState<"n" | "page-n" | "n-of-total">("n");

  const run = async () => {
    r.setError(null);
    r.setResult(null);
    if (!file) {
      r.setError("Choose a PDF file to number.");
      return;
    }
    r.setBusy(true);
    try {
      const doc = await loadPdf(await fileBytes(file));
      const font = await doc.embedFont(StandardFonts.Helvetica);
      const total = doc.getPageCount();
      doc.getPages().forEach((page, i) => {
        const n = i + 1;
        const label = format === "n" ? `${n}` : format === "page-n" ? `Page ${n}` : `${n} of ${total}`;
        const { width, height } = page.getSize();
        const size = 11;
        const textWidth = font.widthOfTextAtSize(label, size);
        let x = (width - textWidth) / 2;
        let y = 24;
        if (position === "bottom-right") x = width - textWidth - 30;
        if (position === "bottom-left") x = 30;
        if (position === "top-center") y = height - 30;
        if (position === "top-right") {
          x = width - textWidth - 30;
          y = height - 30;
        }
        page.drawText(label, { x, y, size, font, color: rgb(0.25, 0.25, 0.25) });
      });
      const bytes = await doc.save();
      r.setResult({
        bytes,
        filename: "numbered.pdf",
        detail: `Added page numbers to all ${total} page(s) (${formatBytes(bytes.length)}).`,
      });
    } catch (e) {
      r.setError(e instanceof Error ? e.message : "Adding page numbers failed. The file may be damaged or password-protected.");
    } finally {
      r.setBusy(false);
    }
  };

  return (
    <div>
      <Dropzone accept="application/pdf,.pdf" onFiles={(fs) => setFile(fs[0] ?? null)} hint="One PDF file" />
      {file && <FileList files={[file]} onRemove={() => setFile(null)} />}
      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <div>
          <OptionLabel>Position</OptionLabel>
          <select className={selectCls} value={position} onChange={(e) => setPosition(e.target.value as "bottom-center" | "bottom-right" | "bottom-left" | "top-center" | "top-right")}>
            <option value="bottom-center">Bottom centre</option>
            <option value="bottom-right">Bottom right</option>
            <option value="bottom-left">Bottom left</option>
            <option value="top-center">Top centre</option>
            <option value="top-right">Top right</option>
          </select>
        </div>
        <div>
          <OptionLabel>Number style</OptionLabel>
          <select className={selectCls} value={format} onChange={(e) => setFormat(e.target.value as "n" | "page-n" | "n-of-total")}>
            <option value="n">1, 2, 3…</option>
            <option value="page-n">Page 1, Page 2…</option>
            <option value="n-of-total">1 of 5, 2 of 5…</option>
          </select>
        </div>
      </div>
      <ProcessButton busy={r.busy} disabled={!file} label="Add page numbers" busyLabel="Adding…" onClick={run} />
      <ErrorNote message={r.error} />
      {r.result && <ResultCard title="Your numbered PDF is ready" detail={r.result.detail} filename={r.result.filename} onDownload={r.download} />}
    </div>
  );
}
