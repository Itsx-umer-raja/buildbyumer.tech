// Pure, client-side student-calculator formulas for PDF World.
// No network, no storage: every function here is a plain calculation that
// the tool components call with the numbers the user typed. Keeping the
// formulas in this file (not inside the components) means they can be
// executed and checked against hand-computed values with `tsc` + node.

export interface GradeOption {
  label: string;
  points: number;
}

/** Standard US 4.0 grade-point table (A+ and A both count as 4.0). */
export const GRADE_POINTS_4: GradeOption[] = [
  { label: "A+", points: 4.0 },
  { label: "A", points: 4.0 },
  { label: "A−", points: 3.7 },
  { label: "B+", points: 3.3 },
  { label: "B", points: 3.0 },
  { label: "B−", points: 2.7 },
  { label: "C+", points: 2.3 },
  { label: "C", points: 2.0 },
  { label: "C−", points: 1.7 },
  { label: "D+", points: 1.3 },
  { label: "D", points: 1.0 },
  { label: "D−", points: 0.7 },
  { label: "F", points: 0 },
];

/** Indian 10-point scale (used for SGPA/CGPA in India and Pakistan). */
export const GRADE_POINTS_10: GradeOption[] = [
  { label: "O", points: 10 },
  { label: "A+", points: 9 },
  { label: "A", points: 8 },
  { label: "B+", points: 7 },
  { label: "B", points: 6 },
  { label: "C", points: 5 },
  { label: "P", points: 4 },
  { label: "F", points: 0 },
];

/** Round to 2 decimal places (display rounding, not banker's rounding). */
export function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

/**
 * Credit-weighted average: sum(grade points × credits) / sum(credits).
 * Returns null when there are no credits at all (nothing to average).
 */
export function creditWeightedAverage(
  entries: { points: number; credits: number }[],
): number | null {
  let totalPoints = 0;
  let totalCredits = 0;
  for (const e of entries) {
    totalPoints += e.points * e.credits;
    totalCredits += e.credits;
  }
  if (totalCredits <= 0) return null;
  return round2(totalPoints / totalCredits);
}

/** Total credits across a set of entries. */
export function totalCredits(entries: { credits: number }[]): number {
  return entries.reduce((sum, e) => sum + e.credits, 0);
}

/** Total grade points (points × credits) across a set of entries. */
export function totalGradePoints(entries: { points: number; credits: number }[]): number {
  return round2(entries.reduce((sum, e) => sum + e.points * e.credits, 0));
}

/**
 * CGPA from per-semester results: sum(semester GPA × semester credits) /
 * sum(semester credits). Same weighted-average shape as GPA, but the
 * inputs are whole semesters instead of individual courses.
 */
export function cgpaFromSemesters(
  semesters: { gpa: number; credits: number }[],
): number | null {
  return creditWeightedAverage(
    semesters.map((s) => ({ points: s.gpa, credits: s.credits })),
  );
}

/** Percentage from marks: obtained / total × 100. */
export function percentageFromMarks(obtained: number, total: number): number {
  return round2((obtained / total) * 100);
}

/** "What is X% of Y?" — e.g. 15% of 200 = 30. */
export function percentOfNumber(percent: number, number: number): number {
  return round2((percent / 100) * number);
}

/** "X is what % of Y?" — e.g. 45 is 90% of 50. */
export function whatPercentOf(part: number, whole: number): number {
  return round2((part / whole) * 100);
}

export interface LetterGrade {
  letter: string;
  points: number;
  /** Lowest percentage that still earns this grade. */
  minPercent: number;
}

/** Standard US +/- letter-grade scale. */
export const LETTER_GRADE_TABLE: LetterGrade[] = [
  { letter: "A+", points: 4.0, minPercent: 97 },
  { letter: "A", points: 4.0, minPercent: 93 },
  { letter: "A−", points: 3.7, minPercent: 90 },
  { letter: "B+", points: 3.3, minPercent: 87 },
  { letter: "B", points: 3.0, minPercent: 83 },
  { letter: "B−", points: 2.7, minPercent: 80 },
  { letter: "C+", points: 2.3, minPercent: 77 },
  { letter: "C", points: 2.0, minPercent: 73 },
  { letter: "C−", points: 1.7, minPercent: 70 },
  { letter: "D+", points: 1.3, minPercent: 67 },
  { letter: "D", points: 1.0, minPercent: 63 },
  { letter: "D−", points: 0.7, minPercent: 60 },
  { letter: "F", points: 0, minPercent: 0 },
];

/** Letter grade (and its grade points) for a percentage, 0–100. */
export function letterGradeFor(percent: number): LetterGrade {
  for (const row of LETTER_GRADE_TABLE) {
    if (percent >= row.minPercent) return row;
  }
  return LETTER_GRADE_TABLE[LETTER_GRADE_TABLE.length - 1];
}

/**
 * CGPA (10-point scale) to percentage. factor 9.5 is the widely used
 * Indian-university convention (e.g. CBSE); factor 10 is the direct
 * scale conversion. Universities differ — the tool lets the user pick.
 */
export function cgpaToPercentage(cgpa: number, factor: 9.5 | 10): number {
  return round2(cgpa * factor);
}

/**
 * Percentage to GPA. 4.0 scale: percentage / 100 × 4. 10-point scale:
 * percentage / 10. This is an approximation — schools convert differently,
 * so the tool says so on the page.
 */
export function percentageToGpa(percent: number, scale: 4 | 10): number {
  return scale === 4 ? round2((percent / 100) * 4) : round2(percent / 10);
}

/** GPA to percentage: the reverse of percentageToGpa. */
export function gpaToPercentage(gpa: number, scale: 4 | 10): number {
  return scale === 4 ? round2((gpa / 4) * 100) : round2(gpa * 10);
}

export interface FinalGradeResult {
  /** Score needed on the final exam, in percent. May exceed 100. */
  required: number;
  /** "possible" | "already" (desired grade already secured) | "impossible" (>100% needed). */
  status: "possible" | "already" | "impossible";
}

/**
 * Score needed on the final exam to reach a desired overall grade.
 * current = grade so far (%), desired = target overall grade (%),
 * finalWeightPercent = how much of the final grade the exam is worth.
 * Formula: required = (desired − current × (1 − w)) / w, with w as a fraction.
 */
export function requiredFinalScore(
  current: number,
  desired: number,
  finalWeightPercent: number,
): FinalGradeResult {
  const w = finalWeightPercent / 100;
  const required = round2((desired - current * (1 - w)) / w);
  const status = required <= 0 ? "already" : required > 100 ? "impossible" : "possible";
  return { required, status };
}

/**
 * Weighted grade from categories: sum(score × weight) / sum(weights).
 * The tool requires the weights to add up to 100 and rejects anything else
 * with a clear error, so this function can assume a 100 total.
 */
export function weightedGrade(items: { score: number; weight: number }[]): number {
  const totalWeight = items.reduce((sum, i) => sum + i.weight, 0);
  const weightedSum = items.reduce((sum, i) => sum + i.score * i.weight, 0);
  return round2(weightedSum / totalWeight);
}

/** Plain-language reading of a 4.0-scale GPA, for the result panel. */
export function gpaStanding(gpa: number): string {
  if (gpa >= 3.7) return "Excellent — roughly the top of the class.";
  if (gpa >= 3.3) return "Very good — comfortably above average.";
  if (gpa >= 3.0) return "Good — a solid B average.";
  if (gpa >= 2.5) return "Above average, with room to improve.";
  if (gpa >= 2.0) return "Average — a C average.";
  return "Below average — worth talking to a tutor or adviser.";
}

/** Plain-language reading of a 10-point-scale SGPA/CGPA. */
export function sgpaStanding(sgpa: number): string {
  if (sgpa >= 9) return "Outstanding.";
  if (sgpa >= 8) return "Excellent.";
  if (sgpa >= 7) return "Very good.";
  if (sgpa >= 6) return "Good.";
  if (sgpa >= 5) return "Average.";
  return "Below average — worth talking to a tutor or adviser.";
}
