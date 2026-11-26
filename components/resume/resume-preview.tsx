"use client";

import type { CSSProperties } from "react";
import { Phone, Mail, MapPin, Globe, Link2 } from "lucide-react";
import type { AcademicExperienceItem, ResumeData, ResumeTemplateId, DateFormat } from "@/lib/resume";
import {
  formatRange,
  skillEntries,
  languageEntries,
  stripLevelLabel,
  bulletList,
  hasExperienceContent,
  hasEducationContent,
  hasAcademicExperienceContent,
  hasReferencesContent,
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

function PhotoSlot({
  photo,
  photoOn,
  className,
  rounded = "rounded-full",
}: {
  photo: string | null;
  photoOn: boolean;
  className: string;
  rounded?: string;
}) {
  if (photo) return <img src={photo} alt="" className={`${className} object-cover ${rounded}`} />;
  // Photo switched on but none uploaded yet: an empty placeholder box, never
  // anyone else's photo and never a stock image.
  if (!photoOn) return null;
  return (
    <div
      className={`${className} flex shrink-0 items-center justify-center border-2 border-dashed border-slate-300 bg-slate-50 text-center text-[10px] font-medium leading-tight text-slate-400 ${rounded}`}
      aria-hidden
    >
      Your photo
    </div>
  );
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
  badge = false,
}: {
  data: ResumeData;
  fmt: DateFormat;
  headingCls: string;
  headingStyle?: CSSProperties;
  /** Black year badge (Umer Classic) instead of a grey date line. */
  badge?: boolean;
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
              {line && range ? (
                badge ? (
                  <span className="bg-black px-2 py-0.5 text-[10px] font-bold text-white">{range}</span>
                ) : (
                  <p className="text-[11px] text-slate-500">{range}</p>
                )
              ) : null}
            </div>
          );
        })}
      </div>
    </section>
  );
}

function AcademicExperienceSection({
  data,
  fmt,
  headingCls,
  headingStyle,
  badge = false,
}: {
  data: ResumeData;
  fmt: DateFormat;
  headingCls: string;
  headingStyle?: CSSProperties;
  badge?: boolean;
}) {
  const items = (data.academicExperience ?? []).filter(hasAcademicExperienceContent);
  if (!items.length) return null;
  return (
    <section className="break-inside-avoid">
      <h2 className={headingCls} style={headingStyle}>
        Academic Experience
      </h2>
      <div className="space-y-3">
        {items.map((e) => {
          const titleLine = [e.title.trim(), e.org.trim()].filter(Boolean).join(" — ");
          const range = formatRange(e.start, e.end, false, fmt);
          return (
            <div key={e.id} className="break-inside-avoid">
              <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                <p className="font-bold">{titleLine || range || "Academic Experience"}</p>
                {titleLine && range ? (
                  badge ? (
                    <span className="bg-black px-2 py-0.5 text-[10px] font-bold text-white">{range}</span>
                  ) : (
                    <p className="text-[11px] text-slate-500">{range}</p>
                  )
                ) : null}
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

function ReferencesSection({
  data,
  headingCls,
  headingStyle,
  centered = false,
  label = "References",
}: {
  data: ResumeData;
  headingCls: string;
  headingStyle?: CSSProperties;
  centered?: boolean;
  label?: string;
}) {
  if (!hasReferencesContent(data)) return null;
  const text = data.referencesOnRequest
    ? "References will be provided upon request."
    : (data.referencesText ?? "").trim();
  if (!text) return null;
  return (
    <section className={`break-inside-avoid ${centered ? "text-center" : ""}`}>
      <h2 className={headingCls} style={headingStyle}>
        {label}
      </h2>
      <p className="text-[12.5px] leading-relaxed">{text}</p>
    </section>
  );
}

function SkillBar({ level, dark }: { level: number; dark?: boolean }) {
  return (
    <span
      className={`mt-1 block h-1.5 w-24 ${dark ? "bg-white/25" : "bg-slate-200"}`}
      role="img"
      aria-label={`Proficiency ${level} out of 100`}
    >
      <span
        className={`block h-full ${dark ? "bg-white" : "bg-[var(--resume-accent)]"}`}
        style={{ width: `${level}%` }}
      />
    </span>
  );
}

// Skills are ALWAYS one per line (a bulleted list) in every template — never
// pills/chips. Bar templates add a proficiency bar under each skill; the
// level label is then dropped from the text so it is not shown twice.
function SkillsSection({
  data,
  headingCls,
  headingStyle,
  showBars = false,
  dark = false,
}: {
  data: ResumeData;
  headingCls?: string;
  headingStyle?: CSSProperties;
  showBars?: boolean;
  dark?: boolean;
}) {
  const entries = skillEntries(data);
  // B4: no heading at all when there are no skills.
  if (!entries.length) return null;
  return (
    <section className="break-inside-avoid">
      {headingCls ? (
        <h2 className={headingCls} style={headingStyle}>
          Skills
        </h2>
      ) : null}
      <ul className={`space-y-1.5 text-[12.5px] leading-relaxed ${dark ? "text-white" : ""}`}>
        {entries.map((e, i) => (
          <li key={`${e.name}-${i}`} className="flex flex-col">
            <span className="flex items-start gap-2">
              <span
                aria-hidden
                className={`mt-[7px] h-1.5 w-1.5 shrink-0 ${dark ? "bg-white" : "bg-[var(--resume-accent)]"}`}
              />
              {showBars ? stripLevelLabel(e.name) : e.name}
            </span>
            {showBars ? <span className="pl-3.5"><SkillBar level={e.level} dark={dark} /></span> : null}
          </li>
        ))}
      </ul>
    </section>
  );
}

// Languages are likewise one per line; bar templates show a proficiency bar.
function LanguagesSection({
  data,
  headingCls,
  headingStyle,
  showBars = false,
  dark = false,
}: {
  data: ResumeData;
  headingCls?: string;
  headingStyle?: CSSProperties;
  showBars?: boolean;
  dark?: boolean;
}) {
  const entries = languageEntries(data);
  if (!entries.length) return null;
  return (
    <section className="break-inside-avoid">
      {headingCls ? (
        <h2 className={headingCls} style={headingStyle}>
          Languages
        </h2>
      ) : null}
      <ul className={`space-y-1.5 text-[12.5px] leading-relaxed ${dark ? "text-white" : ""}`}>
        {entries.map((e, i) => (
          <li key={`${e.name}-${i}`} className="flex flex-col">
            <span className="flex items-start gap-2">
              <span
                aria-hidden
                className={`mt-[7px] h-1.5 w-1.5 shrink-0 ${dark ? "bg-white" : "bg-[var(--resume-accent)]"}`}
              />
              {showBars ? stripLevelLabel(e.name) : e.name}
            </span>
            {showBars ? <span className="pl-3.5"><SkillBar level={e.level} dark={dark} /></span> : null}
          </li>
        ))}
      </ul>
    </section>
  );
}

function SummarySection({
  data,
  headingCls,
  headingStyle,
  label = "Summary",
}: {
  data: ResumeData;
  headingCls: string;
  headingStyle?: CSSProperties;
  label?: string;
}) {
  if (!data.summary.trim()) return null;
  return (
    <section className="break-inside-avoid">
      <h2 className={headingCls} style={headingStyle}>
        {label}
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
  photoOn,
  headingStyle,
}: {
  data: ResumeData;
  fmt: DateFormat;
  photo: string | null;
  photoOn: boolean;
  headingStyle?: CSSProperties;
}) {
  const h =
    "mb-1.5 border-b-2 border-[var(--resume-accent)] pb-1 text-[11px] font-bold uppercase tracking-[0.14em] text-[var(--resume-accent-dark)]";
  return (
    <div className="space-y-4 text-slate-800">
      <header className="border-l-4 border-[var(--resume-accent)] pl-4">
        <div className="flex items-start gap-4">
          <PhotoSlot photo={photo} photoOn={photoOn} className="h-20 w-20" />
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
      <AcademicExperienceSection data={data} fmt={fmt} headingCls={h} headingStyle={headingStyle} />
      <EducationSection data={data} fmt={fmt} headingCls={h} headingStyle={headingStyle} />
      <SkillsSection data={data} headingCls={h} headingStyle={headingStyle} />
      <LanguagesSection data={data} headingCls={h} headingStyle={headingStyle} />
      <ReferencesSection data={data} headingCls={h} headingStyle={headingStyle} />
    </div>
  );
}

// ---------------------------------------------------------------- Classic
function ClassicTemplate({
  data,
  fmt,
  photo,
  photoOn,
  headingStyle,
}: {
  data: ResumeData;
  fmt: DateFormat;
  photo: string | null;
  photoOn: boolean;
  headingStyle?: CSSProperties;
}) {
  const h =
    "mb-1.5 border-b border-slate-400 pb-1 text-center text-[11px] font-bold uppercase tracking-[0.2em] text-slate-900";
  return (
    <div className="space-y-4 text-slate-800">
      <header className="text-center">
        <div className="mb-2 flex justify-center"><PhotoSlot photo={photo} photoOn={photoOn} className="h-20 w-20" /></div>
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
      <AcademicExperienceSection data={data} fmt={fmt} headingCls={h} headingStyle={headingStyle} />
      <EducationSection data={data} fmt={fmt} headingCls={h} headingStyle={headingStyle} />
      <SkillsSection data={data} headingCls={h} headingStyle={headingStyle} />
      <LanguagesSection data={data} headingCls={h} headingStyle={headingStyle} />
      <ReferencesSection data={data} headingCls={h} headingStyle={headingStyle} />
    </div>
  );
}

// ---------------------------------------------------------------- Minimal
function MinimalTemplate({
  data,
  fmt,
  photo,
  photoOn,
  headingStyle,
}: {
  data: ResumeData;
  fmt: DateFormat;
  photo: string | null;
  photoOn: boolean;
  headingStyle?: CSSProperties;
}) {
  const h = "mb-1.5 text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400";
  return (
    <div className="space-y-5 text-slate-800">
      <header>
        <div className="flex items-start gap-4">
          <PhotoSlot photo={photo} photoOn={photoOn} className="h-16 w-16" />
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
      <AcademicExperienceSection data={data} fmt={fmt} headingCls={h} headingStyle={headingStyle} />
      <EducationSection data={data} fmt={fmt} headingCls={h} headingStyle={headingStyle} />
      <SkillsSection data={data} headingCls={h} headingStyle={headingStyle} />
      <LanguagesSection data={data} headingCls={h} headingStyle={headingStyle} />
      <ReferencesSection data={data} headingCls={h} headingStyle={headingStyle} />
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
      <AcademicExperienceSection data={data} fmt={fmt} headingCls={h} headingStyle={arial} />
      <EducationSection data={data} fmt={fmt} headingCls={h} headingStyle={arial} />
      <SkillsSection data={data} headingCls={h} headingStyle={arial} />
      <LanguagesSection data={data} headingCls={h} headingStyle={arial} />
      <ReferencesSection data={data} headingCls={h} headingStyle={arial} />
    </div>
  );
}

// ---------------------------------------------------------------- Classic Two-Column (new)
// Full-width header, then a narrow left column (Skills, Education, Languages)
// and a wide right column (Summary, Experience).
function TwoColumnTemplate({
  data,
  fmt,
  photo,
  photoOn,
  headingStyle,
}: {
  data: ResumeData;
  fmt: DateFormat;
  photo: string | null;
  photoOn: boolean;
  headingStyle?: CSSProperties;
}) {
  const h =
    "mb-1.5 border-b-2 border-[var(--resume-accent)] pb-1 text-[11px] font-bold uppercase tracking-[0.14em] text-[var(--resume-accent-dark)]";
  const sideH =
    "mb-1.5 border-b border-slate-300 pb-1 text-[11px] font-bold uppercase tracking-[0.14em] text-slate-900";
  return (
    <div className="text-slate-800">
      <header className="border-b-2 border-[var(--resume-accent)] pb-3">
        <div className="flex items-start gap-4">
          <PhotoSlot photo={photo} photoOn={photoOn} className="h-16 w-16" />
          <div>
            <h1 className="text-[26px] font-bold leading-tight text-slate-900" style={headingStyle}>
              {data.fullName || "Your Name"}
            </h1>
            {data.title && <p className="text-[13px] font-semibold text-[var(--resume-accent)]">{data.title}</p>}
            <div className="mt-1 text-[11.5px] text-slate-500">
              <ContactLine data={data} />
            </div>
          </div>
        </div>
      </header>
      <div className="mt-4 flex gap-6">
        <aside className="w-[32%] shrink-0 space-y-4 border-r border-slate-200 pr-5">
          <SkillsSection data={data} headingCls={sideH} headingStyle={headingStyle} />
          <EducationSection data={data} fmt={fmt} headingCls={sideH} headingStyle={headingStyle} />
          <LanguagesSection data={data} headingCls={sideH} headingStyle={headingStyle} />
        </aside>
        <div className="min-w-0 flex-1 space-y-4">
          <SummarySection data={data} headingCls={h} headingStyle={headingStyle} />
          <ExperienceSection data={data} fmt={fmt} headingCls={h} headingStyle={headingStyle} />
          <AcademicExperienceSection data={data} fmt={fmt} headingCls={h} headingStyle={headingStyle} />
        </div>
      </div>
      <div className="mt-4">
        <ReferencesSection data={data} headingCls={h} headingStyle={headingStyle} />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- Fresh Graduate (new)
// Solid theme-coloured sidebar with a round photo (or initials), contact,
// skills listed one per line, and education; Education sits above Experience in
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
          <SkillsSection data={data} headingCls={sideH} headingStyle={headingStyle} dark />
          <LanguagesSection data={data} headingCls={sideH} headingStyle={headingStyle} dark />
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
        <AcademicExperienceSection data={data} fmt={fmt} headingCls={h} headingStyle={headingStyle} />
        <ReferencesSection data={data} headingCls={h} headingStyle={headingStyle} />
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
          <SkillsSection data={data} headingCls={sideH} headingStyle={headingStyle} dark />
          <LanguagesSection data={data} headingCls={sideH} headingStyle={headingStyle} dark />
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
        <AcademicExperienceSection data={data} fmt={fmt} headingCls={h} headingStyle={headingStyle} />
        <EducationSection data={data} fmt={fmt} headingCls={h} headingStyle={headingStyle} />
        <ReferencesSection data={data} headingCls={h} headingStyle={headingStyle} />
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
  photoOn,
  headingStyle,
}: {
  data: ResumeData;
  fmt: DateFormat;
  photo: string | null;
  photoOn: boolean;
  headingStyle?: CSSProperties;
}) {
  const h =
    "mb-1.5 border-b border-[#E5D5C8] pb-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#8A6D5A]";
  return (
    <div className="-mx-8 -my-10 bg-[#FDF6EC] px-8 py-10 text-[#3F3A36] sm:-mx-10 sm:px-10">
      <header className="text-center">
        <div className="mb-3 flex justify-center"><PhotoSlot photo={photo} photoOn={photoOn} className="h-20 w-20 ring-2 ring-[#E5D5C8]" /></div>
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
        <AcademicExperienceSection data={data} fmt={fmt} headingCls={h} headingStyle={headingStyle} />
        <EducationSection data={data} fmt={fmt} headingCls={h} headingStyle={headingStyle} />
        <SkillsSection data={data} headingCls={h} headingStyle={headingStyle} />
        <LanguagesSection data={data} headingCls={h} headingStyle={headingStyle} />
        <ReferencesSection data={data} headingCls={h} headingStyle={headingStyle} />
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
  photoOn,
  headingStyle,
}: {
  data: ResumeData;
  fmt: DateFormat;
  photo: string | null;
  photoOn: boolean;
  headingStyle?: CSSProperties;
}) {
  const h =
    "mb-1.5 border-t-[3px] border-[var(--resume-accent)] pt-1 text-[11px] font-bold uppercase tracking-[0.14em] text-[var(--resume-accent-dark)]";
  return (
    <div className="space-y-4 text-slate-800">
      <header>
        <div className="flex items-start gap-4">
          <PhotoSlot photo={photo} photoOn={photoOn} className="h-20 w-20" rounded="rounded-md" />
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
      <AcademicExperienceSection data={data} fmt={fmt} headingCls={h} headingStyle={headingStyle} />
      <EducationSection data={data} fmt={fmt} headingCls={h} headingStyle={headingStyle} />
      <SkillsSection data={data} headingCls={h} headingStyle={headingStyle} />
      <LanguagesSection data={data} headingCls={h} headingStyle={headingStyle} />
      <ReferencesSection data={data} headingCls={h} headingStyle={headingStyle} />
    </div>
  );
}

// ---------------------------------------------------------------- Simple Professional (new)
// One clean column, centred header, ruled headings, right-aligned dates.
// No photo, no sidebar — the safest choice for portals.
function SimpleTemplate({
  data,
  fmt,
  photo,
  photoOn,
  headingStyle,
}: {
  data: ResumeData;
  fmt: DateFormat;
  photo: string | null;
  photoOn: boolean;
  headingStyle?: CSSProperties;
}) {
  const h =
    "mb-1.5 border-b border-slate-900 pb-1 text-[11px] font-bold uppercase tracking-[0.18em] text-slate-900";
  return (
    <div className="space-y-4 text-slate-800">
      <header className="text-center">
        <div className="mb-2 flex justify-center"><PhotoSlot photo={photo} photoOn={photoOn} className="h-20 w-20" /></div>
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
      <AcademicExperienceSection data={data} fmt={fmt} headingCls={h} headingStyle={headingStyle} />
      <EducationSection data={data} fmt={fmt} headingCls={h} headingStyle={headingStyle} />
      <SkillsSection data={data} headingCls={h} headingStyle={headingStyle} />
      <LanguagesSection data={data} headingCls={h} headingStyle={headingStyle} />
      <ReferencesSection data={data} headingCls={h} headingStyle={headingStyle} />
    </div>
  );
}

// ---------------------------------------------------------------- Umer Classic (new)
// Black-and-white serif CV, reproducing the layout of the user's own CV
// (used with his permission; no personal data from it is used as defaults):
// rectangular photo top-left, big letterspaced serif name, black badge with
// the title in white, two columns split by a vertical divider — About Me,
// Skills and Languages (with black proficiency bars) on the left; Contact
// with icons and Education with black year badges on the right — then
// Academic Experience in two columns and a centred Reference line. The
// colour theme is ignored here by design; the font picker still applies.
function UmerClassicTemplate({
  data,
  fmt,
  photo,
  photoOn,
  headingStyle,
}: {
  data: ResumeData;
  fmt: DateFormat;
  photo: string | null;
  photoOn: boolean;
  headingStyle?: CSSProperties;
}) {
  const h =
    "mb-1.5 border-b border-black pb-1 text-[13px] font-bold uppercase tracking-[0.18em] text-black";
  const contactRows: { icon: React.ReactNode; value: string }[] = [
    { icon: <Phone className="h-3.5 w-3.5 shrink-0" />, value: data.phone },
    { icon: <Mail className="h-3.5 w-3.5 shrink-0" />, value: data.email },
    { icon: <MapPin className="h-3.5 w-3.5 shrink-0" />, value: data.location },
    { icon: <Globe className="h-3.5 w-3.5 shrink-0" />, value: data.website },
    { icon: <Link2 className="h-3.5 w-3.5 shrink-0" />, value: data.linkedin },
  ].filter((r) => r.value.trim());
  const acadItems = (data.academicExperience ?? []).filter(hasAcademicExperienceContent);
  const half = Math.ceil(acadItems.length / 2);
  const acadCell = (items: AcademicExperienceItem[]) => (
    <div className="space-y-4">
      {items.map((e) => {
        const range = formatRange(e.start, e.end, false, fmt);
        return (
          <div key={e.id} className="break-inside-avoid">
            <p className="font-bold">{e.title || "Academic Experience"}</p>
            <div className="flex flex-wrap items-baseline justify-between gap-x-3">
              <p className="text-[12.5px]">{e.org}</p>
              {range ? (
                <span className="bg-black px-2 py-0.5 text-[10px] font-bold text-white">{range}</span>
              ) : null}
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
  );
  return (
    <div className="text-black">
      <header className="flex items-start gap-6">
        <PhotoSlot photo={photo} photoOn={photoOn} className="h-[140px] w-[110px] shrink-0" rounded="rounded-none" />
        <div className="pt-3">
          <h1
            className="text-[30px] font-bold uppercase leading-tight tracking-[0.08em] text-black"
            style={headingStyle}
          >
            {data.fullName || "Your Name"}
          </h1>
          {data.title && (
            <p className="mt-2 inline-block bg-black px-4 py-1 text-[13px] font-bold uppercase tracking-[0.2em] text-white">
              {data.title}
            </p>
          )}
        </div>
      </header>
      <div className="mt-6 flex gap-6">
        <div className="w-[42%] shrink-0 space-y-5 border-r border-black pr-5">
          <SummarySection data={data} headingCls={h} headingStyle={headingStyle} label="About Me" />
          <SkillsSection data={data} headingCls={h} headingStyle={headingStyle} showBars />
          <LanguagesSection data={data} headingCls={h} headingStyle={headingStyle} showBars />
        </div>
        <div className="min-w-0 flex-1 space-y-5">
          {contactRows.length > 0 && (
            <section className="break-inside-avoid">
              <h2 className={h} style={headingStyle}>
                Contact
              </h2>
              <div className="space-y-1.5 text-[12.5px] leading-relaxed">
                {contactRows.map((r, i) => (
                  <p key={i} className="flex items-start gap-2 break-words">
                    <span className="mt-0.5">{r.icon}</span>
                    {r.value}
                  </p>
                ))}
              </div>
            </section>
          )}
          <EducationSection data={data} fmt={fmt} headingCls={h} headingStyle={headingStyle} badge />
        </div>
      </div>
      <div className="mt-6 space-y-4">
        <ExperienceSection data={data} fmt={fmt} headingCls={h} headingStyle={headingStyle} />
      </div>
      {acadItems.length > 0 && (
        <div className="mt-6">
          <h2 className="mb-3 text-center text-[15px] font-bold uppercase tracking-[0.2em] text-black" style={headingStyle}>
            Academic Experience
          </h2>
          <div className="flex gap-6">
            <div className="w-1/2 shrink-0 border-r border-black pr-5">{acadCell(acadItems.slice(0, half))}</div>
            <div className="min-w-0 flex-1">{acadCell(acadItems.slice(half))}</div>
          </div>
        </div>
      )}
      <div className="mt-6">
        <ReferencesSection data={data} headingCls={h} headingStyle={headingStyle} centered label="Reference" />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- Executive Dark Header (new)
// A dark header band (the theme's dark accent) holding a photo, white name,
// title and contact line, then a single clean column. Skills and languages
// are listed one per line with proficiency bars.
function ExecutiveDarkTemplate({
  data,
  fmt,
  photo,
  photoOn,
  headingStyle,
}: {
  data: ResumeData;
  fmt: DateFormat;
  photo: string | null;
  photoOn: boolean;
  headingStyle?: CSSProperties;
}) {
  const h =
    "mb-1.5 border-b-2 border-[var(--resume-accent)] pb-1 text-[11px] font-bold uppercase tracking-[0.14em] text-[var(--resume-accent-dark)]";
  return (
    <div className="text-slate-800">
      <header className="-mx-8 -mt-10 bg-[var(--resume-accent-dark)] px-8 pb-6 pt-10 text-white sm:-mx-10 sm:px-10">
        <div className="flex items-start gap-5">
          <PhotoSlot photo={photo} photoOn={photoOn} className="h-20 w-20 ring-2 ring-white/70" />
          <div>
            <h1 className="text-[28px] font-bold leading-tight" style={headingStyle}>
              {data.fullName || "Your Name"}
            </h1>
            {data.title && <p className="mt-0.5 text-[14px] font-semibold text-white/90">{data.title}</p>}
            <div className="mt-1 text-[11.5px] text-white/80">
              <ContactLine data={data} />
            </div>
          </div>
        </div>
      </header>
      <div className="mt-5 space-y-4">
        <SummarySection data={data} headingCls={h} headingStyle={headingStyle} />
        <ExperienceSection data={data} fmt={fmt} headingCls={h} headingStyle={headingStyle} />
        <AcademicExperienceSection data={data} fmt={fmt} headingCls={h} headingStyle={headingStyle} />
        <EducationSection data={data} fmt={fmt} headingCls={h} headingStyle={headingStyle} />
        <SkillsSection data={data} headingCls={h} headingStyle={headingStyle} showBars />
        <LanguagesSection data={data} headingCls={h} headingStyle={headingStyle} showBars />
        <ReferencesSection data={data} headingCls={h} headingStyle={headingStyle} />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- Creative Portfolio (new)
// A tinted sidebar (the theme's soft colour) with a round photo, contact,
// and skill/language bars; a bright main column for the rest. Distinct from
// Fresh Graduate (solid accent sidebar, white text) and Corporate Navy
// (dark sidebar): here the sidebar is light and the headings are colourful.
function CreativePortfolioTemplate({
  data,
  fmt,
  photo,
  photoOn,
  headingStyle,
}: {
  data: ResumeData;
  fmt: DateFormat;
  photo: string | null;
  photoOn: boolean;
  headingStyle?: CSSProperties;
}) {
  const h =
    "mb-1.5 border-b-2 border-[var(--resume-accent)] pb-1 text-[11px] font-bold uppercase tracking-[0.14em] text-[var(--resume-accent-dark)]";
  const sideH =
    "mb-1.5 border-b border-[var(--resume-accent)] pb-1 text-[11px] font-bold uppercase tracking-[0.14em] text-[var(--resume-accent-dark)]";
  return (
    <div className="flex text-slate-800">
      <aside className="-my-10 -ml-8 flex w-[35%] shrink-0 flex-col items-center bg-[var(--resume-accent-soft)] px-5 py-10 sm:-ml-10">
        <PhotoSlot photo={photo} photoOn={photoOn} className="h-24 w-24 ring-2 ring-[var(--resume-accent)]" />
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
          <SkillsSection data={data} headingCls={sideH} headingStyle={headingStyle} showBars />
          <LanguagesSection data={data} headingCls={sideH} headingStyle={headingStyle} showBars />
        </div>
      </aside>
      <div className="min-w-0 flex-1 space-y-4 pl-6">
        <header>
          <h1 className="text-[26px] font-bold leading-tight text-[var(--resume-accent-dark)]" style={headingStyle}>
            {data.fullName || "Your Name"}
          </h1>
          {data.title && <p className="text-[13px] font-semibold text-[var(--resume-accent)]">{data.title}</p>}
          <hr className="mt-2 border-[var(--resume-accent)]" />
        </header>
        <SummarySection data={data} headingCls={h} headingStyle={headingStyle} />
        <ExperienceSection data={data} fmt={fmt} headingCls={h} headingStyle={headingStyle} />
        <EducationSection data={data} fmt={fmt} headingCls={h} headingStyle={headingStyle} />
        <AcademicExperienceSection data={data} fmt={fmt} headingCls={h} headingStyle={headingStyle} />
        <ReferencesSection data={data} headingCls={h} headingStyle={headingStyle} />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- Academic Research (new)
// Centred serif header with a small square photo, hairline rules, and
// Education plus Academic Experience promoted above work experience.
// Plain one-per-line skills and languages — no bars, no colour blocks.
function AcademicTemplate({
  data,
  fmt,
  photo,
  photoOn,
  headingStyle,
}: {
  data: ResumeData;
  fmt: DateFormat;
  photo: string | null;
  photoOn: boolean;
  headingStyle?: CSSProperties;
}) {
  const h =
    "mb-1.5 border-b border-slate-400 pb-1 text-[11px] font-bold uppercase tracking-[0.2em] text-slate-900";
  return (
    <div className="space-y-4 text-slate-800">
      <header className="text-center">
        <div className="mb-2 flex justify-center"><PhotoSlot photo={photo} photoOn={photoOn} className="h-20 w-20" rounded="rounded-none" /></div>
        <h1 className="text-[26px] font-bold leading-tight text-slate-900" style={headingStyle}>
          {data.fullName || "Your Name"}
        </h1>
        {data.title && <p className="text-[13px] italic text-slate-700">{data.title}</p>}
        <div className="mt-1 text-[11.5px] text-slate-500">
          <ContactLine data={data} />
        </div>
        <hr className="mt-3 border-t-2 border-slate-900" />
      </header>
      <SummarySection data={data} headingCls={h} headingStyle={headingStyle} />
      <EducationSection data={data} fmt={fmt} headingCls={h} headingStyle={headingStyle} />
      <AcademicExperienceSection data={data} fmt={fmt} headingCls={h} headingStyle={headingStyle} />
      <ExperienceSection data={data} fmt={fmt} headingCls={h} headingStyle={headingStyle} />
      <SkillsSection data={data} headingCls={h} headingStyle={headingStyle} />
      <LanguagesSection data={data} headingCls={h} headingStyle={headingStyle} />
      <ReferencesSection data={data} headingCls={h} headingStyle={headingStyle} />
    </div>
  );
}

// ---------------------------------------------------------------- Vibrant Pop (new)
// A bold violet-to-pink-to-amber gradient header band with a round photo and
// white name, title and contact; bright pink headings and skill/language
// bars below. The gradient is a fixed palette (like Pastel's fixed cream),
// so the template stays colourful whatever theme is picked; the font picker
// still applies to the name, headings and body.
function VibrantTemplate({
  data,
  fmt,
  photo,
  photoOn,
  headingStyle,
}: {
  data: ResumeData;
  fmt: DateFormat;
  photo: string | null;
  photoOn: boolean;
  headingStyle?: CSSProperties;
}) {
  const h =
    "mb-1.5 border-b-2 border-[#F472B6] pb-1 text-[11px] font-bold uppercase tracking-[0.14em] text-[#9D174D]";
  return (
    <div className="text-slate-800">
      <header
        className="-mx-8 -mt-10 px-8 pb-6 pt-10 text-white sm:-mx-10 sm:px-10"
        style={{ background: "linear-gradient(120deg, #7C3AED 0%, #DB2777 55%, #F59E0B 100%)" }}
      >
        <div className="flex items-start gap-5">
          <PhotoSlot photo={photo} photoOn={photoOn} className="h-20 w-20 ring-2 ring-white/80" />
          <div>
            <h1 className="text-[30px] font-extrabold leading-tight" style={headingStyle}>
              {data.fullName || "Your Name"}
            </h1>
            {data.title && <p className="mt-0.5 text-[14px] font-semibold text-white/90">{data.title}</p>}
            <div className="mt-1 text-[11.5px] text-white/85">
              <ContactLine data={data} />
            </div>
          </div>
        </div>
      </header>
      <div className="mt-5 space-y-4">
        <SummarySection data={data} headingCls={h} headingStyle={headingStyle} />
        <ExperienceSection data={data} fmt={fmt} headingCls={h} headingStyle={headingStyle} />
        <AcademicExperienceSection data={data} fmt={fmt} headingCls={h} headingStyle={headingStyle} />
        <EducationSection data={data} fmt={fmt} headingCls={h} headingStyle={headingStyle} />
        <SkillsSection data={data} headingCls={h} headingStyle={headingStyle} showBars />
        <LanguagesSection data={data} headingCls={h} headingStyle={headingStyle} showBars />
        <ReferencesSection data={data} headingCls={h} headingStyle={headingStyle} />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- Sunset Glow (new)
// A warm cream page, a coral title badge, and a sunset gradient strip under
// the centred header; warm orange headings and plain one-per-line skills and
// languages (no bars — the colour carries the design). Fixed warm palette,
// font picker still applies.
function SunsetTemplate({
  data,
  fmt,
  photo,
  photoOn,
  headingStyle,
}: {
  data: ResumeData;
  fmt: DateFormat;
  photo: string | null;
  photoOn: boolean;
  headingStyle?: CSSProperties;
}) {
  const h =
    "mb-1.5 border-b border-[#FED7AA] pb-1 text-[11px] font-bold uppercase tracking-[0.18em] text-[#C2410C]";
  return (
    <div className="-mx-8 -my-10 bg-[#FFF7ED] px-8 py-10 text-[#292524] sm:-mx-10 sm:px-10">
      <header className="text-center">
        <div className="mb-3 flex justify-center"><PhotoSlot photo={photo} photoOn={photoOn} className="h-20 w-20 ring-2 ring-[#FDBA74]" /></div>
        <h1 className="text-[28px] font-bold leading-tight text-[#9A3412]" style={headingStyle}>
          {data.fullName || "Your Name"}
        </h1>
        {data.title && (
          <p className="mt-2 inline-block bg-[#EA580C] px-3 py-0.5 text-[12px] font-bold uppercase tracking-[0.14em] text-white">
            {data.title}
          </p>
        )}
        <div className="mt-2 text-[11.5px] text-[#7C2D12]/80">
          <ContactLine data={data} />
        </div>
        <div
          className="mx-auto mt-3 h-1.5 w-40 rounded-full"
          style={{ background: "linear-gradient(90deg, #FBBF24 0%, #F97316 50%, #E11D48 100%)" }}
          aria-hidden
        />
      </header>
      <div className="mt-5 space-y-4">
        <SummarySection data={data} headingCls={h} headingStyle={headingStyle} />
        <ExperienceSection data={data} fmt={fmt} headingCls={h} headingStyle={headingStyle} />
        <AcademicExperienceSection data={data} fmt={fmt} headingCls={h} headingStyle={headingStyle} />
        <EducationSection data={data} fmt={fmt} headingCls={h} headingStyle={headingStyle} />
        <SkillsSection data={data} headingCls={h} headingStyle={headingStyle} />
        <LanguagesSection data={data} headingCls={h} headingStyle={headingStyle} />
        <ReferencesSection data={data} headingCls={h} headingStyle={headingStyle} />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- Ocean Breeze (new)
// A blue-teal gradient sidebar with a round photo, contact and skill/language
// bars in white; a bright main column with deep-teal headings. Distinct from
// Corporate Navy (solid dark sidebar) and Creative Portfolio (light tinted
// sidebar, dark text): here the sidebar is a vivid gradient with white text.
// Fixed gradient palette, font picker still applies.
function OceanTemplate({
  data,
  fmt,
  photo,
  photoOn,
  headingStyle,
}: {
  data: ResumeData;
  fmt: DateFormat;
  photo: string | null;
  photoOn: boolean;
  headingStyle?: CSSProperties;
}) {
  const h =
    "mb-1.5 border-b-2 border-[#0891B2] pb-1 text-[11px] font-bold uppercase tracking-[0.14em] text-[#155E75]";
  const sideH =
    "mb-1.5 border-b border-white/40 pb-1 text-[11px] font-bold uppercase tracking-[0.14em] text-white";
  return (
    <div className="flex text-slate-800">
      <aside
        className="-my-10 -ml-8 flex w-[35%] shrink-0 flex-col items-center px-5 py-10 text-white sm:-ml-10"
        style={{ background: "linear-gradient(180deg, #0E7490 0%, #0369A1 55%, #1D4ED8 100%)" }}
      >
        <PhotoSlot photo={photo} photoOn={photoOn} className="h-24 w-24 ring-2 ring-white/80" />
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
          <SkillsSection data={data} headingCls={sideH} headingStyle={headingStyle} showBars dark />
          <LanguagesSection data={data} headingCls={sideH} headingStyle={headingStyle} showBars dark />
        </div>
      </aside>
      <div className="min-w-0 flex-1 space-y-4 pl-6">
        <header>
          <h1 className="text-[26px] font-bold leading-tight text-[#155E75]" style={headingStyle}>
            {data.fullName || "Your Name"}
          </h1>
          {data.title && <p className="text-[13px] font-semibold text-[#0E7490]">{data.title}</p>}
          <hr className="mt-2 border-[#0E7490]" />
        </header>
        <SummarySection data={data} headingCls={h} headingStyle={headingStyle} />
        <ExperienceSection data={data} fmt={fmt} headingCls={h} headingStyle={headingStyle} />
        <EducationSection data={data} fmt={fmt} headingCls={h} headingStyle={headingStyle} />
        <AcademicExperienceSection data={data} fmt={fmt} headingCls={h} headingStyle={headingStyle} />
        <ReferencesSection data={data} headingCls={h} headingStyle={headingStyle} />
      </div>
    </div>
  );
}

export function ResumePreview({
  data,
  template,
  dateFormat,
  photo,
  photoOn,
  fontId,
  themeId,
  printable = true,
}: {
  data: ResumeData;
  template: ResumeTemplateId;
  dateFormat: DateFormat;
  photo: string | null;
  /** True when the user switched the photo on (even if none uploaded yet). */
  photoOn: boolean;
  /** null = the template's default font. */
  fontId: string | null;
  themeId: string;
  /** False for miniature thumbnails and the empty-state placeholder preview:
   * the sheet then carries no id="resume-print", so the print stylesheet
   * (which only makes #resume-print visible) can never print a thumbnail
   * or placeholder text, and duplicate ids never appear in the page. */
  printable?: boolean;
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
      id={printable ? "resume-print" : undefined}
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
      {template === "modern" && <ModernTemplate data={data} fmt={dateFormat} photo={photo} photoOn={photoOn} headingStyle={headingStyle} />}
      {template === "classic" && <ClassicTemplate data={data} fmt={dateFormat} photo={photo} photoOn={photoOn} headingStyle={headingStyle} />}
      {template === "minimal" && <MinimalTemplate data={data} fmt={dateFormat} photo={photo} photoOn={photoOn} headingStyle={headingStyle} />}
      {template === "ats" && <AtsTemplate data={data} fmt={dateFormat} photo={photo} />}
      {template === "two-column" && <TwoColumnTemplate data={data} fmt={dateFormat} photo={photo} photoOn={photoOn} headingStyle={headingStyle} />}
      {template === "fresh-grad" && <FreshGradTemplate data={data} fmt={dateFormat} photo={photo} headingStyle={headingStyle} />}
      {template === "navy-sidebar" && <NavySidebarTemplate data={data} fmt={dateFormat} photo={photo} headingStyle={headingStyle} />}
      {template === "pastel" && <PastelTemplate data={data} fmt={dateFormat} photo={photo} photoOn={photoOn} headingStyle={headingStyle} />}
      {template === "bold" && <BoldTemplate data={data} fmt={dateFormat} photo={photo} photoOn={photoOn} headingStyle={headingStyle} />}
      {template === "simple" && <SimpleTemplate data={data} fmt={dateFormat} photo={photo} photoOn={photoOn} headingStyle={headingStyle} />}
      {template === "umer-classic" && <UmerClassicTemplate data={data} fmt={dateFormat} photo={photo} photoOn={photoOn} headingStyle={headingStyle} />}
      {template === "executive-dark" && <ExecutiveDarkTemplate data={data} fmt={dateFormat} photo={photo} photoOn={photoOn} headingStyle={headingStyle} />}
      {template === "creative-portfolio" && <CreativePortfolioTemplate data={data} fmt={dateFormat} photo={photo} photoOn={photoOn} headingStyle={headingStyle} />}
      {template === "academic" && <AcademicTemplate data={data} fmt={dateFormat} photo={photo} photoOn={photoOn} headingStyle={headingStyle} />}
      {template === "vibrant" && <VibrantTemplate data={data} fmt={dateFormat} photo={photo} photoOn={photoOn} headingStyle={headingStyle} />}
      {template === "sunset" && <SunsetTemplate data={data} fmt={dateFormat} photo={photo} photoOn={photoOn} headingStyle={headingStyle} />}
      {template === "ocean" && <OceanTemplate data={data} fmt={dateFormat} photo={photo} photoOn={photoOn} headingStyle={headingStyle} />}
    </div>
  );
}
