import type { Exercise, Session, Side, WorkoutSet } from "./schemas";

// Pure progress maths: what each session scores on a measure, the series a
// chart draws, which sessions set a record, and the personal best a list
// row shows. No React, no i18n — views format the numbers.

export type Measure =
  | "topWeight"
  | "estimatedMax"
  | "volume"
  | "bestReps"
  | "totalReps"
  | "longest"
  | "totalTime";

/** One line on a chart: every set, or one side's. */
export type SeriesKey = "value" | Side;

export type ProgressPoint = {
  /** 1-based, oldest first. */
  session: number;
  date?: string;
  values: Partial<Record<SeriesKey, number>>;
  records: Partial<Record<SeriesKey, true>>;
};

export type Progress = {
  keys: SeriesKey[];
  points: ProgressPoint[];
};

export type PersonalBest =
  | { kind: "weight"; weight: number; reps: number }
  | { kind: "reps"; reps: number }
  | { kind: "time"; seconds: number };

/** Measures a chart can switch between; the first is the default. */
export function measuresFor(exercise: Exercise): Measure[] {
  if (exercise.metric === "time") return ["longest", "totalTime"];
  if (exercise.metric === "reps") return ["bestReps", "totalReps"];
  if (exercise.assisted) return ["topWeight", "totalReps"];
  return ["topWeight", "estimatedMax", "volume"];
}

/** Whether a smaller value is the better one (an assisted exercise's
 * counterweight). */
export function lowerIsBetter(exercise: Exercise, measure: Measure): boolean {
  return exercise.assisted === true && measure === "topWeight";
}

/** Epley's one-rep max estimate, rounded to 0.1 kg. */
export function estimateOneRepMax(weight: number, reps: number): number {
  const estimate = reps <= 1 ? weight : weight * (1 + reps / 30);
  return Math.round(estimate * 10) / 10;
}

function weightOf(set: WorkoutSet): number {
  return set.weight ?? 0;
}

function liftedSets(sets: WorkoutSet[]): (WorkoutSet & { reps: number })[] {
  return sets.filter(
    (set): set is WorkoutSet & { reps: number } => set.reps !== undefined,
  );
}

function timedSets(sets: WorkoutSet[]): number[] {
  return sets.flatMap((set) =>
    set.seconds === undefined ? [] : [set.seconds],
  );
}

const sum = (values: number[]) => values.reduce((total, n) => total + n, 0);

/** A session's score on `measure`, or `undefined` when it has no such set. */
export function scoreSets(
  sets: WorkoutSet[],
  measure: Measure,
  lowerBetter = false,
): number | undefined {
  const lifted = liftedSets(sets);
  const timed = timedSets(sets);
  const pick = (values: number[]) =>
    values.length === 0
      ? undefined
      : lowerBetter
        ? Math.min(...values)
        : Math.max(...values);
  switch (measure) {
    case "topWeight":
      return pick(lifted.map(weightOf));
    case "estimatedMax":
      return pick(
        lifted.map((set) => estimateOneRepMax(weightOf(set), set.reps)),
      );
    case "volume":
      return lifted.length === 0
        ? undefined
        : Math.round(sum(lifted.map((set) => weightOf(set) * set.reps)) * 10) /
            10;
    case "bestReps":
      return pick(lifted.map((set) => set.reps));
    case "totalReps":
      return lifted.length === 0 ? undefined : sum(lifted.map((s) => s.reps));
    case "longest":
      return pick(timed);
    case "totalTime":
      return timed.length === 0 ? undefined : sum(timed);
  }
}

/** The sides an exercise logs separately, or `["value"]` for one line. */
export function seriesKeys(exercise: Exercise): SeriesKey[] {
  const sides = new Set(
    exercise.sessions.flatMap((session) =>
      session.sets.flatMap((set) => (set.side ? [set.side] : [])),
    ),
  );
  return sides.size === 0
    ? ["value"]
    : (["right", "left"] as const).filter((side) => sides.has(side));
}

function setsFor(session: Session, key: SeriesKey): WorkoutSet[] {
  return key === "value"
    ? session.sets
    : session.sets.filter((set) => set.side === key);
}

/**
 * Every session's score per series, oldest first. A record is a score
 * strictly better than every earlier one in its series — the first session
 * only sets the baseline.
 */
export function buildProgress(exercise: Exercise, measure: Measure): Progress {
  const keys = seriesKeys(exercise);
  const lowerBetter = lowerIsBetter(exercise, measure);
  const best: Partial<Record<SeriesKey, number>> = {};
  const points = exercise.sessions.map((session, index) => {
    const point: ProgressPoint = {
      session: index + 1,
      date: session.date,
      values: {},
      records: {},
    };
    for (const key of keys) {
      const value = scoreSets(setsFor(session, key), measure, lowerBetter);
      if (value === undefined) continue;
      point.values[key] = value;
      const previous = best[key];
      const improved =
        previous === undefined ||
        (lowerBetter ? value < previous : value > previous);
      if (previous !== undefined && improved) point.records[key] = true;
      if (improved) best[key] = value;
    }
    return point;
  });
  return { keys, points };
}

/** How many sessions set a record on `measure`, across every series. */
export function countRecords(progress: Progress): number {
  return progress.points.filter(
    (point) => Object.keys(point.records).length > 0,
  ).length;
}

/**
 * The exercise's best ever set: the heaviest weight (lightest assistance)
 * with the most reps done at it, the most reps, or the longest hold.
 */
export function personalBest(exercise: Exercise): PersonalBest | undefined {
  const sets = exercise.sessions.flatMap((session) => session.sets);
  if (exercise.metric === "time") {
    const longest = scoreSets(sets, "longest");
    return longest === undefined
      ? undefined
      : { kind: "time", seconds: longest };
  }
  if (exercise.metric === "reps") {
    const reps = scoreSets(sets, "bestReps");
    return reps === undefined ? undefined : { kind: "reps", reps };
  }
  const weight = scoreSets(sets, "topWeight", exercise.assisted === true);
  if (weight === undefined) return undefined;
  const reps = Math.max(
    ...liftedSets(sets)
      .filter((set) => weightOf(set) === weight)
      .map((set) => set.reps),
  );
  return { kind: "weight", weight, reps };
}

/** Consecutive sets at the same weight and side, for display: 50 × 6, 5, 5. */
export type SetGroup = {
  side?: Side;
  weight?: number;
  reps: number[];
  seconds: number[];
};

export function groupSets(sets: WorkoutSet[]): SetGroup[] {
  const groups: SetGroup[] = [];
  for (const set of sets) {
    const last = groups.at(-1);
    const sameGroup =
      last !== undefined &&
      last.side === set.side &&
      last.weight === set.weight &&
      (set.reps === undefined) === (last.reps.length === 0);
    const group = sameGroup
      ? last
      : { side: set.side, weight: set.weight, reps: [], seconds: [] };
    if (!sameGroup) groups.push(group);
    if (set.reps !== undefined) group.reps.push(set.reps);
    if (set.seconds !== undefined) group.seconds.push(set.seconds);
  }
  return groups;
}
