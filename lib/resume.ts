// Resume builder data model, sample data, date formatting, template-based
// summary writer, and .docx export. Everything here is local: no model calls,
// no network. The summary writer fills proven sentence templates with the
// user's own details.

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
  skills: string; // comma-separated
}

export type ResumeTemplateId = "modern" | "classic" | "minimal" | "ats";
export type DateFormat = "mon-yyyy" | "mm-yyyy" | "yyyy" | "mon-dd-yyyy";

export const TEMPLATES: { id: ResumeTemplateId; name: string; description: string }[] = [
  {
    id: "modern",
    name: "Modern",
    description: "Teal accent bar, bold name, skills as pills. Good for tech, design and startups.",
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
];

export const DATE_FORMATS: { id: DateFormat; label: string; example: string }[] = [
  { id: "mon-yyyy", label: "Jan 2025 (month + year)", example: "Jan 2022 – Mar 2025" },
  { id: "mm-yyyy", label: "01/2025 (numeric)", example: "01/2022 – 03/2025" },
  { id: "yyyy", label: "2025 (year only)", example: "2022 – 2025" },
  { id: "mon-dd-yyyy", label: "Jan 15, 2025 (US style)", example: "Jan 2022 – Mar 2025" },
];

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** Parse "2022-01", "Jan 2022", "2022" etc. into {year, month?}. Returns null if unparseable. */
function parseDate(raw: string): { year: number; month?: number } | null {
  const s = raw.trim();
  if (!s) return null;
  const iso = s.match(/^(\d{4})[-/](\d{1,2})(?:[-/]\d{1,2})?$/);
  if (iso) return { year: Number(iso[1]), month: Number(iso[2]) };
  const yearOnly = s.match(/^(\d{4})$/);
  if (yearOnly) return { year: Number(yearOnly[1]) };
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
  // mon-yyyy and mon-dd-yyyy both render as "Mon YYYY" (day is not stored)
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

export function skillList(skills: string): string[] {
  return skills.split(",").map((s) => s.trim()).filter(Boolean);
}

export function bulletList(bullets: string): string[] {
  return bullets.split("\n").map((b) => b.trim()).filter(Boolean);
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
  skills: "Customer support, Zendesk, Live chat, Conflict resolution, CRM, Clear writing, Spanish (conversational)",
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
// colour theme carry into the Word file: headings and the name use the font
// (display fonts apply to headings only, body stays readable), and headings
// use the theme accent. Word substitutes a font it does not have installed.
// ---------------------------------------------------------------------------

export async function buildResumeDocx(
  data: ResumeData,
  fmt: DateFormat,
  opts: { fontId?: string | null; themeId?: string; template?: ResumeTemplateId } = {},
): Promise<Blob> {
  const { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType } = await import("docx");
  const template = opts.template ?? "modern";
  const font = opts.fontId ? getResumeFont(opts.fontId) : getResumeFont(TEMPLATE_DEFAULT_FONTS[template]);
  const theme = getResumeTheme(opts.themeId);
  const accent = theme.accent.replace("#", "");
  // Display fonts (e.g. Bebas Neue, Dancing Script) go on headings only;
  // the body uses the template's default font so it stays readable.
  const bodyFont = font.headingOnly ? getResumeFont(TEMPLATE_DEFAULT_FONTS[template]).docxName : font.docxName;
  const headFont = font.docxName;

  const children: InstanceType<typeof Paragraph>[] = [];

  const heading = (text: string) =>
    new Paragraph({
      heading: HeadingLevel.HEADING_2,
      spacing: { before: 240, after: 80 },
      children: [new TextRun({ text, bold: true, size: 26, color: accent, font: headFont })],
    });

  const body = (text: string, extra: { bold?: boolean; italics?: boolean; size?: number; color?: string } = {}) =>
    new TextRun({ text, font: bodyFont, ...extra });

  children.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [new TextRun({ text: data.fullName || "Your Name", bold: true, size: 44, font: headFont })],
    }),
  );
  if (data.title.trim()) {
    children.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [new TextRun({ text: data.title, size: 26, color: "475569", font: bodyFont })],
      }),
    );
  }
  const contact = [data.email, data.phone, data.location, data.website, data.linkedin]
    .filter((x) => x.trim())
    .join("  ·  ");
  if (contact) {
    children.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 120 },
        children: [new TextRun({ text: contact, size: 20, color: "475569", font: bodyFont })],
      }),
    );
  }
  if (data.summary.trim()) {
    children.push(heading("Summary"));
    children.push(new Paragraph({ children: [body(data.summary, { size: 22 })] }));
  }
  if (data.experience.some((e) => e.role.trim() || e.company.trim())) {
    children.push(heading("Experience"));
    for (const e of data.experience) {
      if (!e.role.trim() && !e.company.trim()) continue;
      children.push(
        new Paragraph({
          spacing: { before: 120 },
          children: [
            body(e.role, { bold: true, size: 24 }),
            new TextRun({ text: e.company ? ` — ${e.company}` : "", size: 24, font: bodyFont }),
          ],
        }),
      );
      const range = formatRange(e.start, e.end, e.current, fmt);
      if (range) {
        children.push(
          new Paragraph({ children: [body(range, { italics: true, size: 20, color: "475569" })] }),
        );
      }
      for (const b of bulletList(e.bullets)) {
        children.push(new Paragraph({ bullet: { level: 0 }, children: [body(b, { size: 22 })] }));
      }
    }
  }
  if (data.education.some((e) => e.degree.trim() || e.school.trim())) {
    children.push(heading("Education"));
    for (const e of data.education) {
      if (!e.degree.trim() && !e.school.trim()) continue;
      children.push(
        new Paragraph({
          children: [
            body(e.degree, { bold: true, size: 24 }),
            new TextRun({ text: e.school ? ` — ${e.school}` : "", size: 24, font: bodyFont }),
          ],
        }),
      );
      const range = formatRange(e.start, e.end, false, fmt);
      if (range) {
        children.push(
          new Paragraph({ children: [body(range, { italics: true, size: 20, color: "475569" })] }),
        );
      }
    }
  }
  const skills = skillList(data.skills);
  if (skills.length) {
    children.push(heading("Skills"));
    children.push(new Paragraph({ children: [body(skills.join("  ·  "), { size: 22 })] }));
  }

  const doc = new Document({
    creator: "PDF World Resume Builder",
    title: `${data.fullName || "Resume"} — ${data.title || "Resume"}`,
    sections: [{ children }],
  });
  return Packer.toBlob(doc);
}

export const STORAGE_KEY = "pdfworld-resume-v1";
