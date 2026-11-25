import { PDFDocument, StandardFonts, rgb, PDFPage, PDFFont } from "pdf-lib";
import JSZip from "jszip";
import { openPdfjs } from "@/lib/pdf-utils";

// ============================================================================
// Shared conversion helpers (QA-A fixes). See
// ~/workspace/research_notes/pdfworld/qa-a-conversions.md for the bug list.
// What this module now does that the old plain-text pipeline did not:
//  - PDF text extraction keeps font size, colour, position and reading order
//    (operator-list walk), splits wide-gap columns instead of merging them,
//    and detects tables from x-coordinates instead of whitespace.
//  - Word / PowerPoint parsing keeps per-run fonts, sizes, colours,
//    bold/italic/underline, headings, lists, tables, links and images.
//  - PDF output renders styled runs (not one grey Helvetica size for
//    everything) and embeds a Unicode font on demand, so non-Latin text
//    no longer crashes with a WinAnsi error (B-01).
// Honest limits that remain (see also each tool's `limits` text):
//  - PDF -> X: pdfjs does not expose bold/italic from a PDF (font names are
//    subsetted/renamed), so bold/italic from PDFs is NOT preserved.
//  - Exact page layout / pagination of the original is never reproduced:
//    output reflows onto A4 pages. Images from PDFs are appended per page,
//    not placed at their exact original position.
// ============================================================================

// ---------------------------------------------------------------------------
// Small utilities
// ---------------------------------------------------------------------------

export function decodeXmlEntities(s: string): string {
  return s
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_m, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_m, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&amp;/g, "&");
}

export function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

/** Escape text so it cannot corrupt Markdown structure (B-19). */
export function escapeMarkdown(s: string): string {
  return s
    .replace(/\\/g, "\\\\")
    .replace(/([`*_[\]<>])/g, "\\$1")
    .replace(/^(#{1,6}\s)/, "\\$1")
    .replace(/^(\s*[-+*]\s)/, "\\$1")
    .replace(/^(\s*\d+[.)]\s)/, "\\$1");
}

export function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const m = hex.replace("#", "").match(/^([0-9a-fA-F]{6})$/);
  if (!m) return null;
  const v = parseInt(m[1], 16);
  return { r: ((v >> 16) & 255) / 255, g: ((v >> 8) & 255) / 255, b: (v & 255) / 255 };
}

export function normalizeColor(raw: string | undefined | null): string | undefined {
  if (!raw) return undefined;
  const t = raw.trim();
  if (!t || t.toLowerCase() === "auto") return undefined;
  if (/^[0-9a-fA-F]{6}$/.test(t)) return `#${t.toUpperCase()}`;
  if (/^#[0-9a-fA-F]{6}$/.test(t)) return t.toUpperCase();
  return undefined;
}

/**
 * Turn a raw library error into a plain, truthful message (B-20). Never
 * claims a valid file is "the wrong type" and never hides a WinAnsi crash
 * behind "Only .docx files are supported".
 */
export function friendlyConversionError(e: unknown, fallback: string): string {
  const msg = e instanceof Error ? e.message : String(e ?? "");
  if (/WinAnsi cannot encode/i.test(msg) || /cannot encode/i.test(msg)) {
    return "This file contains characters (for example Urdu, Arabic, Chinese or emoji) that the basic PDF writer cannot render. Use “Print / Save as PDF” for the styled version instead — it uses your browser's fonts and handles these characters.";
  }
  if (/No password given/i.test(msg) || /PasswordException/i.test(msg)) {
    return "This PDF is password-protected. Enter its password above and try again.";
  }
  if (/Incorrect Password/i.test(msg)) {
    return "The password you entered for this PDF is incorrect.";
  }
  if (/InvalidPDFException|file is empty|size is zero/i.test(msg)) {
    return "This file does not look like a valid PDF — it may be empty or damaged.";
  }
  if (/Could not find file in options/i.test(msg)) {
    return "That file could not be read. It may be empty or not in the expected format.";
  }
  return msg || fallback;
}

export function isPasswordError(e: unknown): boolean {
  const msg = e instanceof Error ? e.message : String(e ?? "");
  return /PasswordException|No password given|Incorrect Password/i.test(msg);
}

// ---------------------------------------------------------------------------
// Tiny XML parser (regex/tokeniser — no DOMParser, so it works in Node too)
// ---------------------------------------------------------------------------

export interface XmlNode {
  tag: string;
  attrs: Record<string, string>;
  children: XmlNode[];
  text?: string; // only for #text nodes
}

export function parseXml(xml: string): XmlNode {
  const root: XmlNode = { tag: "#root", attrs: {}, children: [] };
  const stack: XmlNode[] = [root];
  const tagRe = /<(\/?)([A-Za-z0-9_:\-.]+)((?:\s+[A-Za-z0-9_:\-]+\s*=\s*(?:"[^"]*"|'[^']*'))*)\s*(\/?)>/g;
  let last = 0;
  let m: RegExpExecArray | null;
  const attrRe = /([A-Za-z0-9_:\-]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g;
  while ((m = tagRe.exec(xml)) !== null) {
    const textPart = xml.slice(last, m.index);
    if (textPart) {
      stack[stack.length - 1].children.push({ tag: "#text", attrs: {}, children: [], text: decodeXmlEntities(textPart) });
    }
    last = tagRe.lastIndex;
    const [, closing, name, attrStr, selfClosing] = m;
    if (name.startsWith("?") || name.startsWith("!")) continue; // <?xml ...?>, <!-- -->, <!DOCTYPE>
    if (closing) {
      // Pop back to the matching open tag (tolerant of mismatches).
      for (let i = stack.length - 1; i > 0; i--) {
        if (stack[i].tag === name) { stack.length = i; break; }
      }
      continue;
    }
    const attrs: Record<string, string> = {};
    let am: RegExpExecArray | null;
    while ((am = attrRe.exec(attrStr)) !== null) attrs[am[1]] = decodeXmlEntities(am[2] ?? am[3] ?? "");
    const node: XmlNode = { tag: name, attrs, children: [] };
    stack[stack.length - 1].children.push(node);
    if (!selfClosing) stack.push(node);
  }
  const tail = xml.slice(last);
  if (tail) stack[stack.length - 1].children.push({ tag: "#text", attrs: {}, children: [], text: decodeXmlEntities(tail) });
  return root;
}

export function xmlChildren(node: XmlNode, tag: string): XmlNode[] {
  return node.children.filter((c) => c.tag === tag);
}

export function xmlDescendants(node: XmlNode, tag: string, out: XmlNode[] = []): XmlNode[] {
  for (const c of node.children) {
    if (c.tag === tag) out.push(c);
    xmlDescendants(c, tag, out);
  }
  return out;
}

export function xmlText(node: XmlNode): string {
  let s = "";
  for (const c of node.children) {
    if (c.tag === "#text") s += c.text ?? "";
    else s += xmlText(c);
  }
  return s;
}

export function xmlFirst(node: XmlNode, tag: string): XmlNode | undefined {
  return node.children.find((c) => c.tag === tag);
}

export function bytesToBase64(bytes: Uint8Array): string {
  if (typeof Buffer !== "undefined") return Buffer.from(bytes).toString("base64");
  let bin = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    bin += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(bin);
}

export function base64ToBytes(b64: string): Uint8Array {
  if (typeof Buffer !== "undefined") return new Uint8Array(Buffer.from(b64, "base64"));
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

// ---------------------------------------------------------------------------
// Styled PDF extraction: size, colour, position, columns, links, images
// ---------------------------------------------------------------------------

export interface StyledTextRun {
  str: string;
  fontSize: number;
  color?: string; // "#RRGGBB"
  x: number;
  y: number; // top-down points (0 = top of page)
  pdfY: number; // bottom-up points (PDF coords, for annotation matching)
  width: number;
  link?: string;
  /** Bold/italic are NOT available from pdfjs (see module header). */
  bold?: boolean;
  italic?: boolean;
}

export interface StyledLine {
  runs: StyledTextRun[];
  text: string;
  x: number;
  y: number;
  fontSize: number; // max run size on the line
  color?: string; // colour of the first run, if any
  isHeading: boolean;
  link?: string;
  /** Visual row (y-group) this line segment belongs to. Segments of one
   * row share a rowKey: a wide-gap split and table cells are segments of
   * the same row. */
  rowKey: number;
  /** Segment index within the row (0 = leftmost). */
  segment: number;
}

export interface PdfImageData {
  name: string;
  width: number;
  height: number;
  /** Raw RGBA pixels (width*height*4). Convert with pdfImageToDataUrl(). */
  data: Uint8ClampedArray;
}

export interface StyledPage {
  lines: StyledLine[];
  width: number;
  height: number;
  medianSize: number;
  images: PdfImageData[];
  hasText: boolean;
  /** Plain text of the page (lines joined), for legacy callers. */
  text: string;
}

/** Browser canvas -> PNG data URL for a pdfjs image object. */
export function pdfImageToDataUrl(img: PdfImageData): string | null {
  if (typeof document === "undefined") return null;
  try {
    const canvas = document.createElement("canvas");
    canvas.width = img.width;
    canvas.height = img.height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.putImageData(new ImageData(new Uint8ClampedArray(img.data), img.width, img.height), 0, 0);
    return canvas.toDataURL("image/png");
  } catch {
    return null;
  }
}

function cleanExtractedText(s: string): string {
  // pdfjs can emit NUL separators inside otherwise fine text (B-09).
  // Arabic/PDF text is NOT reordered here: a correctly built PDF already
  // carries logical order, and blindly reversing would corrupt it.
  return s.replace(/\u0000/g, "");
}

function median(nums: number[]): number {
  if (!nums.length) return 12;
  const s = [...nums].sort((a, b) => a - b);
  return s[Math.floor(s.length / 2)];
}

/**
 * Extract styled text per page. Colours come from an operator-list walk
 * (setFillRGBColor / setFont / showText, zipped in order with the
 * non-whitespace text items — verified 17/17 on the QA fixture).
 * Wide gaps inside one visual line are split into separate lines so a
 * two-column line no longer merges (B-15). Heading = size-based, never
 * guessed from the words alone (B-03).
 */
export async function extractStyledPages(bytes: Uint8Array, password?: string): Promise<StyledPage[]> {
  const { doc, numPages } = await openPdfjs(bytes, password);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const pdfjs = await import("pdfjs-dist").catch(() => null as any);
  const OPS = pdfjs?.OPS as Record<string, number> | undefined;
  const opName = (code: number): string => {
    if (!OPS) return String(code);
    for (const [k, v] of Object.entries(OPS)) if (v === code) return k;
    return String(code);
  };
  const out: StyledPage[] = [];
  for (let p = 1; p <= numPages; p++) {
    const page = await doc.getPage(p);
    const vp = page.getViewport({ scale: 1 });
    const tc = await page.getTextContent();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rawItems = (tc.items as any[]).filter((it) => it.str && String(it.str).trim() !== "");
    // --- operator walk: colour + size per showText, in order ---
    const showOps: { color?: string; fontSize: number }[] = [];
    let curColor: string | undefined;
    let curSize = 12;
    try {
      const ops = await page.getOperatorList();
      for (let i = 0; i < ops.fnArray.length; i++) {
        const name = opName(ops.fnArray[i] as number);
        const args = ops.argsArray[i] as unknown[];
        if (name === "setFillRGBColor") {
          if (typeof args[0] === "string") curColor = normalizeColor(args[0] as string);
          else if (typeof args[0] === "number") {
            const r = Math.round((args[0] as number) * 255);
            const g = Math.round((args[1] as number) * 255);
            const b = Math.round((args[2] as number) * 255);
            curColor = `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`.toUpperCase();
          }
        } else if (name === "setFillGray" && typeof args[0] === "number") {
          const v = Math.round((args[0] as number) * 255);
          curColor = `#${v.toString(16).padStart(2, "0")}${v.toString(16).padStart(2, "0")}${v.toString(16).padStart(2, "0")}`.toUpperCase();
        } else if (name === "setFont" && typeof args[1] === "number") {
          curSize = args[1] as number;
        } else if (name === "showText") {
          showOps.push({ color: curColor, fontSize: curSize });
        }
      }
    } catch {
      // Operator walk is best-effort; text items still carry size/position.
    }
    // --- link annotations ---
    let links: { url: string; rect: number[] }[] = [];
    try {
      const annots = await page.getAnnotations();
      links = annots
        .filter((a: { subtype?: string; url?: string }) => a.subtype === "Link" && a.url)
        .map((a: { url: string; rect: number[] }) => ({ url: a.url, rect: a.rect }));
    } catch { /* no annotations */ }
    // --- build runs ---
    const runs: StyledTextRun[] = rawItems.map((it, idx) => {
      const size = Math.hypot(it.transform[2] as number, it.transform[3] as number) || 11;
      const op = showOps.length === rawItems.length ? showOps[idx] : showOps[Math.min(idx, showOps.length - 1)];
      const x = it.transform[4] as number;
      const pdfY = it.transform[5] as number;
      return {
        str: cleanExtractedText(String(it.str)),
        fontSize: op?.fontSize && Math.abs(op.fontSize - size) < 0.5 ? op.fontSize : size,
        color: op?.color,
        x,
        y: vp.height - pdfY - size,
        pdfY,
        width: (it.width as number) || String(it.str).length * size * 0.5,
      };
    });
    // Attach links by rectangle overlap.
    for (const run of runs) {
      for (const l of links) {
        const [x1, y1, x2, y2] = l.rect;
        if (run.x + run.width >= x1 - 2 && run.x <= x2 + 2 && run.pdfY >= y1 - 4 && run.pdfY <= y2 + 4) {
          run.link = l.url;
          break;
        }
      }
    }
    // --- group into lines by y, then split wide column gaps ---
    const sorted = [...runs].sort((a, b) => b.pdfY - a.pdfY || a.x - b.x);
    const lineGroups: StyledTextRun[][] = [];
    for (const run of sorted) {
      const g = lineGroups[lineGroups.length - 1];
      if (g && Math.abs(run.pdfY - g[0].pdfY) <= Math.max(2.5, g[0].fontSize * 0.25)) g.push(run);
      else lineGroups.push([run]);
    }
    const lines: StyledLine[] = [];
    let rowKey = 0;
    for (const g of lineGroups) {
      g.sort((a, b) => a.x - b.x);
      // Split on gaps that look like a column gutter, not a word space.
      // Segments keep the row's rowKey so table detection can still see
      // that "Name | Age | City" was one visual row (B-07/B-15).
      let seg: StyledTextRun[] = [g[0]];
      let segment = 0;
      const flush = (s: StyledTextRun[]) => {
        if (!s.length) return;
        const text = s.map((r) => r.str).join(" ").replace(/\s+/g, " ").trim();
        if (text) {
          lines.push({
            runs: s,
            text,
            x: s[0].x,
            y: Math.min(...s.map((r) => r.y)),
            fontSize: Math.max(...s.map((r) => r.fontSize)),
            color: s[0].color,
            isHeading: false,
            link: s.find((r) => r.link)?.link,
            rowKey,
            segment,
          });
          segment++;
        }
      };
      for (let i = 1; i < g.length; i++) {
        const prev = g[i - 1];
        const gap = g[i].x - (prev.x + prev.width);
        if (gap > Math.max(45, prev.fontSize * 3.5)) { flush(seg); seg = [g[i]]; }
        else seg.push(g[i]);
      }
      flush(seg);
      rowKey++;
    }
    // Reading order: top to bottom, left to right within a row.
    lines.sort((a, b) => a.y - b.y || a.x - b.x);
    const med = median(lines.map((l) => l.fontSize));
    lines.forEach((l, i) => {
      const t = l.text.trim();
      l.isHeading =
        l.fontSize >= 1.4 * med &&
        l.fontSize >= 14 &&
        t.length <= 90 &&
        !/[.!?,:;]$/.test(t) &&
        (l.fontSize >= 1.5 * med || i <= 1);
    });
    // --- images on this page (best effort, 1.5 s cap per image) ---
    const images: PdfImageData[] = [];
    try {
      const ops = await page.getOperatorList();
      const names = new Set<string>();
      for (let i = 0; i < ops.fnArray.length; i++) {
        if (opName(ops.fnArray[i] as number) === "paintImageXObject") {
          const a = ops.argsArray[i] as unknown[];
          if (typeof a[0] === "string") names.add(a[0] as string);
        }
      }
      for (const name of names) {
        try {
          const img = await Promise.race([
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            new Promise<any>((resolve) => { try { page.objs.get(name, (o: unknown) => resolve(o)); } catch { resolve(null); } }),
            new Promise<null>((resolve) => setTimeout(() => resolve(null), 1500)),
          ]);
          if (img && img.width && img.height && img.data) {
            images.push({ name, width: img.width, height: img.height, data: img.data as Uint8ClampedArray });
          }
        } catch { /* skip this image */ }
      }
    } catch { /* images are optional */ }
    out.push({
      lines,
      width: vp.width,
      height: vp.height,
      medianSize: med,
      images,
      hasText: lines.length > 0,
      text: lines.map((l) => l.text).join("\n"),
    });
  }
  return out;
}

/** Extract the visible text of each page, one string per page. */
export async function extractPagesText(bytes: Uint8Array, password?: string): Promise<string[]> {
  const pages = await extractStyledPages(bytes, password);
  return pages.map((p) => p.text.trim());
}

export interface TextItem {
  str: string;
  /** PDF coordinates (origin bottom-left), in points. */
  x: number;
  y: number;
  width: number;
  height: number;
  fontSize: number;
}

/** Extract positioned text items per page (PDF point coordinates). */
export async function extractPageItems(bytes: Uint8Array, password?: string): Promise<{ items: TextItem[]; width: number; height: number }[]> {
  const { doc, numPages } = await openPdfjs(bytes, password);
  const out: { items: TextItem[]; width: number; height: number }[] = [];
  for (let i = 1; i <= numPages; i++) {
    const page = await doc.getPage(i);
    const vp = page.getViewport({ scale: 1 });
    const tc = await page.getTextContent();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const raw = tc.items as any[];
    const items: TextItem[] = raw
      .filter((it) => it.str && it.str.trim())
      .map((it) => {
        const fontSize = Math.hypot(it.transform[2], it.transform[3]) || 11;
        return {
          str: cleanExtractedText(it.str as string),
          x: it.transform[4] as number,
          y: vp.height - (it.transform[5] as number) - fontSize,
          width: (it.width as number) || (it.str as string).length * fontSize * 0.5,
          height: (it.height as number) || fontSize,
          fontSize,
        };
      });
    out.push({ items, width: vp.width, height: vp.height });
  }
  return out;
}

/** One visual row of a PDF page: segments of a single y-group. */
export interface VisualRow {
  /** Per-segment runs (one segment = one table cell, if this is a table row). */
  cells: StyledTextRun[][];
  texts: string[];
  lines: StyledLine[];
  /** True when this row is part of a run of >=2 consecutive rows with the
   * same segment count >= 2 AND aligned segment starts — i.e. a real
   * table, not two-column prose (lone 2-segment row, or rows whose
   * second segments start at different x). */
  isTable: boolean;
}

/** Group a styled page's lines into visual rows (B-07/B-15). */
export function visualRows(page: StyledPage): VisualRow[] {
  const byRow = new Map<number, StyledLine[]>();
  for (const l of page.lines) {
    const arr = byRow.get(l.rowKey) ?? [];
    arr.push(l);
    byRow.set(l.rowKey, arr);
  }
  const rows: VisualRow[] = [...byRow.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([, lines]) => {
      const sorted = [...lines].sort((a, b) => a.segment - b.segment);
      return {
        cells: sorted.map((l) => l.runs),
        texts: sorted.map((l) => l.text),
        lines: sorted,
        isTable: false,
      };
    });
  // A table is >=2 consecutive rows with the same segment count >= 2 and
  // segment starts aligned within 12pt (real columns line up; two prose
  // lines with wide gaps do not).
  const aligned = (a: VisualRow, b: VisualRow): boolean => {
    if (a.cells.length !== b.cells.length || a.cells.length < 2) return false;
    return a.lines.every((l, i) => Math.abs(l.x - b.lines[i].x) <= 12);
  };
  for (let i = 0; i < rows.length; i++) {
    if (rows[i].cells.length < 2) continue;
    const prev = i > 0 && aligned(rows[i - 1], rows[i]);
    const next = i < rows.length - 1 && aligned(rows[i], rows[i + 1]);
    if (prev || next) rows[i].isTable = true;
  }
  return rows;
}

/**
 * Split styled lines into table rows using the visual-row grouping (B-07).
 * A row that the PDF stores as one text run stays one cell — splitting it
 * by whitespace would be guessing, and the caller is told about it.
 */
export function extractTableRows(page: StyledPage): { rows: string[][]; columnsDetected: boolean; unsplitRows: number } {
  const vrows = visualRows(page);
  const columnsDetected = vrows.some((r) => r.isTable);
  let unsplit = 0;
  const rows = vrows.map((r) => {
    if (r.isTable) return r.texts;
    // A lone multi-segment row is prose (e.g. a two-column line), not a
    // table: keep it in one cell instead of wrongly splitting it (B-07).
    if (columnsDetected && r.cells.length === 1) unsplit++;
    return [r.texts.join(" ")];
  });
  return { rows, columnsDetected, unsplitRows: unsplit };
}

/**
 * Heading heuristic for PLAIN text only (no style info).
 * Plain words alone cannot tell a heading from a table row — "Name Age
 * City" is title-case, short and punctuation-free, exactly like a heading
 * (B-03). So without size evidence this only trusts ALL-CAPS lines, which
 * table rows rarely are. Callers with styled data must use
 * StyledLine.isHeading (size-based) instead.
 */
export function looksLikeHeading(line: string, opts?: { fontSize?: number; medianSize?: number }): boolean {
  const t = line.trim();
  if (!t || t.length > 80) return false;
  if (/[.!?,:;]$/.test(t)) return false;
  if (opts?.fontSize && opts?.medianSize) {
    return opts.fontSize >= 1.4 * opts.medianSize && opts.fontSize >= 14;
  }
  if (t === t.toUpperCase() && /[A-Z]/.test(t) && t.split(/\s+/).length <= 8) return true;
  return false;
}

export function splitLines(text: string): string[] {
  return text.split("\n").map((l) => l.trimEnd()).filter((l) => l.trim().length > 0);
}

// ---------------------------------------------------------------------------
// Unicode fonts for PDF output (B-01)
// pdf-lib can only embed custom TTFs with fontkit, which is NOT a project
// dependency (adding it would change package.json, out of scope). So fontkit
// is loaded at runtime from the jsDelivr CDN (+esm build) and the fonts are
// fetched on demand from the google/fonts repo (OFL-licensed Noto fonts).
// If the CDN is unreachable, rendering falls back to a plain error telling
// the user to use "Print / Save as PDF" — never a WinAnsi crash, never a
// misleading "wrong file type" message. Emoji has no embeddable text font
// in pdf-lib, so emoji in the basic PDF path is reported plainly too.
// ---------------------------------------------------------------------------

export const FONTKIT_CDN_URL = "https://cdn.jsdelivr.net/npm/fontkit@2.0.4/+esm";
const NOTO_BASE = "https://github.com/googlefonts/noto-fonts/raw/main/hinted/ttf";
export const UNICODE_FONT_URLS: Record<string, { regular: string; bold: string }> = {
  latin: { regular: `${NOTO_BASE}/NotoSans/NotoSans-Regular.ttf`, bold: `${NOTO_BASE}/NotoSans/NotoSans-Bold.ttf` },
  arabic: { regular: `${NOTO_BASE}/NotoSansArabic/NotoSansArabic-Regular.ttf`, bold: `${NOTO_BASE}/NotoSansArabic/NotoSansArabic-Bold.ttf` },
  devanagari: { regular: `${NOTO_BASE}/NotoSansDevanagari/NotoSansDevanagari-Regular.ttf`, bold: `${NOTO_BASE}/NotoSansDevanagari/NotoSansDevanagari-Bold.ttf` },
  // CJK: the hinted NotoSansSC TTF path 404s; the variable font in
  // google/fonts works (verified 200, 17.7 MB — fetched only on demand).
  cjk: { regular: "https://github.com/google/fonts/raw/main/ofl/notosanssc/NotoSansSC%5Bwght%5D.ttf", bold: "https://github.com/google/fonts/raw/main/ofl/notosanssc/NotoSansSC%5Bwght%5D.ttf" },
};

export type ScriptKind = "latin" | "arabic" | "devanagari" | "cjk" | "emoji" | "other";

export function scriptOfChar(ch: string): ScriptKind {
  const cp = ch.codePointAt(0) ?? 0;
  if (cp >= 0x1f300 && cp <= 0x1faff) return "emoji";
  if (cp >= 0x2600 && cp <= 0x27bf) return "emoji";
  if (cp >= 0xfe00 && cp <= 0xfe0f) return "emoji";
  if (cp >= 0x0600 && cp <= 0x06ff) return "arabic";
  if (cp >= 0x0750 && cp <= 0x077f) return "arabic";
  if (cp >= 0x08a0 && cp <= 0x08ff) return "arabic";
  if (cp >= 0xfb50 && cp <= 0xfdff) return "arabic";
  if (cp >= 0xfe70 && cp <= 0xfeff) return "arabic";
  if (cp >= 0x0900 && cp <= 0x097f) return "devanagari";
  if ((cp >= 0x4e00 && cp <= 0x9fff) || (cp >= 0x3040 && cp <= 0x30ff) || (cp >= 0xac00 && cp <= 0xd7af)) return "cjk";
  if (cp < 128 || (cp >= 0x00a0 && cp <= 0x024f) || (cp >= 0x0370 && cp <= 0x03ff) || (cp >= 0x0400 && cp <= 0x04ff)) return "latin";
  return "other";
}

export function scriptsInText(text: string): Set<ScriptKind> {
  const out = new Set<ScriptKind>();
  for (const ch of text) out.add(scriptOfChar(ch));
  return out;
}

/** True when every character is encodable in WinAnsi (plain Helvetica). */
export function isWinAnsiSafe(text: string): boolean {
  for (const ch of text) {
    const cp = ch.codePointAt(0) ?? 0;
    if (cp > 255 && !(cp >= 0x2010 && cp <= 0x2027) && cp !== 0x20ac) return false;
    if (cp >= 0x80 && cp <= 0x9f) return false;
  }
  return true;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type FontkitLike = { create: (buf: Uint8Array) => any };

export interface FontLoadOptions {
  /** Test hook / preloaded fontkit (production loads it from the CDN). */
  fontkitModule?: FontkitLike;
  /** Test hook / custom font fetcher (production fetches from the CDN). */
  fetchFont?: (url: string) => Promise<Uint8Array>;
}

let cachedFontkit: FontkitLike | null = null;
let fontkitFailed = false;
const fontBytesCache = new Map<string, Uint8Array>();

async function loadFontkit(opts: FontLoadOptions): Promise<FontkitLike> {
  if (opts.fontkitModule) return opts.fontkitModule;
  if (cachedFontkit) return cachedFontkit;
  if (fontkitFailed) throw new Error("FONTKIT_UNAVAILABLE");
  try {
    // webpackIgnore: the URL is a runtime CDN import, not a bundle import.
    const mod = await import(/* webpackIgnore: true */ FONTKIT_CDN_URL);
    const fk = (mod.default ?? mod) as FontkitLike;
    if (typeof fk.create !== "function") throw new Error("bad fontkit");
    cachedFontkit = fk;
    return fk;
  } catch {
    fontkitFailed = true;
    throw new Error("FONTKIT_UNAVAILABLE");
  }
}

async function fetchFontBytes(url: string, opts: FontLoadOptions): Promise<Uint8Array> {
  if (fontBytesCache.has(url)) return fontBytesCache.get(url)!;
  const bytes = opts.fetchFont
    ? await opts.fetchFont(url)
    : new Uint8Array(await (await fetch(url)).arrayBuffer());
  fontBytesCache.set(url, bytes);
  return bytes;
}

// ---------------------------------------------------------------------------
// Styled blocks — the common model for Word / PPTX / HTML / PDF -> PDF
// ---------------------------------------------------------------------------

export interface StyledRun {
  text: string;
  fontSize?: number;
  color?: string; // "#RRGGBB"
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  fontName?: string;
  link?: string;
}

export interface StyledBlock {
  type: "heading" | "paragraph" | "list" | "table" | "image" | "spacer";
  level?: number; // heading 1-3, list indent level
  runs?: StyledRun[];
  /** Table rows; each cell is a list of runs. */
  rows?: StyledRun[][][];
  /** Column widths as fractions of the text width (table only). */
  colWidths?: number[];
  listMarker?: string; // "•" or "1."
  align?: "left" | "center" | "right";
  imageDataUrl?: string;
  imageWidth?: number;
  imageHeight?: number;
}

export function plainTextOfRuns(runs: StyledRun[] | undefined): string {
  return (runs ?? []).map((r) => r.text).join("");
}

function wrapSegments(
  segs: { text: string; font: PDFFont; size: number }[],
  maxWidth: number,
): { text: string; font: PDFFont; size: number; color?: string; underline?: boolean }[][] {
  // Split segments into words, keeping script/font boundaries, then wrap.
  type Word = { text: string; font: PDFFont; size: number; color?: string; underline?: boolean; width: number };
  const words: Word[] = [];
  for (const s of segs as (typeof segs)[number][]) {
    const parts = String(s.text).split(/(\s+)/).filter((p) => p.length > 0);
    for (const p of parts) {
      if (/^\s+$/.test(p)) continue;
      words.push({ ...s, text: p, width: s.font.widthOfTextAtSize(p, s.size) } as Word);
    }
  }
  const spaceW = (font: PDFFont, size: number) => font.widthOfTextAtSize(" ", size);
  const lines: Word[][] = [];
  let cur: Word[] = [];
  let curW = 0;
  for (const w of words) {
    const add = cur.length ? spaceW(w.font, w.size) + w.width : w.width;
    if (cur.length && curW + add > maxWidth) {
      lines.push(cur);
      cur = [w];
      curW = w.width;
    } else {
      cur.push(w);
      curW += add;
    }
  }
  if (cur.length) lines.push(cur);
  if (!lines.length) lines.push([]);
  return lines as unknown as { text: string; font: PDFFont; size: number; color?: string; underline?: boolean }[][];
}

interface FontSet {
  helvetica: PDFFont;
  helveticaBold: PDFFont;
  helveticaOblique: PDFFont;
  helveticaBoldOblique: PDFFont;
  /** script -> { regular, bold } embedded unicode fonts */
  unicode: Map<string, { regular: PDFFont; bold: PDFFont }>;
}

function pickFont(fonts: FontSet, ch: string, bold: boolean, italic: boolean): PDFFont {
  const script = scriptOfChar(ch);
  const uni = fonts.unicode.get(script);
  if (uni) return bold ? uni.bold : uni.regular;
  if (bold && italic) return fonts.helveticaBoldOblique;
  if (bold) return fonts.helveticaBold;
  if (italic) return fonts.helveticaOblique;
  return fonts.helvetica;
}

async function buildFontSet(
  doc: PDFDocument,
  blocks: StyledBlock[],
  opts: FontLoadOptions,
): Promise<FontSet> {
  const fonts: FontSet = {
    helvetica: await doc.embedFont(StandardFonts.Helvetica),
    helveticaBold: await doc.embedFont(StandardFonts.HelveticaBold),
    helveticaOblique: await doc.embedFont(StandardFonts.HelveticaOblique),
    helveticaBoldOblique: await doc.embedFont(StandardFonts.HelveticaBoldOblique),
    unicode: new Map(),
  };
  const allText = blocks.map((b) => plainTextOfRuns(b.runs) + (b.rows ?? []).flat(2).map((r) => r.text).join("")).join("\n");
  const scripts = scriptsInText(allText);
  const needsUnicode = [...scripts].filter((s) => s === "arabic" || s === "devanagari" || s === "cjk");
  const unsupported: string[] = [];
  for (const ch of allText) {
    const s = scriptOfChar(ch);
    if ((s === "emoji" || s === "other") && !unsupported.includes(ch)) unsupported.push(ch);
  }
  if (unsupported.length) {
    throw new Error(
      `UNSUPPORTED_CHARS:${unsupported.slice(0, 8).join("")} — these characters (${unsupported.slice(0, 8).join(" ")}) cannot be drawn in the basic downloaded PDF because no embeddable font covers them. Use “Print / Save as PDF” for the styled version, which uses your browser's fonts.`,
    );
  }
  if (!needsUnicode.length) return fonts;
  let fontkit: FontkitLike;
  try {
    fontkit = await loadFontkit(opts);
  } catch {
    const names = [...needsUnicode].join(", ");
    throw new Error(
      `UNICODE_FONT_UNAVAILABLE — this document uses ${names} text, which needs a Unicode font downloaded from the internet, and that download failed (you may be offline). Use “Print / Save as PDF” for the styled version, which uses your browser's fonts.`,
    );
  }
  doc.registerFontkit(fontkit as never);
  for (const script of needsUnicode) {
    const urls = UNICODE_FONT_URLS[script];
    if (!urls) continue;
    try {
      const [reg, bold] = await Promise.all([
        doc.embedFont(await fetchFontBytes(urls.regular, opts)),
        doc.embedFont(await fetchFontBytes(urls.bold, opts)),
      ]);
      fonts.unicode.set(script, { regular: reg, bold });
    } catch {
      throw new Error(
        `UNICODE_FONT_UNAVAILABLE — the ${script} font could not be downloaded. Use “Print / Save as PDF” for the styled version, which uses your browser's fonts.`,
      );
    }
  }
  return fonts;
}

function segmentsForRuns(fonts: FontSet, runs: StyledRun[], defaultSize: number): { text: string; font: PDFFont; size: number; color?: string; underline?: boolean }[] {
  const segs: { text: string; font: PDFFont; size: number; color?: string; underline?: boolean }[] = [];
  for (const run of runs) {
    const size = run.fontSize && run.fontSize > 0 ? run.fontSize : defaultSize;
    // Split the run by script so e.g. an Arabic word inside Latin text
    // gets the Arabic font while the rest keeps Helvetica.
    let cur = "";
    let curScript: ScriptKind | null = null;
    const flush = () => {
      if (!cur) return;
      const font = pickFont(fonts, cur[0], !!run.bold, !!run.italic);
      segs.push({ text: cur, font, size, color: run.color, underline: run.underline });
      cur = "";
    };
    for (const ch of run.text) {
      const s = scriptOfChar(ch);
      if (curScript === null) curScript = s;
      if (s !== curScript) { flush(); curScript = s; }
      cur += ch;
    }
    flush();
  }
  return segs;
}

/**
 * Render styled blocks to an A4 PDF. Preserves per-run size/colour/
 * bold/italic/underline, headings, lists, tables and (for PNG/JPEG data
 * URLs) images. Reflows onto A4 — exact original pagination is not kept.
 */
export async function renderStyledBlocksToPdf(
  blocks: StyledBlock[],
  opts?: { title?: string } & FontLoadOptions,
): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  if (opts?.title) doc.setTitle(opts.title);
  const fonts = await buildFontSet(doc, blocks, opts ?? {});
  const margin = 50;
  const pageW = 595.28;
  const pageH = 841.89;
  const maxW = pageW - margin * 2;
  let page: PDFPage = doc.addPage([pageW, pageH]);
  let y = pageH - margin;
  const newPage = () => { page = doc.addPage([pageW, pageH]); y = pageH - margin; };
  const ensure = (needed: number) => { if (y - needed < margin) newPage(); };

  const drawWrapped = (runs: StyledRun[], defaultSize: number, opts2?: { indent?: number; align?: string }) => {
    const indent = opts2?.indent ?? 0;
    const segs = segmentsForRuns(fonts, runs, defaultSize);
    const lines = wrapSegments(segs, maxW - indent);
    const lineH = defaultSize * 1.45;
    for (const line of lines) {
      ensure(lineH);
      let x = margin + indent;
      const words = line as unknown as { text: string; font: PDFFont; size: number; color?: string; underline?: boolean }[];
      words.forEach((w, wi) => {
        const c = w.color ? hexToRgb(w.color) : null;
        // Draw the word WITH its trailing space glyph (except at line end):
        // without it, extracted/copied text runs words together.
        const drawn = wi < words.length - 1 ? `${w.text} ` : w.text;
        page.drawText(drawn, { x, y: y - w.size, size: w.size, font: w.font, color: c ? rgb(c.r, c.g, c.b) : rgb(0.15, 0.15, 0.15) });
        if (w.underline) {
          const wd = w.font.widthOfTextAtSize(w.text, w.size);
          page.drawLine({ start: { x, y: y - w.size - 1.5 }, end: { x: x + wd, y: y - w.size - 1.5 }, thickness: 0.7, color: c ? rgb(c.r, c.g, c.b) : rgb(0.15, 0.15, 0.15) });
        }
        x += w.font.widthOfTextAtSize(w.text, w.size) + w.font.widthOfTextAtSize(" ", w.size);
      });
      y -= lineH;
    }
  };

  const drawTable = (block: StyledBlock) => {
    const rows = block.rows ?? [];
    if (!rows.length) return;
    const cols = Math.max(...rows.map((r) => r.length));
    const widths = block.colWidths && block.colWidths.length === cols
      ? block.colWidths
      : Array.from({ length: cols }, () => 1 / cols);
    const cellPad = 4;
    for (let ri = 0; ri < rows.length; ri++) {
      const row = rows[ri];
      const isHeader = ri === 0;
      // Wrap every cell first to learn the row height.
      const cellLines: { text: string; font: PDFFont; size: number; color?: string; underline?: boolean }[][][] = [];
      let maxLines = 1;
      for (let ci = 0; ci < cols; ci++) {
        const cellRuns = (row[ci] ?? []).map((r) => ({ ...r, bold: r.bold ?? isHeader }));
        const segs = segmentsForRuns(fonts, cellRuns, 10);
        const wrapped = wrapSegments(segs, maxW * widths[ci] - cellPad * 2);
        cellLines.push(wrapped as unknown as { text: string; font: PDFFont; size: number; color?: string; underline?: boolean }[][]);
        maxLines = Math.max(maxLines, wrapped.length);
      }
      const rowH = maxLines * 10 * 1.45 + cellPad * 2;
      ensure(rowH + 2);
      let x = margin;
      for (let ci = 0; ci < cols; ci++) {
        const cw = maxW * widths[ci];
        page.drawRectangle({ x, y: y - rowH, width: cw, height: rowH, borderColor: rgb(0.8, 0.8, 0.8), borderWidth: 0.5, color: isHeader ? rgb(0.95, 0.95, 0.95) : undefined });
        let cy = y - cellPad - 10;
        for (const line of cellLines[ci]) {
          let cx = x + cellPad;
          line.forEach((w, wi) => {
            const c = w.color ? hexToRgb(w.color) : null;
            const drawn = wi < line.length - 1 ? `${w.text} ` : w.text;
            page.drawText(drawn, { x: cx, y: cy, size: w.size, font: w.font, color: c ? rgb(c.r, c.g, c.b) : rgb(0.15, 0.15, 0.15) });
            cx += w.font.widthOfTextAtSize(w.text, w.size) + w.font.widthOfTextAtSize(" ", w.size);
          });
          cy -= 10 * 1.45;
        }
        x += cw;
      }
      y -= rowH;
    }
    y -= 6;
  };

  for (const block of blocks) {
    if (block.type === "spacer") { y -= 8; continue; }
    if (block.type === "image") {
      if (!block.imageDataUrl) continue;
      try {
        const m = block.imageDataUrl.match(/^data:(image\/(png|jpe?g));base64,(.+)$/);
        if (!m) continue;
        const bytes = base64ToBytes(m[3]);
        const img = m[2] === "png" ? await doc.embedPng(bytes) : await doc.embedJpg(bytes);
        const availW = Math.min(maxW, block.imageWidth ?? img.width);
        const scale = Math.min(1, availW / img.width, 300 / img.height);
        const dw = img.width * scale;
        const dh = img.height * scale;
        ensure(dh + 6);
        page.drawImage(img, { x: margin, y: y - dh, width: dw, height: dh });
        y -= dh + 6;
      } catch { /* image is optional in the basic PDF */ }
      continue;
    }
    if (block.type === "table") { drawTable(block); continue; }
    if (block.type === "heading") {
      const size = block.level === 1 ? 20 : block.level === 2 ? 16 : 13.5;
      const runs = (block.runs ?? []).map((r) => ({ ...r, bold: true, fontSize: r.fontSize ?? size }));
      y -= 4;
      drawWrapped(runs, size);
      y -= 4;
      continue;
    }
    if (block.type === "list") {
      const marker = block.listMarker ?? "•";
      const indent = 18;
      const runs: StyledRun[] = [{ text: `${marker}  `, fontSize: 11 }, ...(block.runs ?? [])];
      drawWrapped(runs, 11, { indent: 0 });
      void indent;
      continue;
    }
    drawWrapped(block.runs ?? [], 11);
    y -= 2;
  }
  return doc.save();
}

export interface TextPdfPage {
  heading?: string;
  lines: string[];
}

/**
 * Render plain-text pages into an A4 PDF. Kept for compatibility; now
 * delegates to the styled renderer so non-Latin text goes through the
 * Unicode-font path instead of crashing (B-01). Headings passed via
 * `heading` are rendered at heading size (B-10).
 */
export async function renderTextPagesToPdf(
  pages: TextPdfPage[],
  opts?: { title?: string; fontSize?: number } & FontLoadOptions,
): Promise<Uint8Array> {
  const blocks: StyledBlock[] = [];
  for (const pg of pages) {
    if (pg.heading) blocks.push({ type: "heading", level: 2, runs: [{ text: pg.heading }] });
    for (const line of pg.lines) blocks.push({ type: "paragraph", runs: [{ text: line, fontSize: opts?.fontSize ?? 11 }] });
    blocks.push({ type: "spacer" });
  }
  return renderStyledBlocksToPdf(blocks, opts);
}

/** Strip HTML tags to plain text, keeping line breaks for block elements. */
export function htmlToPlainText(html: string): string {
  // Table cells need a separator or "Alice30" results (B-12).
  const withBreaks = html
    .replace(/<\/(td|th)>/gi, "\t")
    .replace(/<\/(p|div|h[1-6]|li|tr|br|section|article)>/gi, "\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(ul|ol|table)>/gi, "\n");
  let text: string;
  if (typeof DOMParser !== "undefined") {
    const doc = new DOMParser().parseFromString(withBreaks, "text/html");
    text = doc.body.textContent || "";
  } else {
    // No DOM (Node test harness): strip tags with the separators above.
    text = withBreaks.replace(/<[^>]+>/g, "");
    text = decodeXmlEntities(text);
  }
  return text
    .split("\n")
    .map((l) => l.split("\t").map((c) => c.trim()).filter(Boolean).join("\t").trim())
    .filter(Boolean)
    .join("\n");
}

// ---------------------------------------------------------------------------
// Styled blocks <-> HTML (browser print path: the only route that keeps
// full styling + shaping for Arabic/emoji, using the browser's own fonts)
// ---------------------------------------------------------------------------

export function styledBlocksToHtml(blocks: StyledBlock[], title = "Document"): string {
  const runHtml = (r: StyledRun): string => {
    const styles: string[] = [];
    if (r.fontSize) styles.push(`font-size:${r.fontSize}pt`);
    if (r.color) styles.push(`color:${r.color}`);
    if (r.fontName) styles.push(`font-family:${r.fontName},sans-serif`);
    if (r.underline) styles.push("text-decoration:underline");
    let inner = escapeHtml(r.text);
    if (r.bold) inner = `<strong>${inner}</strong>`;
    if (r.italic) inner = `<em>${inner}</em>`;
    if (r.link) return `<a href="${escapeHtml(r.link)}"${styles.length ? ` style="${styles.join(";")}"` : ""}>${inner}</a>`;
    return styles.length ? `<span style="${styles.join(";")}">${inner}</span>` : inner;
  };
  const align = (b: StyledBlock) => (b.align && b.align !== "left" ? ` style="text-align:${b.align}"` : "");
  const parts: string[] = [];
  let inList = false;
  const closeList = () => { if (inList) { parts.push("</ul>"); inList = false; } };
  for (const b of blocks) {
    if (b.type === "heading") {
      closeList();
      const tag = b.level === 1 ? "h1" : b.level === 2 ? "h2" : "h3";
      parts.push(`<${tag}${align(b)}>${(b.runs ?? []).map(runHtml).join("")}</${tag}>`);
    } else if (b.type === "list") {
      if (!inList) { parts.push("<ul>"); inList = true; }
      parts.push(`<li>${(b.runs ?? []).map(runHtml).join("")}</li>`);
    } else if (b.type === "table") {
      closeList();
      const rows = (b.rows ?? []).map((row, ri) => {
        const cells = row.map((cell) => {
          const inner = cell.map(runHtml).join("");
          return ri === 0 ? `<th>${inner}</th>` : `<td>${inner}</td>`;
        }).join("");
        return `<tr>${cells}</tr>`;
      }).join("");
      parts.push(`<table>${rows}</table>`);
    } else if (b.type === "image") {
      closeList();
      if (b.imageDataUrl) parts.push(`<p><img src="${b.imageDataUrl}" style="max-width:100%" alt="" /></p>`);
    } else if (b.type === "paragraph") {
      closeList();
      const txt = (b.runs ?? []).map(runHtml).join("");
      if (txt.trim()) parts.push(`<p${align(b)}>${txt}</p>`);
    }
  }
  closeList();
  return `<!doctype html><html><head><meta charset="utf-8"><title>${escapeHtml(title)}</title><style>
body{font-family:Calibri,Arial,sans-serif;font-size:11pt;color:#262626;margin:40px;line-height:1.45}
h1{font-size:20pt;margin:12px 0 6px}h2{font-size:16pt;margin:10px 0 5px}h3{font-size:13.5pt;margin:8px 0 4px}
p{margin:0 0 6px}table{border-collapse:collapse;margin:8px 0}th,td{border:1px solid #ccc;padding:4px 8px;text-align:left}
a{color:#2563eb}ul{margin:0 0 6px;padding-left:20px}img{max-width:100%}
</style></head><body>${parts.join("\n")}</body></html>`;
}

/** Parse an inline CSS fragment (style="...") for colour / size / family. */
function parseInlineStyle(style: string): { color?: string; fontSize?: number; fontName?: string } {
  const out: { color?: string; fontSize?: number; fontName?: string } = {};
  for (const part of style.split(";")) {
    const [k, v] = part.split(":").map((s) => s?.trim());
    if (!k || !v) continue;
    if (k === "color") out.color = normalizeColor(v) ?? (/^#[0-9a-fA-F]{6}$/.test(v) ? v.toUpperCase() : undefined);
    if (k === "font-size") {
      const m = v.match(/^([\d.]+)(pt|px)?$/);
      if (m) out.fontSize = m[2] === "px" ? Number(m[1]) * 0.75 : Number(m[1]);
    }
    if (k === "font-family") out.fontName = v.split(",")[0].replace(/['"]/g, "").trim();
  }
  return out;
}

/**
 * Convert pasted/uploaded HTML into styled blocks (headings, bold/italic,
 * colours, sizes, lists, tables, links). Browser path uses DOMParser;
 * without a DOM it falls back to plain-text paragraphs.
 */
export function htmlToStyledBlocks(html: string): StyledBlock[] {
  if (typeof DOMParser === "undefined") {
    return splitLines(htmlToPlainText(html)).map((l) => ({ type: "paragraph" as const, runs: [{ text: l }] }));
  }
  const doc = new DOMParser().parseFromString(html, "text/html");
  const blocks: StyledBlock[] = [];
  const runsFrom = (el: Element): StyledRun[] => {
    const runs: StyledRun[] = [];
    const walk = (node: Node, inherited: Partial<StyledRun>) => {
      if (node.nodeType === 3) {
        const t = node.textContent ?? "";
        if (t) runs.push({ text: t, ...inherited });
        return;
      }
      if (node.nodeType !== 1) return;
      const el2 = node as Element;
      const next: Partial<StyledRun> = { ...inherited };
      const tag = el2.tagName.toLowerCase();
      if (tag === "strong" || tag === "b") next.bold = true;
      if (tag === "em" || tag === "i") next.italic = true;
      if (tag === "u") next.underline = true;
      if (tag === "a") next.link = (el2 as HTMLAnchorElement).href || undefined;
      Object.assign(next, parseInlineStyle(el2.getAttribute("style") ?? ""));
      if (tag === "font") {
        const c = el2.getAttribute("color");
        if (c) next.color = normalizeColor(c);
        const s = el2.getAttribute("size");
        if (s) next.fontSize = Number(s) + 8;
        const f = el2.getAttribute("face");
        if (f) next.fontName = f;
      }
      el2.childNodes.forEach((c) => walk(c, next));
    };
    el.childNodes.forEach((c) => walk(c, {}));
    return runs.filter((r) => r.text.trim() !== "" || r.text === " ");
  };
  const walkBlock = (el: Element) => {
    const tag = el.tagName.toLowerCase();
    if (/^h[1-6]$/.test(tag)) {
      blocks.push({ type: "heading", level: Number(tag[1]), runs: runsFrom(el) });
    } else if (tag === "p" || tag === "div" || tag === "section" || tag === "article") {
      if (el.querySelector(":scope > table, :scope > ul, :scope > ol")) {
        Array.from(el.children).forEach((c) => walkBlock(c as Element));
        return;
      }
      const runs = runsFrom(el);
      if (plainTextOfRuns(runs).trim()) blocks.push({ type: "paragraph", runs });
    } else if (tag === "ul" || tag === "ol") {
      el.querySelectorAll(":scope > li").forEach((li, i) => {
        blocks.push({ type: "list", listMarker: tag === "ol" ? `${i + 1}.` : "•", runs: runsFrom(li) });
      });
    } else if (tag === "table") {
      const rows: StyledRun[][][] = [];
      el.querySelectorAll("tr").forEach((tr) => {
        const row: StyledRun[][] = [];
        tr.querySelectorAll("th,td").forEach((cell) => row.push(runsFrom(cell)));
        if (row.length) rows.push(row);
      });
      if (rows.length) blocks.push({ type: "table", rows });
    } else if (tag === "img") {
      const src = (el as HTMLImageElement).src;
      if (src) blocks.push({ type: "image", imageDataUrl: src });
    } else {
      Array.from(el.children).forEach((c) => walkBlock(c as Element));
      if (!el.children.length && el.textContent?.trim()) {
        blocks.push({ type: "paragraph", runs: [{ text: el.textContent }] });
      }
    }
  };
  Array.from(doc.body?.children ?? []).forEach((c) => walkBlock(c as Element));
  if (!blocks.length) {
    return splitLines(htmlToPlainText(html)).map((l) => ({ type: "paragraph" as const, runs: [{ text: l }] }));
  }
  return blocks;
}

// ---------------------------------------------------------------------------
// DOCX parsing (styled): document.xml + rels + media, via the XML parser
// ---------------------------------------------------------------------------

export interface ParsedDocx {
  blocks: StyledBlock[];
  imageCount: number;
  warnings: string[];
}

function docxRunProps(rPr: XmlNode | undefined): Partial<StyledRun> {
  if (!rPr) return {};
  const out: Partial<StyledRun> = {};
  const has = (tag: string) => xmlFirst(rPr, tag) !== undefined;
  if (has("w:b")) out.bold = true;
  if (has("w:i")) out.italic = true;
  const u = xmlFirst(rPr, "w:u");
  if (u && u.attrs["w:val"] !== "none") out.underline = true;
  const color = xmlFirst(rPr, "w:color");
  if (color?.attrs["w:val"]) out.color = normalizeColor(color.attrs["w:val"]);
  const sz = xmlFirst(rPr, "w:sz");
  if (sz?.attrs["w:val"]) out.fontSize = Number(sz.attrs["w:val"]) / 2;
  const fonts = xmlFirst(rPr, "w:rFonts");
  if (fonts?.attrs["w:ascii"]) out.fontName = fonts.attrs["w:ascii"];
  return out;
}

function parseDocxParagraph(p: XmlNode, rels: Map<string, string>, media: Map<string, string>, numbering: Map<string, string>, listCounters: Map<string, number>): StyledBlock | null {
  const pPr = xmlFirst(p, "w:pPr");
  const styleNode = pPr ? xmlFirst(pPr, "w:pStyle") : undefined;
  const style = styleNode?.attrs["w:val"] ?? "";
  const jc = pPr ? xmlFirst(pPr, "w:jc")?.attrs["w:val"] : undefined;
  const align = jc === "center" ? "center" : jc === "right" || jc === "end" ? "right" : "left";
  const runs: StyledRun[] = [];
  let imageDataUrl: string | undefined;
  const walk = (node: XmlNode, link?: string) => {
    for (const c of node.children) {
      if (c.tag === "w:r") {
        const rPr = xmlFirst(c, "w:rPr");
        const props = docxRunProps(rPr);
        for (const inner of c.children) {
          if (inner.tag === "w:t") runs.push({ text: xmlText(inner), ...props, link });
          else if (inner.tag === "w:tab") runs.push({ text: "\t", ...props, link });
          else if (inner.tag === "w:br") runs.push({ text: "\n", ...props, link });
          else if (inner.tag === "w:drawing") {
            const blip = xmlDescendants(inner, "a:blip")[0];
            const embed = blip?.attrs["r:embed"];
            if (embed) {
              const target = rels.get(embed);
              if (target) {
                const key = target.replace(/^word\//, "").replace(/^\//, "");
                const dataUrl = media.get(key) ?? media.get(target);
                if (dataUrl) imageDataUrl = dataUrl;
              }
            }
          }
        }
      } else if (c.tag === "w:hyperlink") {
        const rid = c.attrs["r:id"];
        walk(c, rid ? rels.get(rid) : undefined);
      } else if (c.tag === "w:smartTag" || c.tag === "w:sdt" || c.tag === "w:ins") {
        walk(c, link);
      }
    }
  };
  walk(p);
  if (imageDataUrl && !runs.some((r) => r.text.trim())) {
    return { type: "image", imageDataUrl };
  }
  if (!runs.some((r) => r.text.trim()) && !imageDataUrl) return null;
  const headingLevel = style === "Title" ? 1 : /^Heading([1-3])$/.test(style) ? Number(style.replace("Heading", "")) : 0;
  const numPr = pPr ? xmlFirst(pPr, "w:numPr") : undefined;
  if (headingLevel > 0) return { type: "heading", level: headingLevel, runs, align };
  if (numPr || /^List/.test(style)) {
    const numId = xmlFirst(numPr ?? { tag: "", attrs: {}, children: [] }, "w:numId")?.attrs["w:val"] ?? style;
    const fmt = numbering.get(numId) ?? "bullet";
    let marker = "•";
    if (fmt === "decimal") {
      const n = (listCounters.get(numId) ?? 0) + 1;
      listCounters.set(numId, n);
      marker = `${n}.`;
    }
    const block: StyledBlock = { type: "list", listMarker: marker, runs, align };
    if (imageDataUrl) return block;
    return block;
  }
  return { type: "paragraph", runs, align };
}

/** Parse a .docx (arrayBuffer) into styled blocks — fonts, colours, sizes, headings, lists, tables, links, images. */
export async function parseDocxStyled(arrayBuffer: ArrayBuffer | Uint8Array): Promise<ParsedDocx> {
  const zip = await JSZip.loadAsync(arrayBuffer as never);
  const warnings: string[] = [];
  const rels = new Map<string, string>();
  const relsXml = zip.files["word/_rels/document.xml.rels"];
  if (relsXml) {
    const root = parseXml(await relsXml.async("string"));
    for (const rel of xmlDescendants(root, "Relationship")) {
      rels.set(rel.attrs.Id ?? "", rel.attrs.Target ?? "");
    }
  }
  const media = new Map<string, string>();
  let imageCount = 0;
  for (const [name, file] of Object.entries(zip.files)) {
    if (/^word\/media\//.test(name) && !file.dir) {
      const bytes = new Uint8Array(await file.async("uint8array"));
      const ext = name.split(".").pop()?.toLowerCase() ?? "png";
      const mime = ext === "jpg" || ext === "jpeg" ? "image/jpeg" : ext === "gif" ? "image/gif" : "image/png";
      media.set(name.replace(/^word\//, ""), `data:${mime};base64,${bytesToBase64(bytes)}`);
      media.set(name, `data:${mime};base64,${bytesToBase64(bytes)}`);
      imageCount++;
    }
  }
  const numbering = new Map<string, string>();
  const numberingXml = zip.files["word/numbering.xml"];
  if (numberingXml) {
    try {
      const root = parseXml(await numberingXml.async("string"));
      const abstract = new Map<string, string>();
      for (const a of xmlDescendants(root, "w:abstractNum")) {
        const lvl = xmlFirst(a, "w:lvl");
        const fmt = lvl ? xmlFirst(lvl, "w:numFmt")?.attrs["w:val"] : undefined;
        if (fmt) abstract.set(a.attrs["w:abstractNumId"] ?? "", fmt);
      }
      for (const n of xmlDescendants(root, "w:num")) {
        const abs = xmlFirst(n, "w:abstractNumId")?.attrs["w:val"];
        if (abs && abstract.get(abs)) numbering.set(n.attrs["w:numId"] ?? "", abstract.get(abs)!);
      }
    } catch { /* numbering is optional */ }
  }
  const docXml = zip.files["word/document.xml"];
  if (!docXml) throw new Error("This .docx file has no document.xml — it may be damaged.");
  const root = parseXml(await docXml.async("string"));
  const body = xmlDescendants(root, "w:body")[0];
  if (!body) throw new Error("This .docx file has no document body — it may be damaged.");
  const blocks: StyledBlock[] = [];
  const listCounters = new Map<string, number>();
  for (const child of body.children) {
    if (child.tag === "w:p") {
      const b = parseDocxParagraph(child, rels, media, numbering, listCounters);
      if (b) blocks.push(b);
    } else if (child.tag === "w:tbl") {
      const rows: StyledRun[][][] = [];
      for (const tr of xmlChildren(child, "w:tr")) {
        const row: StyledRun[][] = [];
        for (const tc of xmlChildren(tr, "w:tc")) {
          const cellRuns: StyledRun[] = [];
          const cellPs = xmlDescendants(tc, "w:p");
          cellPs.forEach((cp, i) => {
            const pb = parseDocxParagraph(cp, rels, media, numbering, listCounters);
            if (pb?.runs) {
              if (i > 0) cellRuns.push({ text: "\n" });
              cellRuns.push(...pb.runs);
            }
          });
          row.push(cellRuns);
        }
        if (row.length) rows.push(row);
      }
      if (rows.length) blocks.push({ type: "table", rows });
    }
  }
  if (imageCount === 0 && media.size > 0) warnings.push("Some embedded images could not be matched to the document.");
  return { blocks, imageCount, warnings };
}

// ---------------------------------------------------------------------------
// PPTX parsing (styled, presentation order): presentation.xml + rels
// ---------------------------------------------------------------------------

export interface ParsedPptx {
  slides: { blocks: StyledBlock[]; name: string }[];
}

function pptxRunsFromParagraph(aP: XmlNode): StyledRun[] {
  const runs: StyledRun[] = [];
  const pPr = xmlFirst(aP, "a:pPr");
  void pPr;
  for (const c of aP.children) {
    if (c.tag === "a:r") {
      const rPr = xmlFirst(c, "a:rPr");
      const props: Partial<StyledRun> = {};
      if (rPr) {
        if (rPr.attrs.b === "1") props.bold = true;
        if (rPr.attrs.i === "1") props.italic = true;
        if (rPr.attrs.u && rPr.attrs.u !== "none") props.underline = true;
        if (rPr.attrs.sz) props.fontSize = Number(rPr.attrs.sz) / 100;
        const latin = xmlFirst(rPr, "a:latin");
        if (latin?.attrs.typeface) props.fontName = latin.attrs.typeface;
        const fill = xmlFirst(rPr, "a:solidFill");
        const clr = fill ? xmlFirst(fill, "a:srgbClr") : undefined;
        if (clr?.attrs.val) props.color = normalizeColor(clr.attrs.val);
      }
      const t = xmlFirst(c, "a:t");
      if (t) runs.push({ text: xmlText(t), ...props });
    } else if (c.tag === "a:br") {
      runs.push({ text: "\n" });
    } else if (c.tag === "a:fld") {
      const t = xmlFirst(c, "a:t");
      if (t) runs.push({ text: xmlText(t) });
    }
  }
  return runs;
}

/** Parse a .pptx into styled slides in PRESENTATION order (B-05), with XML entities decoded (B-04). */
export async function parsePptxStyled(arrayBuffer: ArrayBuffer | Uint8Array): Promise<ParsedPptx> {
  const zip = await JSZip.loadAsync(arrayBuffer as never);
  // Presentation order: <p:sldIdLst> in presentation.xml -> rels -> slide file.
  let ordered: string[] = [];
  try {
    const presXml = zip.files["ppt/presentation.xml"];
    const presRels = zip.files["ppt/_rels/presentation.xml.rels"];
    if (presXml && presRels) {
      const relMap = new Map<string, string>();
      for (const rel of xmlDescendants(parseXml(await presRels.async("string")), "Relationship")) {
        relMap.set(rel.attrs.Id ?? "", rel.attrs.Target ?? "");
      }
      const pres = parseXml(await presXml.async("string"));
      for (const sldId of xmlDescendants(pres, "p:sldId")) {
        const target = relMap.get(sldId.attrs["r:id"] ?? "");
        if (target) ordered.push(`ppt/${target.replace(/^\//, "")}`);
      }
    }
  } catch { /* fall back to filename order */ }
  if (!ordered.length) {
    ordered = Object.keys(zip.files)
      .filter((n) => /^ppt\/slides\/slide\d+\.xml$/.test(n))
      .sort((a, b) => (Number(a.match(/slide(\d+)\.xml$/)?.[1] ?? 0) - Number(b.match(/slide(\d+)\.xml$/)?.[1] ?? 0)));
  }
  if (!ordered.length) throw new Error("No slides found in this file. Only .pptx presentations are supported.");
  const slides: { blocks: StyledBlock[]; name: string }[] = [];
  for (const name of ordered) {
    const file = zip.files[name];
    if (!file) continue;
    const slideRels = new Map<string, string>();
    const relPath = name.replace("ppt/slides/", "ppt/slides/_rels/").replace(/\.xml$/, ".xml.rels");
    const relFile = zip.files[relPath];
    if (relFile) {
      for (const rel of xmlDescendants(parseXml(await relFile.async("string")), "Relationship")) {
        slideRels.set(rel.attrs.Id ?? "", rel.attrs.Target ?? "");
      }
    }
    const root = parseXml(await file.async("string"));
    const blocks: StyledBlock[] = [];
    for (const sp of xmlDescendants(root, "p:sp")) {
      const ph = xmlDescendants(sp, "p:ph")[0];
      const phType = ph?.attrs.type ?? "";
      const isTitle = phType === "title" || phType === "ctrTitle";
      for (const txBody of xmlDescendants(sp, "p:txBody")) {
        for (const aP of xmlChildren(txBody, "a:p")) {
          const runs = pptxRunsFromParagraph(aP);
          if (!runs.some((r) => r.text.trim())) continue;
          const lvl = Number(xmlFirst(aP, "a:pPr")?.attrs.lvl ?? 0);
          if (isTitle) blocks.push({ type: "heading", level: 1, runs });
          else if (lvl > 0) blocks.push({ type: "list", listMarker: "•", runs });
          else blocks.push({ type: "paragraph", runs });
        }
      }
    }
    // Tables on the slide.
    for (const tbl of xmlDescendants(root, "a:tbl")) {
      const rows: StyledRun[][][] = [];
      for (const tr of xmlChildren(tbl, "a:tr")) {
        const row: StyledRun[][] = [];
        for (const tc of xmlChildren(tr, "a:tc")) {
          const cellRuns: StyledRun[] = [];
          for (const txBody of xmlDescendants(tc, "a:txBody")) {
            for (const aP of xmlChildren(txBody, "a:p")) cellRuns.push(...pptxRunsFromParagraph(aP));
          }
          row.push(cellRuns);
        }
        if (row.length) rows.push(row);
      }
      if (rows.length) blocks.push({ type: "table", rows });
    }
    // Pictures on the slide.
    for (const pic of xmlDescendants(root, "p:pic")) {
      const blip = xmlDescendants(pic, "a:blip")[0];
      const target = blip ? slideRels.get(blip.attrs["r:embed"] ?? "") : undefined;
      if (!target) continue;
      const mediaPath = `ppt/${target.replace(/^\.\.\//, "").replace(/^\//, "")}`;
      const mediaFile = zip.files[mediaPath];
      if (!mediaFile) continue;
      const bytes = new Uint8Array(await mediaFile.async("uint8array"));
      const ext = mediaPath.split(".").pop()?.toLowerCase() ?? "png";
      const mime = ext === "jpg" || ext === "jpeg" ? "image/jpeg" : "image/png";
      blocks.push({ type: "image", imageDataUrl: `data:${mime};base64,${bytesToBase64(bytes)}` });
    }
    // A slide whose first text is display-size (>=24pt) is its title even
    // when the shape carries no title placeholder (python-pptx fixtures).
    if (blocks.length && !blocks.some((b) => b.type === "heading")) {
      const first = blocks[0];
      const maxSize = Math.max(0, ...(first.runs ?? []).map((r) => r.fontSize ?? 0));
      if (maxSize >= 24) blocks[0] = { ...first, type: "heading", level: 1 };
    }
    slides.push({ blocks, name });
  }
  return { slides };
}
