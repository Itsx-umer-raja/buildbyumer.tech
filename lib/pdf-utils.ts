import { PDFDocument } from "pdf-lib";

/** Download bytes/a Blob as a file in the browser. */
export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}

export function downloadBytes(bytes: Uint8Array, filename: string, type = "application/pdf") {
  downloadBlob(new Blob([bytes as unknown as BlobPart], { type }), filename);
}

export async function fileBytes(file: File | Blob): Promise<Uint8Array> {
  return new Uint8Array(await file.arrayBuffer());
}

export function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(2)} MB`;
}

/** Load pdf-lib document from bytes. Throws on encrypted/invalid files. */
export async function loadPdf(bytes: Uint8Array): Promise<PDFDocument> {
  return PDFDocument.load(bytes, { ignoreEncryption: false });
}

/** Lazily load pdfjs-dist in the browser and point it at the bundled worker. */
export async function loadPdfjs() {
  const pdfjs = await import("pdfjs-dist");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (pdfjs as any).GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
  return pdfjs;
}

export interface PdfjsDoc {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  doc: any;
  numPages: number;
}

/** Open a PDF with pdfjs-dist. Pass `password` for protected files. */
export async function openPdfjs(bytes: Uint8Array, password?: string): Promise<PdfjsDoc> {
  const pdfjs = await loadPdfjs();
  const task = pdfjs.getDocument({ data: bytes.slice(), password });
  const doc = await task.promise;
  return { doc, numPages: doc.numPages as number };
}

/** Render one pdfjs page to a JPEG blob. Scale ~2 gives print-quality images. */
export async function renderPageToJpeg(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  doc: any,
  pageNum: number,
  scale = 2,
  quality = 0.85,
): Promise<Blob> {
  const page = await doc.getPage(pageNum);
  const viewport = page.getViewport({ scale });
  const canvas = document.createElement("canvas");
  canvas.width = Math.ceil(viewport.width);
  canvas.height = Math.ceil(viewport.height);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas is not available in this browser.");
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  await page.render({ canvasContext: ctx, viewport }).promise;
  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, "image/jpeg", quality),
  );
  if (!blob) throw new Error("Could not render this page as an image.");
  return blob;
}

/** Render one pdfjs page to a small thumbnail data URL. */
export async function renderPageThumb(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  doc: any,
  pageNum: number,
  maxWidth = 220,
): Promise<string> {
  const page = await doc.getPage(pageNum);
  const vp1 = page.getViewport({ scale: 1 });
  const scale = Math.min(1, maxWidth / vp1.width);
  const viewport = page.getViewport({ scale });
  const canvas = document.createElement("canvas");
  canvas.width = Math.ceil(viewport.width);
  canvas.height = Math.ceil(viewport.height);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas is not available in this browser.");
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  await page.render({ canvasContext: ctx, viewport }).promise;
  return canvas.toDataURL("image/jpeg", 0.75);
}

/**
 * Parse a page-range string like "1-3, 5, 8-10" into sorted unique 1-based
 * page numbers, clamped to `totalPages`. Invalid parts are ignored.
 */
export function parseRanges(input: string, totalPages: number): number[] {
  const out = new Set<number>();
  for (const part of input.split(",")) {
    const p = part.trim();
    if (!p) continue;
    const m = p.match(/^(\d+)\s*-\s*(\d+)$/);
    if (m) {
      const a = parseInt(m[1], 10);
      const b = parseInt(m[2], 10);
      const lo = Math.min(a, b);
      const hi = Math.max(a, b);
      for (let i = lo; i <= hi; i++) if (i >= 1 && i <= totalPages) out.add(i);
    } else if (/^\d+$/.test(p)) {
      const n = parseInt(p, 10);
      if (n >= 1 && n <= totalPages) out.add(n);
    }
  }
  return [...out].sort((a, b) => a - b);
}
