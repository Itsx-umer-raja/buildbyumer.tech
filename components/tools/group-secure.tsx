"use client";

import { useState } from "react";
import { PDFDocument } from "pdf-lib";
import {
  Dropzone,
  FileList,
  ProcessButton,
  ResultCard,
  ErrorNote,
  OptionLabel,
  inputCls,
} from "@/components/tool-ui";
import { downloadBytes, fileBytes, formatBytes, loadPdf } from "@/lib/pdf-utils";
import { encryptPdf, looksEncrypted } from "@/lib/pdf-encrypt";

// ---------------------------------------------------------------- Protect
export function ProtectTool() {
  const [file, setFile] = useState<File | null>(null);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [result, setResult] = useState<{ bytes: Uint8Array; filename: string; detail: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const run = async () => {
    setError(null);
    setResult(null);
    if (!file) {
      setError("Choose a PDF file to protect.");
      return;
    }
    if (password.length < 4) {
      setError("Choose a password of at least 4 characters.");
      return;
    }
    // B-08: characters above U+00FF (emoji, CJK, ✓, …) have no single-byte
    // PDF representation, so a file protected with one could never be opened
    // with the same password. Reject them here with a clear message instead
    // of letting the user lock themselves out. Accented Latin letters (ä, ß)
    // are fine and now work correctly (see lib/pdf-encrypt.ts).
    if (/[^\x00-\xFF]/.test(password)) {
      setError(
        "That password contains a character (for example an emoji, Chinese/Japanese/Korean character or ✓) that PDF readers cannot use in a password — the file would not open afterwards. Use Latin letters, digits and symbols instead; accented letters such as ä are fine.",
      );
      return;
    }
    if (password !== confirm) {
      setError("The two passwords do not match.");
      return;
    }
    setBusy(true);
    try {
      const doc = await loadPdf(await fileBytes(file));
      // Object streams would hide objects from the encryptor — save plain.
      const plain = await doc.save({ useObjectStreams: false });
      const encrypted = encryptPdf(plain, password);
      setResult({
        bytes: encrypted,
        filename: "protected.pdf",
        detail: `Password protection added (${formatBytes(encrypted.length)}). The file now asks for the password before opening in a standard PDF reader. It uses 40-bit RC4 encryption — the basic, widely compatible level.`,
      });
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Protection failed. The file may be damaged or already password-protected.",
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <Dropzone accept="application/pdf,.pdf" onFiles={(fs) => setFile(fs[0] ?? null)} hint="One PDF file" />
      {file && <FileList files={[file]} onRemove={() => setFile(null)} />}
      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <div>
          <OptionLabel htmlFor="secure-new-password">New password</OptionLabel>
          <input id="secure-new-password" className={inputCls} type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="At least 4 characters" />
        </div>
        <div>
          <OptionLabel htmlFor="secure-confirm-password">Confirm password</OptionLabel>
          <input id="secure-confirm-password" className={inputCls} type="password" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder="Repeat the password" />
        </div>
      </div>
      <p className="mt-3 text-sm text-slate-500">
        Keep the password safe — there is no way to recover it. Use Latin letters, digits and
        symbols (accented letters such as ä are fine); emoji and Chinese/Japanese/Korean
        characters cannot be used in a PDF password. This tool uses 40-bit RC4
        encryption, the basic standard level. It stops casual opening without the password, but
        it is not strong enough for highly sensitive documents.
      </p>
      <ProcessButton busy={busy} disabled={!file} label="Protect PDF" busyLabel="Protecting…" onClick={run} />
      <ErrorNote message={error} />
      {result && (
        <ResultCard
          title="Your protected PDF is ready"
          detail={result.detail}
          filename={result.filename}
          onDownload={() => downloadBytes(result.bytes, result.filename)}
        />
      )}
    </div>
  );
}

// ---------------------------------------------------------------- Unlock
export function UnlockTool() {
  const [file, setFile] = useState<File | null>(null);
  const [password, setPassword] = useState("");
  const [result, setResult] = useState<{ bytes: Uint8Array; filename: string; detail: string; warning?: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const run = async () => {
    setError(null);
    setResult(null);
    if (!file) {
      setError("Choose a password-protected PDF file.");
      return;
    }
    if (!password) {
      setError("Enter the password for this PDF.");
      return;
    }
    setBusy(true);
    try {
      const { openPdfjs, renderPageToJpeg } = await import("@/lib/pdf-utils");
      const original = await fileBytes(file);
      // B-09: never rasterise a file that was never locked — that destroyed
      // its selectable text (and doubled its page size) for nothing. Refuse
      // before even asking pdfjs for the password.
      if (!looksEncrypted(original)) {
        throw new Error("This PDF is not password-protected, so there is nothing to unlock. The file was left unchanged.");
      }
      let opened;
      try {
        opened = await openPdfjs(original, password);
      } catch (e) {
        const name = (e as Error)?.name ?? "";
        if (name === "PasswordException" || /password/i.test((e as Error)?.message ?? "")) {
          throw new Error("Wrong password — this PDF could not be opened with the password you entered. Check it and try again.");
        }
        throw e;
      }
      const { doc, numPages } = opened;
      if (numPages === 0) throw new Error("This PDF has no pages to unlock.");
      // Rebuild the document from rendered pages: the password is gone, and
      // the output is an ordinary, unprotected PDF.
      const out = await PDFDocument.create();
      for (let i = 1; i <= numPages; i++) {
        const blob = await renderPageToJpeg(doc, i, 2, 0.9);
        const img = await out.embedJpg(new Uint8Array(await blob.arrayBuffer()));
        // B-04: rendering at scale 2 makes the image 2× the page in pixels;
        // using its pixel size as the page size made pages 2× too big
        // (612×792 pt became 1224×1584 pt). Keep the original page size.
        const page = await doc.getPage(i);
        const vp = page.getViewport({ scale: 1 });
        const pageSize: [number, number] = [vp.width, vp.height];
        const newPage = out.addPage(pageSize);
        newPage.drawImage(img, { x: 0, y: 0, width: pageSize[0], height: pageSize[1] });
      }
      const bytes = await out.save();
      setResult({
        bytes,
        filename: "unlocked.pdf",
        detail: `Password removed from a ${numPages}-page PDF (${formatBytes(bytes.length)}). The unlocked copy opens without a password and keeps its original page size. It was rebuilt from rendered pages, so its text is not selectable.`,
        // B-10: the rebuild is inherently lossy (pdf-lib cannot decrypt a
        // PDF while keeping its vectors), and on text PDFs it is also much
        // bigger than the original. Say so plainly instead of hiding it.
        warning:
          bytes.length > original.length
            ? `The unlocked copy (${formatBytes(bytes.length)}) is larger than the protected original (${formatBytes(original.length)}) because every page was rebuilt as an image, and its text is not selectable. That is the cost of removing the password with this tool.`
            : undefined,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unlocking failed. The file may be damaged or use encryption this tool cannot handle.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <div className="mb-5 rounded-xl border border-teal-200 bg-teal-50 px-4 py-3 text-sm leading-relaxed text-teal-900">
        <strong>Only for passwords you already know.</strong> This tool never guesses, cracks
        or bypasses passwords. If you enter the wrong password, it shows an error and does
        nothing. If you have forgotten the password, this tool cannot help.
      </div>
      <Dropzone accept="application/pdf,.pdf" onFiles={(fs) => setFile(fs[0] ?? null)} hint="One password-protected PDF" />
      {file && <FileList files={[file]} onRemove={() => setFile(null)} />}
      <div className="mt-5 max-w-sm">
        <OptionLabel htmlFor="secure-current-pdf-password">Current PDF password</OptionLabel>
        <input id="secure-current-pdf-password" className={inputCls} type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="The password you already know" />
      </div>
      <ProcessButton busy={busy} disabled={!file} label="Unlock PDF" busyLabel="Unlocking…" onClick={run} />
      <ErrorNote message={error} />
      {result && (
        <ResultCard
          title="Your unlocked PDF is ready"
          detail={result.detail}
          warning={result.warning}
          filename={result.filename}
          onDownload={() => downloadBytes(result.bytes, result.filename)}
        />
      )}
    </div>
  );
}
