"use client";

import { useState } from "react";
import { Dropzone, FileList, ProcessButton, ResultCard, ErrorNote, OptionLabel, selectCls } from "@/components/tool-ui";
import { downloadBytes, downloadBlob, fileBytes, formatBytes } from "@/lib/pdf-utils";
import { extractPagesText, renderTextPagesToPdf } from "@/lib/text-tools";
import { summarizeText, translateText, langName } from "@/lib/edit-ai-helpers";

// ---------------------------------------------------------------------------
// Shared helpers (same shape as the other tool groups)
// ---------------------------------------------------------------------------

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
  const add = (incoming: File[]) => setFiles((prev) => (multiple ? [...prev, ...incoming] : incoming.slice(0, 1)));
  const remove = (i: number) => setFiles((prev) => prev.filter((_, x) => x !== i));
  return { files, add, remove };
}

function baseName(f: File) {
  return f.name.replace(/\.[^.]+$/, "");
}

// ---------------------------------------------------------------------------
// AI Summarizer — extractive, frequency-scored. Template-based, no AI model.
// Scoring lives in lib/edit-ai-helpers (Unicode-aware; see there).
// ---------------------------------------------------------------------------

export function AiSummarizerTool() {
  const { files, add, remove } = useFiles(false);
  const r = useResult();
  const [length, setLength] = useState<"short" | "medium" | "long">("medium");
  const [summaryText, setSummaryText] = useState<string | null>(null);
  const [summaryMeta, setSummaryMeta] = useState<string | null>(null);

  const run = async () => {
    r.setError(null);
    r.setResult(null);
    setSummaryText(null);
    setSummaryMeta(null);
    if (!files.length) return r.setError("Choose a PDF file.");
    r.setBusy(true);
    try {
      const pages = await extractPagesText(await fileBytes(files[0]));
      const text = pages.join("\n");
      const { summary, total, words } = summarizeText(text, length);
      const joined = summary.join(" ");
      setSummaryText(joined);
      setSummaryMeta(
        `Picked ${summary.length} key sentences from ${total} sentences in the original (${words.toLocaleString()} words, ${pages.length} page${pages.length === 1 ? "" : "s"}).`,
      );
      const bytes = await renderTextPagesToPdf(
        [{ heading: `Summary — ${files[0].name}`, lines: summary }],
        { title: `Summary of ${files[0].name}` },
      );
      r.setResult({
        bytes,
        filename: `${baseName(files[0])}-summary.pdf`,
        detail: `Summary ready as a PDF (${formatBytes(bytes.length)}). The summary is shown below too.`,
      });
    } catch (e) {
      r.setError(e instanceof Error ? e.message : "Summarising failed. The file may be damaged or password-protected.");
    } finally {
      r.setBusy(false);
    }
  };

  return (
    <div>
      <p className="mb-4 rounded-xl bg-slate-100 px-4 py-3 text-sm leading-relaxed text-slate-700">
        <strong>Template-based — no AI model.</strong> This tool does not use an AI model. It scores the
        document&apos;s own sentences by word frequency and keeps the highest-scoring ones, in their original
        order. It can only repeat what is already in the document — it cannot write new insights.
      </p>
      <Dropzone accept="application/pdf,.pdf" onFiles={add} hint="One PDF file" />
      <FileList files={files} onRemove={remove} />
      <div className="mt-4 max-w-xs">
        <OptionLabel>Summary length</OptionLabel>
        <select className={selectCls} value={length} onChange={(e) => setLength(e.target.value as typeof length)}>
          <option value="short">Short — about 5 sentences</option>
          <option value="medium">Medium — about 8 sentences</option>
          <option value="long">Long — about 12 sentences</option>
        </select>
      </div>
      <ProcessButton busy={r.busy} disabled={!files.length} label="Summarise PDF" busyLabel="Reading…" onClick={run} />
      <ErrorNote message={r.error} />
      {summaryText && (
        <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-5">
          <p className="font-semibold text-slate-900">Summary</p>
          {summaryMeta && <p className="mt-1 text-xs text-slate-500">{summaryMeta}</p>}
          <p className="mt-3 text-sm leading-relaxed text-slate-700">{summaryText}</p>
          <button
            type="button"
            onClick={() => {
              const blob = new Blob([summaryText], { type: "text/plain;charset=utf-8" });
              downloadBlob(blob, `${files[0] ? baseName(files[0]) : "summary"}-summary.txt`);
            }}
            className="mt-4 inline-flex items-center gap-2 rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800 hover:border-teal-600"
          >
            Download as .txt
          </button>
        </div>
      )}
      {r.result && <ResultCard title="Your summary PDF is ready" detail={r.result.detail} filename={r.result.filename} onDownload={r.download} />}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Translate PDF — text extraction in-browser, translation via the free,
// no-key MyMemory service (api.mymemory.translated.net). LibreTranslate's
// hosted instance now requires a paid API key, so it is NOT used.
// ---------------------------------------------------------------------------

const TARGET_LANGS: { code: string; name: string }[] = [
  { code: "es", name: "Spanish" },
  { code: "fr", name: "French" },
  { code: "de", name: "German" },
  { code: "it", name: "Italian" },
  { code: "pt", name: "Portuguese" },
  { code: "nl", name: "Dutch" },
  { code: "ar", name: "Arabic" },
  { code: "zh-CN", name: "Chinese (Simplified)" },
  { code: "ja", name: "Japanese" },
  { code: "hi", name: "Hindi" },
  { code: "ur", name: "Urdu" },
  { code: "en", name: "English" },
];

const SOURCE_LANGS: { code: string; name: string }[] = [
  { code: "auto", name: "Auto-detect (in your browser)" },
  { code: "en", name: "English" },
  { code: "es", name: "Spanish" },
  { code: "fr", name: "French" },
  { code: "de", name: "German" },
  { code: "it", name: "Italian" },
  { code: "pt", name: "Portuguese" },
  { code: "ur", name: "Urdu" },
  { code: "ar", name: "Arabic" },
  { code: "hi", name: "Hindi" },
];

// Translation itself lives in lib/edit-ai-helpers (translateText):
// "Auto-detect" is resolved in the browser by language detection and is
// NEVER sent to MyMemory (the service rejects langpair=auto|xx), and any
// non-200 responseStatus — string or number — is treated as an error, never
// as a translation (BUG-1, BUG-12).

export function TranslatePdfTool() {
  const { files, add, remove } = useFiles(false);
  const r = useResult();
  const [source, setSource] = useState("auto");
  const [target, setTarget] = useState("es");
  const [translated, setTranslated] = useState<string | null>(null);
  const [progress, setProgress] = useState<string | null>(null);
  const [extracted, setExtracted] = useState<string | null>(null);

  const run = async () => {
    r.setError(null);
    r.setResult(null);
    setTranslated(null);
    setExtracted(null);
    setProgress(null);
    if (!files.length) return r.setError("Choose a PDF file.");
    if (source !== "auto" && source === target) return r.setError("Source and target languages are the same.");
    r.setBusy(true);
    try {
      const pages = await extractPagesText(await fileBytes(files[0]));
      const text = pages.join("\n").trim();
      if (text.length < 10) {
        return r.setError("No extractable text found — scanned PDFs need OCR first.");
      }
      setExtracted(text);
      const { translated: joined, detectedSource, chunks } = await translateText(text, source, target, fetch, (done, total) =>
        setProgress(`Translating part ${done} of ${total}…`),
      );
      setProgress(null);
      setTranslated(joined);
      const targetName = TARGET_LANGS.find((l) => l.code === target)?.name ?? target;
      const detectedNote = source === "auto" ? ` (auto-detected ${langName(detectedSource)})` : "";
      const bytes = await renderTextPagesToPdf(
        [{ heading: `Translation (${targetName}) — ${files[0].name}`, lines: joined.split(/(?<=[.!?])\s+/) }],
        { title: `Translation of ${files[0].name}` },
      );
      r.setResult({
        bytes,
        filename: `${baseName(files[0])}-translated-${target}.pdf`,
        detail: `Translated ${chunks} part${chunks === 1 ? "" : "s"} from ${langName(detectedSource)}${detectedNote} into ${targetName} (${formatBytes(bytes.length)}). Machine translation is approximate — check important wording before relying on it.`,
      });
    } catch (e) {
      setProgress(null);
      const msg = e instanceof Error ? e.message : "Translation failed.";
      r.setError(
        msg.startsWith("QUOTA:")
          ? msg.slice("QUOTA:".length).trim()
          : `${msg} The free service may be busy or unreachable — your extracted text is still available to download below.`,
      );
    } finally {
      r.setBusy(false);
    }
  };

  return (
    <div>
      <p className="mb-4 rounded-xl bg-slate-100 px-4 py-3 text-sm leading-relaxed text-slate-700">
        <strong>How this works:</strong> the PDF&apos;s text is extracted in your browser, then sent to the free,
        no-key MyMemory translation service (api.mymemory.translated.net) for translation. That means the
        document&apos;s text — unlike our other tools — does leave your device for the translation step.
        LibreTranslate&apos;s hosted service now requires a paid API key, so it is not used.
      </p>
      <Dropzone accept="application/pdf,.pdf" onFiles={add} hint="One PDF file" />
      <FileList files={files} onRemove={remove} />
      <div className="mt-4 grid max-w-lg gap-3 sm:grid-cols-2">
        <div>
          <OptionLabel>From</OptionLabel>
          <select className={selectCls} value={source} onChange={(e) => setSource(e.target.value)}>
            {SOURCE_LANGS.map((l) => (
              <option key={l.code} value={l.code}>{l.name}</option>
            ))}
          </select>
        </div>
        <div>
          <OptionLabel>To</OptionLabel>
          <select className={selectCls} value={target} onChange={(e) => setTarget(e.target.value)}>
            {TARGET_LANGS.map((l) => (
              <option key={l.code} value={l.code}>{l.name}</option>
            ))}
          </select>
        </div>
      </div>
      <ProcessButton busy={r.busy} disabled={!files.length} label="Translate PDF" busyLabel="Translating…" onClick={run} />
      {progress && <p className="mt-3 text-sm text-slate-600">{progress}</p>}
      <ErrorNote message={r.error} />
      {translated && (
        <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-5">
          <p className="font-semibold text-slate-900">Translation</p>
          <p className="mt-3 max-h-72 overflow-y-auto whitespace-pre-wrap text-sm leading-relaxed text-slate-700">{translated}</p>
        </div>
      )}
      {extracted && (
        <button
          type="button"
          onClick={() => {
            const blob = new Blob([extracted], { type: "text/plain;charset=utf-8" });
            downloadBlob(blob, `${files[0] ? baseName(files[0]) : "document"}-extracted-text.txt`);
          }}
          className="mt-4 inline-flex items-center gap-2 rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800 hover:border-teal-600"
        >
          Download extracted text (.txt)
        </button>
      )}
      {r.result && <ResultCard title="Your translated PDF is ready" detail={r.result.detail} filename={r.result.filename} onDownload={r.download} />}
    </div>
  );
}
