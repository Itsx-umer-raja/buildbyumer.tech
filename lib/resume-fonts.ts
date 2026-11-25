// Resume fonts + colour themes.
//
// Classic fonts are system stacks: they render from fonts installed on the
// user's own device, exactly as MS Word does — no Microsoft fonts are
// bundled or shipped by this site. Stylish fonts are free Google Fonts
// (OFL licence), self-hosted at build time through next/font/google, the
// same mechanism the site already uses for Fraunces and Inter.

import type { ResumeTemplateId } from "./resume";

export type ResumeFontGroup = "classic" | "stylish";

export interface ResumeFont {
  id: string;
  name: string;
  group: ResumeFontGroup;
  /** CSS font-family used in the live preview and in print. */
  family: string;
  /** Font name written into .docx runs (Word substitutes if not installed). */
  docxName: string;
  /** Display fonts apply to the name + section headings only; the body stays readable. */
  headingOnly?: boolean;
  /** Short hint shown in the picker. */
  hint?: string;
}

export const RESUME_FONTS: ResumeFont[] = [
  // MS Word classics — system stacks, rendered from the device's own fonts.
  { id: "times-new-roman", name: "Times New Roman", group: "classic", family: "'Times New Roman', Times, serif", docxName: "Times New Roman" },
  { id: "arial", name: "Arial", group: "classic", family: "Arial, Helvetica, sans-serif", docxName: "Arial" },
  { id: "calibri", name: "Calibri", group: "classic", family: "Calibri, Carlito, 'Segoe UI', sans-serif", docxName: "Calibri" },
  { id: "georgia", name: "Georgia", group: "classic", family: "Georgia, 'Times New Roman', serif", docxName: "Georgia" },
  { id: "garamond", name: "Garamond", group: "classic", family: "Garamond, 'EB Garamond', 'Times New Roman', serif", docxName: "Garamond" },
  { id: "cambria", name: "Cambria", group: "classic", family: "Cambria, Georgia, serif", docxName: "Cambria" },
  { id: "verdana", name: "Verdana", group: "classic", family: "Verdana, Geneva, sans-serif", docxName: "Verdana" },
  { id: "trebuchet", name: "Trebuchet MS", group: "classic", family: "'Trebuchet MS', Verdana, sans-serif", docxName: "Trebuchet MS" },
  { id: "courier-new", name: "Courier New", group: "classic", family: "'Courier New', Courier, monospace", docxName: "Courier New" },
  { id: "tahoma", name: "Tahoma", group: "classic", family: "Tahoma, Verdana, sans-serif", docxName: "Tahoma" },
  // Stylish — free Google Fonts (OFL), loaded with next/font/google on /resume.
  { id: "playfair", name: "Playfair Display", group: "stylish", family: "var(--font-resume-playfair), Georgia, serif", docxName: "Playfair Display" },
  { id: "montserrat", name: "Montserrat", group: "stylish", family: "var(--font-resume-montserrat), 'Segoe UI', sans-serif", docxName: "Montserrat" },
  { id: "poppins", name: "Poppins", group: "stylish", family: "var(--font-resume-poppins), 'Segoe UI', sans-serif", docxName: "Poppins" },
  { id: "raleway", name: "Raleway", group: "stylish", family: "var(--font-resume-raleway), 'Segoe UI', sans-serif", docxName: "Raleway" },
  { id: "dancing-script", name: "Dancing Script", group: "stylish", family: "var(--font-resume-dancing), cursive", docxName: "Dancing Script", headingOnly: true, hint: "Headings only" },
  { id: "bebas-neue", name: "Bebas Neue", group: "stylish", family: "var(--font-resume-bebas), 'Arial Narrow', sans-serif", docxName: "Bebas Neue", headingOnly: true, hint: "Headings only" },
  { id: "oswald", name: "Oswald", group: "stylish", family: "var(--font-resume-oswald), 'Arial Narrow', sans-serif", docxName: "Oswald" },
  { id: "lora", name: "Lora", group: "stylish", family: "var(--font-resume-lora), Georgia, serif", docxName: "Lora" },
];

export function getResumeFont(id: string | undefined | null): ResumeFont {
  return RESUME_FONTS.find((f) => f.id === id) ?? RESUME_FONTS.find((f) => f.id === "calibri")!;
}

/** The font each template uses until the user picks one in the font picker. */
export const TEMPLATE_DEFAULT_FONTS: Record<ResumeTemplateId, string> = {
  modern: "calibri",
  classic: "georgia",
  minimal: "calibri",
  ats: "arial",
  "two-column": "calibri",
  "fresh-grad": "montserrat",
  "navy-sidebar": "calibri",
  pastel: "lora",
  bold: "montserrat",
  simple: "garamond",
};

export interface ResumeTheme {
  id: string;
  name: string;
  /** Accent used for headings, rules and badges. */
  accent: string;
  /** Darker accent for text on a light tint. */
  accentDark: string;
  /** Light tint for skill pills and highlights. */
  soft: string;
}

export const RESUME_THEMES: ResumeTheme[] = [
  { id: "teal", name: "Teal", accent: "#0F766E", accentDark: "#115E59", soft: "#F0FDFB" },
  { id: "navy", name: "Navy", accent: "#1E3A5F", accentDark: "#172F4D", soft: "#EFF4FA" },
  { id: "burgundy", name: "Burgundy", accent: "#7C2D3E", accentDark: "#641F2E", soft: "#FBF1F2" },
  { id: "emerald", name: "Emerald", accent: "#047857", accentDark: "#065F46", soft: "#ECFDF5" },
  { id: "plum", name: "Plum", accent: "#6B21A8", accentDark: "#581C87", soft: "#FAF5FF" },
  { id: "charcoal", name: "Charcoal", accent: "#334155", accentDark: "#1E293B", soft: "#F1F5F9" },
  { id: "royal", name: "Royal Blue", accent: "#1D4ED8", accentDark: "#1E40AF", soft: "#EFF6FF" },
  { id: "coral", name: "Coral", accent: "#EA580C", accentDark: "#C2410C", soft: "#FFF7ED" },
];

export function getResumeTheme(id: string | undefined | null): ResumeTheme {
  return RESUME_THEMES.find((t) => t.id === id) ?? RESUME_THEMES[0];
}
