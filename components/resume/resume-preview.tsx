"use client";

import type { CSSProperties } from "react";
import type { ResumeData, ResumeTemplateId, DateFormat } from "@/lib/resume";
import { formatRange, skillList, bulletList } from "@/lib/resume";
import { getResumeFont, getResumeTheme, TEMPLATE_DEFAULT_FONTS } from "@/lib/resume-fonts";

function ContactLine({ data }: { data: ResumeData }) {
  const parts = [data.email, data.phone, data.location, data.website, data.linkedin].filter((x) => x.trim());
  return <p>{parts.join("  ·  ")}</p>;
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
  const items = data.experience.filter((e) => e.role.trim() || e.company.trim());
  if (!items.length) return null;
  return (
    <section>
      <h2 className={headingCls} style={headingStyle}>
        Experience
      </h2>
      <div className="space-y-3">
        {items.map((e) => (
          <div key={e.id}>
            <div className="flex flex-wrap items-baseline justify-between gap-x-3">
              <p className="font-bold">
                {e.role}
                {e.company ? <span className="font-semibold"> — {e.company}</span> : null}
              </p>
              <p className="text-[11px] text-slate-500">{formatRange(e.start, e.end, e.current, fmt)}</p>
            </div>
            {bulletList(e.bullets).length > 0 && (
              <ul className="mt-1 list-disc space-y-0.5 pl-5 text-[12.5px] leading-relaxed">
                {bulletList(e.bullets).map((b, i) => (
                  <li key={i}>{b}</li>
                ))}
              </ul>
            )}
          </div>
        ))}
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
  const items = data.education.filter((e) => e.degree.trim() || e.school.trim());
  if (!items.length) return null;
  return (
    <section>
      <h2 className={headingCls} style={headingStyle}>
        Education
      </h2>
      <div className="space-y-2">
        {items.map((e) => (
          <div key={e.id} className="flex flex-wrap items-baseline justify-between gap-x-3">
            <p>
              <span className="font-bold">{e.degree}</span>
              {e.school ? <span> — {e.school}</span> : null}
            </p>
            <p className="text-[11px] text-slate-500">{formatRange(e.start, e.end, false, fmt)}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function SkillsSection({ data, pill }: { data: ResumeData; pill: boolean }) {
  const skills = skillList(data.skills);
  if (!skills.length) return null;
  return (
    <section>
      <h2 className="sr-only">Skills</h2>
      {pill ? (
        <div className="flex flex-wrap gap-1.5">
          {skills.map((s) => (
            <span
              key={s}
              className="rounded-full bg-[var(--resume-accent-soft)] px-2.5 py-1 text-[11.5px] font-medium text-[var(--resume-accent-dark)] ring-1 ring-[var(--resume-accent)]"
            >
              {s}
            </span>
          ))}
        </div>
      ) : (
        <p className="text-[12.5px] leading-relaxed">{skills.join("  ·  ")}</p>
      )}
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
    <section>
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
      <section>
        <h2 className={h} style={headingStyle}>
          Skills
        </h2>
        <SkillsSection data={data} pill />
      </section>
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
      <section>
        <h2 className={h} style={headingStyle}>
          Skills
        </h2>
        <SkillsSection data={data} pill={false} />
      </section>
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
      <section>
        <h2 className={h} style={headingStyle}>
          Skills
        </h2>
        <SkillsSection data={data} pill={false} />
      </section>
    </div>
  );
}

// ---------------------------------------------------------------- ATS-friendly
// Deliberately stays black: the colour theme is not applied here so applicant
// tracking systems read the resume reliably.
function AtsTemplate({ data, fmt, headingStyle }: { data: ResumeData; fmt: DateFormat; photo: string | null; headingStyle?: CSSProperties }) {
  const h = "mb-1.5 border-b border-black pb-0.5 text-[12px] font-bold uppercase tracking-wide text-black";
  return (
    <div className="space-y-4 text-black">
      <header>
        <h1 className="text-[24px] font-bold leading-tight" style={headingStyle}>
          {data.fullName || "Your Name"}
        </h1>
        {data.title && <p className="text-[13px] font-semibold">{data.title}</p>}
        <div className="mt-1 text-[12px]">
          <ContactLine data={data} />
        </div>
      </header>
      <SummarySection data={data} headingCls={h} headingStyle={headingStyle} />
      <ExperienceSection data={data} fmt={fmt} headingCls={h} headingStyle={headingStyle} />
      <EducationSection data={data} fmt={fmt} headingCls={h} headingStyle={headingStyle} />
      <section>
        <h2 className={h} style={headingStyle}>
          Skills
        </h2>
        <SkillsSection data={data} pill={false} />
      </section>
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
  // Display fonts (e.g. Bebas Neue, Dancing Script) go on the name and
  // section headings only; the body keeps the template's default font.
  const bodyFont = font.headingOnly ? getResumeFont(TEMPLATE_DEFAULT_FONTS[template]).family : font.family;
  const headingStyle: CSSProperties = { fontFamily: font.family };

  return (
    <div
      id="resume-print"
      className="resume-sheet mx-auto w-full max-w-[820px] bg-white px-8 py-10 text-[13px] leading-relaxed shadow-sm sm:px-10"
      style={
        {
          fontFamily: bodyFont,
          "--resume-accent": theme.accent,
          "--resume-accent-dark": theme.accentDark,
          "--resume-accent-soft": theme.soft,
        } as CSSProperties
      }
    >
      {template === "modern" && <ModernTemplate data={data} fmt={dateFormat} photo={photo} headingStyle={headingStyle} />}
      {template === "classic" && <ClassicTemplate data={data} fmt={dateFormat} photo={photo} headingStyle={headingStyle} />}
      {template === "minimal" && <MinimalTemplate data={data} fmt={dateFormat} photo={photo} headingStyle={headingStyle} />}
      {template === "ats" && <AtsTemplate data={data} fmt={dateFormat} photo={photo} headingStyle={headingStyle} />}
    </div>
  );
}
