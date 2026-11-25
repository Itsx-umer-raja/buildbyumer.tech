"use client";

import { useState } from "react";
import { Plus, Trash2, Lightbulb } from "lucide-react";
import { ErrorNote, OptionLabel, ProcessButton, inputCls, selectCls } from "@/components/tool-ui";
import {
  GRADE_POINTS_4,
  GRADE_POINTS_10,
  LETTER_GRADE_TABLE,
  cgpaFromSemesters,
  cgpaToPercentage,
  creditWeightedAverage,
  gpaStanding,
  gpaToPercentage,
  letterGradeFor,
  percentOfNumber,
  percentageFromMarks,
  percentageToGpa,
  requiredFinalScore,
  round2,
  sgpaStanding,
  totalCredits,
  totalGradePoints,
  weightedGrade,
  whatPercentOf,
  type GradeOption,
} from "@/lib/student-calculators";

// ---------------------------------------------------------------------------
// Shared UI for the calculator tools
// ---------------------------------------------------------------------------

function ResultBox({
  title,
  value,
  sub,
}: {
  title: string;
  value: string;
  sub?: string;
}) {
  return (
    <div className="mt-6 rounded-2xl border border-teal-200 bg-teal-50 p-5 text-center">
      <p className="text-sm font-semibold uppercase tracking-wider text-teal-700">{title}</p>
      <p className="mt-1 font-display text-4xl font-bold text-teal-900">{value}</p>
      {sub && <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-teal-900/80">{sub}</p>}
    </div>
  );
}

function ExampleBox({
  text,
  onLoad,
}: {
  text: string;
  onLoad: () => void;
}) {
  return (
    <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <p className="flex items-center gap-2 text-sm font-semibold text-slate-900">
        <Lightbulb className="h-4 w-4 text-teal-700" /> Worked example
      </p>
      <p className="mt-2 text-sm leading-relaxed text-slate-700">{text}</p>
      <button
        type="button"
        onClick={onLoad}
        className="mt-3 inline-flex items-center gap-2 rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800 hover:border-teal-600"
      >
        Load this example
      </button>
    </div>
  );
}

function parseNum(value: string): number | null {
  const n = Number(value);
  return value.trim() === "" || Number.isNaN(n) ? null : n;
}

let rowId = 0;
function nextRowId() {
  rowId += 1;
  return rowId;
}

interface GradeRow {
  id: number;
  name: string;
  grade: string;
  credits: string;
}

function GradeRows({
  rows,
  setRows,
  grades,
  nameLabel,
}: {
  rows: GradeRow[];
  setRows: (rows: GradeRow[]) => void;
  grades: GradeOption[];
  nameLabel: string;
}) {
  return (
    <div className="space-y-2">
      {rows.map((row, i) => (
        <div key={row.id} className="grid grid-cols-[1fr_92px_84px_36px] items-center gap-2 sm:grid-cols-[1fr_120px_100px_36px]">
          <input
            aria-label={`${nameLabel} ${i + 1}`}
            className={inputCls}
            placeholder={`${nameLabel} ${i + 1} (optional)`}
            value={row.name}
            onChange={(e) =>
              setRows(rows.map((r) => (r.id === row.id ? { ...r, name: e.target.value } : r)))
            }
          />
          <select
            aria-label={`Grade for ${nameLabel.toLowerCase()} ${i + 1}`}
            className={selectCls}
            value={row.grade}
            onChange={(e) =>
              setRows(rows.map((r) => (r.id === row.id ? { ...r, grade: e.target.value } : r)))
            }
          >
            {grades.map((g) => (
              <option key={g.label} value={g.label}>
                {g.label} ({g.points})
              </option>
            ))}
          </select>
          <input
            aria-label={`Credits for ${nameLabel.toLowerCase()} ${i + 1}`}
            className={inputCls}
            type="number"
            min="0"
            step="0.5"
            inputMode="decimal"
            placeholder="Credits"
            value={row.credits}
            onChange={(e) =>
              setRows(rows.map((r) => (r.id === row.id ? { ...r, credits: e.target.value } : r)))
            }
          />
          <button
            type="button"
            aria-label={`Remove ${nameLabel.toLowerCase()} ${i + 1}`}
            disabled={rows.length <= 1}
            onClick={() => setRows(rows.filter((r) => r.id !== row.id))}
            className="rounded-md p-2 text-slate-500 hover:bg-red-50 hover:text-red-600 disabled:opacity-30"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={() =>
          setRows([...rows, { id: nextRowId(), name: "", grade: grades[0].label, credits: "" }])
        }
        className="inline-flex items-center gap-1.5 rounded-full border border-slate-300 bg-white px-3.5 py-2 text-sm font-semibold text-slate-800 hover:border-teal-600"
      >
        <Plus className="h-4 w-4" /> Add a row
      </button>
    </div>
  );
}

function validateGradeRows(
  rows: GradeRow[],
  grades: GradeOption[],
  maxCredits: number,
): { entries: { points: number; credits: number }[] } | { error: string } {
  const entries: { points: number; credits: number }[] = [];
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const credits = parseNum(row.credits);
    if (credits === null) return { error: `Row ${i + 1}: enter the credits (a number).` };
    if (credits < 0 || credits > maxCredits)
      return { error: `Row ${i + 1}: credits must be between 0 and ${maxCredits}.` };
    const grade = grades.find((g) => g.label === row.grade);
    if (!grade) return { error: `Row ${i + 1}: pick a grade.` };
    entries.push({ points: grade.points, credits });
  }
  if (totalCredits(entries) <= 0)
    return { error: "Total credits are 0 — enter credits of at least one row." };
  return { entries };
}

function gpaResultPanel(result: { gpa: number; credits: number; points: number; standing: string }) {
  return (
    <ResultBox
      title="Your GPA"
      value={result.gpa.toFixed(2)}
      sub={`${result.points.toFixed(2)} grade points across ${result.credits} credits. ${result.standing}`}
    />
  );
}

// ---------------------------------------------------------------------------
// 1. GPA Calculator — 4.0 scale, credit-weighted, letter grades
// ---------------------------------------------------------------------------

export function GpaCalculatorTool() {
  const [rows, setRows] = useState<GradeRow[]>([
    { id: nextRowId(), name: "Mathematics", grade: "A", credits: "3" },
    { id: nextRowId(), name: "English", grade: "B+", credits: "3" },
    { id: nextRowId(), name: "Physics", grade: "A−", credits: "4" },
    { id: nextRowId(), name: "History", grade: "B", credits: "3" },
  ]);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ gpa: number; credits: number; points: number } | null>(null);

  const calculate = () => {
    setError(null);
    setResult(null);
    const checked = validateGradeRows(rows, GRADE_POINTS_4, 12);
    if ("error" in checked) return setError(checked.error);
    const gpa = creditWeightedAverage(checked.entries);
    if (gpa === null) return setError("Total credits are 0 — enter credits of at least one row.");
    setResult({ gpa, credits: totalCredits(checked.entries), points: totalGradePoints(checked.entries) });
  };

  return (
    <div>
      <p className="mb-4 text-sm leading-relaxed text-slate-700">
        Enter each course&apos;s letter grade and credit hours. GPA = sum of (grade points ×
        credits) ÷ total credits, on the 4.0 scale (A+ and A both count as 4.0).
      </p>
      <GradeRows rows={rows} setRows={setRows} grades={GRADE_POINTS_4} nameLabel="Course" />
      <ProcessButton busy={false} label="Calculate GPA" onClick={calculate} />
      <ErrorNote message={error} />
      {result && gpaResultPanel({ ...result, standing: gpaStanding(result.gpa) })}
      <ExampleBox
        text="Maths A (3 credits), English B+ (3), Physics A− (4), History B (3): (4.0×3 + 3.3×3 + 3.7×4 + 3.0×3) ÷ 13 = 45.7 ÷ 13 = 3.52."
        onLoad={() =>
          setRows([
            { id: nextRowId(), name: "Mathematics", grade: "A", credits: "3" },
            { id: nextRowId(), name: "English", grade: "B+", credits: "3" },
            { id: nextRowId(), name: "Physics", grade: "A−", credits: "4" },
            { id: nextRowId(), name: "History", grade: "B", credits: "3" },
          ])
        }
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// 2. CGPA Calculator — semester GPAs weighted by semester credits
// ---------------------------------------------------------------------------

interface SemesterRow {
  id: number;
  name: string;
  gpa: string;
  credits: string;
}

export function CgpaCalculatorTool() {
  const [scale, setScale] = useState<"4" | "10">("4");
  const [rows, setRows] = useState<SemesterRow[]>([
    { id: nextRowId(), name: "Semester 1", gpa: "3.5", credits: "15" },
    { id: nextRowId(), name: "Semester 2", gpa: "3.8", credits: "16" },
    { id: nextRowId(), name: "Semester 3", gpa: "3.2", credits: "15" },
  ]);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ cgpa: number; credits: number } | null>(null);

  const maxGpa = scale === "4" ? 4 : 10;
  const calculate = () => {
    setError(null);
    setResult(null);
    const semesters: { gpa: number; credits: number }[] = [];
    for (let i = 0; i < rows.length; i++) {
      const gpa = parseNum(rows[i].gpa);
      const credits = parseNum(rows[i].credits);
      if (gpa === null) return setError(`Semester ${i + 1}: enter the GPA (a number).`);
      if (gpa < 0 || gpa > maxGpa)
        return setError(`Semester ${i + 1}: GPA must be between 0 and ${maxGpa} on the ${maxGpa}.0 scale.`);
      if (credits === null) return setError(`Semester ${i + 1}: enter the credits (a number).`);
      if (credits < 0 || credits > 40)
        return setError(`Semester ${i + 1}: credits must be between 0 and 40.`);
      semesters.push({ gpa, credits });
    }
    if (totalCredits(semesters) <= 0)
      return setError("Total credits are 0 — enter credits of at least one semester.");
    const cgpa = cgpaFromSemesters(semesters);
    if (cgpa === null) return setError("Total credits are 0 — enter credits of at least one semester.");
    setResult({ cgpa, credits: totalCredits(semesters) });
  };

  return (
    <div>
      <p className="mb-4 text-sm leading-relaxed text-slate-700">
        Enter each semester&apos;s GPA and its total credits. CGPA = sum of (semester GPA ×
        semester credits) ÷ total credits. A semester with more credits counts more.
      </p>
      <div className="mb-4 max-w-xs">
        <OptionLabel>GPA scale</OptionLabel>
        <select
          className={selectCls}
          value={scale}
          onChange={(e) => {
            setScale(e.target.value as "4" | "10");
            setResult(null);
          }}
        >
          <option value="4">4.0 scale (US / UK)</option>
          <option value="10">10.0 scale (India / Pakistan)</option>
        </select>
      </div>
      <div className="space-y-2">
        {rows.map((row, i) => (
          <div key={row.id} className="grid grid-cols-[1fr_92px_84px_36px] items-center gap-2 sm:grid-cols-[1fr_120px_100px_36px]">
            <input
              aria-label={`Semester ${i + 1} name`}
              className={inputCls}
              placeholder={`Semester ${i + 1}`}
              value={row.name}
              onChange={(e) =>
                setRows(rows.map((r) => (r.id === row.id ? { ...r, name: e.target.value } : r)))
              }
            />
            <input
              aria-label={`GPA for semester ${i + 1}`}
              className={inputCls}
              type="number"
              min="0"
              max={maxGpa}
              step="0.01"
              inputMode="decimal"
              placeholder="GPA"
              value={row.gpa}
              onChange={(e) =>
                setRows(rows.map((r) => (r.id === row.id ? { ...r, gpa: e.target.value } : r)))
              }
            />
            <input
              aria-label={`Credits for semester ${i + 1}`}
              className={inputCls}
              type="number"
              min="0"
              step="1"
              inputMode="decimal"
              placeholder="Credits"
              value={row.credits}
              onChange={(e) =>
                setRows(rows.map((r) => (r.id === row.id ? { ...r, credits: e.target.value } : r)))
              }
            />
            <button
              type="button"
              aria-label={`Remove semester ${i + 1}`}
              disabled={rows.length <= 1}
              onClick={() => setRows(rows.filter((r) => r.id !== row.id))}
              className="rounded-md p-2 text-slate-500 hover:bg-red-50 hover:text-red-600 disabled:opacity-30"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={() =>
            setRows([...rows, { id: nextRowId(), name: `Semester ${rows.length + 1}`, gpa: "", credits: "" }])
          }
          className="inline-flex items-center gap-1.5 rounded-full border border-slate-300 bg-white px-3.5 py-2 text-sm font-semibold text-slate-800 hover:border-teal-600"
        >
          <Plus className="h-4 w-4" /> Add a semester
        </button>
      </div>
      <ProcessButton busy={false} label="Calculate CGPA" onClick={calculate} />
      <ErrorNote message={error} />
      {result && (
        <ResultBox
          title="Your CGPA"
          value={result.cgpa.toFixed(2)}
          sub={`Across ${result.credits} credits in total. ${
            scale === "4" ? gpaStanding(result.cgpa) : sgpaStanding(result.cgpa)
          }`}
        />
      )}
      <ExampleBox
        text="Semester 1: GPA 3.5 (15 credits), Semester 2: 3.8 (16), Semester 3: 3.2 (15): (3.5×15 + 3.8×16 + 3.2×15) ÷ 46 = 161.3 ÷ 46 = 3.51."
        onLoad={() =>
          setRows([
            { id: nextRowId(), name: "Semester 1", gpa: "3.5", credits: "15" },
            { id: nextRowId(), name: "Semester 2", gpa: "3.8", credits: "16" },
            { id: nextRowId(), name: "Semester 3", gpa: "3.2", credits: "15" },
          ])
        }
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// 3. Percentage Calculator — marks → %, X% of Y, X is what % of Y
// ---------------------------------------------------------------------------

export function PercentageCalculatorTool() {
  const [mode, setMode] = useState<"marks" | "of" | "is">("marks");
  const [a, setA] = useState("425");
  const [b, setB] = useState("500");
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);

  const labels =
    mode === "marks"
      ? { a: "Marks obtained", b: "Total marks", phA: "e.g. 425", phB: "e.g. 500" }
      : mode === "of"
        ? { a: "Percentage (%)", b: "Number", phA: "e.g. 15", phB: "e.g. 200" }
        : { a: "Part (X)", b: "Whole (Y)", phA: "e.g. 45", phB: "e.g. 50" };

  const calculate = () => {
    setError(null);
    setResult(null);
    const x = parseNum(a);
    const y = parseNum(b);
    if (x === null) return setError(`Enter ${labels.a.toLowerCase()} (a number).`);
    if (y === null) return setError(`Enter ${labels.b.toLowerCase()} (a number).`);
    if (mode === "marks") {
      if (y <= 0) return setError("Total marks must be more than 0.");
      if (x < 0) return setError("Marks obtained cannot be negative.");
      if (x > y) return setError("Marks obtained cannot be more than the total marks.");
      setResult(`${percentageFromMarks(x, y).toFixed(2)}%`);
    } else if (mode === "of") {
      if (x < 0 || x > 1000) return setError("Percentage must be between 0 and 1000.");
      setResult(`${percentOfNumber(x, y)}`);
    } else {
      if (y === 0) return setError("The whole (Y) cannot be 0.");
      setResult(`${whatPercentOf(x, y).toFixed(2)}%`);
    }
  };

  return (
    <div>
      <div className="mb-4 max-w-sm">
        <OptionLabel>What do you want to work out?</OptionLabel>
        <select
          className={selectCls}
          value={mode}
          onChange={(e) => {
            setMode(e.target.value as typeof mode);
            setResult(null);
            setError(null);
          }}
        >
          <option value="marks">Marks → percentage (obtained ÷ total)</option>
          <option value="of">What is X% of Y?</option>
          <option value="is">X is what % of Y?</option>
        </select>
      </div>
      <div className="grid max-w-lg gap-3 sm:grid-cols-2">
        <div>
          <OptionLabel>{labels.a}</OptionLabel>
          <input className={inputCls} type="number" inputMode="decimal" placeholder={labels.phA} value={a} onChange={(e) => setA(e.target.value)} />
        </div>
        <div>
          <OptionLabel>{labels.b}</OptionLabel>
          <input className={inputCls} type="number" inputMode="decimal" placeholder={labels.phB} value={b} onChange={(e) => setB(e.target.value)} />
        </div>
      </div>
      <ProcessButton busy={false} label="Calculate percentage" onClick={calculate} />
      <ErrorNote message={error} />
      {result && <ResultBox title="Result" value={result} />}
      <ExampleBox
        text={
          mode === "marks"
            ? "425 marks out of 500: 425 ÷ 500 × 100 = 85%."
            : mode === "of"
              ? "15% of 200: 15 ÷ 100 × 200 = 30."
              : "45 is what % of 50: 45 ÷ 50 × 100 = 90%."
        }
        onLoad={() => {
          if (mode === "marks") {
            setA("425");
            setB("500");
          } else if (mode === "of") {
            setA("15");
            setB("200");
          } else {
            setA("45");
            setB("50");
          }
        }}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// 4. Grade Calculator — percentage → letter grade + grade points
// ---------------------------------------------------------------------------

export function GradeCalculatorTool() {
  const [percent, setPercent] = useState("88");
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ letter: string; points: number } | null>(null);

  const calculate = () => {
    setError(null);
    setResult(null);
    const p = parseNum(percent);
    if (p === null) return setError("Enter your percentage (a number).");
    if (p < 0 || p > 100) return setError("Percentage must be between 0 and 100.");
    const g = letterGradeFor(p);
    setResult({ letter: g.letter, points: g.points });
  };

  return (
    <div>
      <p className="mb-4 text-sm leading-relaxed text-slate-700">
        Enter a percentage and see the letter grade and grade points on the standard US
        +/− scale (A+ 97–100, A 93–96, A− 90–92, B+ 87–89, B 83–86, B− 80–82, C+ 77–79,
        C 73–76, C− 70–72, D+ 67–69, D 63–66, D− 60–62, F below 60). Grading scales differ
        by school — check yours if the boundary matters.
      </p>
      <div className="max-w-xs">
        <OptionLabel>Percentage (%)</OptionLabel>
        <input
          className={inputCls}
          type="number"
          min="0"
          max="100"
          step="0.1"
          inputMode="decimal"
          placeholder="e.g. 88"
          value={percent}
          onChange={(e) => setPercent(e.target.value)}
        />
      </div>
      <ProcessButton busy={false} label="Find my grade" onClick={calculate} />
      <ErrorNote message={error} />
      {result && (
        <ResultBox
          title="Your grade"
          value={`${result.letter} · ${result.points.toFixed(1)} points`}
          sub={`${percent}% is a ${result.letter} on the standard US +/− scale.`}
        />
      )}
      <div className="mt-6 overflow-x-auto rounded-2xl border border-slate-200">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 text-left text-slate-700">
              <th className="px-4 py-2 font-semibold">Percentage</th>
              <th className="px-4 py-2 font-semibold">Grade</th>
              <th className="px-4 py-2 font-semibold">Points</th>
            </tr>
          </thead>
          <tbody>
            {LETTER_GRADE_TABLE.map((row, idx) => {
              const upper =
                idx === 0 ? 100 : LETTER_GRADE_TABLE[idx - 1].minPercent - 1;
              return (
              <tr key={row.letter} className="border-t border-slate-100 text-slate-700">
                <td className="px-4 py-1.5">
                  {row.letter === "F" ? "Below 60" : `${row.minPercent}–${upper}`}
                </td>
                <td className="px-4 py-1.5 font-semibold text-slate-900">{row.letter}</td>
                <td className="px-4 py-1.5">{row.points.toFixed(1)}</td>
              </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <ExampleBox
        text="88% falls in the 87–89 band, so it is a B+ worth 3.3 grade points."
        onLoad={() => setPercent("88")}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// 5. CGPA to Percentage — ×9.5 (common Indian convention) or ×10
// ---------------------------------------------------------------------------

export function CgpaToPercentageTool() {
  const [cgpa, setCgpa] = useState("8.6");
  const [factor, setFactor] = useState<"9.5" | "10">("9.5");
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<number | null>(null);

  const calculate = () => {
    setError(null);
    setResult(null);
    const c = parseNum(cgpa);
    if (c === null) return setError("Enter your CGPA (a number).");
    if (c < 0 || c > 10) return setError("CGPA must be between 0 and 10.");
    setResult(cgpaToPercentage(c, factor === "9.5" ? 9.5 : 10));
  };

  return (
    <div>
      <p className="mb-4 text-sm leading-relaxed text-slate-700">
        Convert a CGPA on the 10-point scale into a percentage. The ×9.5 formula is the
        widely used Indian-university convention; ×10 is the direct scale conversion.
        Universities differ — use the formula your university publishes when it matters.
      </p>
      <div className="grid max-w-lg gap-3 sm:grid-cols-2">
        <div>
          <OptionLabel>CGPA (0–10)</OptionLabel>
          <input className={inputCls} type="number" min="0" max="10" step="0.01" inputMode="decimal" placeholder="e.g. 8.6" value={cgpa} onChange={(e) => setCgpa(e.target.value)} />
        </div>
        <div>
          <OptionLabel>Conversion formula</OptionLabel>
          <select className={selectCls} value={factor} onChange={(e) => setFactor(e.target.value as "9.5" | "10")}>
            <option value="9.5">× 9.5 — common Indian formula</option>
            <option value="10">× 10 — direct scale</option>
          </select>
        </div>
      </div>
      <ProcessButton busy={false} label="Convert to percentage" onClick={calculate} />
      <ErrorNote message={error} />
      {result !== null && (
        <ResultBox
          title="Percentage"
          value={`${result.toFixed(2)}%`}
          sub={`A CGPA of ${cgpa} on the 10-point scale is ${result.toFixed(2)}% using the ×${factor} formula.`}
        />
      )}
      <ExampleBox
        text="CGPA 8.6 with the ×9.5 formula: 8.6 × 9.5 = 81.7%."
        onLoad={() => {
          setCgpa("8.6");
          setFactor("9.5");
        }}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// 6. Percentage to GPA — 4.0 or 10.0 scale (approximation; schools differ)
// ---------------------------------------------------------------------------

export function PercentageToGpaTool() {
  const [percent, setPercent] = useState("85");
  const [scale, setScale] = useState<"4" | "10">("4");
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<number | null>(null);

  const calculate = () => {
    setError(null);
    setResult(null);
    const p = parseNum(percent);
    if (p === null) return setError("Enter your percentage (a number).");
    if (p < 0 || p > 100) return setError("Percentage must be between 0 and 100.");
    setResult(percentageToGpa(p, scale === "4" ? 4 : 10));
  };

  return (
    <div>
      <p className="mb-4 text-sm leading-relaxed text-slate-700">
        Convert a percentage into a GPA. On the 4.0 scale the formula is percentage ÷ 100 ×
        4; on the 10-point scale it is percentage ÷ 10. This is an approximation — schools
        convert percentages to GPA in different ways, so treat the result as a guide.
      </p>
      <div className="grid max-w-lg gap-3 sm:grid-cols-2">
        <div>
          <OptionLabel>Percentage (%)</OptionLabel>
          <input className={inputCls} type="number" min="0" max="100" step="0.1" inputMode="decimal" placeholder="e.g. 85" value={percent} onChange={(e) => setPercent(e.target.value)} />
        </div>
        <div>
          <OptionLabel>GPA scale</OptionLabel>
          <select className={selectCls} value={scale} onChange={(e) => setScale(e.target.value as "4" | "10")}>
            <option value="4">4.0 scale (US / UK)</option>
            <option value="10">10.0 scale (India / Pakistan)</option>
          </select>
        </div>
      </div>
      <ProcessButton busy={false} label="Convert to GPA" onClick={calculate} />
      <ErrorNote message={error} />
      {result !== null && (
        <ResultBox
          title="Your GPA"
          value={result.toFixed(2)}
          sub={`${percent}% is about ${result.toFixed(2)} on the ${scale}.0 scale (approximate — schools convert differently).`}
        />
      )}
      <ExampleBox
        text="85% on the 4.0 scale: 85 ÷ 100 × 4 = 3.40. On the 10-point scale the same 85% is 8.50."
        onLoad={() => {
          setPercent("85");
          setScale("4");
        }}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// 7. Final Grade Calculator — score needed on the final exam
// ---------------------------------------------------------------------------

export function FinalGradeCalculatorTool() {
  const [current, setCurrent] = useState("82");
  const [desired, setDesired] = useState("85");
  const [weight, setWeight] = useState("40");
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ required: number; status: string } | null>(null);

  const calculate = () => {
    setError(null);
    setResult(null);
    const cur = parseNum(current);
    const des = parseNum(desired);
    const w = parseNum(weight);
    if (cur === null) return setError("Enter your current grade (a number).");
    if (des === null) return setError("Enter the grade you want (a number).");
    if (w === null) return setError("Enter the final exam's weight (a number).");
    if (cur < 0 || cur > 100) return setError("Current grade must be between 0 and 100.");
    if (des < 0 || des > 100) return setError("Desired grade must be between 0 and 100.");
    if (w <= 0 || w >= 100) return setError("The final exam's weight must be between 1 and 99 percent.");
    const r = requiredFinalScore(cur, des, w);
    setResult(r);
  };

  return (
    <div>
      <p className="mb-4 text-sm leading-relaxed text-slate-700">
        Work out what you need on your final exam to finish with the grade you want.
        Required score = (desired grade − current grade × (1 − exam weight)) ÷ exam
        weight. If the answer is over 100%, the target is not reachable with this exam
        alone.
      </p>
      <div className="grid max-w-lg gap-3 sm:grid-cols-3">
        <div>
          <OptionLabel>Current grade (%)</OptionLabel>
          <input className={inputCls} type="number" min="0" max="100" step="0.1" inputMode="decimal" placeholder="e.g. 82" value={current} onChange={(e) => setCurrent(e.target.value)} />
        </div>
        <div>
          <OptionLabel>Grade you want (%)</OptionLabel>
          <input className={inputCls} type="number" min="0" max="100" step="0.1" inputMode="decimal" placeholder="e.g. 85" value={desired} onChange={(e) => setDesired(e.target.value)} />
        </div>
        <div>
          <OptionLabel>Final exam weight (%)</OptionLabel>
          <input className={inputCls} type="number" min="1" max="99" step="1" inputMode="decimal" placeholder="e.g. 40" value={weight} onChange={(e) => setWeight(e.target.value)} />
        </div>
      </div>
      <ProcessButton busy={false} label="What do I need on the final?" onClick={calculate} />
      <ErrorNote message={error} />
      {result && (
        <ResultBox
          title="You need on the final exam"
          value={`${result.required.toFixed(2)}%`}
          sub={
            result.status === "already"
              ? "You have already secured your target grade — even a 0 on the final keeps you there."
              : result.status === "impossible"
                ? "That target is not reachable: you would need more than 100% on the final. Lower the target or check the weight."
                : `Score at least ${result.required.toFixed(2)}% on the final (worth ${weight}% of your grade) to finish at ${desired}%.`
          }
        />
      )}
      <ExampleBox
        text="Current grade 82%, you want 85%, final exam worth 40%: (85 − 82 × 0.60) ÷ 0.40 = (85 − 49.2) ÷ 0.40 = 89.5%. You need 89.5% on the final."
        onLoad={() => {
          setCurrent("82");
          setDesired("85");
          setWeight("40");
        }}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// 8. SGPA Calculator — 10-point scale, credit-weighted, per semester
// ---------------------------------------------------------------------------

export function SgpaCalculatorTool() {
  const [rows, setRows] = useState<GradeRow[]>([
    { id: nextRowId(), name: "Mathematics", grade: "O", credits: "4" },
    { id: nextRowId(), name: "Physics", grade: "A+", credits: "3" },
    { id: nextRowId(), name: "Chemistry", grade: "A", credits: "3" },
    { id: nextRowId(), name: "English", grade: "B+", credits: "2" },
  ]);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ sgpa: number; credits: number; points: number } | null>(null);

  const calculate = () => {
    setError(null);
    setResult(null);
    const checked = validateGradeRows(rows, GRADE_POINTS_10, 12);
    if ("error" in checked) return setError(checked.error);
    const sgpa = creditWeightedAverage(checked.entries);
    if (sgpa === null) return setError("Total credits are 0 — enter credits of at least one subject.");
    setResult({ sgpa, credits: totalCredits(checked.entries), points: totalGradePoints(checked.entries) });
  };

  return (
    <div>
      <p className="mb-4 text-sm leading-relaxed text-slate-700">
        SGPA is the semester GPA on the 10-point scale used in India and Pakistan: O = 10,
        A+ = 9, A = 8, B+ = 7, B = 6, C = 5, P = 4, F = 0. SGPA = sum of (grade points ×
        credits) ÷ total credits for one semester.
      </p>
      <GradeRows rows={rows} setRows={setRows} grades={GRADE_POINTS_10} nameLabel="Subject" />
      <ProcessButton busy={false} label="Calculate SGPA" onClick={calculate} />
      <ErrorNote message={error} />
      {result && (
        <ResultBox
          title="Your SGPA"
          value={result.sgpa.toFixed(2)}
          sub={`${result.points.toFixed(2)} grade points across ${result.credits} credits. ${sgpaStanding(result.sgpa)}`}
        />
      )}
      <ExampleBox
        text="Maths O (4 credits), Physics A+ (3), Chemistry A (3), English B+ (2): (10×4 + 9×3 + 8×3 + 7×2) ÷ 12 = 105 ÷ 12 = 8.75."
        onLoad={() =>
          setRows([
            { id: nextRowId(), name: "Mathematics", grade: "O", credits: "4" },
            { id: nextRowId(), name: "Physics", grade: "A+", credits: "3" },
            { id: nextRowId(), name: "Chemistry", grade: "A", credits: "3" },
            { id: nextRowId(), name: "English", grade: "B+", credits: "2" },
          ])
        }
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// 9. Weighted Grade Calculator — categories with weights that sum to 100%
// ---------------------------------------------------------------------------

interface CategoryRow {
  id: number;
  name: string;
  score: string;
  weight: string;
}

export function WeightedGradeCalculatorTool() {
  const [rows, setRows] = useState<CategoryRow[]>([
    { id: nextRowId(), name: "Homework", score: "90", weight: "20" },
    { id: nextRowId(), name: "Quizzes", score: "80", weight: "20" },
    { id: nextRowId(), name: "Midterm", score: "85", weight: "25" },
    { id: nextRowId(), name: "Final exam", score: "88", weight: "35" },
  ]);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ grade: number; letter: string } | null>(null);

  const calculate = () => {
    setError(null);
    setResult(null);
    const items: { score: number; weight: number }[] = [];
    for (let i = 0; i < rows.length; i++) {
      const score = parseNum(rows[i].score);
      const weight = parseNum(rows[i].weight);
      if (score === null) return setError(`Row ${i + 1}: enter the score (a number).`);
      if (score < 0 || score > 100) return setError(`Row ${i + 1}: score must be between 0 and 100.`);
      if (weight === null) return setError(`Row ${i + 1}: enter the weight (a number).`);
      if (weight < 0 || weight > 100) return setError(`Row ${i + 1}: weight must be between 0 and 100.`);
      items.push({ score, weight });
    }
    const totalWeight = round2(items.reduce((s, i) => s + i.weight, 0));
    if (totalWeight !== 100)
      return setError(`Weights add up to ${totalWeight}%, not 100%. Adjust them so they total exactly 100%.`);
    const grade = weightedGrade(items);
    setResult({ grade, letter: letterGradeFor(grade).letter });
  };

  return (
    <div>
      <p className="mb-4 text-sm leading-relaxed text-slate-700">
        Enter each part of your course — homework, quizzes, exams — with its score and how
        much it counts. The weights must add up to exactly 100%. Weighted grade = sum of
        (score × weight) ÷ 100.
      </p>
      <div className="space-y-2">
        {rows.map((row, i) => (
          <div key={row.id} className="grid grid-cols-[1fr_76px_76px_36px] items-center gap-2 sm:grid-cols-[1fr_100px_100px_36px]">
            <input
              aria-label={`Category ${i + 1} name`}
              className={inputCls}
              placeholder={`Category ${i + 1} (e.g. Homework)`}
              value={row.name}
              onChange={(e) =>
                setRows(rows.map((r) => (r.id === row.id ? { ...r, name: e.target.value } : r)))
              }
            />
            <input
              aria-label={`Score for category ${i + 1}`}
              className={inputCls}
              type="number"
              min="0"
              max="100"
              step="0.1"
              inputMode="decimal"
              placeholder="Score %"
              value={row.score}
              onChange={(e) =>
                setRows(rows.map((r) => (r.id === row.id ? { ...r, score: e.target.value } : r)))
              }
            />
            <input
              aria-label={`Weight for category ${i + 1}`}
              className={inputCls}
              type="number"
              min="0"
              max="100"
              step="1"
              inputMode="decimal"
              placeholder="Weight %"
              value={row.weight}
              onChange={(e) =>
                setRows(rows.map((r) => (r.id === row.id ? { ...r, weight: e.target.value } : r)))
              }
            />
            <button
              type="button"
              aria-label={`Remove category ${i + 1}`}
              disabled={rows.length <= 1}
              onClick={() => setRows(rows.filter((r) => r.id !== row.id))}
              className="rounded-md p-2 text-slate-500 hover:bg-red-50 hover:text-red-600 disabled:opacity-30"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={() =>
            setRows([...rows, { id: nextRowId(), name: "", score: "", weight: "" }])
          }
          className="inline-flex items-center gap-1.5 rounded-full border border-slate-300 bg-white px-3.5 py-2 text-sm font-semibold text-slate-800 hover:border-teal-600"
        >
          <Plus className="h-4 w-4" /> Add a category
        </button>
      </div>
      <ProcessButton busy={false} label="Calculate weighted grade" onClick={calculate} />
      <ErrorNote message={error} />
      {result && (
        <ResultBox
          title="Your weighted grade"
          value={`${result.grade.toFixed(2)}% · ${result.letter}`}
          sub={`That is a ${result.letter} on the standard US +/− scale.`}
        />
      )}
      <ExampleBox
        text="Homework 90% (weight 20), Quizzes 80% (20), Midterm 85% (25), Final 88% (35): (90×20 + 80×20 + 85×25 + 88×35) ÷ 100 = 8605 ÷ 100 = 86.05%."
        onLoad={() =>
          setRows([
            { id: nextRowId(), name: "Homework", score: "90", weight: "20" },
            { id: nextRowId(), name: "Quizzes", score: "80", weight: "20" },
            { id: nextRowId(), name: "Midterm", score: "85", weight: "25" },
            { id: nextRowId(), name: "Final exam", score: "88", weight: "35" },
          ])
        }
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// 10. GPA to Percentage — 4.0 or 10.0 scale
// ---------------------------------------------------------------------------

export function GpaToPercentageTool() {
  const [gpa, setGpa] = useState("3.6");
  const [scale, setScale] = useState<"4" | "10">("4");
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<number | null>(null);

  const maxGpa = scale === "4" ? 4 : 10;
  const calculate = () => {
    setError(null);
    setResult(null);
    const g = parseNum(gpa);
    if (g === null) return setError("Enter your GPA (a number).");
    if (g < 0 || g > maxGpa) return setError(`GPA must be between 0 and ${maxGpa} on the ${maxGpa}.0 scale.`);
    setResult(gpaToPercentage(g, scale === "4" ? 4 : 10));
  };

  return (
    <div>
      <p className="mb-4 text-sm leading-relaxed text-slate-700">
        Convert a GPA into a percentage. On the 4.0 scale the formula is GPA ÷ 4 × 100; on
        the 10-point scale it is GPA × 10. This is an approximation — schools convert
        GPA to percentage in different ways, so treat the result as a guide.
      </p>
      <div className="grid max-w-lg gap-3 sm:grid-cols-2">
        <div>
          <OptionLabel>GPA</OptionLabel>
          <input className={inputCls} type="number" min="0" max={maxGpa} step="0.01" inputMode="decimal" placeholder="e.g. 3.6" value={gpa} onChange={(e) => setGpa(e.target.value)} />
        </div>
        <div>
          <OptionLabel>GPA scale</OptionLabel>
          <select className={selectCls} value={scale} onChange={(e) => setScale(e.target.value as "4" | "10")}>
            <option value="4">4.0 scale (US / UK)</option>
            <option value="10">10.0 scale (India / Pakistan)</option>
          </select>
        </div>
      </div>
      <ProcessButton busy={false} label="Convert to percentage" onClick={calculate} />
      <ErrorNote message={error} />
      {result !== null && (
        <ResultBox
          title="Percentage"
          value={`${result.toFixed(2)}%`}
          sub={`A GPA of ${gpa} on the ${scale}.0 scale is about ${result.toFixed(2)}% (approximate — schools convert differently).`}
        />
      )}
      <ExampleBox
        text="GPA 3.6 on the 4.0 scale: 3.6 ÷ 4 × 100 = 90%."
        onLoad={() => {
          setGpa("3.6");
          setScale("4");
        }}
      />
    </div>
  );
}
