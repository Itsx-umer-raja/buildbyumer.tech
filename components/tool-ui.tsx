"use client";

import { useCallback, useRef, useState } from "react";
import { UploadCloud, X, FileText, Image as ImageIcon, ArrowUp, ArrowDown, Loader2, Download, Info, CheckCircle2, AlertTriangle } from "lucide-react";
import { formatBytes } from "@/lib/pdf-utils";

export function Dropzone({
  accept,
  multiple,
  onFiles,
  hint,
  privacyNote,
}: {
  accept: string;
  multiple?: boolean;
  onFiles: (files: File[]) => void;
  hint: string;
  /**
   * If set, shown instead of the "files stay on your device" line — for
   * tools that send something to a remote service (e.g. Translate).
   */
  privacyNote?: string;
}) {
  const [drag, setDrag] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDrag(false);
      const files = Array.from(e.dataTransfer.files);
      if (files.length) onFiles(files);
    },
    [onFiles],
  );

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setDrag(true);
      }}
      onDragLeave={() => setDrag(false)}
      onDrop={handleDrop}
      onClick={() => inputRef.current?.click()}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") inputRef.current?.click();
      }}
      className={`cursor-pointer rounded-2xl border-2 border-dashed px-6 py-10 text-center transition ${
        drag ? "border-teal-600 bg-teal-50" : "border-slate-300 bg-white hover:border-teal-600 hover:bg-teal-50/40"
      }`}
    >
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        multiple={multiple}
        className="hidden"
        onChange={(e) => {
          if (e.target.files?.length) onFiles(Array.from(e.target.files));
          e.target.value = "";
        }}
      />
      <UploadCloud className="mx-auto h-10 w-10 text-teal-700" />
      <p className="mt-3 font-semibold text-slate-900">
        {drag ? "Drop your files here" : "Drag files here, or click to choose"}
      </p>
      <p className="mt-1 text-sm text-slate-500">{hint}</p>
      <p className="mt-2 text-xs text-slate-400">
        {privacyNote ??
          "Files stay on your device — they are processed in your browser and never uploaded."}
      </p>
    </div>
  );
}

export function FileList({
  files,
  onRemove,
  onMove,
}: {
  files: File[];
  onRemove: (i: number) => void;
  onMove?: (i: number, dir: -1 | 1) => void;
}) {
  if (files.length === 0) return null;
  return (
    <ul className="mt-4 space-y-2">
      {files.map((f, i) => (
        <li
          key={`${f.name}-${i}`}
          className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-3 py-2.5"
        >
          {f.type.startsWith("image/") ? (
            <ImageIcon className="h-5 w-5 shrink-0 text-teal-700" />
          ) : (
            <FileText className="h-5 w-5 shrink-0 text-teal-700" />
          )}
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-medium text-slate-900">{f.name}</span>
            <span className="text-xs text-slate-500">{formatBytes(f.size)}</span>
          </span>
          {onMove && (
            <span className="flex gap-1">
              <button
                type="button"
                aria-label={`Move ${f.name} up`}
                disabled={i === 0}
                onClick={() => onMove(i, -1)}
                className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 disabled:opacity-30"
              >
                <ArrowUp className="h-4 w-4" />
              </button>
              <button
                type="button"
                aria-label={`Move ${f.name} down`}
                disabled={i === files.length - 1}
                onClick={() => onMove(i, 1)}
                className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 disabled:opacity-30"
              >
                <ArrowDown className="h-4 w-4" />
              </button>
            </span>
          )}
          <button
            type="button"
            aria-label={`Remove ${f.name}`}
            onClick={() => onRemove(i)}
            className="rounded-md p-1.5 text-slate-500 hover:bg-red-50 hover:text-red-600"
          >
            <X className="h-4 w-4" />
          </button>
        </li>
      ))}
    </ul>
  );
}

export function ProcessButton({
  busy,
  disabled,
  label,
  busyLabel,
  onClick,
}: {
  busy: boolean;
  disabled?: boolean;
  label: string;
  busyLabel?: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      disabled={busy || disabled}
      onClick={onClick}
      className="btn-animated mt-5 inline-flex w-full items-center justify-center gap-2 rounded-full px-6 py-3.5 text-base font-semibold text-white shadow-sm disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
    >
      {busy && <Loader2 className="h-5 w-5 animate-spin" />}
      {busy ? (busyLabel ?? "Working…") : label}
    </button>
  );
}

export function ResultCard({
  title,
  detail,
  filename,
  onDownload,
  warning,
  downloadLabel,
}: {
  title: string;
  detail: string;
  filename: string;
  onDownload: () => void;
  warning?: string;
  downloadLabel?: string;
}) {
  return (
    <div className="mt-6 rounded-2xl border border-teal-200 bg-teal-50 p-5">
      <p className="flex items-center gap-2 font-semibold text-teal-900">
        <CheckCircle2 className="h-5 w-5 text-teal-700" />
        {title}
      </p>
      <p className="mt-1 text-sm text-teal-900/80">{detail}</p>
      {warning && (
        <p className="mt-2 flex items-start gap-2 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          {warning}
        </p>
      )}
      <button
        type="button"
        onClick={onDownload}
        className="btn-animated mt-4 inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold text-white"
      >
        <Download className="h-4 w-4" />
        {downloadLabel ?? `Download ${filename}`}
      </button>
    </div>
  );
}

export function ErrorNote({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <p className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
      {message}
    </p>
  );
}

export function LimitsNote({ text }: { text: string }) {
  return (
    <p className="mt-6 flex items-start gap-2 rounded-xl bg-amber-50 px-4 py-3 text-sm leading-relaxed text-amber-900">
      <Info className="mt-0.5 h-4 w-4 shrink-0" />
      <span>
        <strong>Honest limits: </strong>
        {text}
      </span>
    </p>
  );
}

export function OptionLabel({ children, htmlFor }: { children: React.ReactNode; htmlFor?: string }) {
  return (
    <label htmlFor={htmlFor} className="mb-1.5 block text-sm font-semibold text-slate-800">
      {children}
    </label>
  );
}

export const selectCls =
  "w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 focus:border-teal-600 focus:outline-none";
export const inputCls =
  "w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 focus:border-teal-600 focus:outline-none";
