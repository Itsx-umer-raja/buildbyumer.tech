/**
 * Shared pure logic for the Edit + AI tools (group-edit.tsx, group-edit2.tsx,
 * group-ai.tsx). These functions are deliberately UI-free so they can be
 * executed and verified in Node as well as in the browser.
 *
 * Nothing in this file modifies lib/pdf-utils.ts or lib/text-tools.ts.
 */
import {
  PDFDocument,
  PDFName,
  PDFArray,
  PDFDict,
  PDFRef,
  StandardFonts,
  rgb,
  PDFTextField,
  PDFCheckBox,
  PDFDropdown,
  PDFRadioGroup,
  decodePDFRawStream,
} from "pdf-lib";
import type { PDFPage, PDFFont } from "pdf-lib";
import { diffWordsWithSpace } from "diff";
import { extractPagesText, extractPageItems } from "./text-tools";
import type { TextItem } from "./text-tools";
import { parseRanges, countFormFields } from "./pdf-utils";
import { looksEncrypted } from "./pdf-encrypt";

export { countFormFields };

/** Lowercase + strip all whitespace — used for leak checks so a secret split
 *  across lines/items can never hide behind a line break. */
export function normalizeForMatch(s: string): string {
  return s.toLowerCase().replace(/\s+/g, "");
}

export function decodeHtmlEntities(s: string): string {
  return s
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");
}

// ---------------------------------------------------------------------------
// Translate — language detection, chunking, MyMemory response validation
// ---------------------------------------------------------------------------

const LANG_NAMES: Record<string, string> = {
  en: "English",
  es: "Spanish",
  fr: "French",
  de: "German",
  it: "Italian",
  pt: "Portuguese",
  nl: "Dutch",
  ar: "Arabic",
  hi: "Hindi",
  ur: "Urdu",
  "zh-CN": "Chinese (Simplified)",
  ja: "Japanese",
};

/** Small stopword lists — good enough to pick a source language for the
 *  common cases; anything uncertain falls back to English (never "auto",
 *  which MyMemory rejects). */
const STOPWORD_HINTS: Record<string, string[]> = {
  en: ["the", "and", "is", "are", "was", "were", "have", "has", "with", "this", "that", "from", "which", "their", "there"],
  es: ["el", "la", "los", "las", "de", "que", "es", "en", "una", "con", "por", "para", "los", "se", "su"],
  fr: ["le", "la", "les", "de", "des", "est", "une", "dans", "que", "qui", "pour", "sur", "pas", "plus"],
  de: ["der", "die", "das", "und", "ist", "ein", "eine", "von", "mit", "den", "für", "auf", "sich", "nicht"],
  it: ["il", "la", "che", "di", "non", "una", "per", "sono", "con", "del", "nella", "come", "più"],
  pt: ["o", "a", "os", "as", "de", "que", "em", "um", "uma", "para", "com", "não", "mais", "seu"],
  ur: ["aur", "hai", "ka", "ki", "ko", "mein", "se", "yeh", "woh", "nahi", "kya", "bhi"],
  ar: ["al", "wa", "fi", "min", "ila", "an", "la", "ma", "kan", "hatha", "alay"],
  hi: ["aur", "hai", "ka", "ki", "ko", "mein", "se", "yeh", "woh", "nahi", "kya", "bhi"],
};

export function langName(code: string): string {
  return LANG_NAMES[code] ?? code;
}

/**
 * Detect the source language of extracted text. Never returns "auto":
 * MyMemory rejects langpair=auto|xx with an error string (BUG-1).
 * Script-based detection first (Arabic script, Devanagari, CJK, kana),
 * then stopword scoring for Latin-script text; fallback is English.
 */
export function detectSourceLanguage(text: string): string {
  const t = text.toLowerCase();
  const words = new Set(t.replace(/[^\p{L}\s]/gu, " ").split(/\s+/).filter(Boolean));
  if (/[\u3040-\u30ff]/.test(t)) return "ja";
  if (/[\u4e00-\u9fff]/.test(t)) return "zh-CN";
  if (/[\u0900-\u097f]/.test(t)) return "hi";
  if (/[\u0600-\u06ff]/.test(t)) {
    // Arabic vs Urdu share the script: Urdu uses extra letters + common words.
    const urduScore = ["aur", "hai", "ka", "ki", "ko", "mein", "nahi", "kya"].filter((w) => words.has(w)).length;
    const urduLetters = /[\u0679\u0688\u0691\u06ba\u06be\u06c1\u06d2]/.test(t);
    if (urduScore >= 2 || urduLetters) return "ur";
    return "ar";
  }
  let best = "en";
  let bestScore = 0;
  for (const [code, hints] of Object.entries(STOPWORD_HINTS)) {
    const score = hints.filter((w) => words.has(w)).length;
    if (score > bestScore) {
      bestScore = score;
      best = code;
    }
  }
  return bestScore >= 2 ? best : "en";
}

/**
 * Split text into chunks of at most `max` chars, cut at sentence ends where
 * possible and at word boundaries otherwise — never mid-word (BUG-12).
 */
export function chunkTextForTranslation(text: string, max = 450): string[] {
  const sentences = text.match(/[^.!?]+[.!?]+["')\]]*\s*|[^.!?]+$/g) ?? [text];
  const chunks: string[] = [];
  let cur = "";
  const pushWords = (piece: string) => {
    // Split one over-long piece at word boundaries.
    for (const w of piece.split(/\s+/).filter(Boolean)) {
      if (cur && cur.length + w.length + 1 > max) {
        chunks.push(cur);
        cur = "";
      }
      if (w.length > max) {
        if (cur) {
          chunks.push(cur);
          cur = "";
        }
        for (let i = 0; i < w.length; i += max) chunks.push(w.slice(i, i + max));
      } else {
        cur = cur ? `${cur} ${w}` : w;
      }
    }
  };
  for (const s of sentences) {
    const piece = s.trim();
    if (!piece) continue;
    if (cur && cur.length + piece.length + 1 > max) {
      chunks.push(cur);
      cur = "";
    }
    if (piece.length > max) pushWords(piece);
    else cur = cur ? `${cur} ${piece}` : piece;
  }
  if (cur) chunks.push(cur);
  return chunks.filter(Boolean);
}

export interface MyMemoryResponse {
  responseStatus?: number | string;
  responseData?: { translatedText?: string };
  responseDetails?: string;
  matches?: { translation?: string }[];
}

/**
 * Validate a MyMemory JSON payload. MyMemory returns HTTP 200 even for
 * errors, with responseStatus as a STRING ("403", "429") — the old code
 * only compared against the number 429 and treated the error text as a
 * translation (BUG-1). Throws on anything that is not a clean 200 with a
 * plausible translation; quota errors carry a "QUOTA:" prefix.
 */
export function parseMyMemoryResponse(data: MyMemoryResponse): string {
  const status = String(data.responseStatus ?? "");
  const out = decodeHtmlEntities((data.responseData?.translatedText ?? "").trim());
  const details = data.responseDetails ?? "";
  if (status === "429" || /MYMEMORY WARNING|USED ALL AVAILABLE FREE TRANSLATIONS|QUERY LENGTH LIMIT/i.test(out) || /MYMEMORY WARNING|USED ALL AVAILABLE FREE TRANSLATIONS/i.test(details)) {
    throw new Error(
      "QUOTA: the free translation service's daily quota for this network is used up. Try again later, or download the extracted text and translate it elsewhere.",
    );
  }
  if (status !== "200") {
    throw new Error(
      `Translation service error (status ${status || "unknown"}): ${out || details || "no translation returned"}.`,
    );
  }
  if (/INVALID (SOURCE|TARGET) LANGUAGE/i.test(out) || /INVALID (SOURCE|TARGET) LANGUAGE/i.test(details)) {
    throw new Error(`Translation service rejected the language pair: ${out || details}.`);
  }
  if (!out) throw new Error("The translation service returned an empty result.");
  return out;
}

const QUOTA_RE = /^QUOTA:/;

/** One chunk via MyMemory, with up to 3 attempts on network/5xx failures.
 *  Validation/quota errors are never retried. */
export async function translateChunk(
  text: string,
  source: string,
  target: string,
  fetchFn: typeof fetch = fetch,
): Promise<string> {
  const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${encodeURIComponent(source)}|${encodeURIComponent(target)}`;
  let lastErr: Error | null = null;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const res = await fetchFn(url);
      if (!res.ok) {
        if (res.status >= 500 && attempt < 3) {
          await new Promise((r) => setTimeout(r, 500 * attempt));
          continue;
        }
        throw new Error(`Translation service returned HTTP ${res.status}.`);
      }
      const data = (await res.json()) as MyMemoryResponse;
      return parseMyMemoryResponse(data);
    } catch (e) {
      const err = e instanceof Error ? e : new Error(String(e));
      if (QUOTA_RE.test(err.message) || /INVALID (SOURCE|TARGET) LANGUAGE/i.test(err.message) || /status (4\d\d|200)/.test(err.message)) throw err;
      lastErr = err;
      if (attempt < 3) await new Promise((r) => setTimeout(r, 500 * attempt));
    }
  }
  throw lastErr ?? new Error("Translation failed.");
}

/** Full document translation: resolves "auto" by detection (never sends it),
 *  enforces the ~4,800-char cap, translates chunk by chunk. */
export async function translateText(
  text: string,
  source: string,
  target: string,
  fetchFn: typeof fetch = fetch,
  onProgress?: (done: number, total: number) => void,
): Promise<{ translated: string; detectedSource: string; chunks: number }> {
  const trimmed = text.trim();
  if (trimmed.length < 10) throw new Error("No extractable text found — scanned PDFs need OCR first.");
  const detectedSource = source === "auto" ? detectSourceLanguage(trimmed) : source;
  if (detectedSource === target) {
    throw new Error(
      source === "auto"
        ? `The document was detected as ${langName(detectedSource)}, which is the same as the target language.`
        : "Source and target languages are the same.",
    );
  }
  const chunks = chunkTextForTranslation(trimmed);
  if (chunks.join("").length > 4800) {
    throw new Error(
      `This document has about ${chunks.join("").length.toLocaleString()} characters of text, above this tool's ~5,000-character limit for one run. Translate a shorter document, or split the PDF first.`,
    );
  }
  const out: string[] = [];
  for (let i = 0; i < chunks.length; i++) {
    out.push(await translateChunk(chunks[i], detectedSource, target, fetchFn));
    onProgress?.(i + 1, chunks.length);
  }
  return { translated: out.join(" "), detectedSource, chunks: chunks.length };
}

// ---------------------------------------------------------------------------
// Summarizer — extractive, frequency-scored. Template-based, no AI model.
// ---------------------------------------------------------------------------

const STOPWORDS = new Set(
  ("a,an,the,and,or,but,if,then,else,when,at,by,for,with,about,against,between,into,through,during,before,after,above,below,to,from,up,down,in,out,on,off,over,under,again,further,once,here,there,all,any,both,each,few,more,most,other,some,such,no,nor,not,only,own,same,so,than,too,very,can,will,just,should,now,is,are,was,were,be,been,being,have,has,had,having,do,does,did,doing,would,could,shall,may,might,must,of,as,it,its,this,that,these,those,i,you,he,she,we,they,them,his,her,their,our,your,my,me,him,us,who,whom,which,what,how,why,where,also,one,two,first,second,new,used,use,using,per,via,et,al,fig,page,pages").split(","),
);

export function splitSentences(text: string): string[] {
  const cleaned = text.replace(/\s+/g, " ").trim();
  if (!cleaned) return [];
  const parts = cleaned.match(/[^.!?]+[.!?]+["')\]]*\s*|[^.!?]+$/g) ?? [];
  return parts.map((s) => s.trim()).filter((s) => s.length > 25 && s.split(/\s+/).length >= 4);
}

/** Unicode-aware word split: keeps accented letters (é, ü, ñ) instead of
 *  deleting them as the old /[^a-z0-9\s]/g did (BUG-10). */
function summaryWords(s: string): string[] {
  return s
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2 && !STOPWORDS.has(w));
}

export function extractiveSummary(text: string, targetSentences: number): { summary: string[]; total: number } {
  let sentences = splitSentences(text);
  if (!sentences.length) {
    // Relaxed fallback for short documents whose sentences are short.
    const cleaned = text.replace(/\s+/g, " ").trim();
    const parts = cleaned.match(/[^.!?]+[.!?]+["')\]]*\s*|[^.!?]+$/g) ?? [];
    sentences = parts.map((s) => s.trim()).filter((s) => s.length > 10 && s.split(/\s+/).length >= 3);
  }
  if (!sentences.length) return { summary: [], total: 0 };
  const freq = new Map<string, number>();
  for (const s of sentences) {
    for (const w of summaryWords(s)) freq.set(w, (freq.get(w) ?? 0) + 1);
  }
  const scored = sentences.map((s, i) => {
    const words = summaryWords(s);
    const score = words.reduce((acc, w) => acc + (freq.get(w) ?? 0), 0) / Math.max(1, Math.sqrt(words.length));
    return { s, i, score };
  });
  const picked = scored
    .sort((a, b) => b.score - a.score)
    .slice(0, Math.min(targetSentences, sentences.length))
    .sort((a, b) => a.i - b.i);
  return { summary: picked.map((p) => p.s), total: sentences.length };
}

/** Summarise extracted document text. Refuses only documents too short to
 *  summarise meaningfully (25 words, down from 40 — BUG-10). */
export function summarizeText(text: string, length: "short" | "medium" | "long"): { summary: string[]; total: number; words: number } {
  const words = text.split(/\s+/).filter(Boolean).length;
  if (words < 25) {
    throw new Error("Not enough extractable text to summarise — this PDF has fewer than 25 words. Scanned PDFs need OCR first.");
  }
  const target = length === "short" ? 5 : length === "medium" ? 8 : 12;
  const { summary, total } = extractiveSummary(text, target);
  if (!summary.length) throw new Error("Could not find complete sentences to summarise in this PDF.");
  return { summary, total, words };
}

// ---------------------------------------------------------------------------
// Compare — word-level diff (BUG-5)
// ---------------------------------------------------------------------------

export interface WordDiff {
  changedPages: number;
  addedWords: number;
  removedWords: number;
  report: string;
  preview: string;
  summary: string;
}

export function compareTexts(aPages: string[], bPages: string[], nameA: string, nameB: string): WordDiff {
  const maxPages = Math.max(aPages.length, bPages.length);
  let changedPages = 0;
  let addedWords = 0;
  let removedWords = 0;
  const report: string[] = [`# PDF comparison`, ``, `A: ${nameA} (${aPages.length} pages)`, `B: ${nameB} (${bPages.length} pages)`, ``];
  const previewLines: string[] = [];
  for (let i = 0; i < maxPages; i++) {
    const ta = aPages[i] ?? "";
    const tb = bPages[i] ?? "";
    if (ta === tb) continue;
    changedPages++;
    report.push(`## Page ${i + 1}`);
    // Word-level diff rendered inline: removed words as [-word-], added as [+word+],
    // wrapped so the reader sees WHICH word changed, in context.
    const tokens: string[] = [];
    for (const part of diffWordsWithSpace(ta, tb)) {
      if (part.added) {
        for (const w of part.value.split(/(\s+)/)) {
          if (!w) continue;
          if (/^\s+$/.test(w)) tokens.push(w);
          else {
            tokens.push(`[+${w}+]`);
            addedWords++;
          }
        }
      } else if (part.removed) {
        for (const w of part.value.split(/(\s+)/)) {
          if (!w) continue;
          if (/^\s+$/.test(w)) tokens.push(w);
          else {
            tokens.push(`[-${w}-]`);
            removedWords++;
          }
        }
      } else {
        tokens.push(part.value);
      }
    }
    const flat = tokens.join("").replace(/\s+/g, " ");
    const words = flat.split(" ");
    let line = "";
    const emit = (l: string) => {
      report.push(l);
      if (previewLines.length < 60) previewLines.push(l);
    };
    for (const w of words) {
      if (line && line.length + w.length + 1 > 100) {
        emit(line);
        line = w;
      } else line = line ? `${line} ${w}` : w;
    }
    if (line) emit(line);
    report.push("");
  }
  const summary =
    changedPages === 0
      ? `The two PDFs have identical extractable text (${aPages.length} page(s) each). Visual differences in images or layout are not detected by this text comparison.`
      : `${changedPages} of ${maxPages} page(s) differ: ${addedWords} word(s) added, ${removedWords} word(s) removed.`;
  return { changedPages, addedWords, removedWords, report: report.join("\n"), preview: previewLines.join("\n"), summary };
}

// ---------------------------------------------------------------------------
// Edit PDF (annotations) — highlight honours xPct (BUG-7), empty note never
// wraps into a sliver (BUG-9)
// ---------------------------------------------------------------------------

export interface AnnotateOptions {
  page: number;
  kind: "text" | "highlight";
  text: string;
  xPct: number;
  yPct: number;
  size: number;
}

export async function annotatePdfBytes(bytes: Uint8Array, opts: AnnotateOptions): Promise<Uint8Array> {
  const doc = await PDFDocument.load(bytes);
  const pg = doc.getPage(opts.page - 1);
  const { width, height } = pg.getSize();
  const x = (opts.xPct / 100) * width;
  const y = (opts.yPct / 100) * height;
  if (opts.kind === "text") {
    const font = await doc.embedFont(StandardFonts.HelveticaBold);
    const note = opts.text || "(empty note)";
    // Clamp x leftwards so the note fits on one line instead of wrapping
    // into a narrow column at extreme positions (BUG-9).
    const noteWidth = font.widthOfTextAtSize(note, opts.size);
    const effX = Math.min(x, Math.max(20, width - noteWidth - 24));
    pg.drawText(note, { x: effX, y, size: opts.size, font, color: rgb(0.75, 0.1, 0.1), maxWidth: width - effX - 20 });
  } else {
    // Highlight band starts at the horizontal slider position (BUG-7).
    const bandX = x;
    const bandWidth = Math.max(24, width - bandX - 36);
    pg.drawRectangle({ x: bandX, y: y - opts.size, width: bandWidth, height: opts.size * 1.6, color: rgb(1, 0.95, 0.4), opacity: 0.55 });
    const font = await doc.embedFont(StandardFonts.Helvetica);
    pg.drawText(opts.text || "Highlighted", { x: bandX + 4, y: y - opts.size + 4, size: opts.size, font, color: rgb(0.1, 0.1, 0.1), maxWidth: bandWidth - 8 });
  }
  return doc.save();
}

// ---------------------------------------------------------------------------
// Content-stream surgery — the engine behind genuine redaction (BUG-2/3/4)
// and genuine crop (B-14). Text in PDF content streams is stored as hex
// strings <...> or literal strings (...); replacing matched characters with
// spaces (0x20) removes the text from extraction while leaving every other
// object on the page (images, vectors, fonts) untouched.
// ---------------------------------------------------------------------------

export interface ContentToken {
  kind: "hex" | "lit";
  start: number;
  end: number;
  text: string;
  /** Raw byte positions of each decoded char: [highNibble, lowNibble] for hex. */
  nibblePos?: [number, number][];
  /** Raw byte span [start, end) of each decoded char for literals. */
  spans?: [number, number][];
}

/** Find every string token in a decoded content stream, in order. */
export function parseContentStringTokens(buf: Uint8Array): ContentToken[] {
  const toks: ContentToken[] = [];
  let i = 0;
  while (i < buf.length) {
    const c = buf[i];
    if (c === 0x3c && buf[i + 1] !== 0x3c) {
      // Hex string <...>
      let j = i + 1;
      const nibbles: { ch: string; pos: number }[] = [];
      while (j < buf.length && buf[j] !== 0x3e) {
        const ch = buf[j];
        if (ch !== 0x20 && ch !== 0x0a && ch !== 0x0d && ch !== 0x09 && ch !== 0x0c) nibbles.push({ ch: String.fromCharCode(ch), pos: j });
        j++;
      }
      if (j >= buf.length) break;
      let text = "";
      const nibblePos: [number, number][] = [];
      for (let k = 0; k + 1 < nibbles.length; k += 2) {
        text += String.fromCharCode(parseInt(nibbles[k].ch + nibbles[k + 1].ch, 16));
        nibblePos.push([nibbles[k].pos, nibbles[k + 1].pos]);
      }
      toks.push({ kind: "hex", start: i, end: j + 1, text, nibblePos });
      i = j + 1;
    } else if (c === 0x28) {
      // Literal string (...) with escapes and nesting.
      let j = i + 1;
      let depth = 1;
      let text = "";
      const spans: [number, number][] = [];
      while (j < buf.length && depth > 0) {
        const ch = buf[j];
        if (ch === 0x5c && j + 1 < buf.length) {
          const n = buf[j + 1];
          if (n >= 0x30 && n <= 0x37) {
            let k = j + 1;
            let oct = "";
            while (k < buf.length && k < j + 4 && buf[k] >= 0x30 && buf[k] <= 0x37) {
              oct += String.fromCharCode(buf[k]);
              k++;
            }
            text += String.fromCharCode(parseInt(oct, 8));
            spans.push([j, k]);
            j = k;
          } else {
            const map: Record<string, string> = { n: "\n", r: "\r", t: "\t", b: "\b", f: "\f" };
            text += map[String.fromCharCode(n)] ?? String.fromCharCode(n);
            spans.push([j, j + 2]);
            j += 2;
          }
        } else if (ch === 0x28) {
          depth++;
          text += "(";
          spans.push([j, j + 1]);
          j++;
        } else if (ch === 0x29) {
          depth--;
          if (depth > 0) {
            text += ")";
            spans.push([j, j + 1]);
          }
          j++;
        } else {
          text += String.fromCharCode(ch);
          spans.push([j, j + 1]);
          j++;
        }
      }
      toks.push({ kind: "lit", start: i, end: j, text, spans });
      i = j;
    } else {
      i++;
    }
  }
  return toks;
}

function blankTokenChars(out: Buffer, tok: ContentToken, charIndexes?: Set<number>) {
  const should = (ci: number) => !charIndexes || charIndexes.has(ci);
  if (tok.kind === "hex") {
    tok.nibblePos?.forEach(([a, b], ci) => {
      if (should(ci) && !/\s/.test(tok.text[ci])) {
        out[a] = 0x32; // '2'
        out[b] = 0x30; // '0'  => byte 0x20 (space)
      }
    });
  } else {
    tok.spans?.forEach(([a, b], ci) => {
      if (should(ci) && !/\s/.test(tok.text[ci])) {
        for (let q = a; q < b; q++) out[q] = 0x20;
      }
    });
  }
}

/**
 * Replace every occurrence of `query` in the decoded stream text with spaces.
 * Matching is whitespace-insensitive so a secret split across tokens/lines
 * is still found (BUG-2). Pass query=null to blank ALL text (whole-page
 * blackout). Returns the new bytes and how many matches were blanked.
 */
export function scrubContentBytes(decoded: Uint8Array, query: string | null): { bytes: Uint8Array; found: number } {
  const out = Buffer.from(decoded);
  const toks = parseContentStringTokens(decoded);
  if (query === null) {
    for (const t of toks) blankTokenChars(out, t);
    return { bytes: new Uint8Array(out), found: toks.length };
  }
  const joined = toks.map((t) => t.text).join("");
  const nJoined = normalizeForMatch(joined);
  const nQ = normalizeForMatch(query);
  if (!nQ) return { bytes: new Uint8Array(out), found: 0 };
  // Map each non-whitespace char of the joined text back to (token, char).
  const map: { ti: number; ci: number }[] = [];
  toks.forEach((t, ti) => {
    for (let ci = 0; ci < t.text.length; ci++) {
      if (!/\s/.test(t.text[ci])) map.push({ ti, ci });
    }
  });
  let found = 0;
  let idx = 0;
  while (true) {
    const p = nJoined.indexOf(nQ, idx);
    if (p < 0) break;
    found++;
    const perToken = new Map<number, Set<number>>();
    for (let k = p; k < p + nQ.length && k < map.length; k++) {
      const m = map[k];
      if (!perToken.has(m.ti)) perToken.set(m.ti, new Set());
      perToken.get(m.ti)!.add(m.ci);
    }
    for (const [ti, cis] of perToken) blankTokenChars(out, toks[ti], cis);
    idx = p + Math.max(1, nQ.length);
  }
  return { bytes: new Uint8Array(out), found };
}

/** Blank every string token fully inside the byte range [start, end). */
export function blankTokensInRange(decoded: Uint8Array, start: number, end: number): { bytes: Uint8Array; blanked: number } {
  const out = Buffer.from(decoded);
  let blanked = 0;
  for (const t of parseContentStringTokens(decoded)) {
    if (t.start >= start && t.end <= end) {
      blankTokenChars(out, t);
      blanked++;
    }
  }
  return { bytes: new Uint8Array(out), blanked };
}

/** Decode every content stream of a page, run `fn` on the bytes, and write
 *  the result back as a single new stream. Returns what `fn` returned. */
async function rewritePageContent(page: PDFPage, doc: PDFDocument, fn: (decoded: Uint8Array) => { bytes: Uint8Array; value: number }): Promise<number> {
  const contents = page.node.Contents();
  if (!contents) return 0;
  const refs = contents instanceof PDFArray ? contents.asArray() : [contents];
  const parts: Uint8Array[] = [];
  let total = 0;
  let touched = false;
  for (const ref of refs) {
    const stream = doc.context.lookup(ref);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const decoded = (decodePDFRawStream as any)(stream).decode() as Uint8Array;
    const { bytes, value } = fn(decoded);
    total += value;
    if (value > 0) touched = true;
    parts.push(bytes);
  }
  if (!touched) return total;
  const joined = Buffer.concat(parts.map((p) => Buffer.from(p)));
  const newRef = doc.context.register(doc.context.flateStream(new Uint8Array(joined)));
  page.node.set(PDFName.of("Contents"), newRef);
  return total;
}

/** Scrub `query` (or all text when null) from one page's content streams. */
export async function scrubPageContent(page: PDFPage, doc: PDFDocument, query: string | null): Promise<number> {
  return rewritePageContent(page, doc, (decoded) => {
    const { bytes, found } = scrubContentBytes(decoded, query);
    return { bytes, value: found };
  });
}

// ---------------------------------------------------------------------------
// Redact — cross-item matching, partial-item spans, image preservation
// ---------------------------------------------------------------------------

export interface RedactSpan {
  itemIndex: number;
  startChar: number;
  endChar: number;
  x: number;
  y: number;
  width: number;
  height: number;
}

/** Find every occurrence of the query in the page's items, even when it
 *  spans item boundaries (BUG-2). Returns per-item char ranges + the exact
 *  black-box geometry for just the matched characters (BUG-4). */
export function computeRedactionSpans(items: TextItem[], query: string): RedactSpan[] {
  const q = normalizeForMatch(query);
  if (!q) return [];
  const joined = items.map((it) => it.str).join("");
  const nJoined = normalizeForMatch(joined);
  // Map normalized index -> {itemIndex, charIndex}.
  const map: { itemIndex: number; charIndex: number }[] = [];
  items.forEach((it, ii) => {
    for (let ci = 0; ci < it.str.length; ci++) {
      if (!/\s/.test(it.str[ci])) map.push({ itemIndex: ii, charIndex: ci });
    }
  });
  const spans: RedactSpan[] = [];
  let idx = 0;
  while (true) {
    const p = nJoined.indexOf(q, idx);
    if (p < 0) break;
    // Group consecutive matched chars by item.
    const byItem = new Map<number, { start: number; end: number }>();
    for (let k = p; k < p + q.length && k < map.length; k++) {
      const m = map[k];
      const cur = byItem.get(m.itemIndex);
      if (!cur) byItem.set(m.itemIndex, { start: m.charIndex, end: m.charIndex + 1 });
      else cur.end = m.charIndex + 1;
    }
    for (const [itemIndex, range] of byItem) {
      const it = items[itemIndex];
      const charW = it.width / Math.max(1, it.str.length);
      spans.push({
        itemIndex,
        startChar: range.start,
        endChar: range.end,
        x: Math.max(0, it.x + range.start * charW - 1),
        y: Math.max(0, it.y - 1),
        width: (range.end - range.start) * charW + 2,
        height: it.height + 2,
      });
    }
    idx = p + Math.max(1, q.length);
  }
  return spans;
}

/** Surviving (non-matched) segments of one item, for the text-only fallback. */
export function survivingSegments(item: TextItem, spans: RedactSpan[], itemIndex: number): { text: string; startChar: number }[] {
  const covered = spans
    .filter((s) => s.itemIndex === itemIndex)
    .map((s) => [s.startChar, s.endChar] as [number, number])
    .sort((a, b) => a[0] - b[0]);
  const out: { text: string; startChar: number }[] = [];
  let cur = 0;
  for (const [a, b] of covered) {
    if (a > cur) out.push({ text: item.str.slice(cur, a), startChar: cur });
    cur = Math.max(cur, b);
  }
  if (cur < item.str.length) out.push({ text: item.str.slice(cur), startChar: cur });
  return out.filter((s) => s.text.trim().length > 0);
}

export interface RedactResult {
  bytes: Uint8Array;
  redactedItems: number;
  rebuiltPages: number;
  fallbackPages: number[];
  imagesPreserved: boolean;
  verified: boolean;
  leaked: boolean;
  blackoutPagesBlank: boolean;
}

/**
 * Redact text (and/or whole pages) from a PDF.
 * Primary path: copy each affected page intact (images/vectors/fonts all
 * preserved), remove the matched text from its content stream, and cover
 * the spot with a black box. Fallback path (only when the stream cannot be
 * scrubbed, e.g. custom font encodings): rebuild that page from its text
 * items, keeping only the surviving text — images on that page are lost and
 * the page is listed in fallbackPages. Verification uses full-page text
 * extraction with whitespace removed, so a split secret can never pass.
 */
export async function redactPdfBytes(original: Uint8Array, opts: { search: string; pages: string }): Promise<RedactResult> {
  const pageData = await extractPageItems(original);
  const pageCount = pageData.length;
  const src = await PDFDocument.load(original);
  const query = opts.search.trim();
  const blackout = opts.pages.trim() ? new Set(parseRanges(opts.pages, pageCount)) : new Set<number>();

  const runPass = async (forceFallback: Set<number>): Promise<{ bytes: Uint8Array; redactedItems: number; rebuiltPages: number; fallbackPages: number[] }> => {
    const out = await PDFDocument.create();
    const font = await out.embedFont(StandardFonts.Helvetica);
    let redactedItems = 0;
    let rebuiltPages = 0;
    const fallbackPages: number[] = [];
    for (let i = 0; i < pageData.length; i++) {
      const { items, width, height } = pageData[i];
      const pageNum = i + 1;
      const spans = query ? computeRedactionSpans(items, query) : [];
      if (blackout.has(pageNum)) {
        const [copied] = await out.copyPages(src, [i]);
        out.addPage(copied);
        await scrubPageContent(copied, out, null);
        copied.drawRectangle({ x: 0, y: 0, width, height, color: rgb(0, 0, 0) });
        redactedItems += items.length;
        rebuiltPages++;
        continue;
      }
      if (spans.length === 0) {
        const [copied] = await out.copyPages(src, [i]);
        out.addPage(copied);
        continue;
      }
      rebuiltPages++;
      redactedItems += new Set(spans.map((s) => s.itemIndex)).size;
      if (forceFallback.has(pageNum)) {
        fallbackPages.push(pageNum);
        const pg = out.addPage([width, height]);
        for (let ii = 0; ii < items.length; ii++) {
          const it = items[ii];
          const charW = it.width / Math.max(1, it.str.length);
          for (const seg of survivingSegments(it, spans, ii)) {
            pg.drawText(seg.text, { x: it.x + seg.startChar * charW, y: it.y, size: Math.min(Math.max(it.fontSize, 6), 48), font, color: rgb(0.1, 0.1, 0.1), maxWidth: width - (it.x + seg.startChar * charW) });
          }
        }
        for (const s of spans) pg.drawRectangle({ x: s.x, y: s.y, width: s.width, height: s.height, color: rgb(0, 0, 0) });
        continue;
      }
      // Primary path: copy the page whole, scrub its stream, cover matches.
      const [copied] = await out.copyPages(src, [i]);
      out.addPage(copied);
      const found = query ? await scrubPageContent(copied, out, query) : 0;
      if (found === 0) {
        // Stream scrub found nothing (unusual encoding) — rebuild this page
        // from scratch instead of leaving the secret in place. Re-run the
        // loop logic by marking fallback and rebuilding below.
        fallbackPages.push(pageNum);
        out.removePage(out.getPageCount() - 1);
        const pg = out.addPage([width, height]);
        for (let ii = 0; ii < items.length; ii++) {
          const it = items[ii];
          const charW = it.width / Math.max(1, it.str.length);
          for (const seg of survivingSegments(it, spans, ii)) {
            pg.drawText(seg.text, { x: it.x + seg.startChar * charW, y: it.y, size: Math.min(Math.max(it.fontSize, 6), 48), font, color: rgb(0.1, 0.1, 0.1), maxWidth: width - (it.x + seg.startChar * charW) });
          }
        }
        for (const s of spans) pg.drawRectangle({ x: s.x, y: s.y, width: s.width, height: s.height, color: rgb(0, 0, 0) });
        continue;
      }
      for (const s of spans) copied.drawRectangle({ x: s.x, y: s.y, width: s.width, height: s.height, color: rgb(0, 0, 0) });
    }
    return { bytes: await out.save(), redactedItems, rebuiltPages, fallbackPages };
  };

  const verify = async (bytes: Uint8Array): Promise<{ leaked: boolean; blackoutPagesBlank: boolean }> => {
    const afterText = await extractPagesText(bytes);
    const joined = normalizeForMatch(afterText.join(" "));
    const leaked = query ? joined.includes(normalizeForMatch(query)) : false;
    let blackoutPagesBlank = true;
    for (const p of blackout) {
      if ((afterText[p - 1] ?? "").trim().length > 0) blackoutPagesBlank = false;
    }
    return { leaked, blackoutPagesBlank };
  };

  let pass = await runPass(new Set());
  if (pass.redactedItems === 0 && blackout.size === 0) {
    throw new Error(query ? `The text “${query}” was not found in this PDF.` : "Nothing to redact.");
  }
  let check = await verify(pass.bytes);
  if (check.leaked && query) {
    // Second pass: force the text-only rebuild for every page that had a
    // match, then verify again. Never report "Verified" on a leak.
    const spanPages = new Set<number>();
    pageData.forEach((pd, i) => {
      if (computeRedactionSpans(pd.items, query).length) spanPages.add(i + 1);
    });
    pass = await runPass(spanPages);
    check = await verify(pass.bytes);
  }
  return {
    bytes: pass.bytes,
    redactedItems: pass.redactedItems,
    rebuiltPages: pass.rebuiltPages,
    fallbackPages: pass.fallbackPages,
    imagesPreserved: pass.fallbackPages.length === 0,
    verified: !check.leaked && check.blackoutPagesBlank,
    leaked: check.leaked,
    blackoutPagesBlank: check.blackoutPagesBlank,
  };
}

// ---------------------------------------------------------------------------
// Forms — radio groups handled, invalid dropdown/radio values rejected
// ---------------------------------------------------------------------------

export interface FormFieldState {
  name: string;
  type: string;
  value: string;
  options?: string[];
}

export async function detectFormFields(bytes: Uint8Array): Promise<FormFieldState[]> {
  const doc = await PDFDocument.load(bytes);
  const form = doc.getForm();
  return form.getFields().map((f) => {
    const name = f.getName();
    if (f instanceof PDFTextField) return { name, type: "text", value: f.getText() ?? "" };
    if (f instanceof PDFCheckBox) return { name, type: "checkbox", value: f.isChecked() ? "yes" : "no" };
    if (f instanceof PDFDropdown) return { name, type: "dropdown", value: f.getSelected()[0] ?? "", options: f.getOptions() };
    if (f instanceof PDFRadioGroup) return { name, type: "radio", value: f.getSelected() ?? "", options: f.getOptions() };
    return { name, type: f.constructor.name.replace("PDF", ""), value: "" };
  });
}

export async function fillFormPdf(bytes: Uint8Array, states: FormFieldState[]): Promise<Uint8Array> {
  const doc = await PDFDocument.load(bytes);
  const form = doc.getForm();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  for (const state of states) {
    const field = form.getField(state.name);
    if (field instanceof PDFTextField) {
      field.setText(state.value);
    } else if (field instanceof PDFCheckBox) {
      if (state.value === "yes") field.check();
      else field.uncheck();
    } else if (field instanceof PDFDropdown) {
      if (state.value) {
        if (!field.getOptions().includes(state.value)) {
          throw new Error(`“${state.value}” is not a valid option for “${state.name}” (valid: ${field.getOptions().join(", ") || "none"}).`);
        }
        field.select(state.value);
      }
    } else if (field instanceof PDFRadioGroup) {
      if (state.value) {
        if (!field.getOptions().includes(state.value)) {
          throw new Error(`“${state.value}” is not a valid option for “${state.name}” (valid: ${field.getOptions().join(", ") || "none"}).`);
        }
        field.select(state.value);
      }
    }
    // Any other field type is left untouched — the UI never offers it as editable.
  }
  form.updateFieldAppearances(font);
  return doc.save();
}

// ---------------------------------------------------------------------------
// Crop — genuinely removes out-of-box text and images (B-14)
// ---------------------------------------------------------------------------

export interface CropRect {
  /** Display coords (origin top-left, as pdfjs reports items). */
  dx0: number;
  dy0: number;
  dx1: number;
  dy1: number;
  /** Unrotated PDF coords (origin bottom-left) for setCropBox/setMediaBox. */
  ux0: number;
  uy0: number;
  ux1: number;
  uy1: number;
}

function displayRectToPdfBox(dx0: number, dy0: number, dx1: number, dy1: number, w: number, h: number, rotation: number): { ux0: number; uy0: number; ux1: number; uy1: number } {
  const a = ((rotation % 360) + 360) % 360;
  if (a === 90) return { ux0: w - dy1, uy0: dx0, ux1: w - dy0, uy1: dx1 };
  if (a === 180) return { ux0: w - dx1, uy0: h - dy1, ux1: w - dx0, uy1: h - dy0 };
  if (a === 270) return { ux0: dy0, uy0: h - dx1, ux1: dy1, uy1: h - dx0 };
  return { ux0: dx0, uy0: h - dy1, ux1: dx1, uy1: h - dy0 };
}

function itemOutsideDisplayRect(it: TextItem, r: CropRect, tol = 1): boolean {
  const x0 = it.x;
  const x1 = it.x + it.width;
  const y0 = it.y;
  const y1 = it.y + it.height;
  return x1 <= r.dx0 + tol || x0 >= r.dx1 - tol || y1 <= r.dy0 + tol || y0 >= r.dy1 - tol;
}

function rectsOverlap(ax0: number, ay0: number, ax1: number, ay1: number, bx0: number, by0: number, bx1: number, by1: number): boolean {
  return ax0 < bx1 && ax1 > bx0 && ay0 < by1 && ay1 > by0;
}

/** Find BT...ET blocks in a decoded stream, with byte ranges. */
function findTextBlocks(decoded: Uint8Array): { start: number; end: number }[] {
  const s = Buffer.from(decoded).toString("latin1");
  const blocks: { start: number; end: number }[] = [];
  const re = /BT\b([\s\S]*?)\bET\b/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(s)) !== null) blocks.push({ start: m.index, end: m.index + m[0].length });
  return blocks;
}

interface PlacedImage {
  name: string;
  doStart: number;
  doEnd: number;
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

/** Find `/Name Do` image placements with their effective transform.
 *  pdf-lib composes a placement from SEVERAL cm ops in a row (translate,
 *  scale, identities), so the effective matrix is the product of every cm
 *  since the enclosing q — taking only the last cm gives the identity. */
function findPlacedImages(decoded: Uint8Array): PlacedImage[] {
  const s = Buffer.from(decoded).toString("latin1");
  const out: PlacedImage[] = [];
  type Mat = [number, number, number, number, number, number];
  const ident: Mat = [1, 0, 0, 1, 0, 0];
  const mul = (m1: Mat, m2: Mat): Mat => [
    m1[0] * m2[0] + m1[1] * m2[2],
    m1[0] * m2[1] + m1[1] * m2[3],
    m1[2] * m2[0] + m1[3] * m2[2],
    m1[2] * m2[1] + m1[3] * m2[3],
    m1[4] * m2[0] + m1[5] * m2[2] + m2[4],
    m1[4] * m2[1] + m1[5] * m2[3] + m2[5],
  ];
  const stack: Mat[] = [];
  let ctm: Mat = ident;
  const opRe = /(\bq\b|\bQ\b|(-?[\d.]+)\s+(-?[\d.]+)\s+(-?[\d.]+)\s+(-?[\d.]+)\s+(-?[\d.]+)\s+(-?[\d.]+)\s+cm\b|\/([A-Za-z0-9_.\-]+)\s+Do\b)/g;
  let m: RegExpExecArray | null;
  while ((m = opRe.exec(s)) !== null) {
    const tok = m[0];
    if (tok === "q") {
      stack.push(ctm);
    } else if (tok === "Q") {
      ctm = stack.pop() ?? ident;
    } else if (tok.endsWith("cm")) {
      const nums = tok.slice(0, -2).trim().split(/\s+/).map(Number) as unknown as Mat;
      ctm = mul(ctm, nums);
    } else {
      const name = m[8];
      const [a, b, cc, d, e, f] = ctm;
      const corners = [
        [e, f],
        [a + e, b + f],
        [cc + e, d + f],
        [a + cc + e, b + d + f],
      ];
      const xs = corners.map((p) => p[0]);
      const ys = corners.map((p) => p[1]);
      out.push({ name, doStart: m.index, doEnd: m.index + m[0].length, x0: Math.min(...xs), y0: Math.min(...ys), x1: Math.max(...xs), y1: Math.max(...ys) });
    }
  }
  return out;
}

function pageReferencesXObject(doc: PDFDocument, exceptIndex: number, ref: PDFRef): boolean {
  for (let i = 0; i < doc.getPageCount(); i++) {
    if (i === exceptIndex) continue;
    try {
      const res = doc.getPage(i).node.Resources();
      const xobj = res?.lookupMaybe(PDFName.of("XObject"), PDFDict);
      if (!xobj) continue;
      for (const key of xobj.keys()) {
        const v = xobj.get(key);
        if (v === ref) return true;
      }
    } catch {
      // ignore
    }
  }
  return false;
}

export interface CropResult {
  bytes: Uint8Array;
  croppedPages: number[];
  removedTextItems: number;
  removedImages: number;
  fallbackPages: number[];
  /** True when every cropped page passed the post-crop text check. */
  verified: boolean;
}

/**
 * Crop pages so content outside the crop region is genuinely gone — not
 * merely hidden behind a smaller CropBox (B-14).
 *
 * Primary path (unrotated pages): the content stream is rewritten — text
 * blocks whose text sits fully outside the crop rectangle are blanked, and
 * image placements fully outside are deleted from the stream, the page's
 * XObject dictionary and the document (when no other page uses them). The
 * CropBox/MediaBox are then set to the crop rectangle.
 * Fallback path (rotated pages, or any page where the stream could not be
 * parsed/verified): the page is rebuilt from its text items that fall
 * inside the crop rectangle. Images on fallback pages are lost — the page
 * is listed in fallbackPages and the result says so.
 * Vector drawings outside the crop area are NOT removed (they are clipped
 * from view by the CropBox); the result text says this plainly.
 * Verification: after saving, no text item may sit fully outside the crop
 * rectangle on any cropped page.
 */
export async function cropPdfBytes(
  bytes: Uint8Array,
  opts: { left: number; right: number; top: number; bottom: number; scope: "all" | "pages"; pages: string },
): Promise<CropResult> {
  const pageData = await extractPageItems(bytes);
  const doc = await PDFDocument.load(bytes);
  const total = doc.getPageCount();
  if (total === 0) throw new Error("This PDF has 0 pages — there is nothing to crop.");
  const targets = opts.scope === "all" ? Array.from({ length: total }, (_, i) => i) : parseRanges(opts.pages, total).map((p) => p - 1);
  if (!targets.length) throw new Error(`No valid pages in "${opts.pages}" for a ${total}-page PDF.`);
  const targetSet = new Set(targets);
  let removedTextItems = 0;
  let removedImages = 0;
  const fallbackPages: number[] = [];
  const rects = new Map<number, CropRect>();

  for (const idx of targets) {
    const page = doc.getPage(idx);
    const { width, height } = page.getSize();
    const vp = pageData[idx];
    const rotation = page.getRotation().angle;
    const dx0 = (vp.width * opts.left) / 100;
    const dy0 = (vp.height * opts.top) / 100;
    const dx1 = vp.width - (vp.width * opts.right) / 100;
    const dy1 = vp.height - (vp.height * opts.bottom) / 100;
    const box = displayRectToPdfBox(dx0, dy0, dx1, dy1, width, height, rotation);
    const rect: CropRect = { dx0, dy0, dx1, dy1, ...box };
    rects.set(idx, rect);
    const items = vp.items;

    if (rotation === 0) {
      // --- Content-stream surgery -------------------------------------------
      const contents = page.node.Contents();
      if (contents) {
        const refs = contents instanceof PDFArray ? contents.asArray() : [contents];
        const newParts: Uint8Array[] = [];
        for (const ref of refs) {
          const stream = doc.context.lookup(ref);
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const decoded = (decodePDFRawStream as any)(stream).decode() as Uint8Array;
          const out = Buffer.from(decoded);
          const blocks = findTextBlocks(decoded);
          const allToks = parseContentStringTokens(decoded);
          // Map string tokens to pdfjs items in order. One BT block can hold
          // several Tj lines (one token per line), so mapping is per token,
          // not per block. If the counts disagree, skip text surgery for this
          // stream — verification will send the page to the fallback instead
          // of risking wrongly-blanked text.
          const textToks = allToks.filter((t) => blocks.some((b) => t.start >= b.start && t.end <= b.end));
          if (textToks.length === items.length) {
            for (let ti = 0; ti < textToks.length; ti++) {
              const it = items[ti];
              // Item bbox in PDF coords (origin bottom-left).
              const baseY = height - it.y - it.fontSize;
              if (!rectsOverlap(it.x, baseY, it.x + it.width, baseY + it.fontSize, rect.ux0, rect.uy0, rect.ux1, rect.uy1)) {
                blankTokenChars(out, textToks[ti]);
                removedTextItems++;
              }
            }
          }
          // Images fully outside the crop rectangle.
          const placed = findPlacedImages(new Uint8Array(out));
          const removedNames = new Set<string>();
          for (const img of placed) {
            if (!rectsOverlap(img.x0, img.y0, img.x1, img.y1, rect.ux0, rect.uy0, rect.ux1, rect.uy1)) {
              for (let q = img.doStart; q < img.doEnd; q++) out[q] = 0x20;
              removedNames.add(img.name);
              removedImages++;
            }
          }
          if (removedNames.size) {
            try {
              const res = page.node.Resources();
              const xobj = res?.lookupMaybe(PDFName.of("XObject"), PDFDict);
              if (xobj) {
                for (const name of removedNames) {
                  const key = PDFName.of(name);
                  const v = xobj.get(key);
                  xobj.delete(key);
                  if (v instanceof PDFRef && !pageReferencesXObject(doc, idx, v)) doc.context.delete(v);
                }
              }
            } catch {
              // Resource cleanup is best-effort; the Do op is already gone.
            }
          }
          newParts.push(new Uint8Array(out));
        }
        const joined = Buffer.concat(newParts.map((p) => Buffer.from(p)));
        const newRef = doc.context.register(doc.context.flateStream(new Uint8Array(joined)));
        page.node.set(PDFName.of("Contents"), newRef);
      }
    }
    page.setCropBox(rect.ux0, rect.uy0, rect.ux1 - rect.ux0, rect.uy1 - rect.uy0);
    page.setMediaBox(rect.ux0, rect.uy0, rect.ux1 - rect.ux0, rect.uy1 - rect.uy0);
  }

  let outBytes = await doc.save();
  // --- Verification: no text item fully outside the crop rectangle ---------
  // pdfjs reports item coords in PDF user space while the viewport is the
  // crop box, so an item's display position is (x - cropBox.x,
  // y + cropBox.y) in the cropped viewport. The crop rect in that viewport
  // is zero-origin with the crop's width/height. Fallback-rebuilt pages
  // have no crop offset (their box starts at 0,0), so the same adjustment
  // — read from the OUTPUT page's own crop box — is correct for both paths.
  const verify = async (b: Uint8Array): Promise<number[]> => {
    const after = await extractPageItems(b);
    const outDoc = await PDFDocument.load(b);
    const bad: number[] = [];
    for (const idx of targets) {
      const r = rects.get(idx)!;
      const zeroRect: CropRect = { dx0: 0, dy0: 0, dx1: r.dx1 - r.dx0, dy1: r.dy1 - r.dy0, ux0: 0, uy0: 0, ux1: r.dx1 - r.dx0, uy1: r.dy1 - r.dy0 };
      const cb = outDoc.getPage(idx).getCropBox();
      const items = (after[idx]?.items ?? []).map((it) => ({ ...it, x: it.x - cb.x, y: it.y + cb.y }));
      if (items.some((it) => itemOutsideDisplayRect(it, zeroRect))) bad.push(idx);
    }
    return bad;
  };
  let bad = await verify(outBytes);
  if (bad.length) {
    // Fallback: rebuild the failing pages from inside-crop text items only.
    const badSet = new Set(bad);
    const out2 = await PDFDocument.create();
    const font = await out2.embedFont(StandardFonts.Helvetica);
    const srcDoc = await PDFDocument.load(outBytes);
    for (let i = 0; i < total; i++) {
      if (targetSet.has(i) && badSet.has(i)) {
        const r = rects.get(i)!;
        const items = pageData[i].items.filter((it) => !itemOutsideDisplayRect(it, r));
        const pg = out2.addPage([r.dx1 - r.dx0, r.dy1 - r.dy0]);
        for (const it of items) {
          pg.drawText(it.str, { x: it.x - r.dx0, y: r.dy1 - r.dy0 - (it.y - r.dy0) - it.fontSize, size: Math.min(Math.max(it.fontSize, 6), 48), font, color: rgb(0.1, 0.1, 0.1) });
        }
        fallbackPages.push(i + 1);
      } else {
        const [copied] = await out2.copyPages(srcDoc, [i]);
        out2.addPage(copied);
      }
    }
    outBytes = await out2.save();
    bad = await verify(outBytes);
  }
  return {
    bytes: outBytes,
    croppedPages: targets.map((t) => t + 1),
    removedTextItems,
    removedImages,
    fallbackPages,
    verified: bad.length === 0,
  };
}

// ---------------------------------------------------------------------------
// Repair — refuse encrypted input, verify per page, refuse 0-page input
// (B-11, B-12, B-05)
// ---------------------------------------------------------------------------

export interface RepairResult {
  bytes: Uint8Array;
  pages: number;
  blankPages: number[];
  warnings: string[];
}

export async function repairPdfBytes(bytes: Uint8Array, fallbackTitle: string): Promise<RepairResult> {
  if (looksEncrypted(bytes)) {
    throw new Error("This file is password-protected — unlock it first. Repair cannot work on an encrypted file.");
  }
  const doc = await PDFDocument.load(bytes, { ignoreEncryption: true, updateMetadata: false });
  const pages = doc.getPageCount();
  if (pages === 0) throw new Error("This PDF has 0 pages — there is nothing to repair.");
  let beforeText: string[] | null = null;
  try {
    beforeText = await extractPagesText(bytes);
  } catch {
    beforeText = null;
  }
  doc.setTitle(doc.getTitle() || fallbackTitle);
  const outBytes = await doc.save();
  const warnings: string[] = [];
  let blankPages: number[] = [];
  try {
    const afterText = await extractPagesText(outBytes);
    if (beforeText) {
      blankPages = afterText
        .map((t, i) => ({ t, i }))
        .filter(({ t, i }) => (beforeText![i] ?? "").trim().length > 0 && t.trim().length === 0)
        .map(({ i }) => i + 1);
      if (blankPages.length) {
        warnings.push(
          `Page(s) ${blankPages.join(", ")} lost their text during the repair and came out blank — the file was damaged beyond what this tool can rebuild.`,
        );
      }
    } else {
      // The original could not be read for comparison (e.g. corrupt-flip):
      // any page that comes out blank may have lost its text, so say so
      // instead of reporting a clean success (B-11).
      blankPages = afterText.map((t, i) => ({ t, i })).filter(({ t }) => t.trim().length === 0).map(({ i }) => i + 1);
      if (blankPages.length) {
        warnings.push(
          `Page(s) ${blankPages.join(", ")} came out blank. The original file could not be read for comparison, so those pages may have lost text in the repair — open the file and check them.`,
        );
      } else {
        warnings.push("The original file could not be read for comparison, so the repair could not be verified page by page — open the file and check every page before relying on it.");
      }
    }
  } catch {
    warnings.push("The repaired file could not be fully verified — open it and check every page before relying on it.");
  }
  return { bytes: outBytes, pages, blankPages, warnings };
}

// ---------------------------------------------------------------------------
// PDF/A — honest descriptive XMP only, no false conformance claim (B-13)
// ---------------------------------------------------------------------------

export function escapeXml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

/**
 * Descriptive XMP metadata (title/author) WITHOUT any pdfaid conformance
 * claim: a real PDF/A-1b file needs embedded fonts and an OutputIntent,
 * which this browser tool does not produce. The old XMP asserted
 * <pdfaid:part>1</pdfaid:part><pdfaid:conformance>B</pdfaid:conformance>
 * with neither — a false claim a validator would fail.
 */
export function buildDescriptiveXmp(title: string, author: string): string {
  return [
    '<?xpacket begin="" id="W5M0MpCehiHzreSzNTczkc9d"?>',
    '<x:xmpmeta xmlns:x="adobe:ns:meta/" x:xmptk="PDF World">',
    '<rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#">',
    `<rdf:Description rdf:about="" xmlns:dc="http://purl.org/dc/elements/1.1/"><dc:title><rdf:Alt><rdf:li xml:lang="x-default">${escapeXml(title)}</rdf:li></rdf:Alt></dc:title>${author ? `<dc:creator><rdf:Seq><rdf:li>${escapeXml(author)}</rdf:li></rdf:Seq></dc:creator>` : ""}</rdf:Description>`,
    "</rdf:RDF></x:xmpmeta>",
    '<?xpacket end="w"?>',
  ].join("\n");
}

// ---------------------------------------------------------------------------
// Watermark — fit check (B-06) and Latin-only encoding error (B-15)
// ---------------------------------------------------------------------------

export interface WatermarkFit {
  size: number;
  textWidth: number;
  shrunk: boolean;
  fits: boolean;
}

/**
 * Shrink the watermark font until the text fits inside the page — for the
 * diagonal watermark the -35° rotated bounding box must fit; for the
 * unrotated positions the plain text width must fit (B-06). Returns the
 * size to use and whether it still fits (a very long text at the minimum
 * size may not — the caller warns then).
 */
export function fitWatermarkSize(font: PDFFont, text: string, size: number, pageW: number, pageH: number, rotated = true): WatermarkFit {
  const cos = Math.cos((35 * Math.PI) / 180);
  const sin = Math.sin((35 * Math.PI) / 180);
  const bbox = (s: number) => {
    const w = font.widthOfTextAtSize(text, s);
    if (!rotated) return { w, bboxW: w, bboxH: s };
    return { w, bboxW: w * cos + s * sin, bboxH: w * sin + s * cos };
  };
  let s = size;
  let b = bbox(s);
  while (s > 8 && (b.bboxW > pageW * 0.98 || b.bboxH > pageH * 0.98)) {
    s = Math.max(8, Math.floor(s * 0.9));
    b = bbox(s);
  }
  return { size: s, textWidth: b.w, shrunk: s < size, fits: b.bboxW <= pageW * 0.98 && b.bboxH <= pageH * 0.98 };
}

/** Throw a specific, honest error when the watermark font cannot encode the
 *  text (WinAnsi/Helvetica supports Latin text only) — B-15. */
export function assertWatermarkEncodable(font: PDFFont, text: string): void {
  try {
    font.widthOfTextAtSize(text, 12);
  } catch (e) {
    if (/cannot encode/i.test(e instanceof Error ? e.message : String(e))) {
      throw new Error("This watermark font supports Latin letters, numbers and basic punctuation only — it cannot draw characters such as the ones in your text. Use a Latin-only watermark.");
    }
    throw e;
  }
}

// ---------------------------------------------------------------------------
// Page numbers — collision check with existing content (B-07)
// ---------------------------------------------------------------------------

export interface StampCollision {
  page: number;
  existingText: string;
}

/**
 * Check whether a page-number stamp at the given position would overlap
 * existing text. Positions use the component's fixed stamp spots; labelWidth
 * is the rendered width of that page's label. Coordinates are display
 * coords (origin top-left), matching extractPageItems.
 */
export function findStampCollisions(
  itemsByPage: { items: TextItem[]; width: number; height: number }[],
  position: "bottom-center" | "bottom-right" | "bottom-left" | "top-center" | "top-right",
  labelWidths: number[],
  size = 11,
): StampCollision[] {
  const out: StampCollision[] = [];
  itemsByPage.forEach((pd, i) => {
    const { width, height } = pd;
    const labelW = labelWidths[i] ?? 20;
    let sx: number;
    let syTop: number; // display y of the stamp's top edge
    if (position === "bottom-center") {
      sx = (width - labelW) / 2;
      syTop = height - 24 - size;
    } else if (position === "bottom-right") {
      sx = width - labelW - 30;
      syTop = height - 24 - size;
    } else if (position === "bottom-left") {
      sx = 30;
      syTop = height - 24 - size;
    } else if (position === "top-center") {
      sx = (width - labelW) / 2;
      syTop = 30 - size;
    } else {
      sx = width - labelW - 30;
      syTop = 30 - size;
    }
    const rx0 = sx - 2;
    const rx1 = sx + labelW + 2;
    const ry0 = syTop - 2;
    const ry1 = syTop + size + 4;
    const hit = pd.items.find(
      (it) => it.x < rx1 && it.x + it.width > rx0 && it.y < ry1 && it.y + it.height > ry0,
    );
    if (hit) out.push({ page: i + 1, existingText: hit.str.slice(0, 60) });
  });
  return out;
}
