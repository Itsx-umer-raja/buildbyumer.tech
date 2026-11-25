"use client";

import { useRef, useState } from "react";
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
  loadPdf,
  openPdfjs,
  renderPageToJpeg,
} from "@/lib/pdf-utils";
import { extractPagesText, splitLines, renderTextPagesToPdf } from "@/lib/text-tools";
import {
  annotatePdfBytes,
  compareTexts,
  redactPdfBytes,
  cropPdfBytes,
  detectFormFields,
  fillFormPdf,
  repairPdfBytes,
  buildDescriptiveXmp,
} from "@/lib/edit-ai-helpers";
import type { FormFieldState } from "@/lib/edit-ai-helpers";

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

// ---------------------------------------------------------------- OCR PDF
const TESS_CDN = "https://cdn.jsdelivr.net/npm/tesseract.js@v7.0.0/dist/worker.min.js";
const TESS_CORE = "https://cdn.jsdelivr.net/npm/tesseract.js-core@v7.0.0/tesseract-core-simd.wasm.js";
const TESS_LANG = "https://tessdata.projectnaptha.com/4.0.0";

export function OcrTool() {
  const { files, add, remove } = useFiles(false);
  const r = useResult();
  const [status, setStatus] = useState("");
  const [preview, setPreview] = useState<string | null>(null);

  const run = async () => {
    r.setError(null);
    r.setResult(null);
    setPreview(null);
    if (!files.length) return r.setError("Choose a PDF file.");
    r.setBusy(true);
    try {
      const { createWorker } = await import("tesseract.js");
      const worker = await createWorker("eng", 1, {
        workerPath: TESS_CDN,
        corePath: TESS_CORE,
        langPath: TESS_LANG,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        logger: (m: any) => {
          if (m.status) setStatus(`${m.status}${typeof m.progress === "number" ? ` — ${Math.round(m.progress * 100)}%` : ""}`);
        },
      });
      try {
        const { doc, numPages } = await openPdfjs(await fileBytes(files[0]));
        const pages: { lines: string[] }[] = [];
        for (let p = 1; p <= numPages; p++) {
          setStatus(`Rendering page ${p} of ${numPages}…`);
          const blob = await renderPageToJpeg(doc, p, 2, 0.92);
          setStatus(`Reading page ${p} of ${numPages}…`);
          const { data } = await worker.recognize(blob);
          pages.push({ lines: splitLines(data.text) });
        }
        const bytes = await renderTextPagesToPdf(pages, { title: `${baseName(files[0])} (OCR)` });
        const allText = pages.flatMap((pg) => pg.lines).join("\n");
        setPreview(allText.slice(0, 3000));
        r.setResult({
          bytes,
          filename: `${baseName(files[0])}-ocr.pdf`,
          detail: `OCR finished for ${numPages} page(s) — a searchable text PDF was built from the recognised words (${formatBytes(bytes.length)}). English only; accuracy varies with scan quality.`,
        });
      } finally {
        await worker.terminate();
      }
      setStatus("");
    } catch (e) {
      r.setError(e instanceof Error ? e.message : "OCR failed. Check your connection — the OCR engine loads from a CDN the first time.");
    } finally {
      r.setBusy(false);
    }
  };

  return (
    <div>
      <Dropzone accept="application/pdf,.pdf" onFiles={add} hint="One PDF file — scanned/image pages work best" />
      <FileList files={files} onRemove={remove} />
      <ProcessButton busy={r.busy} disabled={!files.length} label="Run OCR" busyLabel="Reading pages…" onClick={run} />
      {r.busy && status && <p className="mt-3 text-sm text-slate-600">{status}</p>}
      <ErrorNote message={r.error} />
      {r.result && <ResultCard title="Your OCR PDF is ready" detail={r.result.detail} filename={r.result.filename} onDownload={r.download} />}
      {preview && (
        <div className="mt-6">
          <OptionLabel>Recognised text (preview)</OptionLabel>
          <pre className="max-h-64 overflow-auto whitespace-pre-wrap rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-800">{preview}</pre>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------- Edit PDF (annotations)
export function EditPdfTool() {
  const { files, add, remove } = useFiles(false);
  const r = useResult();
  const [pageCount, setPageCount] = useState(0);
  const [page, setPage] = useState(1);
  const [kind, setKind] = useState<"text" | "highlight">("text");
  const [text, setText] = useState("Note: please review this section.");
  const [xPct, setXPct] = useState(10);
  const [yPct, setYPct] = useState(80);
  const [size, setSize] = useState(14);

  const load = async (incoming: File[]) => {
    add(incoming);
    r.setError(null);
    r.setResult(null);
    try {
      const doc = await loadPdf(await fileBytes(incoming[0]));
      setPageCount(doc.getPageCount());
      setPage(1);
    } catch {
      r.setError("Could not read this PDF. It may be damaged or password-protected.");
    }
  };

  const run = async () => {
    r.setError(null);
    r.setResult(null);
    if (!files.length) return r.setError("Choose a PDF file.");
    if (page < 1 || page > pageCount) return r.setError(`Page must be between 1 and ${pageCount}.`);
    r.setBusy(true);
    try {
      const bytes = await annotatePdfBytes(await fileBytes(files[0]), { page, kind, text, xPct, yPct, size });
      r.setResult({
        bytes,
        filename: `${baseName(files[0])}-annotated.pdf`,
        detail: `Added a ${kind === "text" ? "text note" : "highlight band"} on page ${page} of ${pageCount} (${formatBytes(bytes.length)}). This adds annotations on top of the page — it does not edit the document's existing text.`,
      });
    } catch (e) {
      r.setError(e instanceof Error ? e.message : "Could not add the annotation.");
    } finally {
      r.setBusy(false);
    }
  };

  return (
    <div>
      <Dropzone accept="application/pdf,.pdf" onFiles={load} hint="One PDF file" />
      <FileList files={files} onRemove={remove} />
      {pageCount > 0 && (
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <div>
            <OptionLabel>Page (1–{pageCount})</OptionLabel>
            <input className={inputCls} type="number" min={1} max={pageCount} value={page} onChange={(e) => setPage(Number(e.target.value) || 1)} />
          </div>
          <div>
            <OptionLabel>Annotation type</OptionLabel>
            <select className={selectCls} value={kind} onChange={(e) => setKind(e.target.value as "text" | "highlight")}>
              <option value="text">Text note</option>
              <option value="highlight">Highlight band</option>
            </select>
          </div>
          <div className="sm:col-span-2">
            <OptionLabel>Text</OptionLabel>
            <input className={inputCls} value={text} onChange={(e) => setText(e.target.value)} />
          </div>
          <div>
            <OptionLabel>Horizontal position ({xPct}% from left){kind === "highlight" ? " — highlight band starts here" : ""}</OptionLabel>
            <input type="range" min={0} max={90} value={xPct} onChange={(e) => setXPct(Number(e.target.value))} className="w-full" />
          </div>
          <div>
            <OptionLabel>Vertical position ({yPct}% from bottom)</OptionLabel>
            <input type="range" min={5} max={95} value={yPct} onChange={(e) => setYPct(Number(e.target.value))} className="w-full" />
          </div>
          <div>
            <OptionLabel>Font size ({size} pt)</OptionLabel>
            <input type="range" min={8} max={32} value={size} onChange={(e) => setSize(Number(e.target.value))} className="w-full" />
          </div>
        </div>
      )}
      <ProcessButton busy={r.busy} disabled={!files.length} label="Add annotation" busyLabel="Adding…" onClick={run} />
      <ErrorNote message={r.error} />
      {r.result && <ResultCard title="Your annotated PDF is ready" detail={r.result.detail} filename={r.result.filename} onDownload={r.download} />}
    </div>
  );
}

// ---------------------------------------------------------------- Compare PDF
export function CompareTool() {
  const [fileA, setFileA] = useState<File | null>(null);
  const [fileB, setFileB] = useState<File | null>(null);
  const r = useResult();
  const [summary, setSummary] = useState<string | null>(null);
  const [diffPreview, setDiffPreview] = useState<string | null>(null);

  const run = async () => {
    r.setError(null);
    r.setResult(null);
    setSummary(null);
    setDiffPreview(null);
    if (!fileA || !fileB) return r.setError("Choose two PDF files to compare.");
    r.setBusy(true);
    try {
      const a = await extractPagesText(await fileBytes(fileA));
      const b = await extractPagesText(await fileBytes(fileB));
      const diff = compareTexts(a, b, fileA.name, fileB.name);
      setSummary(diff.summary);
      setDiffPreview(diff.preview || null);
      const blob = new Blob([diff.report], { type: "text/markdown" });
      r.setResult({
        bytes: blob,
        isBlob: true,
        mime: "text/markdown",
        filename: "pdf-comparison.md",
        detail: `Comparison complete. ${diff.changedPages === 0 ? "No text differences found." : `${diff.changedPages} page(s) differ — download the full word-by-word report.`} This compares extracted text only; images and layout are not compared.`,
      });
    } catch (e) {
      r.setError(e instanceof Error ? e.message : "Comparison failed. One of the files may be damaged or password-protected.");
    } finally {
      r.setBusy(false);
    }
  };

  return (
    <div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <OptionLabel>First PDF (A)</OptionLabel>
          <Dropzone accept="application/pdf,.pdf" onFiles={(f) => setFileA(f[0])} hint={fileA ? fileA.name : "Choose PDF A"} />
        </div>
        <div>
          <OptionLabel>Second PDF (B)</OptionLabel>
          <Dropzone accept="application/pdf,.pdf" onFiles={(f) => setFileB(f[0])} hint={fileB ? fileB.name : "Choose PDF B"} />
        </div>
      </div>
      <ProcessButton busy={r.busy} disabled={!fileA || !fileB} label="Compare PDFs" busyLabel="Comparing…" onClick={run} />
      <ErrorNote message={r.error} />
      {summary && <p className="mt-4 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800">{summary}</p>}
      {diffPreview && (
        <div className="mt-4">
          <OptionLabel>Differing words (preview — [-removed-] [+added+])</OptionLabel>
          <pre className="max-h-64 overflow-auto whitespace-pre-wrap rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-800">{diffPreview}</pre>
        </div>
      )}
      {r.result && <ResultCard title="Comparison report ready" detail={r.result.detail} filename={r.result.filename} onDownload={r.download} />}
    </div>
  );
}

// ---------------------------------------------------------------- Redact PDF
export function RedactTool() {
  const { files, add, remove } = useFiles(false);
  const r = useResult();
  const [search, setSearch] = useState("");
  const [pages, setPages] = useState("");
  const [verified, setVerified] = useState<string | null>(null);

  const load = async (incoming: File[]) => {
    add(incoming);
    r.setError(null);
    r.setResult(null);
    setVerified(null);
    try {
      await loadPdf(await fileBytes(incoming[0]));
    } catch {
      r.setError("Could not read this PDF. It may be damaged or password-protected.");
    }
  };

  const run = async () => {
    r.setError(null);
    r.setResult(null);
    setVerified(null);
    if (!files.length) return r.setError("Choose a PDF file.");
    if (!search.trim() && !pages.trim()) return r.setError("Enter text to redact, or page numbers to black out (or both).");
    r.setBusy(true);
    try {
      const original = await fileBytes(files[0]);
      const result = await redactPdfBytes(original, { search, pages });
      if (result.leaked) {
        setVerified(
          "Warning: verification found the redacted text is still extractable — do not share this file. The text may be stored in a form this tool cannot remove (for example inside an embedded form or image).",
        );
      } else if (result.fallbackPages.length > 0) {
        setVerified(
          `Verified: after redaction, “${search.trim() || "the blacked-out pages"}” no longer appears in the extracted text. Page(s) ${result.fallbackPages.join(", ")} could not be redacted in place, so ${result.fallbackPages.length === 1 ? "it was" : "they were"} rebuilt as text-only — images and vector graphics on ${result.fallbackPages.length === 1 ? "that page were" : "those pages were"} not preserved.`,
        );
      } else {
        setVerified(
          `Verified: after redaction, “${search.trim() || "the blacked-out pages"}” no longer appears in the extracted text. Redacted pages kept their images and graphics — only the matched text was removed and covered.`,
        );
      }
      r.setResult({
        bytes: result.bytes,
        filename: `${baseName(files[0])}-redacted.pdf`,
        detail: `Redacted ${result.redactedItems} text item(s) across ${result.rebuiltPages} page(s) (${formatBytes(result.bytes.length)}). The underlying text was removed, not just covered.${result.fallbackPages.length > 0 ? ` Page(s) ${result.fallbackPages.join(", ")} were rebuilt as text-only (images not preserved).` : ""}${result.leaked ? " Verification FAILED — see the warning above." : ""}`,
      });
    } catch (e) {
      r.setError(e instanceof Error ? e.message : "Redaction failed.");
    } finally {
      r.setBusy(false);
    }
  };

  return (
    <div>
      <Dropzone accept="application/pdf,.pdf" onFiles={load} hint="One PDF file" />
      <FileList files={files} onRemove={remove} />
      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <div>
          <OptionLabel>Text to redact (exact words, case-insensitive)</OptionLabel>
          <input className={inputCls} value={search} onChange={(e) => setSearch(e.target.value)} placeholder="e.g. 555-1234" />
        </div>
        <div>
          <OptionLabel>Whole pages to black out (optional, e.g. 2, 5-6)</OptionLabel>
          <input className={inputCls} value={pages} onChange={(e) => setPages(e.target.value)} placeholder="Leave blank for none" />
        </div>
      </div>
      <p className="mt-4 rounded-xl bg-slate-100 px-4 py-3 text-sm leading-relaxed text-slate-700">
        Redaction removes the matched text from the file itself — including text split across lines — and covers
        the spot with a black box. Redacted pages keep their images and graphics. Only the words you searched
        for are removed; the rest of the sentence stays. If a page&apos;s text cannot be removed in place
        (unusual fonts), that page is rebuilt as text-only and you will be told which page lost its images.
      </p>
      <ProcessButton busy={r.busy} disabled={!files.length} label="Redact PDF" busyLabel="Redacting…" onClick={run} />
      <ErrorNote message={r.error} />
      {verified && <p className="mt-4 rounded-xl border border-teal-200 bg-teal-50 px-4 py-3 text-sm text-teal-900">{verified}</p>}
      {r.result && <ResultCard title="Your redacted PDF is ready" detail={r.result.detail} filename={r.result.filename} onDownload={r.download} />}
    </div>
  );
}

// ---------------------------------------------------------------- Crop PDF
export function CropTool() {
  const { files, add, remove } = useFiles(false);
  const r = useResult();
  const [left, setLeft] = useState(5);
  const [right, setRight] = useState(5);
  const [top, setTop] = useState(5);
  const [bottom, setBottom] = useState(5);
  const [scope, setScope] = useState<"all" | "pages">("all");
  const [pages, setPages] = useState("1");

  const load = async (incoming: File[]) => {
    add(incoming);
    r.setError(null);
    r.setResult(null);
    try {
      await loadPdf(await fileBytes(incoming[0]));
    } catch {
      r.setError("Could not read this PDF. It may be damaged or password-protected.");
    }
  };

  const run = async () => {
    r.setError(null);
    r.setResult(null);
    if (!files.length) return r.setError("Choose a PDF file.");
    if (left + right >= 100 || top + bottom >= 100) return r.setError("The margins add up to 100% or more — nothing would be left of the page.");
    r.setBusy(true);
    try {
      const result = await cropPdfBytes(await fileBytes(files[0]), { left, right, top, bottom, scope, pages });
      const fallbackNote =
        result.fallbackPages.length > 0
          ? ` Page(s) ${result.fallbackPages.join(", ")} could not be cropped in place, so ${result.fallbackPages.length === 1 ? "it was" : "they were"} rebuilt from the text inside the crop area only — images on ${result.fallbackPages.length === 1 ? "that page were" : "those pages were"} not preserved.`
          : "";
      r.setResult({
        bytes: result.bytes,
        filename: `${baseName(files[0])}-cropped.pdf`,
        detail: `Cropped ${result.croppedPages.length} page(s) by ${left}% left, ${right}% right, ${top}% top, ${bottom}% bottom (${formatBytes(result.bytes.length)}). Text${result.removedImages > 0 ? ` and ${result.removedImages} image(s)` : ""} outside the crop area were removed from the file, not just hidden${result.verified ? " (verified: no text remains outside the crop area)" : " — verification could not confirm every page, so check the result before sharing"}. Vector drawings outside the crop area may remain embedded but are clipped from view.${fallbackNote}`,
      });
    } catch (e) {
      r.setError(e instanceof Error ? e.message : "Cropping failed.");
    } finally {
      r.setBusy(false);
    }
  };

  return (
    <div>
      <Dropzone accept="application/pdf,.pdf" onFiles={load} hint="One PDF file" />
      <FileList files={files} onRemove={remove} />
      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <div>
          <OptionLabel>Left margin (%)</OptionLabel>
          <input className={inputCls} type="number" min={0} max={90} value={left} onChange={(e) => setLeft(Math.max(0, Number(e.target.value) || 0))} />
        </div>
        <div>
          <OptionLabel>Right margin (%)</OptionLabel>
          <input className={inputCls} type="number" min={0} max={90} value={right} onChange={(e) => setRight(Math.max(0, Number(e.target.value) || 0))} />
        </div>
        <div>
          <OptionLabel>Top margin (%)</OptionLabel>
          <input className={inputCls} type="number" min={0} max={90} value={top} onChange={(e) => setTop(Math.max(0, Number(e.target.value) || 0))} />
        </div>
        <div>
          <OptionLabel>Bottom margin (%)</OptionLabel>
          <input className={inputCls} type="number" min={0} max={90} value={bottom} onChange={(e) => setBottom(Math.max(0, Number(e.target.value) || 0))} />
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
      <p className="mt-4 rounded-xl bg-slate-100 px-4 py-3 text-sm leading-relaxed text-slate-700">
        Cropping removes the text and images outside the crop area from the file — it does not just hide
        them. Vector drawings outside the area may remain embedded but are clipped from view.
      </p>
      <ProcessButton busy={r.busy} disabled={!files.length} label="Crop PDF" busyLabel="Cropping…" onClick={run} />
      <ErrorNote message={r.error} />
      {r.result && <ResultCard title="Your cropped PDF is ready" detail={r.result.detail} filename={r.result.filename} onDownload={r.download} />}
    </div>
  );
}

// ---------------------------------------------------------------- PDF Forms
export function FormsTool() {
  const { files, add, remove } = useFiles(false);
  const r = useResult();
  const [fields, setFields] = useState<FormFieldState[]>([]);
  const [loaded, setLoaded] = useState(false);

  const load = async (incoming: File[]) => {
    add(incoming);
    r.setError(null);
    r.setResult(null);
    setFields([]);
    setLoaded(false);
    try {
      const list = await detectFormFields(await fileBytes(incoming[0]));
      setFields(list);
      setLoaded(true);
      if (!list.length) r.setError("This PDF has no fillable form fields. Only PDFs with AcroForm fields can be filled here.");
    } catch (e) {
      r.setError(e instanceof Error ? e.message : "Could not read this PDF. It may be damaged or password-protected.");
    }
  };

  const setValue = (i: number, value: string) =>
    setFields((prev) => prev.map((f, x) => (x === i ? { ...f, value } : f)));

  const run = async () => {
    r.setError(null);
    r.setResult(null);
    if (!files.length) return r.setError("Choose a PDF file.");
    if (!fields.length) return r.setError("This PDF has no fillable form fields.");
    r.setBusy(true);
    try {
      const bytes = await fillFormPdf(await fileBytes(files[0]), fields);
      const filled = fields.filter((f) => f.value.trim()).length;
      r.setResult({
        bytes,
        filename: `${baseName(files[0])}-filled.pdf`,
        detail: `Saved the form with ${filled} of ${fields.length} field(s) filled in (${formatBytes(bytes.length)}). The filled values are stored in the PDF itself.`,
      });
    } catch (e) {
      r.setError(e instanceof Error ? e.message : "Could not save the filled form.");
    } finally {
      r.setBusy(false);
    }
  };

  return (
    <div>
      <Dropzone accept="application/pdf,.pdf" onFiles={load} hint="One PDF with fillable form fields" />
      <FileList files={files} onRemove={remove} />
      {loaded && fields.length > 0 && (
        <div className="mt-5 space-y-4">
          <p className="text-sm text-slate-600">Found {fields.length} fillable field(s):</p>
          {fields.map((f, i) => (
            <div key={f.name}>
              <OptionLabel>
                {f.name} <span className="font-normal text-slate-500">({f.type})</span>
              </OptionLabel>
              {f.type === "checkbox" ? (
                <select className={selectCls} value={f.value} onChange={(e) => setValue(i, e.target.value)}>
                  <option value="no">Unchecked</option>
                  <option value="yes">Checked</option>
                </select>
              ) : f.type === "dropdown" ? (
                <select className={selectCls} value={f.value} onChange={(e) => setValue(i, e.target.value)}>
                  <option value="">— leave blank —</option>
                  {(f.options ?? []).map((o) => (
                    <option key={o} value={o}>
                      {o}
                    </option>
                  ))}
                </select>
              ) : f.type === "radio" ? (
                <div className="flex flex-wrap gap-4">
                  {(f.options ?? []).map((o) => (
                    <label key={o} className="flex items-center gap-2 text-sm text-slate-800">
                      <input
                        type="radio"
                        name={`form-field-${f.name}`}
                        value={o}
                        checked={f.value === o}
                        onChange={() => setValue(i, o)}
                        className="accent-teal-700"
                      />
                      {o}
                    </label>
                  ))}
                  {(f.options ?? []).length === 0 && <span className="text-sm text-slate-500">This radio group has no options.</span>}
                </div>
              ) : f.type === "text" ? (
                <input className={inputCls} value={f.value} onChange={(e) => setValue(i, e.target.value)} placeholder={`Enter ${f.name}`} />
              ) : (
                <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                  This field ({f.type}) cannot be filled here — it is left unchanged in the saved file.
                </p>
              )}
            </div>
          ))}
        </div>
      )}
      {loaded && fields.length === 0 && (
        <p className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          This PDF has no fillable form fields, so there is nothing to fill. Try a PDF that was created as a form.
        </p>
      )}
      <ProcessButton busy={r.busy} disabled={!files.length || !fields.length} label="Save filled PDF" busyLabel="Saving…" onClick={run} />
      <ErrorNote message={r.error} />
      {r.result && <ResultCard title="Your filled PDF is ready" detail={r.result.detail} filename={r.result.filename} onDownload={r.download} />}
    </div>
  );
}

// ---------------------------------------------------------------- Repair PDF
export function RepairTool() {
  const { files, add, remove } = useFiles(false);
  const r = useResult();

  const run = async () => {
    r.setError(null);
    r.setResult(null);
    if (!files.length) return r.setError("Choose a PDF file.");
    r.setBusy(true);
    try {
      const original = await fileBytes(files[0]);
      const result = await repairPdfBytes(original, baseName(files[0]));
      const warnNote = result.warnings.length ? ` ${result.warnings.join(" ")}` : "";
      r.setResult({
        bytes: result.bytes,
        filename: `${baseName(files[0])}-repaired.pdf`,
        detail: `Re-saved the file (${result.pages} page(s), ${formatBytes(original.length)} → ${formatBytes(result.bytes.length)}). This rebuild fixes some structural corruption, but it is not a guaranteed repair — it only helps files this tool can already read, and badly damaged files may still fail to open.${warnNote}`,
      });
    } catch (e) {
      r.setError(
        e instanceof Error
          ? `Repair failed: ${e.message}. This file is too damaged to rebuild in the browser.`
          : "Repair failed. This file is too damaged to rebuild in the browser.",
      );
    } finally {
      r.setBusy(false);
    }
  };

  return (
    <div>
      <Dropzone accept="application/pdf,.pdf" onFiles={add} hint="One damaged or misbehaving PDF" />
      <FileList files={files} onRemove={remove} />
      <p className="mt-4 rounded-xl bg-slate-100 px-4 py-3 text-sm leading-relaxed text-slate-700">
        Repair re-saves files this tool can already read. It cannot fix files that will not open at all, and
        password-protected files must be unlocked first. After repairing, every page is checked — if a page
        lost its text, you will be told which one.
      </p>
      <ProcessButton busy={r.busy} disabled={!files.length} label="Attempt repair" busyLabel="Repairing…" onClick={run} />
      <ErrorNote message={r.error} />
      {r.result && <ResultCard title="Repaired copy ready" detail={r.result.detail} filename={r.result.filename} onDownload={r.download} />}
    </div>
  );
}

// ---------------------------------------------------------------- PDF to PDF/A
export function PdfATool() {
  const { files, add, remove } = useFiles(false);
  const r = useResult();
  const [title, setTitle] = useState("");
  const [author, setAuthor] = useState("");

  const run = async () => {
    r.setError(null);
    r.setResult(null);
    if (!files.length) return r.setError("Choose a PDF file.");
    r.setBusy(true);
    try {
      const { PDFDocument, PDFName } = await import("pdf-lib");
      const doc = await PDFDocument.load(await fileBytes(files[0]));
      if (title.trim()) doc.setTitle(title.trim());
      if (author.trim()) doc.setAuthor(author.trim());
      doc.setCreator("PDF World (browser)");
      doc.setProducer("PDF World PDF/A-style export");
      doc.setCreationDate(new Date());
      doc.setModificationDate(new Date());
      // Descriptive XMP only (title/author). This deliberately does NOT claim
      // PDF/A conformance: a real PDF/A-1b file needs embedded fonts and an
      // OutputIntent, which this browser tool does not produce (B-13).
      const xmp = buildDescriptiveXmp(title || doc.getTitle() || "", author);
      const stream = doc.context.flateStream(new TextEncoder().encode(xmp));
      doc.catalog.set(PDFName.of("Metadata"), doc.context.register(stream));
      const bytes = await doc.save();
      r.setResult({
        bytes,
        filename: `${baseName(files[0])}-pdfa.pdf`,
        detail: `Added PDF/A-style descriptive metadata and document info (${doc.getPageCount()} page(s), ${formatBytes(bytes.length)}). This is metadata only — it is NOT a certified PDF/A file: fonts are not embedded, there is no OutputIntent, and no conformance is claimed. Do not submit it where a validated PDF/A is required.`,
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
          <OptionLabel>Title (optional)</OptionLabel>
          <input className={inputCls} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Document title" />
        </div>
        <div>
          <OptionLabel>Author (optional)</OptionLabel>
          <input className={inputCls} value={author} onChange={(e) => setAuthor(e.target.value)} placeholder="Author name" />
        </div>
      </div>
      <p className="mt-4 rounded-xl bg-slate-100 px-4 py-3 text-sm leading-relaxed text-slate-700">
        This adds PDF/A-style descriptive metadata (title, author) to the file. It does <strong>not</strong>{" "}
        produce a certified PDF/A file — fonts are not embedded and no conformance is claimed — so do not
        submit the result where a validated PDF/A is required.
      </p>
      <ProcessButton busy={r.busy} disabled={!files.length} label="Create PDF/A-style file" busyLabel="Working…" onClick={run} />
      <ErrorNote message={r.error} />
      {r.result && <ResultCard title="Your PDF/A-style file is ready" detail={r.result.detail} filename={r.result.filename} onDownload={r.download} />}
    </div>
  );
}

// ---------------------------------------------------------------- Sign PDF
export function SignTool() {
  const { files, add, remove } = useFiles(false);
  const r = useResult();
  const [pageCount, setPageCount] = useState(0);
  const [page, setPage] = useState(1);
  const [mode, setMode] = useState<"draw" | "type">("draw");
  const [typed, setTyped] = useState("");
  const [position, setPosition] = useState<"bottom-right" | "bottom-left" | "bottom-centre">("bottom-right");
  const [width, setWidth] = useState(180);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawingRef = useRef(false);

  const load = async (incoming: File[]) => {
    add(incoming);
    r.setError(null);
    r.setResult(null);
    try {
      const doc = await loadPdf(await fileBytes(incoming[0]));
      setPageCount(doc.getPageCount());
      setPage(1);
    } catch {
      r.setError("Could not read this PDF. It may be damaged or password-protected.");
    }
  };

  const canvasPos = (e: React.PointerEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return { x: ((e.clientX - rect.left) / rect.width) * canvas.width, y: ((e.clientY - rect.top) / rect.height) * canvas.height };
  };

  const startDraw = (e: React.PointerEvent) => {
    drawingRef.current = true;
    const ctx = canvasRef.current?.getContext("2d");
    const { x, y } = canvasPos(e);
    ctx?.beginPath();
    ctx?.moveTo(x, y);
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const moveDraw = (e: React.PointerEvent) => {
    if (!drawingRef.current) return;
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    const { x, y } = canvasPos(e);
    ctx.lineWidth = 2.5;
    ctx.lineCap = "round";
    ctx.strokeStyle = "#0f172a";
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    canvas?.getContext("2d")?.clearRect(0, 0, canvas.width, canvas.height);
  };

  const run = async () => {
    r.setError(null);
    r.setResult(null);
    if (!files.length) return r.setError("Choose a PDF file.");
    if (page < 1 || page > pageCount) return r.setError(`Page must be between 1 and ${pageCount}.`);
    r.setBusy(true);
    try {
      let pngBytes: Uint8Array;
      let aspect: number;
      if (mode === "draw") {
        const canvas = canvasRef.current;
        if (!canvas) throw new Error("Signature pad is not ready.");
        const blank = document.createElement("canvas");
        blank.width = canvas.width;
        blank.height = canvas.height;
        const bctx = blank.getContext("2d");
        if (!bctx) throw new Error("Canvas is not available.");
        const img = bctx.getImageData(0, 0, canvas.width, canvas.height);
        const hasInk = img.data.some((v, i) => i % 4 === 3 && v > 0);
        if (!hasInk) throw new Error("Draw your signature in the box first, or switch to “Type my name”.");
        const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
        if (!blob) throw new Error("Could not read your signature.");
        pngBytes = new Uint8Array(await blob.arrayBuffer());
        aspect = canvas.width / canvas.height;
      } else {
        if (!typed.trim()) throw new Error("Type your name first.");
        const canvas = document.createElement("canvas");
        canvas.width = 600;
        canvas.height = 160;
        const ctx = canvas.getContext("2d");
        if (!ctx) throw new Error("Canvas is not available.");
        ctx.font = "italic 72px cursive, Georgia, serif";
        ctx.fillStyle = "#0f172a";
        ctx.textBaseline = "middle";
        ctx.fillText(typed.trim(), 10, 85);
        const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
        if (!blob) throw new Error("Could not read your signature.");
        pngBytes = new Uint8Array(await blob.arrayBuffer());
        aspect = canvas.width / canvas.height;
      }
      const { PDFDocument } = await import("pdf-lib");
      const doc = await loadPdf(await fileBytes(files[0]));
      const pg = doc.getPage(page - 1);
      const { width: pw, height: ph } = pg.getSize();
      const w = Math.min(width, pw - 72);
      const h = w / aspect;
      const x = position === "bottom-right" ? pw - w - 36 : position === "bottom-left" ? 36 : (pw - w) / 2;
      const y = 36;
      const img = await doc.embedPng(pngBytes);
      pg.drawImage(img, { x, y, width: w, height: h });
      const bytes = await doc.save();
      r.setResult({
        bytes,
        filename: `${baseName(files[0])}-signed.pdf`,
        detail: `Placed your signature on page ${page} of ${pageCount} (${formatBytes(bytes.length)}). This is a simple placed image signature — it is not a certified digital signature and does not prove who signed.`,
      });
    } catch (e) {
      r.setError(e instanceof Error ? e.message : "Could not sign the PDF.");
    } finally {
      r.setBusy(false);
    }
  };

  return (
    <div>
      <Dropzone accept="application/pdf,.pdf" onFiles={load} hint="One PDF file" />
      <FileList files={files} onRemove={remove} />
      {pageCount > 0 && (
        <div className="mt-5 space-y-4">
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <OptionLabel>Page (1–{pageCount})</OptionLabel>
              <input className={inputCls} type="number" min={1} max={pageCount} value={page} onChange={(e) => setPage(Number(e.target.value) || 1)} />
            </div>
            <div>
              <OptionLabel>Signature</OptionLabel>
              <select className={selectCls} value={mode} onChange={(e) => setMode(e.target.value as "draw" | "type")}>
                <option value="draw">Draw it</option>
                <option value="type">Type my name</option>
              </select>
            </div>
            <div>
              <OptionLabel>Position</OptionLabel>
              <select className={selectCls} value={position} onChange={(e) => setPosition(e.target.value as "bottom-right" | "bottom-left" | "bottom-centre")}>
                <option value="bottom-right">Bottom right</option>
                <option value="bottom-left">Bottom left</option>
                <option value="bottom-centre">Bottom centre</option>
              </select>
            </div>
          </div>
          {mode === "draw" ? (
            <div>
              <OptionLabel>Draw your signature</OptionLabel>
              <canvas
                ref={canvasRef}
                width={600}
                height={180}
                onPointerDown={startDraw}
                onPointerMove={moveDraw}
                onPointerUp={() => (drawingRef.current = false)}
                onPointerLeave={() => (drawingRef.current = false)}
                className="w-full cursor-crosshair touch-none rounded-xl border border-slate-300 bg-white"
              />
              <button type="button" onClick={clearCanvas} className="mt-2 text-sm font-medium text-slate-600 underline hover:text-slate-900">
                Clear
              </button>
            </div>
          ) : (
            <div>
              <OptionLabel>Your name (rendered as a script signature)</OptionLabel>
              <input className={inputCls} value={typed} onChange={(e) => setTyped(e.target.value)} placeholder="e.g. Alex Morgan" />
            </div>
          )}
          <div>
            <OptionLabel>Signature width ({width} pt)</OptionLabel>
            <input type="range" min={90} max={300} value={width} onChange={(e) => setWidth(Number(e.target.value))} className="w-full" />
          </div>
        </div>
      )}
      <ProcessButton busy={r.busy} disabled={!files.length} label="Sign PDF" busyLabel="Signing…" onClick={run} />
      <ErrorNote message={r.error} />
      {r.result && <ResultCard title="Your signed PDF is ready" detail={r.result.detail} filename={r.result.filename} onDownload={r.download} />}
    </div>
  );
}
