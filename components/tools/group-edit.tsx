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
import { countFormFields } from "@/lib/pdf-utils";
import { extractPageItems } from "@/lib/text-tools";
import {
  assertWatermarkEncodable,
  fitWatermarkSize,
  findStampCollisions,
} from "@/lib/edit-ai-helpers";

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
  const [formFields, setFormFields] = useState(0);
  const r = useResult();

  const load = async (incoming: File[]) => {
    const f = incoming[0];
    if (!f) return;
    setFile(f);
    setThumbs([]);
    setFormFields(0);
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
      // AcroForm fields do not survive copyPages (B-01): warn, don't drop silently.
      try {
        setFormFields(countFormFields(await loadPdf(await fileBytes(f))));
      } catch {
        setFormFields(0);
      }
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
        detail: `Saved ${thumbs.length} page(s) in your new order (${formatBytes(bytes.length)}).${formFields > 0 ? ` Note: this PDF had ${formFields} fillable form field(s), which were lost when the pages were rebuilt — form fields do not survive reorganising.` : ""}`,
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
      {formFields > 0 && (
        <p className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          This PDF has {formFields} fillable form field(s). Reorganising rebuilds the file from its pages, so
          those fields will be lost in the saved copy.
        </p>
      )}
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
      // Helvetica is a WinAnsi font: non-Latin text cannot be drawn at all.
      // Say so plainly instead of the generic "file may be damaged" error (B-15).
      assertWatermarkEncodable(font, text);
      const total = doc.getPageCount();
      let shrunkNote = "";
      for (const page of doc.getPages()) {
        const { width, height } = page.getSize();
        const rotated = position === "diagonal";
        const fit = fitWatermarkSize(font, text, size, width, height, rotated);
        if (fit.shrunk) shrunkNote = ` The font was shrunk from ${size} pt to ${fit.size} pt so the text fits on the page.`;
        if (!fit.fits) {
          throw new Error(
            `The watermark text is too long to fit on the page even at the smallest size (8 pt) — shorten the text and try again.`,
          );
        }
        const effSize = fit.size;
        const textWidth = fit.textWidth;
        const opts = { size: effSize, font, color: rgb(0.55, 0.55, 0.55), opacity };
        if (position === "diagonal") {
          // Centre the -35° rotated bounding box on the page (B-06): the old
          // code centred the unrotated text, so long text ran off-page.
          const cos = Math.cos((35 * Math.PI) / 180);
          const sin = Math.sin((35 * Math.PI) / 180);
          const bboxW = textWidth * cos + effSize * sin;
          const x = width / 2 - bboxW / 2;
          const y = height / 2 + (textWidth * sin) / 2 - (effSize * cos) / 2;
          page.drawText(text, { ...opts, x, y, rotate: degrees(-35) });
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
        detail: `Added the watermark “${text}” to ${total} page(s) (${formatBytes(bytes.length)}).${shrunkNote}`,
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
          <OptionLabel htmlFor="edit-watermark-text">Watermark text</OptionLabel>
          <input id="edit-watermark-text" className={inputCls} value={text} onChange={(e) => setText(e.target.value)} placeholder="e.g. DRAFT" />
        </div>
        <div>
          <OptionLabel htmlFor="edit-position">Position</OptionLabel>
          <select id="edit-position" className={selectCls} value={position} onChange={(e) => setPosition(e.target.value as "center" | "diagonal" | "top" | "bottom")}>
            <option value="diagonal">Diagonal across the page</option>
            <option value="center">Centre of the page</option>
            <option value="top">Top of the page</option>
            <option value="bottom">Bottom of the page</option>
          </select>
        </div>
        <div>
          <OptionLabel htmlFor="edit-watermark-opacity">Opacity ({Math.round(opacity * 100)}%)</OptionLabel>
          <input id="edit-watermark-opacity" type="range" min={5} max={80} value={Math.round(opacity * 100)} onChange={(e) => setOpacity(Number(e.target.value) / 100)} className="w-full accent-teal-700" />
        </div>
        <div>
          <OptionLabel htmlFor="edit-watermark-size">Text size ({size} pt)</OptionLabel>
          <input id="edit-watermark-size" type="range" min={18} max={96} value={size} onChange={(e) => setSize(Number(e.target.value))} className="w-full accent-teal-700" />
        </div>
      </div>
      <p className="mt-4 rounded-xl bg-slate-100 px-4 py-3 text-sm leading-relaxed text-slate-700">
        Long text is automatically shrunk so the watermark fits on the page. The watermark font supports
        Latin letters, numbers and basic punctuation only.
      </p>
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
      const bytes = await fileBytes(file);
      const doc = await loadPdf(bytes);
      const font = await doc.embedFont(StandardFonts.Helvetica);
      const total = doc.getPageCount();
      const size = 11;
      // Collision check: would a number land on top of existing text? (B-07)
      const labelFor = (n: number) => (format === "n" ? `${n}` : format === "page-n" ? `Page ${n}` : `${n} of ${total}`);
      const labelWidths = Array.from({ length: total }, (_, i) => font.widthOfTextAtSize(labelFor(i + 1), size));
      let collisions: { page: number; existingText: string }[] = [];
      try {
        collisions = findStampCollisions(await extractPageItems(bytes), position, labelWidths, size);
      } catch {
        collisions = [];
      }
      const rotatedPages = doc.getPages().map((p, i) => (p.getRotation().angle % 360 !== 0 ? i + 1 : null)).filter((n): n is number => n !== null);
      doc.getPages().forEach((page, i) => {
        const n = i + 1;
        const label = labelFor(n);
        const { width, height } = page.getSize();
        const textWidth = labelWidths[i];
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
      const outBytes = await doc.save();
      const collisionNote =
        collisions.length > 0
          ? ` Note: the number overlaps existing text on page(s) ${collisions.map((c) => `${c.page} (“${c.existingText}”)`).join(", ")} — it is stamped on top of it.`
          : "";
      const rotatedNote =
        rotatedPages.length > 0
          ? ` Page(s) ${rotatedPages.join(", ")} are rotated, so the number appears on the visual side of the page rather than the bottom/top.`
          : "";
      r.setResult({
        bytes: outBytes,
        filename: "numbered.pdf",
        detail: `Added page numbers to all ${total} page(s) (${formatBytes(outBytes.length)}).${collisionNote}${rotatedNote}`,
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
          <OptionLabel htmlFor="edit-position-2">Position</OptionLabel>
          <select id="edit-position-2" className={selectCls} value={position} onChange={(e) => setPosition(e.target.value as "bottom-center" | "bottom-right" | "bottom-left" | "top-center" | "top-right")}>
            <option value="bottom-center">Bottom centre</option>
            <option value="bottom-right">Bottom right</option>
            <option value="bottom-left">Bottom left</option>
            <option value="top-center">Top centre</option>
            <option value="top-right">Top right</option>
          </select>
        </div>
        <div>
          <OptionLabel htmlFor="edit-number-style">Number style</OptionLabel>
          <select id="edit-number-style" className={selectCls} value={format} onChange={(e) => setFormat(e.target.value as "n" | "page-n" | "n-of-total")}>
            <option value="n">1, 2, 3…</option>
            <option value="page-n">Page 1, Page 2…</option>
            <option value="n-of-total">1 of 5, 2 of 5…</option>
          </select>
        </div>
      </div>
      <p className="mt-4 rounded-xl bg-slate-100 px-4 py-3 text-sm leading-relaxed text-slate-700">
        Numbers are stamped at fixed positions. If a page already has a footer there, the number is drawn on
        top of it — the result will tell you which pages overlap.
      </p>
      <ProcessButton busy={r.busy} disabled={!file} label="Add page numbers" busyLabel="Adding…" onClick={run} />
      <ErrorNote message={r.error} />
      {r.result && <ResultCard title="Your numbered PDF is ready" detail={r.result.detail} filename={r.result.filename} onDownload={r.download} />}
    </div>
  );
}
