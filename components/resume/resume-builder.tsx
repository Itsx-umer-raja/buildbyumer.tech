"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Printer,
  FileDown,
  Save,
  FolderOpen,
  Trash2,
  Plus,
  X,
  Sparkles,
  User,
  Briefcase,
  GraduationCap,
  ListChecks,
  ImagePlus,
  Upload,
  Languages,
} from "lucide-react";
import { inputCls, selectCls, OptionLabel } from "@/components/tool-ui";
import { downloadBlob } from "@/lib/pdf-utils";
import {
  SAMPLE_RESUME,
  TEMPLATES,
  DATE_FORMATS,
  SUMMARY_PROFESSIONS,
  STORAGE_KEY,
  buildSummary,
  buildResumeDocx,
  sanitizeDocxFilename,
  parseUploadedResume,
  type ResumeData,
  type ResumeTemplateId,
  type DateFormat,
  type SummaryTone,
  type ResumeParseResult,
} from "@/lib/resume";
import {
  RESUME_FONTS,
  RESUME_THEMES,
  TEMPLATE_DEFAULT_FONTS,
  getResumeFont,
  getResumeTheme,
} from "@/lib/resume-fonts";
import { ResumePreview } from "./resume-preview";

const EMPTY: ResumeData = {
  fullName: "",
  title: "",
  email: "",
  phone: "",
  location: "",
  website: "",
  linkedin: "",
  summary: "",
  experience: [{ id: "exp-1", role: "", company: "", start: "", end: "", current: false, bullets: "" }],
  education: [{ id: "edu-1", degree: "", school: "", start: "", end: "" }],
  skills: "",
  languages: "",
};

function uid(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function Section({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="flex items-center gap-2 font-display text-lg font-bold text-slate-900">
        <span className="text-teal-700">{icon}</span> {title}
      </h2>
      <div className="mt-4 space-y-3">{children}</div>
    </section>
  );
}

export function ResumeBuilder() {
  const [data, setData] = useState<ResumeData>(EMPTY);
  const [template, setTemplate] = useState<ResumeTemplateId>("modern");
  const [dateFormat, setDateFormat] = useState<DateFormat>("mon-yyyy");
  const [fontId, setFontId] = useState<string | null>(null); // null = the template's default font
  const [themeId, setThemeId] = useState<string>("teal");
  const [photoOn, setPhotoOn] = useState(false);
  const [photo, setPhoto] = useState<string | null>(null);
  const [photoSize, setPhotoSize] = useState<{ width: number; height: number } | null>(null);
  const [savedNote, setSavedNote] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [docxBusy, setDocxBusy] = useState(false);
  const [docxError, setDocxError] = useState<string | null>(null);
  const [uploadBusy, setUploadBusy] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadResult, setUploadResult] = useState<ResumeParseResult | null>(null);
  const [profession, setProfession] = useState<string>(SUMMARY_PROFESSIONS[0]);
  const [tone, setTone] = useState<SummaryTone>("professional");
  const [writerNote, setWriterNote] = useState<string | null>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const uploadInputRef = useRef<HTMLInputElement>(null);

  // Load a saved resume from this browser only, on first render.
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as {
          data: ResumeData;
          template: ResumeTemplateId;
          dateFormat: DateFormat;
          fontId?: string | null;
          themeId?: string;
          photoOn?: boolean;
        };
        if (parsed?.data) {
          // Older saves have no languages field; fill it in.
          setData({ ...EMPTY, ...parsed.data, languages: parsed.data.languages ?? "" });
          if (parsed.template) setTemplate(parsed.template);
          if (parsed.dateFormat) setDateFormat(parsed.dateFormat);
          if (typeof parsed.photoOn === "boolean") setPhotoOn(parsed.photoOn);
          // Older saves have no font/theme; they keep the template defaults.
          if (typeof parsed.fontId === "string" && RESUME_FONTS.some((f) => f.id === parsed.fontId)) {
            setFontId(parsed.fontId);
          } else if (parsed.fontId === null) {
            setFontId(null);
          }
          if (typeof parsed.themeId === "string" && RESUME_THEMES.some((t) => t.id === parsed.themeId)) {
            setThemeId(parsed.themeId);
          }
          setSavedNote("Loaded the resume saved in this browser.");
        }
      }
    } catch {
      // Corrupt saved data is ignored; the blank form stays usable.
    }
    setLoaded(true);
  }, []);

  const set = useCallback(<K extends keyof ResumeData>(key: K, value: ResumeData[K]) => {
    setData((d) => ({ ...d, [key]: value }));
  }, []);

  const save = () => {
    try {
      // The photo is deliberately not saved: it can be large, and it is
      // optional. Everything else is stored only in this browser — including
      // the photo toggle (B6), so a reload does not silently drop the photo.
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ data, template, dateFormat, fontId, themeId, photoOn }));
      setSavedNote("Saved in this browser (localStorage). Nothing is sent to a server.");
    } catch {
      setSavedNote("Could not save — this browser's local storage may be full or disabled.");
    }
  };

  const loadSample = () => {
    setData(SAMPLE_RESUME);
    setSavedNote("Loaded the sample resume. Replace the details with your own.");
  };

  const clearAll = () => {
    if (!window.confirm("Clear the whole form and delete the copy saved in this browser?")) return;
    setData(EMPTY);
    setPhoto(null);
    setPhotoOn(false);
    setPhotoSize(null);
    setUploadResult(null);
    setUploadError(null);
    localStorage.removeItem(STORAGE_KEY);
    setSavedNote("Cleared. The saved copy in this browser was deleted too.");
  };

  const exportDocx = async () => {
    setDocxError(null);
    setDocxBusy(true);
    try {
      const blob = await buildResumeDocx(data, dateFormat, {
        fontId,
        themeId,
        template,
        photo: photoOn && photo ? { dataUrl: photo, width: photoSize?.width ?? 200, height: photoSize?.height ?? 200 } : null,
      });
      const name = sanitizeDocxFilename(data.fullName.trim());
      downloadBlob(blob, `${name}-resume.docx`);
    } catch (err) {
      setDocxError(err instanceof Error ? err.message : "Could not build the Word file. Please try again.");
    } finally {
      setDocxBusy(false);
    }
  };

  /** Upload an existing PDF/DOCX resume, parse it on this device, and prefill the form. */
  const onUploadResume = async (file: File | undefined) => {
    if (!file) return;
    setUploadError(null);
    setUploadResult(null);
    if (!/\.pdf$|\.docx$/i.test(file.name)) {
      setUploadError("Please choose a PDF (.pdf) or Word (.docx) resume.");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setUploadError("That file is over 10 MB. Please choose a smaller resume file.");
      return;
    }
    const hasContent =
      data.fullName.trim() || data.summary.trim() || data.skills.trim() || data.experience.some((e) => e.role.trim() || e.bullets.trim());
    if (hasContent && !window.confirm("Uploading a resume replaces what is in the form now. Continue?")) return;
    setUploadBusy(true);
    try {
      const result = await parseUploadedResume(file);
      if (!result.found.length) {
        setUploadError(
          "We could not read any usable details from this file — it may be a scanned image or an unusual layout. You can still fill in the form by hand below.",
        );
        return;
      }
      // Keep the builder's row ids stable: reuse existing rows where the
      // parsed data has fewer entries than the form already shows.
      setData(result.data);
      setUploadResult(result);
      setSavedNote("Resume uploaded and parsed on this device — nothing was sent to a server. Check the fields below and fix anything the parser missed.");
    } catch {
      setUploadError(
        "We could not read this file. It may be password-protected, damaged, or a scanned image with no text. You can still fill in the form by hand below.",
      );
    } finally {
      setUploadBusy(false);
    }
  };

  const generateSummary = () => {
    const text = buildSummary(data, profession, tone);
    set("summary", text);
    setWriterNote("Summary filled from a template using your details. Edit it freely — it is your text.");
  };

  const onPhoto = (file: File | undefined) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) return;
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = String(reader.result);
      setPhoto(dataUrl);
      const img = new Image();
      img.onload = () => setPhotoSize({ width: img.naturalWidth || 200, height: img.naturalHeight || 200 });
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
  };

  if (!loaded) return null;

  return (
    <div>
      <style>{`
        @page { size: A4; margin: 12mm 14mm; }
        @media print {
          .no-print { display: none !important; }
          body * { visibility: hidden !important; }
          #resume-print, #resume-print * { visibility: visible !important; }
          #resume-print { position: absolute !important; left: 0; top: 0; width: 100% !important; max-width: none !important; box-shadow: none !important; padding: 0 !important; print-color-adjust: exact !important; -webkit-print-color-adjust: exact !important; }
          #resume-print section { break-inside: avoid; }
          #resume-print h1, #resume-print h2 { break-after: avoid; }
        }
      `}</style>

      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
        <p className="text-xs font-semibold uppercase tracking-wider text-teal-700">Resume builder</p>
        <h1 className="mt-2 font-display text-3xl font-bold text-slate-900 sm:text-4xl">Build a free resume that gets read</h1>
        <p className="mt-2 max-w-2xl leading-relaxed text-slate-600">
          Fill in the form and watch the preview update live. Pick one of ten original templates, choose a
          font — MS Word classics or stylish Canva-style fonts — and a colour theme, then export as PDF or
          Word. Already have a resume? Upload it as PDF or Word and we&apos;ll fill in the form for you to
          edit. Your details stay in your browser — nothing is uploaded, and saving uses only this
          browser&apos;s local storage.
        </p>

        {/* Toolbar */}
        <div className="no-print mt-6 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center gap-2 rounded-full bg-teal-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-teal-800"
          >
            <Printer className="h-4 w-4" /> Export PDF (print → Save as PDF)
          </button>
          <button
            type="button"
            onClick={exportDocx}
            disabled={docxBusy}
            className="inline-flex items-center gap-2 rounded-full border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-800 hover:border-teal-600 disabled:opacity-50"
          >
            <FileDown className="h-4 w-4" /> {docxBusy ? "Building…" : "Download .docx"}
          </button>
          <button
            type="button"
            onClick={() => uploadInputRef.current?.click()}
            disabled={uploadBusy}
            className="inline-flex items-center gap-2 rounded-full border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-800 hover:border-teal-600 disabled:opacity-50"
          >
            <Upload className="h-4 w-4" /> {uploadBusy ? "Reading your resume…" : "Upload resume (PDF / Word)"}
          </button>
          <input
            ref={uploadInputRef}
            type="file"
            accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            className="hidden"
            onChange={(e) => {
              void onUploadResume(e.target.files?.[0]);
              e.target.value = "";
            }}
          />
          <button
            type="button"
            onClick={save}
            className="inline-flex items-center gap-2 rounded-full border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-800 hover:border-teal-600"
          >
            <Save className="h-4 w-4" /> Save in this browser
          </button>
          <button
            type="button"
            onClick={loadSample}
            className="inline-flex items-center gap-2 rounded-full border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-800 hover:border-teal-600"
          >
            <FolderOpen className="h-4 w-4" /> Load sample
          </button>
          <button
            type="button"
            onClick={clearAll}
            className="inline-flex items-center gap-2 rounded-full border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-red-700 hover:border-red-400"
          >
            <Trash2 className="h-4 w-4" /> Clear all
          </button>
        </div>
        {savedNote && (
          <p className="mt-3 rounded-xl bg-teal-50 px-4 py-2.5 text-sm text-teal-900">{savedNote}</p>
        )}
        {uploadResult && (
          <div className="mt-3 rounded-xl border border-teal-200 bg-teal-50 px-4 py-2.5 text-sm text-teal-900">
            <p className="font-semibold">What we found in your file — check it below and correct anything we missed:</p>
            <p className="mt-1">{uploadResult.found.join(" · ")}</p>
            {uploadResult.warnings.length > 0 && (
              <ul className="mt-1 list-disc space-y-0.5 pl-5">
                {uploadResult.warnings.map((w, i) => (
                  <li key={i}>{w}</li>
                ))}
              </ul>
            )}
          </div>
        )}
        {uploadError && (
          <p className="mt-3 rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-800">{uploadError}</p>
        )}
        {docxError && (
          <p className="mt-3 rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-800">{docxError}</p>
        )}
        <p className="mt-3 text-sm text-slate-500">
          PDF export uses your browser&apos;s print dialog: choose “Save as PDF”, A4, and turn off headers and
          footers for a clean page. The Word export downloads a real .docx file you can edit.
        </p>

        <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
          {/* ------------------------------------------------ Form */}
          <div className="no-print space-y-5">
            {/* Template + format */}
            <Section icon={<Sparkles className="h-5 w-5" />} title="Template & format">
              <div>
                <OptionLabel>Template</OptionLabel>
                <div className="grid gap-2 sm:grid-cols-2">
                  {TEMPLATES.map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setTemplate(t.id)}
                      aria-pressed={template === t.id}
                      className={`rounded-xl border p-3 text-left transition ${
                        template === t.id
                          ? "border-teal-700 bg-teal-50 ring-1 ring-teal-700"
                          : "border-slate-300 bg-white hover:border-teal-600"
                      }`}
                    >
                      <span className="block text-sm font-bold text-slate-900">{t.name}</span>
                      <span className="mt-1 block text-xs leading-relaxed text-slate-600">{t.description}</span>
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <OptionLabel>Font</OptionLabel>
                <div className="grid gap-2 sm:grid-cols-2">
                  <button
                    key="template-default"
                    type="button"
                    onClick={() => setFontId(null)}
                    aria-pressed={fontId === null}
                    className={`rounded-xl border p-3 text-left transition ${
                      fontId === null
                        ? "border-teal-700 bg-teal-50 ring-1 ring-teal-700"
                        : "border-slate-300 bg-white hover:border-teal-600"
                    }`}
                  >
                    <span className="block text-base leading-tight" style={{ fontFamily: getResumeFont(TEMPLATE_DEFAULT_FONTS[template]).family }}>
                      Aa
                    </span>
                    <span className="mt-1 block text-sm font-bold text-slate-900">
                      Template default — {getResumeFont(TEMPLATE_DEFAULT_FONTS[template]).name}
                    </span>
                  </button>
                </div>
                <p className="mt-3 text-xs font-semibold text-slate-700">
                  Classic fonts — as in MS Word
                </p>
                <p className="mt-0.5 text-xs leading-relaxed text-slate-500">
                  These use the fonts installed on your device, just like Word does. We don&apos;t bundle
                  Microsoft&apos;s fonts — if a font isn&apos;t on your device, the browser falls back to a
                  similar one.
                </p>
                <div className="mt-2 grid gap-2 sm:grid-cols-2">
                  {RESUME_FONTS.filter((f) => f.group === "classic").map((f) => (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => setFontId(f.id)}
                      aria-pressed={fontId === f.id}
                      className={`rounded-xl border p-3 text-left transition ${
                        fontId === f.id
                          ? "border-teal-700 bg-teal-50 ring-1 ring-teal-700"
                          : "border-slate-300 bg-white hover:border-teal-600"
                      }`}
                    >
                      <span className="block text-base leading-tight" style={{ fontFamily: f.family }}>
                        Aa
                      </span>
                      <span className="mt-1 block text-sm font-bold text-slate-900">{f.name}</span>
                    </button>
                  ))}
                </div>
                <p className="mt-3 text-xs font-semibold text-slate-700">Stylish fonts — free, like Canva</p>
                <p className="mt-0.5 text-xs leading-relaxed text-slate-500">
                  Free open-licence fonts, loaded with the page. No account, no payment.
                </p>
                <div className="mt-2 grid gap-2 sm:grid-cols-2">
                  {RESUME_FONTS.filter((f) => f.group === "stylish").map((f) => (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => setFontId(f.id)}
                      aria-pressed={fontId === f.id}
                      className={`rounded-xl border p-3 text-left transition ${
                        fontId === f.id
                          ? "border-teal-700 bg-teal-50 ring-1 ring-teal-700"
                          : "border-slate-300 bg-white hover:border-teal-600"
                      }`}
                    >
                      <span className="block text-base leading-tight" style={{ fontFamily: f.family }}>
                        Aa
                      </span>
                      <span className="mt-1 block text-sm font-bold text-slate-900">
                        {f.name}
                        {f.hint ? <span className="ml-1.5 text-xs font-medium text-slate-500">· {f.hint}</span> : null}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <OptionLabel>Colour theme</OptionLabel>
                <div className="flex flex-wrap gap-2">
                  {RESUME_THEMES.map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setThemeId(t.id)}
                      aria-pressed={themeId === t.id}
                      aria-label={`${t.name} theme`}
                      title={t.name}
                      style={{ backgroundColor: t.accent }}
                      className={`h-9 w-9 rounded-full transition ${
                        themeId === t.id
                          ? "ring-2 ring-slate-900 ring-offset-2"
                          : "ring-1 ring-slate-300 hover:scale-110"
                      }`}
                    />
                  ))}
                </div>
                <p className="mt-1.5 text-xs text-slate-500">
                  Selected: {getResumeTheme(themeId).name}. The ATS-friendly template stays black so
                  applicant tracking systems read it reliably.
                </p>
              </div>
              <div>
                <OptionLabel>Date format</OptionLabel>
                <select className={selectCls} value={dateFormat} onChange={(e) => setDateFormat(e.target.value as DateFormat)}>
                  {DATE_FORMATS.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.label} — e.g. {f.example}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="flex items-start gap-2 text-sm text-slate-800">
                  <input
                    type="checkbox"
                    checked={photoOn}
                    onChange={(e) => {
                      setPhotoOn(e.target.checked);
                      if (!e.target.checked) setPhoto(null);
                    }}
                    className="mt-0.5 h-4 w-4 accent-teal-700"
                  />
                  <span>
                    Add a photo <span className="text-slate-500">(off by default — photos are not expected on resumes in the US and UK, and some employers prefer them omitted)</span>
                  </span>
                </label>
                {photoOn && (
                  <div className="mt-3 flex items-center gap-3">
                    <input
                      ref={photoInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => onPhoto(e.target.files?.[0])}
                    />
                    <button
                      type="button"
                      onClick={() => photoInputRef.current?.click()}
                      className="inline-flex items-center gap-2 rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800 hover:border-teal-600"
                    >
                      <ImagePlus className="h-4 w-4" /> {photo ? "Change photo" : "Choose a photo"}
                    </button>
                    {photo && (
                      <button
                        type="button"
                        onClick={() => {
                          setPhoto(null);
                          setPhotoSize(null);
                        }}
                        className="text-sm font-medium text-red-700"
                      >
                        Remove
                      </button>
                    )}
                    <span className="text-xs text-slate-500">Photo is kept in memory only and is not saved.</span>
                  </div>
                )}
                {photoOn && template === "ats" && (
                  <p className="mt-2 text-xs leading-relaxed text-amber-800">
                    Your photo is hidden on the ATS-friendly template and never included in its Word export —
                    applicant tracking systems read plain text best. Switch to another template to show it.
                  </p>
                )}
                {photoOn && (template === "simple" || template === "two-column") && (
                  <p className="mt-2 text-xs leading-relaxed text-slate-500">
                    This template has no photo by design, so your photo is hidden here and in its Word export.
                  </p>
                )}
              </div>
            </Section>

            {/* Personal info */}
            <Section icon={<User className="h-5 w-5" />} title="Personal information">
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <OptionLabel>Full name</OptionLabel>
                  <input className={inputCls} value={data.fullName} onChange={(e) => set("fullName", e.target.value)} placeholder="Alex Morgan" />
                </div>
                <div>
                  <OptionLabel>Job title</OptionLabel>
                  <input className={inputCls} value={data.title} onChange={(e) => set("title", e.target.value)} placeholder="Customer Support Specialist" />
                </div>
                <div>
                  <OptionLabel>Email</OptionLabel>
                  <input className={inputCls} type="email" value={data.email} onChange={(e) => set("email", e.target.value)} placeholder="you@example.com" />
                </div>
                <div>
                  <OptionLabel>Phone</OptionLabel>
                  <input className={inputCls} value={data.phone} onChange={(e) => set("phone", e.target.value)} placeholder="+1 (555) 010-2030" />
                </div>
                <div>
                  <OptionLabel>Location</OptionLabel>
                  <input className={inputCls} value={data.location} onChange={(e) => set("location", e.target.value)} placeholder="City, Country" />
                </div>
                <div>
                  <OptionLabel>Website / portfolio (optional)</OptionLabel>
                  <input className={inputCls} value={data.website} onChange={(e) => set("website", e.target.value)} placeholder="yourname.com" />
                </div>
                <div className="sm:col-span-2">
                  <OptionLabel>LinkedIn (optional)</OptionLabel>
                  <input className={inputCls} value={data.linkedin} onChange={(e) => set("linkedin", e.target.value)} placeholder="linkedin.com/in/yourname" />
                </div>
              </div>
            </Section>

            {/* Summary + writer */}
            <Section icon={<Sparkles className="h-5 w-5" />} title="Summary">
              <div>
                <OptionLabel>Professional summary</OptionLabel>
                <textarea
                  className={`${inputCls} min-h-24 resize-y`}
                  value={data.summary}
                  onChange={(e) => set("summary", e.target.value)}
                  placeholder="Two or three sentences about who you are and what you bring."
                />
              </div>
              <div className="rounded-xl bg-slate-50 p-4">
                <p className="text-sm font-semibold text-slate-900">Summary writer — Template-based, no AI model</p>
                <p className="mt-1 text-xs leading-relaxed text-slate-600">
                  Pick a profession and a tone, and a proven template is filled in with your own details. No AI
                  model is involved; the text is assembled from templates you can edit afterwards.
                </p>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <div>
                    <OptionLabel>Profession</OptionLabel>
                    <select className={selectCls} value={profession} onChange={(e) => setProfession(e.target.value)}>
                      {SUMMARY_PROFESSIONS.map((p) => (
                        <option key={p} value={p}>{p}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <OptionLabel>Tone</OptionLabel>
                    <select className={selectCls} value={tone} onChange={(e) => setTone(e.target.value as SummaryTone)}>
                      <option value="professional">Professional</option>
                      <option value="confident">Confident</option>
                      <option value="friendly">Friendly</option>
                      <option value="concise">Concise</option>
                    </select>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={generateSummary}
                  className="mt-3 inline-flex items-center gap-2 rounded-full bg-teal-700 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-800"
                >
                  <Sparkles className="h-4 w-4" /> Fill summary from template
                </button>
                {writerNote && <p className="mt-2 text-xs text-teal-900">{writerNote}</p>}
              </div>
            </Section>

            {/* Experience */}
            <Section icon={<Briefcase className="h-5 w-5" />} title="Experience">
              {data.experience.map((exp, i) => (
                <div key={exp.id} className="rounded-xl border border-slate-200 p-4">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-bold text-slate-900">Job {i + 1}</p>
                    {data.experience.length > 1 && (
                      <button
                        type="button"
                        aria-label={`Remove job ${i + 1}`}
                        onClick={() => set("experience", data.experience.filter((x) => x.id !== exp.id))}
                        className="text-red-700 hover:text-red-900"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    <div>
                      <OptionLabel>Job title</OptionLabel>
                      <input
                        className={inputCls}
                        value={exp.role}
                        placeholder="Customer Support Specialist"
                        onChange={(e) =>
                          set("experience", data.experience.map((x) => (x.id === exp.id ? { ...x, role: e.target.value } : x)))
                        }
                      />
                    </div>
                    <div>
                      <OptionLabel>Company</OptionLabel>
                      <input
                        className={inputCls}
                        value={exp.company}
                        placeholder="Northwind Software"
                        onChange={(e) =>
                          set("experience", data.experience.map((x) => (x.id === exp.id ? { ...x, company: e.target.value } : x)))
                        }
                      />
                    </div>
                    <div>
                      <OptionLabel>Start (e.g. 2022-01 or Jan 2022)</OptionLabel>
                      <input
                        className={inputCls}
                        value={exp.start}
                        placeholder="2022-03"
                        onChange={(e) =>
                          set("experience", data.experience.map((x) => (x.id === exp.id ? { ...x, start: e.target.value } : x)))
                        }
                      />
                    </div>
                    <div>
                      <OptionLabel>End</OptionLabel>
                      <input
                        className={inputCls}
                        value={exp.end}
                        placeholder="2025-01"
                        disabled={exp.current}
                        onChange={(e) =>
                          set("experience", data.experience.map((x) => (x.id === exp.id ? { ...x, end: e.target.value } : x)))
                        }
                      />
                      <label className="mt-1.5 flex items-center gap-2 text-xs text-slate-700">
                        <input
                          type="checkbox"
                          checked={exp.current}
                          onChange={(e) =>
                            set("experience", data.experience.map((x) => (x.id === exp.id ? { ...x, current: e.target.checked } : x)))
                          }
                          className="h-4 w-4 accent-teal-700"
                        />
                        I work here now
                      </label>
                    </div>
                  </div>
                  <div className="mt-3">
                    <OptionLabel>What you did — one achievement per line</OptionLabel>
                    <textarea
                      className={`${inputCls} min-h-20 resize-y`}
                      value={exp.bullets}
                      placeholder={"Resolved 60+ tickets a day\nRaised first-contact resolution to 91%"}
                      onChange={(e) =>
                        set("experience", data.experience.map((x) => (x.id === exp.id ? { ...x, bullets: e.target.value } : x)))
                      }
                    />
                  </div>
                </div>
              ))}
              <button
                type="button"
                onClick={() =>
                  set("experience", [...data.experience, { id: uid("exp"), role: "", company: "", start: "", end: "", current: false, bullets: "" }])
                }
                className="inline-flex items-center gap-1.5 rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800 hover:border-teal-600"
              >
                <Plus className="h-4 w-4" /> Add another job
              </button>
            </Section>

            {/* Education */}
            <Section icon={<GraduationCap className="h-5 w-5" />} title="Education">
              {data.education.map((edu, i) => (
                <div key={edu.id} className="rounded-xl border border-slate-200 p-4">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-bold text-slate-900">Education {i + 1}</p>
                    {data.education.length > 1 && (
                      <button
                        type="button"
                        aria-label={`Remove education ${i + 1}`}
                        onClick={() => set("education", data.education.filter((x) => x.id !== edu.id))}
                        className="text-red-700 hover:text-red-900"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    <div>
                      <OptionLabel>Degree / qualification</OptionLabel>
                      <input
                        className={inputCls}
                        value={edu.degree}
                        placeholder="B.A. Communications"
                        onChange={(e) =>
                          set("education", data.education.map((x) => (x.id === edu.id ? { ...x, degree: e.target.value } : x)))
                        }
                      />
                    </div>
                    <div>
                      <OptionLabel>School / university</OptionLabel>
                      <input
                        className={inputCls}
                        value={edu.school}
                        placeholder="University of Texas at Austin"
                        onChange={(e) =>
                          set("education", data.education.map((x) => (x.id === edu.id ? { ...x, school: e.target.value } : x)))
                        }
                      />
                    </div>
                    <div>
                      <OptionLabel>Start year</OptionLabel>
                      <input
                        className={inputCls}
                        value={edu.start}
                        placeholder="2016"
                        onChange={(e) =>
                          set("education", data.education.map((x) => (x.id === edu.id ? { ...x, start: e.target.value } : x)))
                        }
                      />
                    </div>
                    <div>
                      <OptionLabel>End year</OptionLabel>
                      <input
                        className={inputCls}
                        value={edu.end}
                        placeholder="2020"
                        onChange={(e) =>
                          set("education", data.education.map((x) => (x.id === edu.id ? { ...x, end: e.target.value } : x)))
                        }
                      />
                    </div>
                  </div>
                </div>
              ))}
              <button
                type="button"
                onClick={() => set("education", [...data.education, { id: uid("edu"), degree: "", school: "", start: "", end: "" }])}
                className="inline-flex items-center gap-1.5 rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800 hover:border-teal-600"
              >
                <Plus className="h-4 w-4" /> Add another qualification
              </button>
            </Section>

            {/* Skills */}
            <Section icon={<ListChecks className="h-5 w-5" />} title="Skills">
              <div>
                <OptionLabel>Skills — separated by commas, or one per line</OptionLabel>
                <textarea
                  className={`${inputCls} min-h-20 resize-y`}
                  value={data.skills}
                  onChange={(e) => set("skills", e.target.value)}
                  placeholder="Customer support, Zendesk, Live chat, Conflict resolution"
                />
                <p className="mt-1.5 text-xs text-slate-500">
                  List the skills the job asks for, using the employer&apos;s own words where you honestly have them.
                </p>
              </div>
            </Section>

            {/* Languages */}
            <Section icon={<Languages className="h-5 w-5" />} title="Languages">
              <div>
                <OptionLabel>Languages — separated by commas, or one per line</OptionLabel>
                <textarea
                  className={`${inputCls} min-h-20 resize-y`}
                  value={data.languages}
                  onChange={(e) => set("languages", e.target.value)}
                  placeholder="English (native), Spanish (conversational)"
                />
                <p className="mt-1.5 text-xs text-slate-500">
                  Add your level in brackets if you like, for example &ldquo;French (fluent)&rdquo;. Languages
                  appear in their own section in the preview and in the Word export.
                </p>
              </div>
            </Section>
          </div>

          {/* ------------------------------------------------ Preview */}
          <div className="lg:sticky lg:top-20 lg:self-start">
            <p className="no-print mb-3 text-sm font-semibold text-slate-700">
              Live preview — {TEMPLATES.find((t) => t.id === template)?.name} template ·{" "}
              {fontId ? getResumeFont(fontId).name : `Template default (${getResumeFont(TEMPLATE_DEFAULT_FONTS[template]).name})`} ·{" "}
              {getResumeTheme(themeId).name} theme
            </p>
            <div className="rounded-2xl border border-slate-200 bg-slate-100 p-4 sm:p-6">
              <ResumePreview
                data={data}
                template={template}
                dateFormat={dateFormat}
                photo={photoOn ? photo : null}
                fontId={fontId}
                themeId={themeId}
              />
            </div>
            <p className="no-print mt-3 text-xs leading-relaxed text-slate-500">
              The preview is what the PDF export prints. For the cleanest result, choose “Save as PDF” in the
              print dialog, A4 paper, and switch off headers and footers.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
