"use client";

import type { CSSProperties } from "react";
import type { ResumeData, ResumeTemplateId, DateFormat } from "@/lib/resume";
import {
  formatRange,
  skillList,
  languageList,
  bulletList,
  hasExperienceContent,
  hasEducationContent,
} from "@/lib/resume";
import { getResumeFont, getResumeTheme, TEMPLATE_DEFAULT_FONTS } from "@/lib/resume-fonts";

function ContactLine({ data }: { data: ResumeData }) {
  const parts = [data.email, data.phone, data.location, data.website, data.linkedin].filter((x) => x.trim());
  return <p>{parts.join("  ·  ")}</p>;
}

function initials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}

function PhotoOrInitials({
  photo,
  name,
  size,
  ring,
}: {
  photo: string | null;
  name: string;
  size: string;
  ring?: string;
}) {
  if (photo) return <img src={photo} alt="" className={`${size} rounded-full object-cover ${ring ?? ""}`} />;
  const init = initials(name);
  if (!init) return null;
  return (
    <div
      className={`${size} flex shrink-0 items-center justify-center rounded-full bg-[var(--resume-accent)] text-lg font-bold text-white ${ring ?? ""}`}
      aria-hidden
    >
      {init}
    </div>
  );
}

function ExperienceSection({
  data,
  fmt,
  headingCls,
  headingStyle,
}: {
  data: ResumeData;
  fmt: DateFormat;
  headingCls: string;
  headingStyle?: CSSProperties;
}) {
  // B9: items with only bullets or only dates still count — their text is kept.
  const items = data.experience.filter(hasExperienceContent);
  if (!items.length) return null;
  return (
    <section className="break-inside-avoid">
      <h2 className={headingCls} style={headingStyle}>
        Experience
      </h2>
      <div className="space-y-3">
        {items.map((e) => {
          const roleLine = [e.role.trim(), e.company.trim()].filter(Boolean).join(" — ");
          const range = formatRange(e.start, e.end, e.current, fmt);
          return (
            <div key={e.id} className="break-inside-avoid">
              <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                <p className="font-bold">
                  {roleLine || range || "Experience"}
                </p>
                {roleLine && range ? <p className="text-[11px] text-slate-500">{range}</p> : null}
              </div>
              {bulletList(e.bullets).length > 0 && (
                <ul className="mt-1 list-disc space-y-0.5 pl-5 text-[12.5px] leading-relaxed">
                  {bulletList(e.bullets).map((b, i) => (
                    <li key={i}>{b}</li>
                  ))}
                </ul>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}

function EducationSection({
  data,
  fmt,
  headingCls,
  headingStyle,
}: {
  data: ResumeData;
  fmt: DateFormat;
  headingCls: string;
  headingStyle?: CSSProperties;
}) {
  const items = data.education.filter(hasEducationContent);
  if (!items.length) return null;
  return (
    <section className="break-inside-avoid">
      <h2 className={headingCls} style={headingStyle}>
        Education
      </h2>
      <div className="space-y-2">
        {items.map((e) => {
          const line = [e.degree.trim(), e.school.trim()].filter(Boolean).join(" — ");
          const range = formatRange(e.start, e.end, false, fmt);
          return (
            <div key={e.id} className="flex flex-wrap items-baseline justify-between gap-x-3">
              <p>
                <span className="font-bold">{line || range || "Education"}</span>
              </p>
              {line && range ? <p className="text-[11px] text-slate-500">{range}</p> : null}
            </div>
          );
        })}
      </div>
    </section>
  );
}

function SkillsSection({
  data,
  pill,
  headingCls,
  headingStyle,
  variant = "pills",
}: {
  data: ResumeData;
  pill: boolean;
  headingCls?: string;
  headingStyle?: CSSProperties;
  variant?: "pills" | "line" | "list";
}) {
  const skills = skillList(data.skills);
  // B4: no heading at all when there are no skills.
  if (!skills.length) return null;
  return (
    <section className="break-inside-avoid">
      {headingCls ? (
        <h2 className={headingCls} style={headingStyle}>
          Skills
        </h2>
      ) : null}
      {variant === "pills" || pill ? (
        <div className="flex flex-wrap gap-1.5">
          {skills.map((s, i) => (
            <span
              key={`${s}-${i}`}
              className="rounded-full bg-[var(--resume-accent-soft)] px-2.5 py-1 text-[11.5px] font-medium text-[var(--resume-accent-dark)] ring-1 ring-[var(--resume-accent)]"
            >
              {s}
            </span>
          ))}
        </div>
      ) : variant === "list" ? (
        <ul className="space-y-1 text-[12.5px] leading-relaxed">
          {skills.map((s, i) => (
            <li key={`${s}-${i}`} className="flex items-start gap-2">
              <span aria-hidden className="mt-[7px] h-1.5 w-1.5 shrink-0 bg-[var(--resume-accent)]" />
              {s}
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-[12.5px] leading-relaxed">{skills.join("  ·  ")}</p>
      )}
    </section>
  );
}

function LanguagesSection({
  data,
  headingCls,
  headingStyle,
}: {
  data: ResumeData;
  headingCls?: string;
  headingStyle?: CSSProperties;
}) {
  const langs = languageList(data.languages);
  if (!langs.length) return null;
  return (
    <section className="break-inside-avoid">
      {headingCls ? (
        <h2 className={headingCls} style={headingStyle}>
          Languages
        </h2>
      ) : null}
      <p className="text-[12.5px] leading-relaxed">{langs.join("  ·  ")}</p>
    </section>
  );
}

function SummarySection({
  data,
  headingCls,
  headingStyle,
}: {
  data: ResumeData;
  headingCls: string;
  headingStyle?: CSSProperties;
}) {
  if (!data.summary.trim()) return null;
  return (
    <section className="break-inside-avoid">
      <h2 className={headingCls} style={headingStyle}>
        Summary
      </h2>
      <p className="text-[12.5px] leading-relaxed">{data.summary}</p>
    </section>
  );
}

// ---------------------------------------------------------------- Modern
function ModernTemplate({
  data,
  fmt,
  photo,
  headingStyle,
}: {
  data: ResumeData;
  fmt: DateFormat;
  photo: string | null;
  headingStyle?: CSSProperties;
}) {
  const h =
    "mb-1.5 border-b-2 border-[var(--resume-accent)] pb-1 text-[11px] font-bold uppercase tracking-[0.14em] text-[var(--resume-accent-dark)]";
  return (
    <div className="space-y-4 text-slate-800">
      <header className="border-l-4 border-[var(--resume-accent)] pl-4">
        <div className="flex items-start gap-4">
          {photo && <img src={photo} alt="" className="h-20 w-20 rounded-full object-cover" />}
          <div>
            <h1 className="text-[26px] font-bold leading-tight text-slate-900" style={headingStyle}>
              {data.fullName || "Your Name"}
            </h1>
            {data.title && <p className="text-[14px] font-semibold text-[var(--resume-accent)]">{data.title}</p>}
            <div className="mt-1 text-[11.5px] text-slate-500">
              <ContactLine data={data} />
            </div>
          </div>
        </div>
      </header>
      <SummarySection data={data} headingCls={h} headingStyle={headingStyle} />
      <ExperienceSection data={data} fmt={fmt} headingCls={h} headingStyle={headingStyle} />
      <EducationSection data={data} fmt={fmt} headingCls={h} headingStyle={headingStyle} />
      <SkillsSection data={data} pill headingCls={h} headingStyle={headingStyle} />
      <LanguagesSection data={data} headingCls={h} headingStyle={headingStyle} />
    </div>
  );
}

// ---------------------------------------------------------------- Classic
function ClassicTemplate({
  data,
  fmt,
  photo,
  headingStyle,
}: {
  data: ResumeData;
  fmt: DateFormat;
  photo: string | null;
  headingStyle?: CSSProperties;
}) {
  const h =
    "mb-1.5 border-b border-slate-400 pb-1 text-center text-[11px] font-bold uppercase tracking-[0.2em] text-slate-900";
  return (
    <div className="space-y-4 text-slate-800">
      <header className="text-center">
        {photo && <img src={photo} alt="" className="mx-auto mb-2 h-20 w-20 rounded-full object-cover" />}
        <h1 className="text-[26px] font-bold leading-tight text-slate-900" style={headingStyle}>
          {data.fullName || "Your Name"}
        </h1>
        {data.title && <p className="text-[13px] italic text-[var(--resume-accent-dark)]">{data.title}</p>}
        <div className="mt-1 text-[11.5px] text-slate-500">
          <ContactLine data={data} />
        </div>
        <hr className="mt-3 border-t-2 border-[var(--resume-accent)]" />
      </header>
      <SummarySection data={data} headingCls={h} headingStyle={headingStyle} />
      <ExperienceSection data={data} fmt={fmt} headingCls={h} headingStyle={headingStyle} />
      <EducationSection data={data} fmt={fmt} headingCls={h} headingStyle={headingStyle} />
      <SkillsSection data={data} pill={false} headingCls={h} headingStyle={headingStyle} />
      <LanguagesSection data={data} headingCls={h} headingStyle={headingStyle} />
    </div>
  );
}

// ---------------------------------------------------------------- Minimal
function MinimalTemplate({
  data,
  fmt,
  photo,
  headingStyle,
}: {
  data: ResumeData;
  fmt: DateFormat;
  photo: string | null;
  headingStyle?: CSSProperties;
}) {
  const h = "mb-1.5 text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400";
  return (
    <div className="space-y-5 text-slate-800">
      <header>
        <div className="flex items-start gap-4">
          {photo && <img src={photo} alt="" className="h-16 w-16 rounded-full object-cover" />}
          <div>
            <h1
              className="text-[24px] font-light leading-tight tracking-wide text-slate-900"
              style={headingStyle}
            >
              {data.fullName || "Your Name"}
            </h1>
            {data.title && <p className="mt-0.5 text-[13px] text-[var(--resume-accent)]">{data.title}</p>}
            <div className="mt-2 text-[11.5px] text-slate-500">
              <ContactLine data={data} />
            </div>
          </div>
        </div>
        <hr className="mt-4 border-slate-200" />
      </header>
      <SummarySection data={data} headingCls={h} headingStyle={headingStyle} />
      <ExperienceSection data={data} fmt={fmt} headingCls={h} headingStyle={headingStyle} />
      <EducationSection data={data} fmt={fmt} headingCls={h} headingStyle={headingStyle} />
      <SkillsSection data={data} pill={false} headingCls={h} headingStyle={headingStyle} />
      <LanguagesSection data={data} headingCls={h} headingStyle={headingStyle} />
    </div>
  );
}

// ---------------------------------------------------------------- ATS-friendly
// Deliberately stays black, in plain Arial: the colour theme and any stylish
// font are not applied here so applicant tracking systems read the resume
// reliably (B1, B2). The photo is hidden on purpose; the builder says so.
function AtsTemplate({ data, fmt }: { data: ResumeData; fmt: DateFormat; photo: string | null }) {
  const h = "mb-1.5 border-b border-black pb-0.5 text-[12px] font-bold uppercase tracking-wide text-black";
  const arial: CSSProperties = { fontFamily: "Arial, Helvetica, sans-serif" };
  return (
    <div className="space-y-4 text-black" style={arial}>
      <header>
        <h1 className="text-[24px] font-bold leading-tight">{data.fullName || "Your Name"}</h1>
        {data.title && <p className="text-[13px] font-semibold">{data.title}</p>}
        <div className="mt-1 text-[12px]">
          <ContactLine data={data} />
        </div>
      </header>
      <SummarySection data={data} headingCls={h} headingStyle={arial} />
      <ExperienceSection data={data} fmt={fmt} headingCls={h} headingStyle={arial} />
      <EducationSection data={data} fmt={fmt} headingCls={h} headingStyle={arial} />
      <SkillsSection data={data} pill={false} headingCls={h} headingStyle={arial} />
      <LanguagesSection data={data} headingCls={h} headingStyle={arial} />
    </div>
  );
}

// ---------------------------------------------------------------- Classic Two-Column (new)
// Full-width header, then a narrow left column (Skills, Education, Languages)
// and a wide right column (Summary, Experience).
function TwoColumnTemplate({
  data,
  fmt,
  headingStyle,
}: {
  data: ResumeData;
  fmt: DateFormat;
  headingStyle?: CSSProperties;
}) {
  const h =
    "mb-1.5 border-b-2 border-[var(--resume-accent)] pb-1 text-[11px] font-bold uppercase tracking-[0.14em] text-[var(--resume-accent-dark)]";
  const sideH =
    "mb-1.5 border-b border-slate-300 pb-1 text-[11px] font-bold uppercase tracking-[0.14em] text-slate-900";
  return (
    <div className="text-slate-800">
      <header className="border-b-2 border-[var(--resume-accent)] pb-3">
        <h1 className="text-[26px] font-bold leading-tight text-slate-900" style={headingStyle}>
          {data.fullName || "Your Name"}
        </h1>
        {data.title && <p className="text-[13px] font-semibold text-[var(--resume-accent)]">{data.title}</p>}
        <div className="mt-1 text-[11.5px] text-slate-500">
          <ContactLine data={data} />
        </div>
      </header>
      <div className="mt-4 flex gap-6">
        <aside className="w-[32%] shrink-0 space-y-4 border-r border-slate-200 pr-5">
          <SkillsSection data={data} pill headingCls={sideH} headingStyle={headingStyle} />
          <EducationSection data={data} fmt={fmt} headingCls={sideH} headingStyle={headingStyle} />
          <LanguagesSection data={data} headingCls={sideH} headingStyle={headingStyle} />
        </aside>
        <div className="min-w-0 flex-1 space-y-4">
          <SummarySection data={data} headingCls={h} headingStyle={headingStyle} />
          <ExperienceSection data={data} fmt={fmt} headingCls={h} headingStyle={headingStyle} />
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- Fresh Graduate (new)
// Solid theme-coloured sidebar with a round photo (or initials), contact,
// skills as pale pills, and education; Education sits above Experience in
// the main column for a graduate-first reading order.
function FreshGradTemplate({
  data,
  fmt,
  photo,
  headingStyle,
}: {
  data: ResumeData;
  fmt: DateFormat;
  photo: string | null;
  headingStyle?: CSSProperties;
}) {
  const h =
    "mb-1.5 border-b-2 border-[var(--resume-accent)] pb-1 text-[11px] font-bold uppercase tracking-[0.14em] text-[var(--resume-accent-dark)]";
  const sideH =
    "mb-1.5 border-b border-white/40 pb-1 text-[11px] font-bold uppercase tracking-[0.14em] text-white";
  return (
    <div className="flex text-slate-800">
      <aside className="-my-10 -ml-8 flex w-[35%] shrink-0 flex-col items-center bg-[var(--resume-accent)] px-5 py-10 text-white sm:-ml-10">
        <PhotoOrInitials photo={photo} name={data.fullName} size="h-24 w-24" ring="ring-2 ring-white" />
        <div className="mt-5 w-full space-y-4 text-[12px] leading-relaxed">
          <div>
            <h2 className={sideH}>Contact</h2>
            <div className="space-y-0.5 break-words">
              {[data.email, data.phone, data.location, data.website, data.linkedin]
                .filter((x) => x.trim())
                .map((x, i) => (
                  <p key={i}>{x}</p>
                ))}
            </div>
          </div>
          <SkillsSection
            data={data}
            pill
            headingCls={sideH}
            headingStyle={headingStyle}
          />
          <LanguagesSection data={data} headingCls={sideH} headingStyle={headingStyle} />
        </div>
      </aside>
      <div className="min-w-0 flex-1 space-y-4 pl-6">
        <header>
          <h1 className="text-[26px] font-bold leading-tight text-slate-900" style={headingStyle}>
            {data.fullName || "Your Name"}
          </h1>
          {data.title && <p className="text-[13px] font-semibold text-[var(--resume-accent)]">{data.title}</p>}
          <hr className="mt-2 border-[var(--resume-accent)]" />
        </header>
        <SummarySection data={data} headingCls={h} headingStyle={headingStyle} />
        <EducationSection data={data} fmt={fmt} headingCls={h} headingStyle={headingStyle} />
        <ExperienceSection data={data} fmt={fmt} headingCls={h} headingStyle={headingStyle} />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- Corporate Navy (new)
// Deep navy sidebar with a smaller round photo and contact/skills as a plain
// list; roomy white main column with navy-ruled headings.
function NavySidebarTemplate({
  data,
  fmt,
  photo,
  headingStyle,
}: {
  data: ResumeData;
  fmt: DateFormat;
  photo: string | null;
  headingStyle?: CSSProperties;
}) {
  const h =
    "mb-1.5 border-b-2 border-[#1B2A4A] pb-1 text-[11px] font-bold uppercase tracking-[0.14em] text-[#1B2A4A]";
  const sideH =
    "mb-1.5 border-b border-white/40 pb-1 text-[11px] font-bold uppercase tracking-[0.14em] text-white";
  return (
    <div className="flex text-slate-800">
      <aside className="-my-10 -ml-8 flex w-[32%] shrink-0 flex-col items-center bg-[#1B2A4A] px-5 py-10 text-white sm:-ml-10">
        <PhotoOrInitials photo={photo} name={data.fullName} size="h-20 w-20" ring="ring-2 ring-white/80" />
        <div className="mt-5 w-full space-y-4 text-[12px] leading-relaxed">
          <div>
            <h2 className={sideH}>Contact</h2>
            <div className="space-y-0.5 break-words">
              {[data.email, data.phone, data.location, data.website, data.linkedin]
                .filter((x) => x.trim())
                .map((x, i) => (
                  <p key={i}>{x}</p>
                ))}
            </div>
          </div>
          <SkillsSection data={data} pill={false} variant="list" headingCls={sideH} headingStyle={headingStyle} />
          <LanguagesSection data={data} headingCls={sideH} headingStyle={headingStyle} />
        </div>
      </aside>
      <div className="min-w-0 flex-1 space-y-4 pl-6">
        <header>
          <h1 className="text-[26px] font-bold leading-tight text-slate-900" style={headingStyle}>
            {data.fullName || "Your Name"}
          </h1>
          {data.title && <p className="text-[13px] font-semibold text-[#1B2A4A]">{data.title}</p>}
          <hr className="mt-2 border-[#1B2A4A]" />
        </header>
        <SummarySection data={data} headingCls={h} headingStyle={headingStyle} />
        <ExperienceSection data={data} fmt={fmt} headingCls={h} headingStyle={headingStyle} />
        <EducationSection data={data} fmt={fmt} headingCls={h} headingStyle={headingStyle} />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- Pastel Minimalist (new)
// Single column on a soft cream page; muted headings in sentence case, hairline
// tint rules, body in soft charcoal (never pure black).
function PastelTemplate({
  data,
  fmt,
  photo,
  headingStyle,
}: {
  data: ResumeData;
  fmt: DateFormat;
  photo: string | null;
  headingStyle?: CSSProperties;
}) {
  const h =
    "mb-1.5 border-b border-[#E5D5C8] pb-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#8A6D5A]";
  return (
    <div className="-mx-8 -my-10 bg-[#FDF6EC] px-8 py-10 text-[#3F3A36] sm:-mx-10 sm:px-10">
      <header className="text-center">
        {photo && <img src={photo} alt="" className="mx-auto mb-3 h-20 w-20 rounded-full object-cover ring-2 ring-[#E5D5C8]" />}
        <h1 className="text-[28px] font-bold leading-tight text-[#2B2622]" style={headingStyle}>
          {data.fullName || "Your Name"}
        </h1>
        {data.title && <p className="mt-0.5 text-[13px] tracking-wide text-[#8A6D5A]">{data.title}</p>}
        <div className="mt-1 text-[11.5px] text-[#6B6259]">
          <ContactLine data={data} />
        </div>
        <div className="mx-auto mt-3 h-px w-16 bg-[#D9A066]" />
      </header>
      <div className="mt-5 space-y-4">
        <SummarySection data={data} headingCls={h} headingStyle={headingStyle} />
        <ExperienceSection data={data} fmt={fmt} headingCls={h} headingStyle={headingStyle} />
        <EducationSection data={data} fmt={fmt} headingCls={h} headingStyle={headingStyle} />
        <SkillsSection data={data} pill headingCls={h} headingStyle={headingStyle} />
        <LanguagesSection data={data} headingCls={h} headingStyle={headingStyle} />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- Bold Display (new)
// Oversized name in the theme colour, a thick accent rule under the header,
// and a short thick accent rule above every section heading.
function BoldTemplate({
  data,
  fmt,
  photo,
  headingStyle,
}: {
  data: ResumeData;
  fmt: DateFormat;
  photo: string | null;
  headingStyle?: CSSProperties;
}) {
  const h =
    "mb-1.5 border-t-[3px] border-[var(--resume-accent)] pt-1 text-[11px] font-bold uppercase tracking-[0.14em] text-[var(--resume-accent-dark)]";
  return (
    <div className="space-y-4 text-slate-800">
      <header>
        <div className="flex items-start gap-4">
          {photo && <img src={photo} alt="" className="h-20 w-20 rounded-md object-cover" />}
          <div>
            <h1
              className="text-[34px] font-extrabold uppercase leading-none tracking-tight text-[var(--resume-accent)]"
              style={headingStyle}
            >
              {data.fullName || "Your Name"}
            </h1>
            {data.title && (
              <p className="mt-1 text-[14px] font-bold uppercase tracking-wide text-slate-900">{data.title}</p>
            )}
            <div className="mt-1 text-[11.5px] text-slate-500">
              <ContactLine data={data} />
            </div>
          </div>
        </div>
        <hr className="mt-3 border-t-4 border-[var(--resume-accent)]" />
      </header>
      <SummarySection data={data} headingCls={h} headingStyle={headingStyle} />
      <ExperienceSection data={data} fmt={fmt} headingCls={h} headingStyle={headingStyle} />
      <EducationSection data={data} fmt={fmt} headingCls={h} headingStyle={headingStyle} />
      <SkillsSection data={data} pill headingCls={h} headingStyle={headingStyle} />
      <LanguagesSection data={data} headingCls={h} headingStyle={headingStyle} />
    </div>
  );
}

// ---------------------------------------------------------------- Simple Professional (new)
// One clean column, centred header, ruled headings, right-aligned dates.
// No photo, no sidebar — the safest choice for portals.
function SimpleTemplate({
  data,
  fmt,
  headingStyle,
}: {
  data: ResumeData;
  fmt: DateFormat;
  headingStyle?: CSSProperties;
}) {
  const h =
    "mb-1.5 border-b border-slate-900 pb-1 text-[11px] font-bold uppercase tracking-[0.18em] text-slate-900";
  return (
    <div className="space-y-4 text-slate-800">
      <header className="text-center">
        <h1 className="text-[24px] font-bold leading-tight text-slate-900" style={headingStyle}>
          {data.fullName || "Your Name"}
        </h1>
        {data.title && <p className="text-[12px] font-semibold text-slate-700">{data.title}</p>}
        <div className="mt-1 text-[11px] text-slate-500">
          <ContactLine data={data} />
        </div>
        <hr className="mt-3 border-slate-300" />
      </header>
      <SummarySection data={data} headingCls={h} headingStyle={headingStyle} />
      <ExperienceSection data={data} fmt={fmt} headingCls={h} headingStyle={headingStyle} />
      <EducationSection data={data} fmt={fmt} headingCls={h} headingStyle={headingStyle} />
      <SkillsSection data={data} pill={false} headingCls={h} headingStyle={headingStyle} />
      <LanguagesSection data={data} headingCls={h} headingStyle={headingStyle} />
    </div>
  );
}

export function ResumePreview({
  data,
  template,
  dateFormat,
  photo,
  fontId,
  themeId,
}: {
  data: ResumeData;
  template: ResumeTemplateId;
  dateFormat: DateFormat;
  photo: string | null;
  /** null = the template's default font. */
  fontId: string | null;
  themeId: string;
}) {
  const font = fontId ? getResumeFont(fontId) : getResumeFont(TEMPLATE_DEFAULT_FONTS[template]);
  const theme = getResumeTheme(themeId);
  // B2: the ATS template always renders in plain Arial, whatever font is picked.
  const isAts = template === "ats";
  const bodyFont = isAts
    ? "Arial, Helvetica, sans-serif"
    : font.headingOnly
      ? getResumeFont(TEMPLATE_DEFAULT_FONTS[template]).family
      : font.family;
  const headingStyle: CSSProperties = { fontFamily: isAts ? "Arial, Helvetica, sans-serif" : font.family };

  return (
    <div
      id="resume-print"
      className="resume-sheet mx-auto w-full max-w-[820px] break-words bg-white px-8 py-10 text-[13px] leading-relaxed shadow-sm sm:px-10"
      style={
        {
          fontFamily: bodyFont,
          overflowWrap: "break-word",
          "--resume-accent": theme.accent,
          "--resume-accent-dark": theme.accentDark,
          "--resume-accent-soft": theme.soft,
        } as CSSProperties
      }
    >
      {template === "modern" && <ModernTemplate data={data} fmt={dateFormat} photo={photo} headingStyle={headingStyle} />}
      {template === "classic" && <ClassicTemplate data={data} fmt={dateFormat} photo={photo} headingStyle={headingStyle} />}
      {template === "minimal" && <MinimalTemplate data={data} fmt={dateFormat} photo={photo} headingStyle={headingStyle} />}
      {template === "ats" && <AtsTemplate data={data} fmt={dateFormat} photo={photo} />}
      {template === "two-column" && <TwoColumnTemplate data={data} fmt={dateFormat} headingStyle={headingStyle} />}
      {template === "fresh-grad" && <FreshGradTemplate data={data} fmt={dateFormat} photo={photo} headingStyle={headingStyle} />}
      {template === "navy-sidebar" && <NavySidebarTemplate data={data} fmt={dateFormat} photo={photo} headingStyle={headingStyle} />}
      {template === "pastel" && <PastelTemplate data={data} fmt={dateFormat} photo={photo} headingStyle={headingStyle} />}
      {template === "bold" && <BoldTemplate data={data} fmt={dateFormat} photo={photo} headingStyle={headingStyle} />}
      {template === "simple" && <SimpleTemplate data={data} fmt={dateFormat} headingStyle={headingStyle} />}
    </div>
  );
}
