"use client";

import { memo, useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
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
  BookOpen,
  Quote,
  PenLine,
  Check,
} from "lucide-react";
import { inputCls, selectCls, OptionLabel } from "@/components/tool-ui";
import { downloadBlob } from "@/lib/pdf-utils";
import {
  SAMPLE_RESUME,
  PLACEHOLDER_RESUME,
  isResumeEmpty,
  TEMPLATES,
  DATE_FORMATS,
  SUMMARY_PROFESSIONS,
  STORAGE_KEY,
  buildSummary,
  buildResumeDocx,
  sanitizeDocxFilename,
  parseUploadedResume,
  parseResumeText,
  skillEntries,
  languageEntries,
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
  skillLevels: {},
  languageLevels: {},
  academicExperience: [],
  referencesText: "",
  referencesOnRequest: false,
};

function uid(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function titleCaseWords(s: string) {
  return s.replace(/\b\w+/g, (w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase());
}

/** A phone-like run of digits (9+ digits, so year ranges like 2020–2025 are never mistaken for a phone number). */
function extractPhone(text: string): string | null {
  const matches = text.match(/\+?\d[\d\s().-]{7,}\d/g) ?? [];
  for (const m of matches) {
    if ((m.match(/\d/g) ?? []).length >= 9) return m.replace(/\s+/g, " ").trim();
  }
  return null;
}

// ---------------------------------------------------------------------------
// "Write it in plain words": reshape free prose into the line-structured
// text parseResumeText() was built for. parseResumeText does ALL of the real
// parsing — sections, dates, jobs, education, contact details — and this
// helper only re-lines the input so that parser can see it:
//   • sentences become one-per-line (a single paragraph has <3 lines, and
//     the parser ignores such short input entirely);
//   • email / phone / LinkedIn are hoisted to standalone lines at the top,
//     where the parser looks for contact details, and stripped out of the
//     prose so they do not pollute the summary;
//   • "I am Umer, a law student at National Law College." becomes a name
//     line, a title line and an Education entry;
//   • "I know legal research and moot courts." becomes a skills list.
// Two plain-words patterns are returned separately instead of being fed to
// the parser, because the parser cannot see them at all: a name inside a
// sentence ("I am …") is not a name-shaped line, and a skill line containing
// the word "research" trips the parser's section-header test and is
// misfiled as academic experience. They are applied afterwards, only when
// the parser left that field blank, and the result panel says so.
// ---------------------------------------------------------------------------
function normalisePlainWords(raw: string): {
  text: string;
  nameFromIntro: string;
  skillsFromIntro: string[];
} {
  let lines = raw.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  if (lines.length < 3) {
    lines = raw
      .replace(/([.!?])\s+(?=[A-Z0-9"“])/g, "$1\n")
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);
  }
  const emailMatch = raw.match(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/);
  const phone = extractPhone(raw);
  const linkedinMatch = raw.match(/linkedin\.com\/[^\s,]+/i);
  const stripContact = (line: string) =>
    line
      .replace(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g, "")
      .replace(/linkedin\.com\/[^\s,]+/gi, "")
      .replace(/^(email|phone|tel|contact)\s*:?\s*/i, "")
      .replace(/\s{2,}/g, " ")
      .replace(/^\s*[|,;]\s*/, "")
      .replace(/\s*[|,;]\s*$/, "")
      .trim();

  let nameFromIntro = "";
  let titleLine = "";
  const first = lines[0] ?? "";
  const intro = first.match(/^(?:my name is|i am|i'm|this is)\s+([A-Za-z][A-Za-z'’-]+(?:\s+[A-Za-z][A-Za-z'’-]+){0,3})/i);
  if (intro) {
    nameFromIntro = titleCaseWords(intro[1].trim());
    const rest = first.slice(intro[0].length).replace(/^[\s,]+/, "").trim();
    if (rest) lines[0] = rest;
    else lines.shift();
  }

  const summaryLines: string[] = [];
  const eduLines: string[] = [];
  const expLines: string[] = [];
  const skillsFromIntro: string[] = [];
  for (const rawLine of lines) {
    // A phone number is stripped only when it is the whole contact token;
    // a date range inside a sentence keeps its digits (see extractPhone).
    const withoutEmail = rawLine
      .replace(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g, "")
      .replace(/linkedin\.com\/[^\s,]+/gi, "");
    const phoneInLine = extractPhone(withoutEmail);
    const line = stripContact(phoneInLine ? withoutEmail.replace(phoneInLine, "") : withoutEmail);
    if (!line) continue;
    const student = line.match(/^(?:a|an|the)?\s*([A-Za-z][A-Za-z &/-]*?)\s+student\s+at\s+(.+?)\.?$/i);
    if (student) {
      const degree = titleCaseWords(`${student[1].trim()} student`);
      eduLines.push(degree, student[2].trim());
      if (nameFromIntro && !titleLine) titleLine = degree;
      continue;
    }
    const work = line.match(/^(?:i work as|i'm|i am)\s+(?:a|an|the)?\s*(.+?)\s+at\s+(.+?)\.?$/i);
    if (work) {
      const role = titleCaseWords(work[1].trim());
      expLines.push(`${role} at ${work[2].trim()}`);
      if (nameFromIntro && !titleLine) titleLine = role;
      continue;
    }
    const skills = line.match(/^(?:i know|my skills are|my skills include|i can do|i'm good at|i am good at|skilled in)\s+(.+?)\.?$/i);
    if (skills) {
      for (const item of skills[1].split(/,|\s+and\s+/)) {
        const clean = item.trim();
        if (clean) skillsFromIntro.push(clean);
      }
      continue;
    }
    summaryLines.push(line);
  }

  const out: string[] = [];
  if (nameFromIntro) out.push(nameFromIntro);
  // A title line is only safe directly under a name: on its own the parser
  // would read "Law Student" as the person's name.
  if (titleLine) out.push(titleLine);
  if (emailMatch) out.push(emailMatch[0]);
  if (phone) out.push(phone);
  if (linkedinMatch) out.push(linkedinMatch[0].replace(/\/$/, ""));
  if (summaryLines.length) out.push("Summary", ...summaryLines);
  if (eduLines.length) out.push("Education", ...eduLines);
  if (expLines.length) out.push("Experience", ...expLines);
  return { text: out.join("\n"), nameFromIntro, skillsFromIntro };
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

type PreviewZoom = "fit" | 50 | 75 | 100;

// ---------------------------------------------------------------------------
// Miniature live template thumbnails for the picker. Each thumbnail renders
// the real ResumePreview for one template with the sample resume, that
// template's default font and the teal theme, scaled down to the button
// width with a screen-only transform (same technique as the preview zoom).
// The sheet is 820px wide; unlike the first version — which showed it in a
// fixed 240px-tall window, so only the top of the design was visible — the
// whole page is shown: the miniature sheet's real (unscaled) height is
// measured with a ResizeObserver (transforms do not change offsetHeight, so
// the measurement stays stable while scaled) and the outer box is sized to
// sheetHeight × scale, so header, sections, references and footer are all
// visible at once, exactly like a template gallery. The box is therefore
// taller than 240px (roughly A4 proportions). Thumbnails are memoized (their
// props never change, so typing in the form never re-renders them) and
// mounted lazily with an IntersectionObserver, so the page does not mount
// 14+ full sheets on first load — they appear as the user scrolls the
// picker, with no click needed. printable={false}: no id="resume-print", so
// the print stylesheet can never print a thumbnail and no duplicate ids
// appear in the page.
// ---------------------------------------------------------------------------
const THUMB_SHEET_WIDTH = 820;
// A4 proportions, used only until the sheet's real height is measured.
const THUMB_FALLBACK_ASPECT = 297 / 210;

function TemplateThumbnail({ templateId }: { templateId: ResumeTemplateId }) {
  const outerRef = useRef<HTMLDivElement | null>(null);
  const sheetRef = useRef<HTMLDivElement | null>(null);
  const [width, setWidth] = useState(0);
  const [sheetHeight, setSheetHeight] = useState(0);
  useEffect(() => {
    const el = outerRef.current;
    if (!el) return;
    const measure = () => setWidth(el.clientWidth);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  // Measure the unscaled sheet height: the wrapper is transformed, and a
  // transform never changes offsetHeight, so this is the true page height.
  const widthReady = width > 0;
  useEffect(() => {
    if (!widthReady) return;
    const el = sheetRef.current;
    if (!el) return;
    const measure = () => {
      const h = el.offsetHeight;
      if (h > 0) setSheetHeight((prev) => (Math.abs(prev - h) > 1 ? h : prev));
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [widthReady]);
  const scale = widthReady ? width / THUMB_SHEET_WIDTH : 0;
  // Full page, no cropping: the box is exactly as tall as the scaled sheet
  // (plus 2px for sub-pixel rounding), never a fixed window.
  const height = widthReady
    ? sheetHeight > 0
      ? sheetHeight * scale + 2
      : width * THUMB_FALLBACK_ASPECT
    : undefined;
  return (
    <div
      ref={outerRef}
      className="relative rounded-lg bg-slate-100"
      style={height ? { height } : undefined}
      aria-hidden="true"
    >
      {widthReady && (
        <div
          ref={sheetRef}
          style={{ width: THUMB_SHEET_WIDTH, transform: `scale(${scale})`, transformOrigin: "top left" }}
        >
          <ResumePreview
            data={SAMPLE_RESUME}
            template={templateId}
            dateFormat="mon-yyyy"
            photo={null}
            photoOn
            fontId={null}
            themeId="teal"
            printable={false}
          />
        </div>
      )}
    </div>
  );
}

const MemoThumbnail = memo(TemplateThumbnail);

function LazyThumbnail({ templateId }: { templateId: ResumeTemplateId }) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === "undefined") {
      setInView(true);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setInView(true);
          io.disconnect();
        }
      },
      { rootMargin: "300px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return (
    <div ref={ref}>
      {inView ? (
        <MemoThumbnail templateId={templateId} />
      ) : (
        <div className="flex aspect-[820/1180] w-full items-center justify-center rounded-lg bg-slate-100 text-xs font-medium text-slate-400">
          Loading preview…
        </div>
      )}
    </div>
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
  const [docxBusy, setDocxBusy] = useState(false);
  const [docxError, setDocxError] = useState<string | null>(null);
  const [uploadBusy, setUploadBusy] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadResult, setUploadResult] = useState<ResumeParseResult | null>(null);
  // "Write it in plain words" (Phase 3) and per-template sample confirm (Phase 4).
  const [plainText, setPlainText] = useState("");
  const [plainTextError, setPlainTextError] = useState<string | null>(null);
  const [plainTextReport, setPlainTextReport] = useState<{
    filled: string[];
    skipped: string[];
    missing: string[];
    warnings: string[];
  } | null>(null);
  const [confirmSampleFor, setConfirmSampleFor] = useState<ResumeTemplateId | null>(null);
  const [profession, setProfession] = useState<string>(SUMMARY_PROFESSIONS[0]);
  const [tone, setTone] = useState<SummaryTone>("professional");
  const [writerNote, setWriterNote] = useState<string | null>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const uploadInputRef = useRef<HTMLInputElement>(null);

  // Preview zoom: "fit" scales the whole sheet into view; 50/75/100% are
  // fixed scales. The sheet's unscaled height is measured — transforms do not
  // change offsetHeight, so the measurement stays stable while zoomed.
  const [zoom, setZoom] = useState<PreviewZoom>("fit");
  const [sheetHeight, setSheetHeight] = useState(0);
  const [viewportHeight, setViewportHeight] = useState(0);
  const sheetWrapRef = useRef<HTMLDivElement | null>(null);

  // On a phone the preview sits BELOW the form, so tapping a template or
  // loading a sample would change something the user cannot see — it looked
  // like the button did nothing. After any template/sample action, bring the
  // preview into view on narrow screens. On desktop the preview sits beside
  // the form, so no scroll is needed there. (The preview column carries
  // id="resume-live-preview"; useTemplate scrolls to the same id.)
  const scrollToPreview = () => {
    if (typeof window === "undefined") return;
    if (window.innerWidth >= 1024) return;
    document.getElementById("resume-live-preview")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  // Load a saved resume from this browser only, on first render.
  // The form renders immediately (server-side too) so the page is usable
  // without JavaScript; the saved copy is applied on top once it loads.
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
          // Older saves have no languages / skill-level / academic-experience
          // / references fields; the EMPTY defaults fill them in.
          setData({
            ...EMPTY,
            ...parsed.data,
            languages: parsed.data.languages ?? "",
            skillLevels: parsed.data.skillLevels ?? {},
            languageLevels: parsed.data.languageLevels ?? {},
            academicExperience: parsed.data.academicExperience ?? [],
            referencesText: parsed.data.referencesText ?? "",
            referencesOnRequest: parsed.data.referencesOnRequest ?? false,
          });
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
  }, []);

  // Measure the unscaled sheet height (and the viewport) so "Fit" can scale
  // the whole sheet into view. Re-measures whenever the sheet resizes —
  // content edits, template/font/theme/photo changes — and on window resize.
  useLayoutEffect(() => {
    const el = sheetWrapRef.current;
    if (!el) return;
    const measure = () => {
      const h = el.offsetHeight;
      if (h > 0) setSheetHeight((prev) => (Math.abs(prev - h) > 1 ? h : prev));
      setViewportHeight(window.innerHeight);
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    window.addEventListener("resize", measure);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, []);

  // Fit: shrink the sheet just enough to fit the visible preview area
  // (viewport minus the sticky header, zoom bar and margins). Never enlarge.
  const FIT_ALLOWANCE_PX = 180;
  const fitScale =
    sheetHeight > 0 && viewportHeight > 0
      ? Math.min(1, Math.max(0.2, (viewportHeight - FIT_ALLOWANCE_PX) / sheetHeight))
      : 1;
  const scale = zoom === "fit" ? fitScale : zoom / 100;

  // Empty form: the live preview shows the full template with placeholder
  // text so the user sees the design at once. previewData is derived, never
  // stored — the form state, save, upload and DOCX export always use the
  // real `data`, and the export buttons stay disabled while empty, so
  // placeholder text can never leak into a PDF or Word file.
  const isEmpty = isResumeEmpty(data);
  const previewData = isEmpty ? PLACEHOLDER_RESUME : data;

  const set = useCallback(<K extends keyof ResumeData>(key: K, value: ResumeData[K]) => {
    setData((d) => ({ ...d, [key]: value }));
  }, []);

  // Skills / languages: keep the per-item levels in step with the list text —
  // levels for skills that were deleted are dropped.
  const setSkills = useCallback((text: string) => {
    setData((d) => {
      const kept: Record<string, number> = {};
      const names = new Set(text.split(/[,\n;]+/).map((x) => x.trim()).filter(Boolean));
      for (const [k, v] of Object.entries(d.skillLevels ?? {})) {
        if (names.has(k) || [...names].some((n) => n.toLowerCase() === k.toLowerCase())) kept[k] = v;
      }
      return { ...d, skills: text, skillLevels: kept };
    });
  }, []);

  const setLanguages = useCallback((text: string) => {
    setData((d) => {
      const kept: Record<string, number> = {};
      const names = new Set(text.split(/[,\n;]+/).map((x) => x.trim()).filter(Boolean));
      for (const [k, v] of Object.entries(d.languageLevels ?? {})) {
        if (names.has(k) || [...names].some((n) => n.toLowerCase() === k.toLowerCase())) kept[k] = v;
      }
      return { ...d, languages: text, languageLevels: kept };
    });
  }, []);

  const setSkillLevel = useCallback((name: string, level: number) => {
    setData((d) => ({ ...d, skillLevels: { ...(d.skillLevels ?? {}), [name]: level } }));
  }, []);

  const setLanguageLevel = useCallback((name: string, level: number) => {
    setData((d) => ({ ...d, languageLevels: { ...(d.languageLevels ?? {}), [name]: level } }));
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

  /** Load the sample resume into the form. Never silently overwrites what
   * the user has typed: the toolbar button asks first, and "Use this
   * sample" on a template asks inline (see useSample). */
  const applySample = (id: ResumeTemplateId) => {
    setTemplate(id);
    setData(SAMPLE_RESUME);
    setUploadResult(null);
    setPlainTextReport(null);
    setPlainTextError(null);
    setConfirmSampleFor(null);
    setSavedNote("Loaded the sample resume. Replace the details with your own.");
  };

  const loadSample = () => {
    if (!isResumeEmpty(data) && !window.confirm("Loading the sample replaces what is in the form now. Continue?")) return;
    applySample(template);
    scrollToPreview();
  };

  /** "Use this sample" on a template card: selects that template and loads
   * the sample resume. Empty form loads straight away; a form with the
   * user's own details opens an inline confirm on that card instead. */
  const useSample = (id: ResumeTemplateId) => {
    setTemplate(id);
    if (isResumeEmpty(data)) {
      applySample(id);
      scrollToPreview();
      return;
    }
    setConfirmSampleFor(id);
  };

  /** "Use this Template" on a template card: selects that template without
   * touching the form data, and shows the choice in the live preview. The
   * thumbnail click already did this silently, which is why visitors could
   * not find a working button for it. */
  const useTemplate = (id: ResumeTemplateId) => {
    setTemplate(id);
    setConfirmSampleFor(null);
    const name = TEMPLATES.find((t) => t.id === id)?.name ?? "Selected";
    setSavedNote(`${name} template selected — fill in your details below and watch the live preview update.`);
    // On narrow screens the preview sits below the form, so bring it into
    // view; on desktop it is already visible in the sticky right column.
    if (window.innerWidth < 1024) {
      document.getElementById("resume-live-preview")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
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

  // -----------------------------------------------------------------------
  // Phase 3 — "Write it in plain words": paste simple text, fill the form.
  // Template-based, no AI model: the text is reshaped by
  // normalisePlainWords() and parsed on this device by the existing
  // parseResumeText(); nothing is sent anywhere.
  //
  // Non-empty-form behaviour (chosen): FILL ONLY BLANK FIELDS. Anything the
  // user already typed is never overwritten — a filled field is reported as
  // "already filled, left as it was". Lists (skills, languages) are the one
  // exception to strict blank-only: new items are appended to the existing
  // list, never replacing it. Experience / education / academic experience
  // are replaced only when that whole section is empty; otherwise they are
  // left untouched and reported as skipped.
  // -----------------------------------------------------------------------
  const applyPlainWords = () => {
    const raw = plainText.trim();
    setPlainTextError(null);
    setPlainTextReport(null);
    if (raw.length < 10) {
      setPlainTextError("Write a little more first — at least your name and one detail, for example your email or a skill.");
      return;
    }
    const norm = normalisePlainWords(raw);
    const result = parseResumeText(norm.text);
    const parsed = result.data;
    // Plain-words fallbacks the file parser cannot see (see
    // normalisePlainWords): a name inside "I am …" and skills inside
    // "I know …". Applied only where the parser left the field blank.
    const nameFromIntro = !parsed.fullName && norm.nameFromIntro ? norm.nameFromIntro : "";
    const skillsFromIntro = !parsed.skills && norm.skillsFromIntro.length ? norm.skillsFromIntro : [];

    const filled: string[] = [];
    const skipped: string[] = [];
    const next: ResumeData = {
      ...data,
      experience: data.experience.map((e) => ({ ...e })),
      education: data.education.map((e) => ({ ...e })),
      academicExperience: (data.academicExperience ?? []).map((a) => ({ ...a })),
    };
    const fillScalar = (key: "fullName" | "title" | "email" | "phone" | "location" | "website" | "linkedin" | "summary", label: string, value: string) => {
      if (value.trim() && !data[key].trim()) {
        next[key] = value;
        filled.push(label);
      } else if (value.trim()) {
        skipped.push(label);
      }
    };
    fillScalar("fullName", "Name", parsed.fullName || nameFromIntro);
    fillScalar("title", "Job title", parsed.title);
    fillScalar("email", "Email", parsed.email);
    fillScalar("phone", "Phone", parsed.phone);
    fillScalar("location", "Location", parsed.location);
    fillScalar("website", "Website", parsed.website);
    fillScalar("linkedin", "LinkedIn", parsed.linkedin);
    fillScalar("summary", "Summary", parsed.summary);
    // Skills / languages: blank field takes the parsed list; a filled field
    // keeps what the user typed and only gains items that are not already there.
    const mergeList = (key: "skills" | "languages", label: string, parsedText: string, fromIntro: string[]) => {
      const items = parsedText
        .split(/[,\n;]+/)
        .map((s) => s.trim())
        .filter(Boolean);
      const all = [...items, ...fromIntro];
      if (!all.length) return;
      const current = data[key].trim();
      if (!current) {
        next[key] = all.join(", ");
        filled.push(fromIntro.length && !items.length ? `${label} (from “I know…”)` : label);
        return;
      }
      const have = new Set(current.split(/[,\n;]+/).map((s) => s.trim().toLowerCase()));
      const fresh = all.filter((it) => !have.has(it.toLowerCase()));
      if (fresh.length) {
        next[key] = `${current}, ${fresh.join(", ")}`;
        filled.push(`${label} (added ${fresh.join(", ")})`);
      } else {
        skipped.push(label);
      }
    };
    mergeList("skills", "Skills", parsed.skills, skillsFromIntro);
    mergeList("languages", "Languages", parsed.languages, []);
    // Whole sections: replace only when the user's section is empty.
    // (Row ids are ignored — an empty row still has an id.)
    const expEmpty = data.experience.every((e) => !e.role.trim() && !e.company.trim() && !e.bullets.trim());
    const eduEmpty = data.education.every((e) => !e.degree.trim() && !e.school.trim());
    const acadEmpty = (data.academicExperience ?? []).every((a) => !a.title.trim() && !a.org.trim() && !a.bullets.trim());
    if (parsed.experience.length) {
      if (expEmpty) {
        next.experience = parsed.experience;
        filled.push(`${parsed.experience.length} job${parsed.experience.length > 1 ? "s" : ""}`);
      } else {
        skipped.push("Experience (already has entries)");
      }
    }
    if (parsed.education.length) {
      if (eduEmpty) {
        next.education = parsed.education;
        filled.push(`${parsed.education.length} education ${parsed.education.length > 1 ? "entries" : "entry"}`);
      } else {
        skipped.push("Education (already has entries)");
      }
    }
    if ((parsed.academicExperience ?? []).length) {
      if (acadEmpty) {
        next.academicExperience = parsed.academicExperience;
        filled.push("Academic experience");
      } else {
        skipped.push("Academic experience (already has entries)");
      }
    }
    if (parsed.referencesText?.trim() && !(data.referencesText ?? "").trim()) {
      next.referencesText = parsed.referencesText;
      filled.push("References");
    } else if (parsed.referencesText?.trim()) {
      skipped.push("References");
    }
    if (parsed.referencesOnRequest && !data.referencesOnRequest && !(data.referencesText ?? "").trim()) {
      next.referencesOnRequest = true;
      filled.push("References (on request)");
    }
    // What is still blank after filling — so the user knows what to add by hand.
    const stillBlank = (v: string | undefined) => !v?.trim();
    const missing: string[] = [];
    if (stillBlank(next.fullName)) missing.push("Name");
    if (stillBlank(next.title)) missing.push("Job title");
    if (stillBlank(next.email)) missing.push("Email");
    if (stillBlank(next.phone)) missing.push("Phone");
    if (stillBlank(next.location)) missing.push("Location");
    if (stillBlank(next.summary)) missing.push("Summary");
    if (next.experience.every((e) => !e.role.trim() && !e.company.trim() && !e.bullets.trim())) missing.push("Experience");
    if (next.education.every((e) => !e.degree.trim() && !e.school.trim())) missing.push("Education");
    if (stillBlank(next.skills)) missing.push("Skills");
    if (stillBlank(next.languages)) missing.push("Languages");

    if (!filled.length) {
      setPlainTextError(
        "We couldn't pick out any details from that text. Try short lines — your name on the first line, then your email and phone, then headings like “Skills:” or “Experience:” followed by the details — or fill in the form by hand below.",
      );
      setPlainTextReport({ filled, skipped, missing, warnings: result.warnings });
      return;
    }
    setData(next);
    setPlainTextReport({ filled, skipped, missing, warnings: result.warnings });
    setSavedNote("Filled in what we could find from your words — check the fields below and fix anything we missed.");
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

  return (
    <div>
      <style>{`
        @page { size: A4; margin: 12mm 14mm; }
        @media print {
          .no-print { display: none !important; }
          body * { visibility: hidden !important; }
          #resume-print, #resume-print * { visibility: visible !important; }
          #resume-print { position: absolute !important; left: 0; top: 0; width: 100% !important; max-width: none !important; box-shadow: none !important; padding: 0 !important; transform: none !important; print-color-adjust: exact !important; -webkit-print-color-adjust: exact !important; }
          /* The zoom wrappers are screen-only: the !important rules below beat
             their inline styles, so printing always uses the full-size sheet. */
          .resume-zoom-outer { height: auto !important; }
          .resume-zoom-inner { transform: none !important; }
          #resume-print section { break-inside: avoid; }
          #resume-print h1, #resume-print h2 { break-after: avoid; }
        }
      `}</style>

      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
        <p className="text-xs font-semibold uppercase tracking-wider text-teal-700">Resume builder</p>
        <h1 className="mt-2 font-display text-3xl font-bold text-slate-900 sm:text-4xl">Build a free resume that gets read</h1>
        <p className="mt-2 max-w-2xl leading-relaxed text-slate-600">
          Fill in the form and watch the preview update live. Pick one of {TEMPLATES.length} original templates, choose a
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
            disabled={isEmpty}
            title={isEmpty ? "Add your details first — the preview is showing placeholder text" : undefined}
            className="inline-flex items-center gap-2 rounded-full bg-teal-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-teal-800 disabled:opacity-50"
          >
            <Printer className="h-4 w-4" /> Export PDF (print → Save as PDF)
          </button>
          <button
            type="button"
            onClick={exportDocx}
            disabled={docxBusy || isEmpty}
            title={isEmpty ? "Add your details first — the preview is showing placeholder text" : undefined}
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
                    <div
                      key={t.id}
                      className={`rounded-xl border transition ${
                        template === t.id
                          ? "border-teal-700 bg-teal-50 ring-1 ring-teal-700"
                          : "border-slate-300 bg-white hover:border-teal-600"
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => useTemplate(t.id)}
                        aria-pressed={template === t.id}
                        className="block w-full p-3 text-left"
                      >
                        <LazyThumbnail templateId={t.id} />
                        <span className="mt-2 block text-sm font-bold text-slate-900">{t.name}</span>
                        <span className="mt-1 block text-xs leading-relaxed text-slate-600">{t.description}</span>
                      </button>
                      <div className="flex flex-wrap gap-2 px-3 pb-3">
                        {template === t.id ? (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-teal-700 px-3 py-1.5 text-xs font-semibold text-white">
                            <Check className="h-3.5 w-3.5" /> Selected
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => useTemplate(t.id)}
                            className="inline-flex items-center gap-1.5 rounded-full bg-teal-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-teal-800"
                          >
                            Use this Template
                          </button>
                        )}
                        {confirmSampleFor === t.id ? (
                          <div className="w-full rounded-lg border border-amber-300 bg-amber-50 p-2.5">
                            <p className="text-xs font-semibold leading-snug text-amber-900">
                              Replace what you typed with the sample resume?
                            </p>
                            <div className="mt-2 flex flex-wrap gap-2">
                              <button
                                type="button"
                                onClick={() => {
                                  applySample(t.id);
                                  scrollToPreview();
                                }}
                                className="rounded-full bg-amber-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-amber-800"
                              >
                                Yes, use sample
                              </button>
                              <button
                                type="button"
                                onClick={() => setConfirmSampleFor(null)}
                                className="rounded-full border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-800 hover:border-teal-600"
                              >
                                Keep mine
                              </button>
                            </div>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => useSample(t.id)}
                            className="inline-flex items-center gap-1.5 rounded-full border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-800 hover:border-teal-600"
                          >
                            <FolderOpen className="h-3.5 w-3.5" /> Use this sample
                          </button>
                        )}
                      </div>
                    </div>
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
                <OptionLabel htmlFor="resume-date-format">Date format</OptionLabel>
                <select id="resume-date-format" className={selectCls} value={dateFormat} onChange={(e) => setDateFormat(e.target.value as DateFormat)}>
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
                {photoOn && template !== "ats" && (
                  <p className="mt-2 text-xs leading-relaxed text-slate-500">
                    Your photo appears in this template&apos;s preview and Word export. Until you choose a
                    photo, the preview shows an empty placeholder box — no photo is ever added for you.
                  </p>
                )}
              </div>
            </Section>

            {/* Write it in plain words — template-based, no AI model */}
            <Section icon={<PenLine className="h-5 w-5" />} title="Write it in plain words">
              <p className="-mt-1 text-xs leading-relaxed text-slate-600">
                Type or paste a few sentences about yourself and we will fill in the form for you.
                <span className="font-semibold text-slate-800"> Template-based — no AI model:</span> your
                words are matched against plain templates on this device; nothing is sent to a server and no
                AI writes anything for you. Check every field afterwards — this only picks out what it can
                recognise, and anything it misses stays blank for you to add by hand.
              </p>
              <div>
                <OptionLabel htmlFor="resume-plain-words">Your details, in your own words</OptionLabel>
                <textarea
                  id="resume-plain-words"
                  className={`${inputCls} min-h-28 pb-3 resize-y`}
                  value={plainText}
                  onChange={(e) => setPlainText(e.target.value)}
                  placeholder={"I am Umer, a law student at National Law College. I know legal research and moot courts. Email umer@example.com. Phone 03331234567."}
                />
                <p className="mt-1.5 text-xs leading-relaxed text-slate-500">
                  Short lines work best: your name first, then your email and phone, then lines like
                  “I know …” for skills. For longer lists, use headings such as “Skills:” or
                  “Experience:” followed by the details. Fields you already filled in are never
                  overwritten — only blank fields are filled, and new skills are added to your list.
                </p>
              </div>
              <button
                type="button"
                onClick={applyPlainWords}
                disabled={!plainText.trim()}
                className="inline-flex items-center gap-2 rounded-full bg-teal-700 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-800 disabled:opacity-50"
              >
                <PenLine className="h-4 w-4" /> Fill in my resume from this text
              </button>
              {plainTextError && (
                <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-800">{plainTextError}</p>
              )}
              {plainTextReport && plainTextReport.filled.length > 0 && (
                <div className="rounded-xl border border-teal-200 bg-teal-50 px-4 py-2.5 text-sm text-teal-900">
                  <p className="font-semibold">What we found in your words — check it below and correct anything we missed:</p>
                  <p className="mt-1">Filled in: {plainTextReport.filled.join(" · ")}</p>
                  {plainTextReport.skipped.length > 0 && (
                    <p className="mt-1">Already filled in — left as they were: {plainTextReport.skipped.join(" · ")}</p>
                  )}
                  {plainTextReport.missing.length > 0 && (
                    <p className="mt-1">Still blank — add by hand: {plainTextReport.missing.join(" · ")}</p>
                  )}
                  {plainTextReport.warnings.length > 0 && (
                    <ul className="mt-1 list-disc space-y-0.5 pl-5">
                      {plainTextReport.warnings.map((w, i) => (
                        <li key={i}>{w}</li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </Section>

            {/* Personal info */}
            <Section icon={<User className="h-5 w-5" />} title="Personal information">
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <OptionLabel htmlFor="resume-full-name">Full name</OptionLabel>
                  <input id="resume-full-name" className={inputCls} value={data.fullName} onChange={(e) => set("fullName", e.target.value)} placeholder="Alex Morgan" />
                </div>
                <div>
                  <OptionLabel htmlFor="resume-job-title">Job title</OptionLabel>
                  <input id="resume-job-title" className={inputCls} value={data.title} onChange={(e) => set("title", e.target.value)} placeholder="Customer Support Specialist" />
                </div>
                <div>
                  <OptionLabel htmlFor="resume-email">Email</OptionLabel>
                  <input id="resume-email" className={inputCls} type="email" value={data.email} onChange={(e) => set("email", e.target.value)} placeholder="you@example.com" />
                </div>
                <div>
                  <OptionLabel htmlFor="resume-phone">Phone</OptionLabel>
                  <input id="resume-phone" className={inputCls} value={data.phone} onChange={(e) => set("phone", e.target.value)} placeholder="+1 (555) 010-2030" />
                </div>
                <div>
                  <OptionLabel htmlFor="resume-location">Location</OptionLabel>
                  <input id="resume-location" className={inputCls} value={data.location} onChange={(e) => set("location", e.target.value)} placeholder="City, Country" />
                </div>
                <div>
                  <OptionLabel htmlFor="resume-website-portfolio-optional">Website / portfolio (optional)</OptionLabel>
                  <input id="resume-website-portfolio-optional" className={inputCls} value={data.website} onChange={(e) => set("website", e.target.value)} placeholder="yourname.com" />
                </div>
                <div className="sm:col-span-2">
                  <OptionLabel htmlFor="resume-linkedin-optional">LinkedIn (optional)</OptionLabel>
                  <input id="resume-linkedin-optional" className={inputCls} value={data.linkedin} onChange={(e) => set("linkedin", e.target.value)} placeholder="linkedin.com/in/yourname" />
                </div>
              </div>
            </Section>

            {/* Summary + writer */}
            <Section icon={<Sparkles className="h-5 w-5" />} title="Summary">
              <div>
                <OptionLabel htmlFor="resume-professional-summary">Professional summary</OptionLabel>
                <textarea id="resume-professional-summary"
                  className={`${inputCls} min-h-24 pb-3 resize-y`}
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
                    <OptionLabel htmlFor="resume-profession">Profession</OptionLabel>
                    <select id="resume-profession" className={selectCls} value={profession} onChange={(e) => setProfession(e.target.value)}>
                      {SUMMARY_PROFESSIONS.map((p) => (
                        <option key={p} value={p}>{p}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <OptionLabel htmlFor="resume-tone">Tone</OptionLabel>
                    <select id="resume-tone" className={selectCls} value={tone} onChange={(e) => setTone(e.target.value as SummaryTone)}>
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
                      <OptionLabel htmlFor="{exp-role-${exp.id}}">Job title</OptionLabel>
                      <input id="{exp-role-${exp.id}}"
                        className={inputCls}
                        value={exp.role}
                        placeholder="Customer Support Specialist"
                        onChange={(e) =>
                          set("experience", data.experience.map((x) => (x.id === exp.id ? { ...x, role: e.target.value } : x)))
                        }
                      />
                    </div>
                    <div>
                      <OptionLabel htmlFor="{exp-company-${exp.id}}">Company</OptionLabel>
                      <input id="{exp-company-${exp.id}}"
                        className={inputCls}
                        value={exp.company}
                        placeholder="Northwind Software"
                        onChange={(e) =>
                          set("experience", data.experience.map((x) => (x.id === exp.id ? { ...x, company: e.target.value } : x)))
                        }
                      />
                    </div>
                    <div>
                      <OptionLabel htmlFor="{exp-start-${exp.id}}">Start (e.g. 2022-01 or Jan 2022)</OptionLabel>
                      <input id="{exp-start-${exp.id}}"
                        className={inputCls}
                        value={exp.start}
                        placeholder="2022-03"
                        onChange={(e) =>
                          set("experience", data.experience.map((x) => (x.id === exp.id ? { ...x, start: e.target.value } : x)))
                        }
                      />
                    </div>
                    <div>
                      <OptionLabel htmlFor="{exp-end-${exp.id}}">End</OptionLabel>
                      <input id="{exp-end-${exp.id}}"
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
                    <OptionLabel htmlFor="{exp-bullets-${exp.id}}">What you did — one achievement per line</OptionLabel>
                    <textarea id="{exp-bullets-${exp.id}}"
                      className={`${inputCls} min-h-24 pb-3 resize-y`}
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
                      <OptionLabel htmlFor="{edu-degree-${edu.id}}">Degree / qualification</OptionLabel>
                      <input id="{edu-degree-${edu.id}}"
                        className={inputCls}
                        value={edu.degree}
                        placeholder="B.A. Communications"
                        onChange={(e) =>
                          set("education", data.education.map((x) => (x.id === edu.id ? { ...x, degree: e.target.value } : x)))
                        }
                      />
                    </div>
                    <div>
                      <OptionLabel htmlFor="{edu-school-${edu.id}}">School / university</OptionLabel>
                      <input id="{edu-school-${edu.id}}"
                        className={inputCls}
                        value={edu.school}
                        placeholder="University of Texas at Austin"
                        onChange={(e) =>
                          set("education", data.education.map((x) => (x.id === edu.id ? { ...x, school: e.target.value } : x)))
                        }
                      />
                    </div>
                    <div>
                      <OptionLabel htmlFor="{edu-start-${edu.id}}">Start year</OptionLabel>
                      <input id="{edu-start-${edu.id}}"
                        className={inputCls}
                        value={edu.start}
                        placeholder="2016"
                        onChange={(e) =>
                          set("education", data.education.map((x) => (x.id === edu.id ? { ...x, start: e.target.value } : x)))
                        }
                      />
                    </div>
                    <div>
                      <OptionLabel htmlFor="{edu-end-${edu.id}}">End year</OptionLabel>
                      <input id="{edu-end-${edu.id}}"
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
                <OptionLabel htmlFor="resume-skills-separated-by-commas-or-one-per-line">Skills — separated by commas, or one per line</OptionLabel>
                <textarea id="resume-skills-separated-by-commas-or-one-per-line"
                  className={`${inputCls} min-h-24 pb-3 resize-y`}
                  value={data.skills}
                  onChange={(e) => setSkills(e.target.value)}
                  placeholder="Customer support, Zendesk, Live chat, Conflict resolution"
                />
                <p className="mt-1.5 text-xs text-slate-500">
                  Each skill appears on its own line in your resume — never as pills or chips. List the
                  skills the job asks for, using the employer&apos;s own words where you honestly have them.
                </p>
              </div>
              {skillEntries(data).length > 0 && (
                <div>
                  <OptionLabel>Skill levels — shown as bars on the Umer Classic, Executive and Creative templates</OptionLabel>
                  <div className="space-y-2">
                    {skillEntries(data).map((e) => (
                      <div key={e.name} className="flex items-center gap-3">
                        <span className="w-40 shrink-0 truncate text-sm text-slate-800" title={e.name}>
                          {e.name}
                        </span>
                        <input
                          type="range"
                          min={0}
                          max={100}
                          value={e.level}
                          aria-label={`Proficiency level for ${e.name}`}
                          onChange={(ev) => setSkillLevel(e.name, Number(ev.target.value))}
                          className="h-2 flex-1 accent-teal-700"
                        />
                        <span className="w-10 shrink-0 text-right text-xs font-semibold text-slate-700">{e.level}%</span>
                      </div>
                    ))}
                  </div>
                  <p className="mt-1.5 text-xs text-slate-500">
                    Other templates list the skills without bars. A level written in brackets, such as
                    &ldquo;French (fluent)&rdquo;, is used as the starting level.
                  </p>
                </div>
              )}
            </Section>

            {/* Languages */}
            <Section icon={<Languages className="h-5 w-5" />} title="Languages">
              <div>
                <OptionLabel htmlFor="resume-languages-separated-by-commas-or-one-per-line">Languages — separated by commas, or one per line</OptionLabel>
                <textarea id="resume-languages-separated-by-commas-or-one-per-line"
                  className={`${inputCls} min-h-24 pb-3 resize-y`}
                  value={data.languages}
                  onChange={(e) => setLanguages(e.target.value)}
                  placeholder="English (native), Spanish (conversational)"
                />
                <p className="mt-1.5 text-xs text-slate-500">
                  Each language appears on its own line in your resume. Add your level in brackets if you
                  like, for example &ldquo;French (fluent)&rdquo;.
                </p>
              </div>
              {languageEntries(data).length > 0 && (
                <div>
                  <OptionLabel>Language levels — shown as bars on the Umer Classic, Executive and Creative templates</OptionLabel>
                  <div className="space-y-2">
                    {languageEntries(data).map((e) => (
                      <div key={e.name} className="flex items-center gap-3">
                        <span className="w-40 shrink-0 truncate text-sm text-slate-800" title={e.name}>
                          {e.name}
                        </span>
                        <input
                          type="range"
                          min={0}
                          max={100}
                          value={e.level}
                          aria-label={`Proficiency level for ${e.name}`}
                          onChange={(ev) => setLanguageLevel(e.name, Number(ev.target.value))}
                          className="h-2 flex-1 accent-teal-700"
                        />
                        <span className="w-10 shrink-0 text-right text-xs font-semibold text-slate-700">{e.level}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </Section>

            {/* Academic experience */}
            <Section icon={<BookOpen className="h-5 w-5" />} title="Academic experience">
              <p className="-mt-1 text-xs leading-relaxed text-slate-500">
                Competitions, moot courts, research, conferences and other academic work — shown in its own
                section, and in two columns on the Umer Classic template.
              </p>
              {(data.academicExperience ?? []).map((item, i) => (
                <div key={item.id} className="rounded-xl border border-slate-200 p-4">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-bold text-slate-900">Academic experience {i + 1}</p>
                    <button
                      type="button"
                      aria-label={`Remove academic experience ${i + 1}`}
                      onClick={() => set("academicExperience", (data.academicExperience ?? []).filter((x) => x.id !== item.id))}
                      className="text-red-700 hover:text-red-900"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    <div>
                      <OptionLabel htmlFor="{acad-title-${item.id}}">Title</OptionLabel>
                      <input id="{acad-title-${item.id}}"
                        className={inputCls}
                        value={item.title}
                        placeholder="1st National Moot Court Competition"
                        onChange={(e) =>
                          set("academicExperience", (data.academicExperience ?? []).map((x) => (x.id === item.id ? { ...x, title: e.target.value } : x)))
                        }
                      />
                    </div>
                    <div>
                      <OptionLabel htmlFor="{acad-org-${item.id}}">Organisation / place</OptionLabel>
                      <input id="{acad-org-${item.id}}"
                        className={inputCls}
                        value={item.org}
                        placeholder="National Law College — Rawalpindi"
                        onChange={(e) =>
                          set("academicExperience", (data.academicExperience ?? []).map((x) => (x.id === item.id ? { ...x, org: e.target.value } : x)))
                        }
                      />
                    </div>
                    <div>
                      <OptionLabel htmlFor="{acad-start-${item.id}}">Start (e.g. 2024 or Jan 2024)</OptionLabel>
                      <input id="{acad-start-${item.id}}"
                        className={inputCls}
                        value={item.start}
                        placeholder="2024"
                        onChange={(e) =>
                          set("academicExperience", (data.academicExperience ?? []).map((x) => (x.id === item.id ? { ...x, start: e.target.value } : x)))
                        }
                      />
                    </div>
                    <div>
                      <OptionLabel htmlFor="{acad-end-${item.id}}">End</OptionLabel>
                      <input id="{acad-end-${item.id}}"
                        className={inputCls}
                        value={item.end}
                        placeholder="2025"
                        onChange={(e) =>
                          set("academicExperience", (data.academicExperience ?? []).map((x) => (x.id === item.id ? { ...x, end: e.target.value } : x)))
                        }
                      />
                    </div>
                  </div>
                  <div className="mt-3">
                    <OptionLabel htmlFor="{acad-bullets-${item.id}}">What you did — one achievement per line</OptionLabel>
                    <textarea id="{acad-bullets-${item.id}}"
                      className={`${inputCls} min-h-24 pb-3 resize-y`}
                      value={item.bullets}
                      placeholder={"Participated in the national moot court competition\nStrengthened skills in legal research and argumentation"}
                      onChange={(e) =>
                        set("academicExperience", (data.academicExperience ?? []).map((x) => (x.id === item.id ? { ...x, bullets: e.target.value } : x)))
                      }
                    />
                  </div>
                </div>
              ))}
              <button
                type="button"
                onClick={() =>
                  set("academicExperience", [
                    ...(data.academicExperience ?? []),
                    { id: uid("acad"), title: "", org: "", start: "", end: "", bullets: "" },
                  ])
                }
                className="inline-flex items-center gap-1.5 rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800 hover:border-teal-600"
              >
                <Plus className="h-4 w-4" /> Add academic experience
              </button>
            </Section>

            {/* References */}
            <Section icon={<Quote className="h-5 w-5" />} title="References">
              <div>
                <label className="flex items-start gap-2 text-sm text-slate-800">
                  <input
                    type="checkbox"
                    checked={data.referencesOnRequest ?? false}
                    onChange={(e) => set("referencesOnRequest", e.target.checked)}
                    className="mt-0.5 h-4 w-4 accent-teal-700"
                  />
                  <span>
                    References will be provided upon request
                    <span className="block text-xs text-slate-500">
                      Shows the standard line instead of referee details. Leave it off to list referees below.
                    </span>
                  </span>
                </label>
              </div>
              <div>
                <OptionLabel htmlFor="resume-referees-name-role-and-contact-one-per-line-optional">Referees — name, role and contact, one per line (optional)</OptionLabel>
                <textarea id="resume-referees-name-role-and-contact-one-per-line-optional"
                  className={`${inputCls} min-h-24 pb-3 resize-y`}
                  value={data.referencesText ?? ""}
                  disabled={data.referencesOnRequest ?? false}
                  onChange={(e) => set("referencesText", e.target.value)}
                  placeholder={"Dr A. Khan, Lecturer in Law, National Law College — a.khan@example.com"}
                />
              </div>
            </Section>
          </div>

          {/* ------------------------------------------------ Preview */}
          <div id="resume-live-preview" className="lg:sticky lg:top-20 lg:self-start">
            <div className="no-print mb-3 flex flex-wrap items-end justify-between gap-x-3 gap-y-2">
              <p className="text-sm font-semibold text-slate-700">
                Live preview — {TEMPLATES.find((t) => t.id === template)?.name} template ·{" "}
                {fontId ? getResumeFont(fontId).name : `Template default (${getResumeFont(TEMPLATE_DEFAULT_FONTS[template]).name})`} ·{" "}
                {getResumeTheme(themeId).name} theme
              </p>
              <div className="flex items-center gap-1" role="group" aria-label="Preview zoom">
                <span className="mr-1 text-xs font-semibold text-slate-600">Zoom</span>
                {(["fit", 50, 75, 100] as PreviewZoom[]).map((z) => (
                  <button
                    key={String(z)}
                    type="button"
                    onClick={() => setZoom(z)}
                    aria-pressed={zoom === z}
                    className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                      zoom === z
                        ? "bg-teal-700 text-white"
                        : "border border-slate-300 bg-white text-slate-700 hover:border-teal-600"
                    }`}
                  >
                    {z === "fit" ? "Fit" : `${z}%`}
                  </button>
                ))}
                {zoom === "fit" && sheetHeight > 0 && (
                  <span className="ml-1 text-xs text-slate-500">showing at {Math.round(scale * 100)}%</span>
                )}
              </div>
            </div>
            {isEmpty && (
              <p className="no-print mb-3 rounded-xl bg-teal-50 px-4 py-2.5 text-sm text-teal-900">
                Showing a placeholder preview so you can see the full{" "}
                {TEMPLATES.find((t) => t.id === template)?.name} layout. Type your details — or load the
                sample — and the preview switches to your resume. Placeholder text is never printed or
                downloaded.
              </p>
            )}
            <div className="rounded-2xl border border-slate-200 bg-slate-100 p-4 sm:p-6">
              <div
                className="resume-zoom-outer mx-auto"
                style={scale < 1 ? { height: sheetHeight * scale } : undefined}
              >
                <div
                  ref={sheetWrapRef}
                  className="resume-zoom-inner"
                  style={scale < 1 ? { transform: `scale(${scale})`, transformOrigin: "top center" } : undefined}
                >
                  <ResumePreview
                    data={previewData}
                    template={template}
                    dateFormat={dateFormat}
                    photo={photoOn ? photo : null}
                    photoOn={photoOn || isEmpty}
                    fontId={fontId}
                    themeId={themeId}
                    printable={!isEmpty}
                  />
                </div>
              </div>
            </div>
            <p className="no-print mt-3 text-xs leading-relaxed text-slate-500">
              The preview is what the PDF export prints. For the cleanest result, choose “Save as PDF” in the
              print dialog, A4 paper, and switch off headers and footers. Zoom only changes the on-screen
              preview — the printed PDF is always full size.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
