// Resume builder data model, sample data, date formatting, template-based
// summary writer, .docx export, and resume upload parsing. Everything here
// is local: no model calls, no network. The summary writer fills proven
// sentence templates with the user's own details, and uploaded resumes are
// parsed on the device — the file never leaves the browser.

import { getResumeFont, getResumeTheme, TEMPLATE_DEFAULT_FONTS } from "./resume-fonts";

export interface ExperienceItem {
  id: string;
  role: string;
  company: string;
  start: string; // free text, e.g. "2022-01" or "Jan 2022"
  end: string;
  current: boolean;
  bullets: string; // one achievement per line
}

export interface EducationItem {
  id: string;
  degree: string;
  school: string;
  start: string;
  end: string;
}

/** Academic Experience: competitions, moots, research, conferences etc.
 * (title / organisation / dates / bullets — like a work entry, but academic). */
export interface AcademicExperienceItem {
  id: string;
  title: string;
  org: string;
  start: string;
  end: string;
  bullets: string; // one achievement per line
}

export interface ResumeData {
  fullName: string;
  title: string;
  email: string;
  phone: string;
  location: string;
  website: string;
  linkedin: string;
  summary: string;
  experience: ExperienceItem[];
  education: EducationItem[];
  skills: string; // comma-separated (or one per line)
  languages: string; // comma-separated (or one per line), e.g. "English (native), Spanish (conversational)"
  /** Per-skill proficiency 0–100, keyed by the skill text as typed. Optional:
   * older saves have none, and a missing entry falls back to a level parsed
   * from the skill text itself ("French (fluent)") or a sensible default. */
  skillLevels?: Record<string, number>;
  /** Per-language proficiency 0–100, keyed by the language text as typed. */
  languageLevels?: Record<string, number>;
  academicExperience?: AcademicExperienceItem[];
  /** Free-text references (names, roles, contact details). */
  referencesText?: string;
  /** When true, the resume shows "References will be provided upon request."
   * instead of the free text above. */
  referencesOnRequest?: boolean;
}

export type ResumeTemplateId =
  | "modern"
  | "classic"
  | "minimal"
  | "ats"
  | "two-column"
  | "fresh-grad"
  | "navy-sidebar"
  | "pastel"
  | "bold"
  | "simple"
  | "umer-classic"
  | "executive-dark"
  | "creative-portfolio"
  | "academic";
export type DateFormat = "mon-yyyy" | "mm-yyyy" | "yyyy" | "mon-dd-yyyy";

export const TEMPLATES: { id: ResumeTemplateId; name: string; description: string }[] = [
  {
    id: "modern",
    name: "Modern",
    description: "Teal accent bar, bold name, skills listed one per line. Good for tech, design and startups.",
  },
  {
    id: "classic",
    name: "Classic",
    description: "Centred serif header with ruled sections. Good for traditional employers and law, finance and admin roles.",
  },
  {
    id: "minimal",
    name: "Minimal",
    description: "Quiet typography, thin rules, lots of white space. Good when the content should speak for itself.",
  },
  {
    id: "ats",
    name: "ATS-friendly",
    description: "Single column, plain black text, standard headings, no tables or graphics. Built to be read reliably by applicant tracking systems.",
  },
  {
    id: "two-column",
    name: "Classic Two-Column",
    description: "Full-width header, then Skills, Education and Languages in a narrow left column and Summary and Experience on the right. Good for experienced professionals.",
  },
  {
    id: "fresh-grad",
    name: "Fresh Graduate",
    description: "Teal sidebar with a round photo, contact and skills; Education promoted above Experience. Good for students, graduates and early-career applicants.",
  },
  {
    id: "navy-sidebar",
    name: "Corporate Navy",
    description: "Deep navy sidebar with a round photo and contact details; roomy white main column. Good for corporate, finance, consulting and management roles.",
  },
  {
    id: "pastel",
    name: "Pastel Minimalist",
    description: "Soft cream page, muted headings, gentle spacing. Good for creative, marketing, education and design roles.",
  },
  {
    id: "bold",
    name: "Bold Display",
    description: "Oversized name in the theme colour with a thick accent rule under the header. Good for marketing, sales, product and media roles where standing out matters.",
  },
  {
    id: "simple",
    name: "Simple Professional",
    description: "One clean column, centred header, ruled headings, right-aligned dates. The safest choice for portals and applicant tracking systems.",
  },
  {
    id: "umer-classic",
    name: "Umer Classic",
    description: "Black-and-white serif CV: rectangular photo top-left, black title badge, two-column layout with a divider, skill and language bars, black year badges, Academic Experience and References. Good for law, academia and formal applications.",
  },
  {
    id: "executive-dark",
    name: "Executive Dark Header",
    description: "Dark header band with a photo, white name and contact details, then a single clean column with skill and language bars. Good for senior, management and consulting roles.",
  },
  {
    id: "creative-portfolio",
    name: "Creative Portfolio",
    description: "Colourful tinted sidebar with a round photo, contact, skill and language bars; a bright main column for experience and projects. Good for design, marketing, media and teaching roles.",
  },
  {
    id: "academic",
    name: "Academic Research",
    description: "Centred serif header, Education and Academic Experience promoted above work experience, plain one-per-line skills and languages. Good for researchers, lecturers, students and grant applications.",
  },
];

/** Templates whose .docx export / preview deliberately omit the photo.
 * Only the ATS template: a photo would hurt parser reliability. Every other
 * template supports a photo (off by default; an empty placeholder shows in
 * the preview until one is uploaded). */
export const PHOTOLESS_TEMPLATES: ResumeTemplateId[] = ["ats"];
/** Templates that render the photo in a sidebar (docx + preview). */
export const SIDEBAR_TEMPLATES: ResumeTemplateId[] = ["fresh-grad", "navy-sidebar", "creative-portfolio"];
/** Templates that lay the .docx out as a two-column table. */
export const TABLE_TEMPLATES: ResumeTemplateId[] = ["two-column", "fresh-grad", "navy-sidebar", "umer-classic", "creative-portfolio"];
/** Templates that show proficiency bars next to skills and languages. */
export const BAR_TEMPLATES: ResumeTemplateId[] = ["umer-classic", "executive-dark", "creative-portfolio"];
/** Templates that ignore the colour theme and always render black-and-white
 * (by design: ATS for parser reliability, Umer Classic for its serif CV look). */
export const MONOCHROME_TEMPLATES: ResumeTemplateId[] = ["ats", "umer-classic"];

export const DATE_FORMATS: { id: DateFormat; label: string; example: string }[] = [
  { id: "mon-yyyy", label: "Jan 2025 (month + year)", example: "Jan 2022 – Mar 2025" },
  { id: "mm-yyyy", label: "01/2025 (numeric)", example: "01/2022 – 03/2025" },
  { id: "yyyy", label: "2025 (year only)", example: "2022 – 2025" },
  { id: "mon-dd-yyyy", label: "Jan 15, 2025 (US style)", example: "Jan 15, 2022 – Mar 3, 2025" },
];

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const MONTH_NAMES = [
  "january", "february", "march", "april", "may", "june",
  "july", "august", "september", "october", "november", "december",
];

/** Parse "2022-01-15", "2022-01", "Jan 15, 2022", "Jan 2022", "2022" etc. Returns null if unparseable. */
function parseDate(raw: string): { year: number; month?: number; day?: number } | null {
  const s = raw.trim();
  if (!s) return null;
  const iso = s.match(/^(\d{4})[-/](\d{1,2})(?:[-/](\d{1,2}))?$/);
  if (iso) {
    const month = Number(iso[2]);
    const day = iso[3] ? Number(iso[3]) : undefined;
    // B5: reject out-of-range months/days instead of rendering "undefined 2022".
    if (month < 1 || month > 12) return null;
    if (day !== undefined && (day < 1 || day > 31)) return null;
    return { year: Number(iso[1]), month, day };
  }
  const yearOnly = s.match(/^(\d{4})$/);
  if (yearOnly) return { year: Number(yearOnly[1]) };
  const monDayYear = s.match(/^([A-Za-z]{3,9})\.?\s+(\d{1,2}),?\s+(\d{4})$/);
  if (monDayYear) {
    const idx = MONTH_NAMES.indexOf(monDayYear[1].toLowerCase());
    if (idx < 0) return null;
    const day = Number(monDayYear[2]);
    if (day < 1 || day > 31) return null;
    return { year: Number(monDayYear[3]), month: idx + 1, day };
  }
  const dayMonYear = s.match(/^(\d{1,2})\s+([A-Za-z]{3,9})\.?\s+(\d{4})$/);
  if (dayMonYear) {
    const idx = MONTH_NAMES.indexOf(dayMonYear[2].toLowerCase());
    if (idx < 0) return null;
    const day = Number(dayMonYear[1]);
    if (day < 1 || day > 31) return null;
    return { year: Number(dayMonYear[3]), month: idx + 1, day };
  }
  const monYear = s.match(/^([A-Za-z]{3,9})\.?\s+(\d{4})$/);
  if (monYear) {
    const idx = MONTHS.findIndex((m) => m.toLowerCase() === monYear[1].slice(0, 3).toLowerCase());
    if (idx >= 0) return { year: Number(monYear[2]), month: idx + 1 };
  }
  return null;
}

export function formatDate(raw: string, fmt: DateFormat): string {
  const s = raw.trim();
  if (!s) return "";
  const p = parseDate(s);
  if (!p) return s; // keep the user's text when we cannot parse it
  if (fmt === "yyyy") return String(p.year);
  if (fmt === "mm-yyyy") return p.month ? `${String(p.month).padStart(2, "0")}/${p.year}` : String(p.year);
  if (fmt === "mon-dd-yyyy") {
    // B7: the US style actually shows the day when one was entered.
    if (p.month && p.day) return `${MONTHS[p.month - 1]} ${p.day}, ${p.year}`;
    return p.month ? `${MONTHS[p.month - 1]} ${p.year}` : String(p.year);
  }
  return p.month ? `${MONTHS[p.month - 1]} ${p.year}` : String(p.year);
}

export function formatRange(start: string, end: string, current: boolean, fmt: DateFormat): string {
  const a = formatDate(start, fmt);
  const b = current ? "Present" : formatDate(end, fmt);
  if (!a && !b) return "";
  if (!a) return b;
  if (!b) return a;
  return `${a} – ${b}`;
}

/** Split a comma/newline/semicolon-separated list, trimming and de-duplicating (B13, B12). */
function splitList(value: string): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const part of value.split(/[,\n;]+/)) {
    const s = part.trim().replace(/^[•\-*·\s]+/, "").trim();
    if (!s) continue;
    const key = s.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(s);
  }
  return out;
}

export function skillList(skills: string): string[] {
  return splitList(skills);
}

export function languageList(languages: string): string[] {
  return splitList(languages);
}

export function bulletList(bullets: string): string[] {
  return bullets.split("\n").map((b) => b.trim().replace(/^[•\-*]\s*/, "")).filter(Boolean);
}

/** Proficiency implied by a label in brackets, e.g. "French (fluent)",
 * "English (native)", "Spanish (80%)", "Excel (4/5)". Returns null when the
 * label carries no level information. */
export function parseLevelFromLabel(label: string): number | null {
  const pct = label.match(/\(\s*(\d{1,3})\s*%\s*\)/);
  if (pct) return Math.max(0, Math.min(100, Number(pct[1])));
  const frac = label.match(/\(\s*(\d+(?:\.\d+)?)\s*\/\s*5\s*\)/);
  if (frac) return Math.max(0, Math.min(100, Math.round((Number(frac[1]) / 5) * 100)));
  const word = label.match(/\(\s*([A-Za-z]+)\s*\)/);
  if (!word) return null;
  const w = word[1].toLowerCase();
  if (w === "native" || w === "bilingual" || w === "expert") return 95;
  if (w === "fluent" || w === "advanced" || w === "professional") return 90;
  if (w === "intermediate" || w === "conversational") return 70;
  if (w === "basic" || w === "beginner" || w === "elementary") return 50;
  return null;
}

function clampLevel(n: number): number {
  return Number.isFinite(n) ? Math.max(0, Math.min(100, Math.round(n))) : 80;
}

/** A skill with its proficiency level (0–100). The level comes from the
 * per-skill slider first, then from a level in the skill text itself, then
 * from the default (80). */
export function skillEntries(data: ResumeData): { name: string; level: number }[] {
  return skillList(data.skills).map((name) => {
    const stored = data.skillLevels?.[name] ?? data.skillLevels?.[name.toLowerCase()];
    return { name, level: stored !== undefined ? clampLevel(stored) : (parseLevelFromLabel(name) ?? 80) };
  });
}

export function languageEntries(data: ResumeData): { name: string; level: number }[] {
  return languageList(data.languages).map((name) => {
    const stored = data.languageLevels?.[name] ?? data.languageLevels?.[name.toLowerCase()];
    return { name, level: stored !== undefined ? clampLevel(stored) : (parseLevelFromLabel(name) ?? 85) };
  });
}

/** The display name of a language without its bracketed level, e.g.
 * "English (native)" → "English". Used where a bar already shows the level. */
export function stripLevelLabel(label: string): string {
  return label.replace(/\s*\([^)]*\)\s*$/, "").trim() || label;
}

/** Text bar for the .docx export, e.g. "████████░░" for 80%. Word has no
 * HTML/CSS bars, so the level is drawn with block characters next to the
 * skill name — the text stays selectable and searchable. */
export function levelBarText(level: number, width = 10): string {
  const filled = Math.round((clampLevel(level) / 100) * width);
  return "█".repeat(filled) + "░".repeat(Math.max(0, width - filled));
}

/** B9: an experience item counts if it has a role, company, dates or bullets — not just role/company. */
export function hasExperienceContent(e: ExperienceItem): boolean {
  return Boolean(e.role.trim() || e.company.trim() || e.start.trim() || e.end.trim() || e.bullets.trim());
}

export function hasEducationContent(e: EducationItem): boolean {
  return Boolean(e.degree.trim() || e.school.trim() || e.start.trim() || e.end.trim());
}

/** An academic-experience item counts if it has a title, organisation, dates or bullets. */
export function hasAcademicExperienceContent(e: AcademicExperienceItem): boolean {
  return Boolean(e.title.trim() || e.org.trim() || e.start.trim() || e.end.trim() || e.bullets.trim());
}

/** The references section has content when the toggle is on or free text was entered. */
export function hasReferencesContent(data: ResumeData): boolean {
  return Boolean(data.referencesOnRequest || data.referencesText?.trim());
}

/** B15: true when the resume has no content at all (placeholders don't count). */
export function isResumeEmpty(data: ResumeData): boolean {
  return !(
    data.fullName.trim() ||
    data.title.trim() ||
    data.email.trim() ||
    data.phone.trim() ||
    data.location.trim() ||
    data.website.trim() ||
    data.linkedin.trim() ||
    data.summary.trim() ||
    data.skills.trim() ||
    data.languages.trim() ||
    data.experience.some(hasExperienceContent) ||
    data.education.some(hasEducationContent) ||
    (data.academicExperience ?? []).some(hasAcademicExperienceContent) ||
    hasReferencesContent(data)
  );
}

/** B14: make a download filename safe for filesystems. */
export function sanitizeDocxFilename(name: string): string {
  const cleaned = name
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^A-Za-z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^[.-]+|[.-]+$/g, "")
    .slice(0, 60);
  return cleaned || "resume";
}

export function yearsOfExperience(data: ResumeData): number {
  let total = 0;
  const now = new Date();
  for (const e of data.experience) {
    const s = parseDate(e.start);
    if (!s) continue;
    const end = e.current ? { year: now.getFullYear(), month: now.getMonth() + 1 } : parseDate(e.end);
    if (!end) continue;
    const months = (end.year - s.year) * 12 + ((end.month ?? 1) - (s.month ?? 1));
    if (months > 0) total += months;
  }
  return Math.max(0, Math.round(total / 12));
}

export const SAMPLE_RESUME: ResumeData = {
  fullName: "Alex Morgan",
  title: "Customer Support Specialist",
  email: "alex.morgan@example.com",
  phone: "+1 (555) 010-2030",
  location: "Austin, TX",
  website: "",
  linkedin: "linkedin.com/in/alexmorgan",
  summary:
    "Customer support specialist with 4 years of experience helping users by email, chat and phone. Known for clear explanations, calm handling of difficult cases and a first-contact resolution rate above 90%.",
  experience: [
    {
      id: "exp-1",
      role: "Customer Support Specialist",
      company: "Northwind Software",
      start: "2022-03",
      end: "",
      current: true,
      bullets:
        "Resolved 60+ customer tickets a day across email, chat and phone\nRaised first-contact resolution from 82% to 91% by writing clearer help articles\nTrained 3 new team members on the support inbox and escalation process",
    },
    {
      id: "exp-2",
      role: "Support Associate",
      company: "Bright Retail Group",
      start: "2020-06",
      end: "2022-02",
      current: false,
      bullets:
        "Handled in-store and online customer enquiries, averaging 4.9/5 satisfaction\nReduced refund processing time by creating a one-page returns checklist",
    },
  ],
  education: [
    {
      id: "edu-1",
      degree: "B.A. Communications",
      school: "University of Texas at Austin",
      start: "2016",
      end: "2020",
    },
  ],
  skills: "Customer support, Zendesk, Live chat, Conflict resolution, CRM, Clear writing",
  languages: "English (native), Spanish (conversational)",
  skillLevels: {
    "Customer support": 90,
    Zendesk: 85,
    "Live chat": 90,
    "Conflict resolution": 80,
    CRM: 75,
    "Clear writing": 85,
  },
  languageLevels: { "English (native)": 95, "Spanish (conversational)": 70 },
  academicExperience: [
    {
      id: "acad-1",
      title: "Student Support Workshop",
      org: "University of Texas at Austin",
      start: "2019",
      end: "2019",
      bullets:
        "Ran a workshop on handling difficult customer conversations for 40 fellow students\nWrote the handout the student support team still uses for new volunteers",
    },
  ],
  referencesText: "",
  referencesOnRequest: true,
};

// ---------------------------------------------------------------------------
// Template-based summary writer (no AI model). The user picks a profession
// and a tone; a proven template is filled with their own details.
// ---------------------------------------------------------------------------

export type SummaryTone = "professional" | "confident" | "friendly" | "concise";

export const SUMMARY_PROFESSIONS = [
  "Software Developer",
  "Customer Support Specialist",
  "Teacher",
  "Nurse",
  "Designer",
  "Sales Representative",
  "Project Manager",
  "Accountant",
  "Marketing Specialist",
  "Data Analyst",
  "Student / Recent Graduate",
  "Administrative Assistant",
] as const;

const TONE_OPENERS: Record<SummaryTone, string> = {
  professional: "results-focused",
  confident: "high-performing",
  friendly: "people-focused",
  concise: "experienced",
};

export function buildSummary(data: ResumeData, profession: string, tone: SummaryTone): string {
  const name = data.fullName.trim();
  const years = yearsOfExperience(data);
  const skills = skillList(data.skills);
  const topSkills = skills.slice(0, 3).join(", ");
  const firstJob = data.experience[0];
  const opener = TONE_OPENERS[tone];
  const who = name || "A";
  const role = (data.title.trim() || profession).toLowerCase();

  if (profession === "Student / Recent Graduate" || years === 0) {
    const degree = data.education[0]?.degree || "a recent graduate";
    if (tone === "concise") {
      return `${who} is a ${degree} graduate seeking a first role as a ${role}. ${topSkills ? `Skilled in ${topSkills}. ` : ""}Eager to learn, reliable, and ready to contribute from day one.`;
    }
    return `${who} is a ${opener} ${degree} graduate looking for a first role as a ${role}. ${topSkills ? `Coursework and projects built practical skills in ${topSkills}. ` : ""}Known for being organised, quick to learn and easy to work with, and ready to contribute from day one.`;
  }

  const where = firstJob?.company ? ` at ${firstJob.company}` : "";
  const yearWord = years === 1 ? "year" : "years";
  switch (tone) {
    case "concise":
      return `${who} is a ${role} with ${years} ${yearWord} of experience${where}. ${topSkills ? `Strengths include ${topSkills}. ` : ""}Focused on clear results and dependable delivery.`;
    case "confident":
      return `${who} is a ${opener} ${role} with ${years} ${yearWord} of experience${where}, known for delivering measurable results. ${topSkills ? `Core strengths: ${topSkills}. ` : ""}Looking for a role where that track record can make a visible difference.`;
    case "friendly":
      return `${who} is a ${opener} ${role} with ${years} ${yearWord} of experience${where}. ${topSkills ? `Day to day, the work centres on ${topSkills}. ` : ""}Colleagues describe a calm, helpful teammate who explains things clearly and follows through.`;
    default:
      return `${who} is a ${opener} ${role} with ${years} ${yearWord} of experience${where}. ${topSkills ? `Key strengths include ${topSkills}. ` : ""}Known for reliable delivery, clear communication and steady improvement of the work around them.`;
  }
}

// ---------------------------------------------------------------------------
// .docx export via the docx library (already installed). The chosen font and
// colour theme carry into the Word file, and the layout follows the chosen
// template (B3): sidebar templates export as a real two-column table with a
// shaded sidebar, Bold exports an oversized accent name with a thick rule,
// Pastel exports a cream-tinted header, and so on. Word substitutes a font
// it does not have installed.
//
// ATS rule (B1, B2): the ATS template is always plain black Arial in the
// export, whatever font or theme the user picked — the preview does the same.
// Umer Classic is likewise black-and-white by design. Photo (B6): embedded
// where the template supports a photo; only the ATS template has none, so
// applicants keep parser reliability there.
// Skills and languages export one per line as bullets (never pills, never a
// single joined line); bar templates add a text bar after each item so the
// level survives in Word, where there are no CSS bars.
// ---------------------------------------------------------------------------

export interface ResumePhoto {
  dataUrl: string;
  width: number;
  height: number;
}

export interface DocxOptions {
  fontId?: string | null;
  themeId?: string;
  template?: ResumeTemplateId;
  photo?: ResumePhoto | null;
}

function dataUrlToBytes(dataUrl: string): { bytes: Uint8Array; type: "png" | "jpg" | "gif" } | null {
  const m = dataUrl.match(/^data:image\/(png|jpe?g|gif);base64,(.+)$/);
  if (!m) return null;
  const b64 = m[2];
  const type = m[1] === "png" ? "png" : m[1] === "gif" ? "gif" : "jpg";
  try {
    if (typeof Buffer !== "undefined") {
      return { bytes: new Uint8Array(Buffer.from(b64, "base64")), type };
    }
    const bin = atob(b64);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return { bytes, type };
  } catch {
    return null;
  }
}

export async function buildResumeDocx(
  data: ResumeData,
  fmt: DateFormat,
  opts: DocxOptions = {},
): Promise<Blob> {
  // B15: never export a file whose only content is the "Your Name" placeholder.
  if (isResumeEmpty(data)) {
    throw new Error("Your resume is empty — add at least your name or one section before downloading a Word file.");
  }
  const {
    Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType,
    Table, TableRow, TableCell, WidthType, BorderStyle, ShadingType, ImageRun,
  } = await import("docx");
  const template = opts.template ?? "modern";
  const isAts = template === "ats";
  const isMono = MONOCHROME_TEMPLATES.includes(template);
  const font = opts.fontId ? getResumeFont(opts.fontId) : getResumeFont(TEMPLATE_DEFAULT_FONTS[template]);
  const theme = getResumeTheme(opts.themeId);
  const accent = (isMono ? "000000" : theme.accent.replace("#", ""));
  const accentDark = (isMono ? "000000" : theme.accentDark.replace("#", ""));
  const soft = theme.soft.replace("#", "");
  // B2: ATS always uses Arial, in the export as in the preview. Display fonts
  // (Bebas Neue, Dancing Script) go on headings only; the body uses the
  // template's default font so it stays readable.
  const defaultFont = getResumeFont(TEMPLATE_DEFAULT_FONTS[template]);
  const headFont = isAts ? "Arial" : font.docxName;
  const bodyFont = isAts ? "Arial" : font.headingOnly ? defaultFont.docxName : font.docxName;
  const muted = isMono ? "000000" : "475569";
  const bodyColor = template === "pastel" ? "3F3A36" : isMono ? "000000" : "1F2937";
  const centered = template === "classic" || template === "simple" || template === "academic";
  const headerAlign = centered ? AlignmentType.CENTER : AlignmentType.LEFT;
  const showBars = BAR_TEMPLATES.includes(template);

  type P = InstanceType<typeof Paragraph>;
  const noBorders = {
    top: { style: BorderStyle.NONE, size: 0, space: 0, color: "auto" },
    left: { style: BorderStyle.NONE, size: 0, space: 0, color: "auto" },
    bottom: { style: BorderStyle.NONE, size: 0, space: 0, color: "auto" },
    right: { style: BorderStyle.NONE, size: 0, space: 0, color: "auto" },
    insideHorizontal: { style: BorderStyle.NONE, size: 0, space: 0, color: "auto" },
    insideVertical: { style: BorderStyle.NONE, size: 0, space: 0, color: "auto" },
  };

  const run = (text: string, o: { bold?: boolean; italics?: boolean; size?: number; color?: string; font?: string; allCaps?: boolean; charSpacing?: number } = {}) =>
    new TextRun({ text, font: o.font ?? bodyFont, color: o.color ?? bodyColor, ...o });

  const headingColor =
    template === "minimal" ? "64748B" : template === "pastel" ? accentDark : template === "classic" ? "111827" : accent;
  const heading = (text: string, o: { color?: string; size?: number; align?: (typeof AlignmentType)[keyof typeof AlignmentType]; borderBottom?: string; borderTop?: string; caps?: boolean } = {}): P => {
    const border: Record<string, { style: (typeof BorderStyle)["SINGLE"]; size: number; space: number; color: string }> = {};
    if (o.borderBottom !== undefined) border.bottom = { style: BorderStyle.SINGLE, size: 12, space: 4, color: o.borderBottom };
    if (o.borderTop !== undefined) border.top = { style: BorderStyle.SINGLE, size: 18, space: 4, color: o.borderTop };
    return new Paragraph({
      heading: HeadingLevel.HEADING_2,
      alignment: o.align ?? (centered ? AlignmentType.CENTER : AlignmentType.LEFT),
      spacing: { before: 240, after: 80 },
      keepNext: true,
      border: Object.keys(border).length ? border : undefined,
      children: [
        new TextRun({
          text,
          bold: true,
          size: o.size ?? 26,
          color: o.color ?? headingColor,
          font: headFont,
          allCaps: o.caps ?? (template !== "pastel"),
          characterSpacing: template === "minimal" ? 30 : undefined,
        }),
      ],
    });
  };

  // Sidebar headings (white on the shaded sidebar cell).
  const sideHeading = (text: string): P =>
    new Paragraph({
      heading: HeadingLevel.HEADING_2,
      spacing: { before: 200, after: 60 },
      keepNext: true,
      children: [new TextRun({ text, bold: true, size: 24, color: "FFFFFF", font: headFont, allCaps: true })],
    });

  const photoBytes = opts.photo && !PHOTOLESS_TEMPLATES.includes(template) ? dataUrlToBytes(opts.photo.dataUrl) : null;
  const photoPara = (width: number, align: (typeof AlignmentType)[keyof typeof AlignmentType] = AlignmentType.LEFT): P | null => {
    if (!photoBytes || !opts.photo) return null;
    const scale = Math.min(1, width / opts.photo.width);
    const w = Math.round(opts.photo.width * scale);
    const h = Math.round(opts.photo.height * scale);
    return new Paragraph({
      alignment: align,
      spacing: { after: 120 },
      children: [new ImageRun({ data: photoBytes.bytes, type: photoBytes.type, transformation: { width: w, height: h } })],
    });
  };

  const contact = [data.email, data.phone, data.location, data.website, data.linkedin]
    .filter((x) => x.trim())
    .join("  ·  ");

  // --- shared section builders (each returns its paragraphs) -------------
  const summaryParas = (): P[] => {
    if (!data.summary.trim()) return [];
    return [heading("Summary", { borderBottom: template === "bold" ? accent : undefined, borderTop: template === "bold" ? accent : undefined }), new Paragraph({ children: [run(data.summary, { size: 22 })] })];
  };

  const experienceParas = (side = false): P[] => {
    const items = data.experience.filter(hasExperienceContent);
    if (!items.length) return [];
    const out: P[] = [side ? sideHeading("Experience") : heading("Experience", { borderBottom: template === "bold" ? accent : undefined, borderTop: template === "bold" ? accent : undefined })];
    for (const e of items) {
      const roleLine = [e.role.trim(), e.company.trim()].filter(Boolean).join(" — ");
      const range = formatRange(e.start, e.end, e.current, fmt);
      const title = roleLine || range || "Experience";
      out.push(
        new Paragraph({
          spacing: { before: 120 },
          keepNext: true,
          children: [
            run(title, { bold: true, size: 24, color: side ? "FFFFFF" : bodyColor }),
          ],
        }),
      );
      if (roleLine && range) {
        out.push(new Paragraph({ children: [run(range, { italics: true, size: 20, color: side ? "E5E7EB" : muted })] }));
      }
      for (const b of bulletList(e.bullets)) {
        out.push(new Paragraph({ bullet: { level: 0 }, children: [run(b, { size: 22, color: side ? "FFFFFF" : bodyColor })] }));
      }
    }
    return out;
  };

  const educationParas = (side = false, badge = false): P[] => {
    const items = data.education.filter(hasEducationContent);
    if (!items.length) return [];
    const out: P[] = [side ? sideHeading("Education") : heading("Education", { borderBottom: template === "bold" ? accent : undefined, borderTop: template === "bold" ? accent : undefined })];
    for (const e of items) {
      const line = [e.degree.trim(), e.school.trim()].filter(Boolean).join(" — ");
      const range = formatRange(e.start, e.end, false, fmt);
      out.push(
        new Paragraph({
          spacing: { before: 80 },
          children: [run(line || range || "Education", { bold: true, size: 24, color: side ? "FFFFFF" : bodyColor })],
        }),
      );
      if (line && range) {
        if (badge) {
          // Black year badge, as on the Umer Classic CV: white text on black.
          out.push(
            new Paragraph({
              spacing: { after: 40 },
              children: [
                new TextRun({
                  text: range,
                  bold: true,
                  size: 20,
                  color: "FFFFFF",
                  font: bodyFont,
                  shading: { type: ShadingType.CLEAR, fill: "000000" },
                }),
              ],
            }),
          );
        } else {
          out.push(new Paragraph({ children: [run(range, { italics: true, size: 20, color: side ? "E5E7EB" : muted })] }));
        }
      }
    }
    return out;
  };

  const academicExperienceParas = (side = false): P[] => {
    const items = (data.academicExperience ?? []).filter(hasAcademicExperienceContent);
    if (!items.length) return [];
    const out: P[] = [side ? sideHeading("Academic Experience") : heading("Academic Experience", { borderBottom: template === "bold" ? accent : undefined, borderTop: template === "bold" ? accent : undefined })];
    for (const e of items) {
      const titleLine = [e.title.trim(), e.org.trim()].filter(Boolean).join(" — ");
      const range = formatRange(e.start, e.end, false, fmt);
      out.push(
        new Paragraph({
          spacing: { before: 120 },
          keepNext: true,
          children: [run(titleLine || range || "Academic Experience", { bold: true, size: 24, color: side ? "FFFFFF" : bodyColor })],
        }),
      );
      if (titleLine && range) {
        out.push(new Paragraph({ children: [run(range, { italics: true, size: 20, color: side ? "E5E7EB" : muted })] }));
      }
      for (const b of bulletList(e.bullets)) {
        out.push(new Paragraph({ bullet: { level: 0 }, children: [run(b, { size: 22, color: side ? "FFFFFF" : bodyColor })] }));
      }
    }
    return out;
  };

  const referencesParas = (centeredRef = false, label = "References"): P[] => {
    if (!hasReferencesContent(data)) return [];
    const text = data.referencesOnRequest ? "References will be provided upon request." : (data.referencesText ?? "").trim();
    if (!text) return [];
    return [
      heading(label, { align: centeredRef ? AlignmentType.CENTER : undefined }),
      new Paragraph({
        alignment: centeredRef ? AlignmentType.CENTER : AlignmentType.LEFT,
        children: [run(text, { size: 22 })],
      }),
    ];
  };

  // Skills and languages are always one item per line (bulleted), in the
  // export as in the preview — never pills, never one joined line. Bar
  // templates add a text bar after each item so the level survives in Word.
  const skillsParas = (side = false): P[] => {
    const entries = skillEntries(data);
    if (!entries.length) return [];
    const out: P[] = [side ? sideHeading("Skills") : heading("Skills", { borderBottom: template === "bold" ? accent : undefined, borderTop: template === "bold" ? accent : undefined })];
    for (const { name, level } of entries) {
      const children: InstanceType<typeof TextRun>[] = [run(name, { size: 22, color: side ? "FFFFFF" : bodyColor })];
      if (showBars) {
        children.push(run(`  ${levelBarText(level)}`, { size: 22, color: side ? "FFFFFF" : accent }));
      }
      out.push(new Paragraph({ bullet: { level: 0 }, children }));
    }
    return out;
  };

  const languagesParas = (side = false): P[] => {
    const entries = languageEntries(data);
    if (!entries.length) return [];
    const out: P[] = [side ? sideHeading("Languages") : heading("Languages", { borderBottom: template === "bold" ? accent : undefined, borderTop: template === "bold" ? accent : undefined })];
    for (const { name, level } of entries) {
      const children: InstanceType<typeof TextRun>[] = [run(name, { size: 22, color: side ? "FFFFFF" : bodyColor })];
      if (showBars) {
        children.push(run(`  ${levelBarText(level)}`, { size: 22, color: side ? "FFFFFF" : accent }));
      }
      out.push(new Paragraph({ bullet: { level: 0 }, children }));
    }
    return out;
  };

  // --- header -------------------------------------------------------------
  const headerParas = (): P[] => {
    const out: P[] = [];
    // Header photo (non-sidebar templates that support one).
    if (!SIDEBAR_TEMPLATES.includes(template)) {
      const pp = photoPara(template === "classic" || template === "simple" ? 100 : 110, centered ? AlignmentType.CENTER : AlignmentType.LEFT);
      if (pp) out.push(pp);
    }
    if (data.fullName.trim()) {
      const nameSize =
        template === "bold" ? 72 : template === "classic" ? 56 : template === "umer-classic" ? 56 : template === "academic" ? 52 : template === "pastel" ? 52 : template === "minimal" ? 48 : template === "ats" ? 48 : 44;
      out.push(
        new Paragraph({
          alignment: headerAlign,
          shading: template === "pastel" ? { type: ShadingType.CLEAR, fill: soft } : undefined,
          border:
            template === "bold"
              ? { bottom: { style: BorderStyle.SINGLE, size: 24, space: 6, color: accent } }
              : template === "modern"
                ? { left: { style: BorderStyle.SINGLE, size: 24, space: 8, color: accent } }
                : undefined,
          children: [
            new TextRun({
              text: data.fullName,
              bold: true,
              size: nameSize,
              font: headFont,
              color: template === "bold" ? accent : template === "pastel" ? "3F3A36" : bodyColor,
              allCaps: template === "bold",
            }),
          ],
        }),
      );
    }
    if (data.title.trim()) {
      out.push(
        new Paragraph({
          alignment: headerAlign,
          children: [run(data.title, { size: 26, color: template === "bold" ? accent : muted, italics: template === "classic" })],
        }),
      );
    }
    if (contact) {
      out.push(
        new Paragraph({
          alignment: headerAlign,
          spacing: { after: 120 },
          border: template === "classic" ? { bottom: { style: BorderStyle.SINGLE, size: 12, space: 4, color: accent } } : undefined,
          children: [run(contact, { size: 20, color: muted })],
        }),
      );
    }
    return out;
  };

  // Sidebar (white text on a shaded cell) for the sidebar templates.
  const sidebarFill = template === "navy-sidebar" ? "1B2A4A" : accent;
  const sidebarParas = (): P[] => {
    const out: P[] = [];
    const pp = photoPara(110, AlignmentType.LEFT);
    if (pp) out.push(pp);
    if (contact) {
      out.push(sideHeading("Contact"));
      for (const part of [data.email, data.phone, data.location, data.website, data.linkedin].filter((x) => x.trim())) {
        out.push(new Paragraph({ spacing: { after: 40 }, children: [run(part, { size: 20, color: "FFFFFF" })] }));
      }
    }
    out.push(...skillsParas(true), ...educationParas(true), ...languagesParas(true));
    return out;
  };

  // Creative Portfolio sidebar: dark text on the theme's soft tint (not a
  // solid dark cell), with skill/language bars.
  const creativeSidebarParas = (): P[] => {
    const out: P[] = [];
    const pp = photoPara(110, AlignmentType.LEFT);
    if (pp) out.push(pp);
    if (contact) {
      out.push(heading("Contact"));
      for (const part of [data.email, data.phone, data.location, data.website, data.linkedin].filter((x) => x.trim())) {
        out.push(new Paragraph({ spacing: { after: 40 }, children: [run(part, { size: 20 })] }));
      }
    }
    out.push(...skillsParas(), ...languagesParas());
    return out;
  };

  const mainParas = (): P[] => {
    const out: P[] = [];
    if (data.fullName.trim()) {
      out.push(
        new Paragraph({
          alignment: AlignmentType.LEFT,
          children: [new TextRun({ text: data.fullName, bold: true, size: 48, font: headFont, color: bodyColor })],
        }),
      );
    }
    if (data.title.trim()) {
      out.push(new Paragraph({ children: [run(data.title, { size: 26, color: accent })] }));
    }
    if (contact) {
      out.push(new Paragraph({ spacing: { after: 120 }, children: [run(contact, { size: 20, color: muted })] }));
    }
    return out;
  };

  // Executive Dark header: one shaded band holding the photo, white name,
  // title and contact line.
  const executiveHeaderTable = (): InstanceType<typeof Table> => {
    const cellChildren: P[] = [];
    const pp = photoPara(90, AlignmentType.LEFT);
    if (pp) cellChildren.push(pp);
    if (data.fullName.trim()) {
      cellChildren.push(
        new Paragraph({
          children: [new TextRun({ text: data.fullName, bold: true, size: 52, font: headFont, color: "FFFFFF" })],
        }),
      );
    }
    if (data.title.trim()) {
      cellChildren.push(new Paragraph({ children: [run(data.title, { size: 26, color: "FFFFFF" })] }));
    }
    if (contact) {
      cellChildren.push(new Paragraph({ spacing: { after: 60 }, children: [run(contact, { size: 20, color: "E5E7EB" })] }));
    }
    return new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      borders: noBorders,
      rows: [
        new TableRow({
          children: [
            new TableCell({
              shading: { type: ShadingType.CLEAR, fill: accentDark },
              margins: { top: 200, bottom: 200, left: 250, right: 250 },
              children: cellChildren.length ? cellChildren : [new Paragraph({ children: [run("Resume", { size: 24, color: "FFFFFF" })] })],
            }),
          ],
        }),
      ],
    });
  };

  // Umer Classic header: photo cell + name cell with the black title badge.
  const umerHeaderTable = (): InstanceType<typeof Table> => {
    const nameCell: P[] = [];
    if (data.fullName.trim()) {
      nameCell.push(
        new Paragraph({
          children: [
            new TextRun({
              text: data.fullName,
              bold: true,
              size: 56,
              font: headFont,
              color: "000000",
              allCaps: true,
              characterSpacing: 60,
            }),
          ],
        }),
      );
    }
    if (data.title.trim()) {
      nameCell.push(
        new Paragraph({
          spacing: { before: 120 },
          children: [
            new TextRun({
              text: `  ${data.title}  `,
              bold: true,
              size: 26,
              color: "FFFFFF",
              font: bodyFont,
              allCaps: true,
              characterSpacing: 40,
              shading: { type: ShadingType.CLEAR, fill: "000000" },
            }),
          ],
        }),
      );
    }
    const pp = photoPara(110, AlignmentType.LEFT);
    return new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      borders: noBorders,
      rows: [
        new TableRow({
          children: [
            new TableCell({
              width: { size: 1700, type: WidthType.DXA },
              margins: { top: 100, bottom: 100, left: 100, right: 200 },
              children: pp ? [pp] : [new Paragraph({ children: [run("", { size: 22 })] })],
            }),
            new TableCell({
              width: { size: 7660, type: WidthType.DXA },
              margins: { top: 200, bottom: 100, left: 200, right: 100 },
              children: nameCell.length ? nameCell : [new Paragraph({ children: [run("Resume", { size: 24 })] })],
            }),
          ],
        }),
      ],
    });
  };

  // Umer Classic Academic Experience: entries split across two columns with
  // a vertical divider (the table's inside border), each with a black badge.
  const umerAcademicTable = (): InstanceType<typeof Table> | null => {
    const items = (data.academicExperience ?? []).filter(hasAcademicExperienceContent);
    if (!items.length) return null;
    const cellParas = (cellItems: AcademicExperienceItem[]): P[] => {
      const out: P[] = [];
      for (const e of cellItems) {
        const range = formatRange(e.start, e.end, false, fmt);
        out.push(
          new Paragraph({
            spacing: { before: 120 },
            keepNext: true,
            children: [run(e.title.trim() || "Academic Experience", { bold: true, size: 24 })],
          }),
        );
        if (e.org.trim()) {
          out.push(new Paragraph({ children: [run(e.org, { size: 22 })] }));
        }
        if (range) {
          out.push(
            new Paragraph({
              spacing: { after: 40 },
              children: [
                new TextRun({
                  text: range,
                  bold: true,
                  size: 20,
                  color: "FFFFFF",
                  font: bodyFont,
                  shading: { type: ShadingType.CLEAR, fill: "000000" },
                }),
              ],
            }),
          );
        }
        for (const b of bulletList(e.bullets)) {
          out.push(new Paragraph({ bullet: { level: 0 }, children: [run(b, { size: 22 })] }));
        }
      }
      return out;
    };
    const half = Math.ceil(items.length / 2);
    return new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      borders: {
        ...noBorders,
        insideVertical: { style: BorderStyle.SINGLE, size: 6, space: 0, color: "000000" },
      },
      rows: [
        new TableRow({
          children: [
            new TableCell({
              width: { size: 4680, type: WidthType.DXA },
              margins: { top: 100, bottom: 100, left: 100, right: 200 },
              children: cellParas(items.slice(0, half)),
            }),
            new TableCell({
              width: { size: 4680, type: WidthType.DXA },
              margins: { top: 100, bottom: 100, left: 200, right: 100 },
              children: cellParas(items.slice(half)),
            }),
          ],
        }),
      ],
    });
  };

  // --- assemble per template (B3: the layout is template-specific) --------
  let children: Array<P | InstanceType<typeof Table>>;
  if (template === "umer-classic") {
    // Left column: About Me, Skills (bars), Languages (bars). Right column:
    // Contact, Education (black year badges). Then Academic Experience in
    // two columns, then centred References — mirroring the source CV.
    const left: P[] = [];
    if (data.summary.trim()) {
      left.push(heading("About Me"), new Paragraph({ children: [run(data.summary, { size: 22 })] }));
    }
    left.push(...skillsParas(), ...languagesParas());
    const right: P[] = [];
    if (contact) {
      right.push(heading("Contact"));
      for (const part of [data.email, data.phone, data.location, data.website, data.linkedin].filter((x) => x.trim())) {
        right.push(new Paragraph({ spacing: { after: 40 }, children: [run(part, { size: 22 })] }));
      }
    }
    right.push(...educationParas(false, true));
    const bodyTable = new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      borders: {
        ...noBorders,
        insideVertical: { style: BorderStyle.SINGLE, size: 6, space: 0, color: "000000" },
      },
      rows: [
        new TableRow({
          children: [
            new TableCell({
              width: { size: 3800, type: WidthType.DXA },
              margins: { top: 100, bottom: 100, left: 100, right: 200 },
              children: left.length ? left : [new Paragraph({ children: [run("", { size: 22 })] })],
            }),
            new TableCell({
              width: { size: 5560, type: WidthType.DXA },
              margins: { top: 100, bottom: 100, left: 200, right: 100 },
              children: right.length ? right : [new Paragraph({ children: [run("", { size: 22 })] })],
            }),
          ],
        }),
      ],
    });
    children = [umerHeaderTable(), bodyTable];
    // Work experience (if any) goes between the two-column body and the
    // academic section; the CV itself has none, but the builder supports it.
    children.push(...experienceParas());
    const acadTable = umerAcademicTable();
    if (acadTable) {
      children.push(
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { before: 240, after: 80 },
          keepNext: true,
          children: [new TextRun({ text: "ACADEMIC EXPERIENCE", bold: true, size: 30, color: "000000", font: headFont, characterSpacing: 40 })],
        }),
        acadTable,
      );
    }
    children.push(...referencesParas(true, "Reference"));
  } else if (TABLE_TEMPLATES.includes(template)) {
    const left: P[] =
      template === "two-column"
        ? [...skillsParas(), ...educationParas(), ...languagesParas()]
        : template === "creative-portfolio"
          ? creativeSidebarParas()
          : sidebarParas();
    const right: P[] =
      template === "two-column"
        ? [...headerParas(), ...summaryParas(), ...experienceParas(), ...academicExperienceParas()]
        : template === "fresh-grad"
          ? [...mainParas(), ...summaryParas(), ...educationParas(), ...experienceParas(), ...academicExperienceParas()]
          : template === "creative-portfolio"
            ? [...mainParas(), ...summaryParas(), ...experienceParas(), ...educationParas(), ...academicExperienceParas()]
            : [...mainParas(), ...summaryParas(), ...experienceParas(), ...educationParas(), ...academicExperienceParas()];
    const table = new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      borders: noBorders,
      rows: [
        new TableRow({
          children: [
            new TableCell({
              width: { size: template === "two-column" ? 2800 : 3200, type: WidthType.DXA },
              shading:
                template === "two-column"
                  ? undefined
                  : template === "creative-portfolio"
                    ? { type: ShadingType.CLEAR, fill: soft }
                    : { type: ShadingType.CLEAR, fill: sidebarFill },
              margins: { top: 100, bottom: 100, left: 150, right: 150 },
              children: left,
            }),
            new TableCell({
              width: { size: template === "two-column" ? 6560 : 6160, type: WidthType.DXA },
              margins: { top: 100, bottom: 100, left: 200, right: 100 },
              children: right,
            }),
          ],
        }),
      ],
    });
    // Two-column keeps the full-width header above the table.
    children = template === "two-column" ? [...headerParas(), table, ...referencesParas()] : [table, ...referencesParas()];
  } else if (template === "executive-dark") {
    children = [
      executiveHeaderTable(),
      ...summaryParas(),
      ...experienceParas(),
      ...academicExperienceParas(),
      ...educationParas(),
      ...skillsParas(),
      ...languagesParas(),
      ...referencesParas(),
    ];
  } else if (template === "academic") {
    // Education and Academic Experience come before work experience.
    children = [
      ...headerParas(),
      ...summaryParas(),
      ...educationParas(),
      ...academicExperienceParas(),
      ...experienceParas(),
      ...skillsParas(),
      ...languagesParas(),
      ...referencesParas(),
    ];
  } else {
    children = [
      ...headerParas(),
      ...summaryParas(),
      ...experienceParas(),
      ...academicExperienceParas(),
      ...educationParas(),
      ...skillsParas(),
      ...languagesParas(),
      ...referencesParas(),
    ];
  }

  const doc = new Document({
    creator: "PDF World Resume Builder",
    title: `${data.fullName.trim() || "Resume"} — ${data.title.trim() || "Resume"}`,
    sections: [{ children }],
  });
  return Packer.toBlob(doc);
}

export const STORAGE_KEY = "pdfworld-resume-v1";

// ---------------------------------------------------------------------------
// Resume upload + parse. The file is read and parsed on the device only:
// PDF text comes from pdfjs-dist, DOCX text from Mammoth. The parser is
// heuristic — it finds the usual sections and contact details, and reports
// what it found (and what it could not) so the user can correct the form.
// ---------------------------------------------------------------------------

export interface ResumeParseResult {
  data: ResumeData;
  /** Human-readable labels of the fields that were filled from the file. */
  found: string[];
  /** Things the user should double-check in the form. */
  warnings: string[];
}

const SECTION_HEADERS: { re: RegExp; key: string }[] = [
  { re: /^(professional\s+)?summary|profile|about(\s+me)?|career\s+objective|objective|personal\s+statement$/i, key: "summary" },
  { re: /^(work\s+)?experience|employment(\s+history)?|professional\s+experience|work\s+history|career\s+history$/i, key: "experience" },
  { re: /^education|academic(\s+background)?|qualifications$/i, key: "education" },
  { re: /^(technical\s+)?skills|core\s+skills|competencies|key\s+skills$/i, key: "skills" },
  { re: /^languages$/i, key: "languages" },
  { re: /^academic\s+experience|research(\s+experience)?|competitions?|moot\s+court|conferences?$/i, key: "academic" },
  { re: /^references?$/i, key: "references" },
  { re: /^certifications?|certificates|awards$/i, key: "other" },
];

const DATE_RANGE_RE =
  /((?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\.?\s+\d{4}|\d{4}(?:[-/]\d{1,2})?)\s*[–—\-]\s*((?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\.?\s+\d{4}|Present|Current|Now|\d{4}(?:[-/]\d{1,2})?)/i;

const EMAIL_RE = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/;
const PHONE_RE = /(\+?\d[\d\s().-]{7,}\d)/;

const COMMON_LANGUAGES = [
  "english", "spanish", "french", "german", "italian", "portuguese", "dutch", "russian",
  "chinese", "mandarin", "cantonese", "japanese", "korean", "hindi", "urdu", "arabic",
  "bengali", "punjabi", "turkish", "polish", "ukrainian", "swedish", "norwegian",
  "danish", "finnish", "greek", "hebrew", "persian", "farsi", "tamil", "telugu",
];

function titleCaseName(s: string): string {
  if (s === s.toUpperCase() && /[A-Z]/.test(s)) {
    return s.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
  }
  return s;
}

function looksLikeName(line: string): boolean {
  if (line.length < 3 || line.length > 45) return false;
  if (/\d/.test(line) || /@/.test(line)) return false;
  if (/^(curriculum vitae|resume|cv|profile|contact)$/i.test(line)) return false;
  return /^[A-Za-zÀ-ÿ'’.-]+(?:\s+[A-Za-zÀ-ÿ'’.-]+){0,3}$/.test(line);
}

function looksLikeJobHeader(line: string): boolean {
  if (line.length > 80 || /[.!?]$/.test(line)) return false;
  const m = line.match(/^(.+?)\s+(?:at|@|—|–|\|)\s+(.+)$/);
  if (!m) return false;
  const titleOk = m[1].split(/\s+/).every((w) => /^[A-ZÀ-Þ]/.test(w) || /^(of|and|&)$/i.test(w));
  const companyOk = m[2]
    .split(/\s+/)
    .every((w) => /^[A-ZÀ-Þ0-9]/.test(w) || /^(ltd|inc|llc|group|corp|co|of|the|&)$/i.test(w));
  return titleOk && companyOk && m[1].length <= 45 && m[2].length <= 45;
}

function splitRoleCompany(text: string): { role: string; company: string } {
  const parts = text.split(/\s+(?:at|@)\s+|\s+[—–|]\s+|\s+-\s+|\s*\|\s*/).map((p) => p.trim()).filter(Boolean);
  if (parts.length >= 2) return { role: parts[0], company: parts.slice(1).join(" — ") };
  const comma = text.split(/,\s*/).map((p) => p.trim()).filter(Boolean);
  if (comma.length >= 2 && comma[0].length > 2 && comma[1].length > 2) {
    return { role: comma[0], company: comma.slice(1).join(", ") };
  }
  return { role: text, company: "" };
}

/** Heuristically parse plain resume text into the builder's data model. */
export function parseResumeText(text: string): ResumeParseResult {
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const data: ResumeData = {
    fullName: "",
    title: "",
    email: "",
    phone: "",
    location: "",
    website: "",
    linkedin: "",
    summary: "",
    experience: [],
    education: [],
    skills: "",
    languages: "",
    skillLevels: {},
    languageLevels: {},
    academicExperience: [],
    referencesText: "",
    referencesOnRequest: false,
  };
  const found: string[] = [];
  const warnings: string[] = [];
  if (lines.length < 3 || text.trim().length < 40) {
    warnings.push("Very little text could be read from this file — it may be a scanned image. Fill in the form by hand instead.");
    return { data, found, warnings };
  }

  // Split into sections by header lines.
  const sections: { key: string; lines: string[] }[] = [];
  let current: { key: string; lines: string[] } = { key: "header", lines: [] };
  sections.push(current);
  for (const line of lines) {
    const hit = SECTION_HEADERS.find((h) => h.re.test(line.replace(/[:：]$/, "").trim()));
    if (hit) {
      current = { key: hit.key, lines: [] };
      sections.push(current);
    } else {
      current.lines.push(line);
    }
  }
  const section = (key: string) => sections.find((s) => s.key === key)?.lines ?? [];

  // --- header zone: name, title, contact -------------------------------
  const headerLines = section("header").slice(0, 10);
  for (const line of headerLines) {
    if (!data.fullName && looksLikeName(line)) {
      data.fullName = titleCaseName(line);
      found.push("name");
      continue;
    }
    if (data.fullName && !data.title && !EMAIL_RE.test(line) && !PHONE_RE.test(line) && line.length <= 70 && !DATE_RANGE_RE.test(line)) {
      data.title = line;
      found.push("job title");
      continue;
    }
  }
  const contactPool = [...headerLines, ...section("summary").slice(0, 2)].join("\n");
  const email = contactPool.match(EMAIL_RE);
  if (email) { data.email = email[0]; found.push("email"); }
  const phone = contactPool.match(PHONE_RE);
  if (phone) { data.phone = phone[1].replace(/\s+/g, " ").trim(); found.push("phone"); }
  const linked = contactPool.match(/linkedin\.com\/[^\s,]+/i);
  if (linked) { data.linkedin = linked[0].replace(/\/$/, ""); found.push("LinkedIn"); }
  const site = contactPool.match(/(?:https?:\/\/)?(?:www\.)?[A-Za-z0-9-]+\.[A-Za-z]{2,}(?:\/[^\s,]+)?/);
  if (site && !/linkedin/i.test(site[0]) && !data.email.includes(site[0])) {
    const cleaned = site[0].replace(/^https?:\/\//, "").replace(/^www\./, "");
    if (!data.email.endsWith(cleaned)) { data.website = cleaned; found.push("website"); }
  }
  // Location: a "City, Region/Country" line (or segment of a combined
  // contact line, split on "|") in the header zone.
  const locationSegments = headerLines.flatMap((l) => l.split("|").map((s) => s.trim()));
  for (const line of locationSegments) {
    if (data.location) break;
    if (EMAIL_RE.test(line) || PHONE_RE.test(line) || /linkedin/i.test(line)) continue;
    const m = line.match(/^([A-Za-z][A-Za-z .'-]+),\s*([A-Za-z .'-]{2,30})$/);
    if (m && m[1].length > 2 && !data.fullName.includes(m[1]) && !looksLikeName(line)) {
      data.location = line;
      found.push("location");
    }
  }

  // --- summary -----------------------------------------------------------
  const summaryLines = section("summary").filter((l) => !EMAIL_RE.test(l) && !PHONE_RE.test(l));
  if (summaryLines.length) {
    data.summary = summaryLines.join(" ").replace(/\s+/g, " ").trim();
    found.push("summary");
  }

  // --- experience --------------------------------------------------------
  const expLines = section("experience");
  let currentJob: ExperienceItem | null = null;
  const flushJob = () => {
    if (currentJob && hasExperienceContent(currentJob)) data.experience.push(currentJob);
    currentJob = null;
  };
  const newJob = (): ExperienceItem => ({
    id: `exp-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    role: "", company: "", start: "", end: "", current: false, bullets: "",
  });
  for (const line of expLines) {
    const dateMatch = line.match(DATE_RANGE_RE);
    const isBullet = /^[•\-*▸▪◦]\s+/.test(line);
    const clean = line.replace(/^[•\-*▸▪◦]\s+/, "");
    if (isBullet) {
      if (!currentJob) currentJob = newJob();
      currentJob.bullets = currentJob.bullets ? `${currentJob.bullets}\n${clean}` : clean;
      continue;
    }
    if (dateMatch) {
      const before = line.slice(0, dateMatch.index ?? 0).trim().replace(/[,|–—-]+$/, "").trim();
      const start = dateMatch[1];
      const endRaw = dateMatch[2];
      const isCurrent = /^(present|current|now)$/i.test(endRaw);
      if (before && (!currentJob || currentJob.role || currentJob.company)) {
        // A dated line with a role/company starts a new entry.
        if (currentJob && (currentJob.role || currentJob.company || currentJob.bullets)) flushJob();
        currentJob = newJob();
        const { role, company } = splitRoleCompany(before);
        currentJob.role = role;
        currentJob.company = company;
      } else if (!currentJob) {
        currentJob = newJob();
        if (before) {
          const { role, company } = splitRoleCompany(before);
          currentJob.role = role;
          currentJob.company = company;
        }
      } else if (before && !currentJob.role) {
        const { role, company } = splitRoleCompany(before);
        currentJob.role = role;
        currentJob.company = company;
      }
      if (currentJob) {
        currentJob.start = start;
        currentJob.end = isCurrent ? "" : endRaw;
        currentJob.current = isCurrent;
      }
      continue;
    }
    // Plain line: role/company header, company follow-up, or bullet text.
    // A "Role at Company" line after a job that already has bullets/dates
    // starts a new entry (otherwise the second job becomes a bullet).
    if (currentJob && (currentJob.bullets || currentJob.start) && looksLikeJobHeader(clean)) {
      flushJob();
      currentJob = newJob();
      const { role, company } = splitRoleCompany(clean);
      currentJob.role = role;
      currentJob.company = company;
      continue;
    }
    if (!currentJob) {
      currentJob = newJob();
      const { role, company } = splitRoleCompany(clean);
      currentJob.role = role;
      currentJob.company = company;
      continue;
    }
    if (!currentJob.company && !currentJob.bullets && clean.length <= 70 && !/[.!?]$/.test(clean)) {
      // Short line right after the role is most likely the company.
      currentJob.company = clean;
      continue;
    }
    if (!currentJob.role && !currentJob.company) {
      const { role, company } = splitRoleCompany(clean);
      currentJob.role = role;
      currentJob.company = company;
      continue;
    }
    currentJob.bullets = currentJob.bullets ? `${currentJob.bullets}\n${clean}` : clean;
  }
  flushJob();
  if (data.experience.length) found.push(`${data.experience.length} job${data.experience.length > 1 ? "s" : ""}`);
  if (data.experience.some((e) => !e.start && !e.end)) {
    warnings.push("Some jobs have no dates — check the start/end dates in the Experience section.");
  }

  // --- education ---------------------------------------------------------
  const eduLines = section("education");
  let currentEdu: EducationItem | null = null;
  const flushEdu = () => {
    if (currentEdu && hasEducationContent(currentEdu)) data.education.push(currentEdu);
    currentEdu = null;
  };
  const newEdu = (): EducationItem => ({
    id: `edu-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    degree: "", school: "", start: "", end: "",
  });
  for (const line of eduLines) {
    const dateMatch = line.match(DATE_RANGE_RE);
    const before = dateMatch ? line.slice(0, dateMatch.index ?? 0).trim().replace(/[,|–—-]+$/, "").trim() : line;
    const hasDegree = /(bachelor|master|mba|phd|b\.?\s?sc|b\.?\s?a\.?|m\.?\s?sc|m\.?\s?a\.?|diploma|associate|bba|b\.?eng|m\.?\s?eng|bcom|high school)/i.test(before);
    const hasSchool = /(university|college|institute|school|academy)/i.test(before);
    if (!currentEdu) currentEdu = newEdu();
    if (dateMatch) {
      currentEdu.start = dateMatch[1];
      const endRaw = dateMatch[2];
      currentEdu.end = /^(present|current|now)$/i.test(endRaw) ? "" : endRaw;
    }
    if (hasDegree && hasSchool) {
      const parts = before.split(/,\s*|\s+—\s+|\s+-\s+/).map((p) => p.trim()).filter(Boolean);
      if (parts.length >= 2) {
        currentEdu.degree = parts[0];
        currentEdu.school = parts.slice(1).join(", ");
      } else {
        currentEdu.degree = before;
      }
    } else if (hasDegree && !currentEdu.degree) {
      currentEdu.degree = before;
    } else if (hasSchool && !currentEdu.school) {
      currentEdu.school = before;
    } else if (!currentEdu.degree) {
      currentEdu.degree = before;
    } else if (!currentEdu.school) {
      currentEdu.school = before;
    }
    if (dateMatch || (hasDegree && hasSchool)) flushEdu();
  }
  flushEdu();
  if (data.education.length) found.push(`${data.education.length} education ${data.education.length > 1 ? "entries" : "entry"}`);

  // --- skills & languages -------------------------------------------------
  const skillText = section("skills").join("\n");
  if (skillText.trim()) {
    const all = splitList(skillText);
    const langs: string[] = [];
    const skills: string[] = [];
    for (const item of all) {
      const langMatch = item.match(/^([A-Za-z]+)\s*[\(\-–:]\s*(native|fluent|advanced|intermediate|beginner|conversational|basic|professional|bilingual)/i);
      const bareLang = COMMON_LANGUAGES.includes(item.toLowerCase());
      if (langMatch || bareLang) langs.push(item);
      else skills.push(item);
    }
    if (skills.length) { data.skills = skills.join(", "); found.push(`${skills.length} skills`); }
    if (langs.length) { data.languages = langs.join(", "); found.push("languages"); }
  }
  const langText = section("languages").join("\n");
  if (langText.trim()) {
    const langs = splitList(langText);
    data.languages = data.languages ? `${data.languages}, ${langs.join(", ")}` : langs.join(", ");
    if (!found.includes("languages")) found.push("languages");
  }

  // --- academic experience ------------------------------------------------
  // Same shape as work experience (title / organisation / dates / bullets),
  // parsed with the same date-range logic, kept in its own section.
  const acadLines = section("academic");
  let currentAcad: AcademicExperienceItem | null = null;
  const flushAcad = () => {
    if (currentAcad && hasAcademicExperienceContent(currentAcad)) data.academicExperience!.push(currentAcad);
    currentAcad = null;
  };
  const newAcad = (): AcademicExperienceItem => ({
    id: `acad-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    title: "", org: "", start: "", end: "", bullets: "",
  });
  for (const line of acadLines) {
    const dateMatch = line.match(DATE_RANGE_RE);
    const isBullet = /^[•\-*▸▪◦]\s+/.test(line);
    const clean = line.replace(/^[•\-*▸▪◦]\s+/, "");
    if (isBullet) {
      if (!currentAcad) currentAcad = newAcad();
      currentAcad.bullets = currentAcad.bullets ? `${currentAcad.bullets}\n${clean}` : clean;
      continue;
    }
    if (dateMatch) {
      const before = line.slice(0, dateMatch.index ?? 0).trim().replace(/[,|–—-]+$/, "").trim();
      if (before && (!currentAcad || currentAcad.title || currentAcad.org)) {
        if (currentAcad && (currentAcad.title || currentAcad.org || currentAcad.bullets)) flushAcad();
        currentAcad = newAcad();
        const { role, company } = splitRoleCompany(before);
        currentAcad.title = role;
        currentAcad.org = company;
      } else if (!currentAcad) {
        currentAcad = newAcad();
        if (before) {
          const { role, company } = splitRoleCompany(before);
          currentAcad.title = role;
          currentAcad.org = company;
        }
      }
      if (currentAcad) {
        currentAcad.start = dateMatch[1];
        const endRaw = dateMatch[2];
        currentAcad.end = /^(present|current|now)$/i.test(endRaw) ? "" : endRaw;
      }
      continue;
    }
    if (!currentAcad) {
      currentAcad = newAcad();
      const { role, company } = splitRoleCompany(clean);
      currentAcad.title = role;
      currentAcad.org = company;
      continue;
    }
    if (!currentAcad.org && !currentAcad.bullets && clean.length <= 70 && !/[.!?]$/.test(clean)) {
      currentAcad.org = clean;
      continue;
    }
    currentAcad.bullets = currentAcad.bullets ? `${currentAcad.bullets}\n${clean}` : clean;
  }
  flushAcad();
  if (data.academicExperience!.length) found.push(`${data.academicExperience!.length} academic experience ${data.academicExperience!.length > 1 ? "entries" : "entry"}`);

  // --- references ---------------------------------------------------------
  const refText = section("references").join(" ").replace(/\s+/g, " ").trim();
  if (refText) {
    if (/upon request/i.test(refText)) {
      data.referencesOnRequest = true;
    } else {
      data.referencesText = refText;
    }
    found.push("references");
  }

  if (!data.fullName) warnings.push("No name was found — add your name at the top of the form.");
  if (!data.email) warnings.push("No email address was found — check the contact details.");
  if (!data.experience.length && !data.education.length && !data.skills) {
    warnings.push("No experience, education or skills sections were recognised — check the headings in your file, or fill in the form by hand.");
  }
  return { data, found, warnings };
}

/** Load pdfjs-dist: the normal build with the bundled worker in the browser
 * (the same "/pdf.worker.min.mjs" the rest of the site uses), the legacy
 * build on the main thread anywhere else (Node / tests). */
async function loadPdfjsForResume() {
  if (typeof window === "undefined") {
    return (await import("pdfjs-dist/legacy/build/pdf.mjs")) as typeof import("pdfjs-dist");
  }
  const pdfjs = await import("pdfjs-dist");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (pdfjs as any).GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
  return pdfjs;
}

/** Extract the plain text of an uploaded PDF or DOCX resume (on-device). */
export async function extractResumeTextFromFile(file: Blob, fileName: string): Promise<string> {
  const lower = fileName.toLowerCase();
  if (lower.endsWith(".pdf")) {
    const pdfjs = await loadPdfjsForResume();
    const bytes = new Uint8Array(await file.arrayBuffer());
    const doc = await pdfjs.getDocument({ data: bytes }).promise;
    const pages: string[] = [];
    for (let p = 1; p <= doc.numPages; p++) {
      const page = await doc.getPage(p);
      const tc = await page.getTextContent();
      // Group text runs into lines by their vertical position.
      const rawItems = tc.items as unknown as { str?: string; transform?: number[] }[];
      const runs = rawItems
        .filter((it) => typeof it.str === "string")
        .map((it) => ({ str: it.str as string, x: it.transform?.[4] ?? 0, y: it.transform?.[5] ?? 0 }))
        .filter((r) => r.str.trim());
      runs.sort((a, b) => b.y - a.y || a.x - b.x);
      // Walk sorted runs, starting a new line when y jumps.
      const grouped: string[] = [];
      let currentY: number | null = null;
      let currentLine = "";
      for (const r of runs) {
        if (currentY === null || Math.abs(r.y - currentY) > 3) {
          if (currentLine.trim()) grouped.push(currentLine.trim());
          currentLine = r.str;
          currentY = r.y;
        } else {
          currentLine += (/[ -]$/.test(currentLine) ? "" : " ") + r.str;
        }
      }
      if (currentLine.trim()) grouped.push(currentLine.trim());
      pages.push(grouped.join("\n"));
    }
    return pages.join("\n");
  }
  if (lower.endsWith(".docx")) {
    const mammoth = await import("mammoth");
    const arrayBuffer = await file.arrayBuffer();
    try {
      // Browser path: mammoth accepts an ArrayBuffer.
      const { value } = await mammoth.extractRawText({ arrayBuffer });
      return value;
    } catch {
      // Node path (same library, same result): mammoth wants a Buffer.
      if (typeof Buffer !== "undefined") {
        const { value } = await mammoth.extractRawText({ buffer: Buffer.from(arrayBuffer) });
        return value;
      }
      throw new Error("Could not read this Word file.");
    }
  }
  throw new Error("Only PDF (.pdf) and Word (.docx) resumes can be uploaded.");
}

/** Read an uploaded resume file and parse it into editable builder data. */
export async function parseUploadedResume(file: File): Promise<ResumeParseResult> {
  const text = await extractResumeTextFromFile(file, file.name);
  return parseResumeText(text);
}
