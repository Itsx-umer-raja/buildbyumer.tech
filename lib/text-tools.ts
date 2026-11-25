import { PDFDocument, StandardFonts, rgb, PDFPage, PDFFont } from "pdf-lib";
import { openPdfjs } from "@/lib/pdf-utils";

/** Extract the visible text of each page, one string per page. */
export async function extractPagesText(bytes: Uint8Array): Promise<string[]> {
  const { doc, numPages } = await openPdfjs(bytes);
  const pages: string[] = [];
  for (let i = 1; i <= numPages; i++) {
    const page = await doc.getPage(i);
    const tc = await page.getTextContent();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const items = tc.items as any[];
    let text = "";
    let lastY: number | null = null;
    for (const it of items) {
      if (!it.str) continue;
      const y = Math.round(it.transform[5]);
      if (lastY !== null && y !== lastY) text += "\n";
      else if (text && !text.endsWith("\n") && !text.endsWith(" ")) text += " ";
      text += it.str;
      lastY = y;
    }
    pages.push(text.trim());
  }
  return pages;
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
export async function extractPageItems(bytes: Uint8Array): Promise<{ items: TextItem[]; width: number; height: number }[]> {
  const { doc, numPages } = await openPdfjs(bytes);
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
          str: it.str as string,
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

/** Heading heuristic: short line, no trailing period, all-caps or title-case. */
export function looksLikeHeading(line: string): boolean {
  const t = line.trim();
  if (!t || t.length > 80) return false;
  if (/[.!?,:;]$/.test(t)) return false;
  if (t === t.toUpperCase() && /[A-Z]/.test(t)) return true;
  const words = t.split(/\s+/);
  if (words.length <= 6 && words.every((w) => /^[A-Z0-9][a-z0-9'’\-]*$/.test(w) || /^[^A-Za-z]*$/.test(w))) return true;
  return false;
}

export function splitLines(text: string): string[] {
  return text.split("\n").map((l) => l.trimEnd()).filter((l) => l.trim().length > 0);
}

function wrapLine(line: string, font: PDFFont, size: number, maxWidth: number): string[] {
  const words = line.split(/\s+/).filter(Boolean);
  if (words.length === 0) return [""];
  const out: string[] = [];
  let cur = "";
  for (const w of words) {
    const test = cur ? `${cur} ${w}` : w;
    if (font.widthOfTextAtSize(test, size) <= maxWidth) cur = test;
    else {
      if (cur) out.push(cur);
      // Very long single word: hard-split it.
      let rest = w;
      while (font.widthOfTextAtSize(rest, size) > maxWidth && rest.length > 1) {
        let n = rest.length;
        while (n > 1 && font.widthOfTextAtSize(rest.slice(0, n), size) > maxWidth) n--;
        out.push(rest.slice(0, n));
        rest = rest.slice(n);
      }
      cur = rest;
    }
  }
  if (cur) out.push(cur);
  return out;
}

export interface TextPdfPage {
  heading?: string;
  lines: string[];
}

/**
 * Render plain-text pages into an A4 PDF (Helvetica). Used by the
 * approximation converters (Word/PowerPoint/Excel/OCR → PDF).
 */
export async function renderTextPagesToPdf(
  pages: TextPdfPage[],
  opts?: { title?: string; fontSize?: number },
): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const size = opts?.fontSize ?? 11;
  const lineH = size * 1.45;
  const margin = 50;
  const pageW = 595.28;
  const pageH = 841.89;
  const maxW = pageW - margin * 2;
  if (opts?.title) doc.setTitle(opts.title);

  for (const pg of pages) {
    let page: PDFPage = doc.addPage([pageW, pageH]);
    let y = pageH - margin;
    const newPage = () => {
      page = doc.addPage([pageW, pageH]);
      y = pageH - margin;
    };
    if (pg.heading) {
      for (const wl of wrapLine(pg.heading, bold, 15, maxW)) {
        if (y < margin + lineH) newPage();
        page.drawText(wl, { x: margin, y, size: 15, font: bold, color: rgb(0.1, 0.1, 0.1) });
        y -= 20;
      }
      y -= 6;
    }
    for (const line of pg.lines) {
      const wrapped = wrapLine(line, font, size, maxW);
      for (const wl of wrapped) {
        if (y < margin + lineH) newPage();
        page.drawText(wl, { x: margin, y, size, font, color: rgb(0.15, 0.15, 0.15) });
        y -= lineH;
      }
    }
  }
  return doc.save();
}

/** Strip HTML tags to plain text, keeping line breaks for block elements. */
export function htmlToPlainText(html: string): string {
  const withBreaks = html
    .replace(/<\/(p|div|h[1-6]|li|tr|br|section|article)>/gi, "\n")
    .replace(/<br\s*\/?>/gi, "\n");
  const doc = new DOMParser().parseFromString(withBreaks, "text/html");
  return (doc.body.textContent || "")
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .join("\n");
}
