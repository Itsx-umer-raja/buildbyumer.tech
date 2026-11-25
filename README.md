# PDF World — free PDF tools that run in your browser

Merge, split, compress, convert, rotate, organize, watermark, number, protect
and unlock PDF files — plus a free resume builder. Every PDF tool runs
entirely client-side (pdf-lib, pdfjs-dist, JSZip) — files are never uploaded
to a server. The two exceptions are stated on their pages: Translate PDF sends
extracted text to the free MyMemory translation service, and OCR loads its
engine from a CDN on first use.

## Tools (31)

**Organise** — Merge PDF, Split PDF, Compress PDF, Organize PDF
**Convert** — JPG to PDF, PDF to JPG, PDF to Word, PDF to PowerPoint, PDF to
Excel, Word to PDF, PowerPoint to PDF, Excel to PDF, PDF to Markdown, HTML to
PDF, Scan to PDF, PDF to PDF/A
**Edit** — Rotate PDF, Watermark, Page Numbers, OCR PDF, Edit PDF, Compare PDF,
Redact PDF, Crop PDF, PDF Forms, Repair PDF, Sign PDF
**Secure** — Protect PDF, Unlock PDF
**AI (template-based — no AI model)** — AI Summarizer (extractive, scores the
document's own sentences), Translate PDF (MyMemory free service, no key)
**Resume Builder** (`/resume`, featured on the homepage) — form-based builder
with live preview, four original templates (Modern, Classic, Minimal,
ATS-friendly), international date formats, optional photo (off by default),
PDF export via the browser print dialog and .docx export via the `docx`
library, save/load in the browser's localStorage, and a template-based summary
writer (labelled on the page: "Template-based — no AI model").

## Run locally

```bash
npm install
npm run dev
```

Then open http://localhost:3000.

## Build

```bash
npm run build
npm start
```

## Project layout

- `app/` — homepage, static pages (About, Privacy, Terms, Contact),
  `app/resume/` (resume builder) and `app/tools/[slug]/` tool pages
- `lib/tools.ts` — the tool registry (id, title, description, keywords,
  category, route). Add new tools here.
- `lib/pdf-utils.ts` — shared PDF helpers (pdfjs loading, page rendering,
  downloads, page-range parsing)
- `lib/text-tools.ts` — text extraction and text-to-PDF rendering
- `lib/pdf-encrypt.ts` — standard 40-bit RC4 PDF encryption for Protect PDF
- `lib/resume.ts` — resume data model, date formatting, template-based summary
  writer and .docx export
- `components/tool-ui.tsx` — shared drop zone, file list, result card
- `components/tools/` — the tool implementations (`group-ai.tsx` holds the
  summarizer and translator)
- `components/resume/` — resume builder form and the four preview templates
- `public/sitemap.xml`, `public/robots.txt` — SEO files (update the domain in
  both files if the site moves to a different domain)
- `HOW-TO-DEPLOY.md` — owner steps for deploying on Vercel from GitHub

## Privacy

PDF tools process files in the visitor's browser; files are read from disk,
processed in memory, and the result is downloaded straight back. Nothing is
stored afterwards. The resume builder saves only in the visitor's own
browser (localStorage) when they press "Save in this browser". Translate PDF
is the exception: extracted text is sent to MyMemory's servers for
translation, which is stated on the tool page. There are no accounts and no
analytics IDs. The only advertising-related markup is the AdSense
account-verification `<meta>` tag in `app/layout.tsx` — there are no ad units
or ad scripts in this codebase.

## Honesty notes

- AI Summarizer is extractive and template-based; it uses no AI model and
  says so on the page.
- Translate PDF uses the free, no-key MyMemory service with a ~5,000
  character daily shared quota; LibreTranslate's hosted service now requires
  a paid API key and is not used.
- PDF to PDF/A adds archival metadata only; it is not a certified PDF/A file.
- Protect PDF uses 40-bit RC4 encryption (the basic, widely compatible
  level), not modern strong encryption.

## Licence

MIT — see `LICENSE`.
