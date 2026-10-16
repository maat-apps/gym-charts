import type { Exercise, Session, Side, WorkoutSet } from "./schemas";

// Pure progress maths: what each session scores on a measure, the series a
// chart draws, which sessions set a record, and the personal best a list
// row shows. No React, no i18n — views format the numbers.

export type Measure =
  | "topWeight"
  | "repsAtTop"
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
  | { kind: "weight"; weight: number; reps: number[] }
  | { kind: "reps"; reps: number }
  | { kind: "time"; seconds: number };

/** Measures a chart can switch between; the first is the default. */
export function measuresFor(exercise: Exercise): Measure[] {
  if (exercise.metric === "time") return ["longest", "totalTime"];
  if (exercise.metric === "reps") return ["bestReps", "totalReps"];
  if (exercise.assisted) return ["topWeight", "repsAtTop", "totalReps"];
  return ["topWeight", "repsAtTop", "estimatedMax", "volume"];
}

/** Whether a smaller value is the better one (an assisted exercise's
 * counterweight), which flips the chart's axis. */
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

/** The heaviest weight in `sets` (lightest when `assisted`) and every
 * set's reps at it, or `undefined` without a set with reps. */
export function topSets(
  sets: WorkoutSet[],
  assisted = false,
): { weight: number; reps: number[] } | undefined {
  const lifted = liftedSets(sets);
  if (lifted.length === 0) return undefined;
  const weights = lifted.map(weightOf);
  const weight = assisted ? Math.min(...weights) : Math.max(...weights);
  return {
    weight,
    reps: lifted.filter((set) => weightOf(set) === weight).map((s) => s.reps),
  };
}

/**
 * Whether session `a` beats session `b` on weight: a better top weight, or
 * the same one with more reps done at it in total.
 */
function beatsOnWeight(
  a: { weight: number; reps: number[] },
  b: { weight: number; reps: number[] },
  assisted: boolean,
): boolean {
  if (a.weight !== b.weight) {
    return assisted ? a.weight < b.weight : a.weight > b.weight;
  }
  return sum(a.reps) > sum(b.reps);
}

/** A session's score on `measure`, or `undefined` when it has no such set.
 * `assisted` makes the lightest weight the top one. */
export function scoreSets(
  sets: WorkoutSet[],
  measure: Measure,
  assisted = false,
): number | undefined {
  const lifted = liftedSets(sets);
  const timed = timedSets(sets);
  const max = (values: number[]) =>
    values.length === 0 ? undefined : Math.max(...values);
  switch (measure) {
    case "topWeight":
      return topSets(sets, assisted)?.weight;
    case "repsAtTop": {
      const top = topSets(sets, assisted);
      return top && sum(top.reps);
    }
    case "estimatedMax":
      return max(
        lifted.map((set) => estimateOneRepMax(weightOf(set), set.reps)),
      );
    case "volume":
      return lifted.length === 0
        ? undefined
        : Math.round(sum(lifted.map((set) => weightOf(set) * set.reps)) * 10) /
            10;
    case "bestReps":
      return max(lifted.map((set) => set.reps));
    case "totalReps":
      return lifted.length === 0 ? undefined : sum(lifted.map((s) => s.reps));
    case "longest":
      return max(timed);
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

/** Whether each session (per series) set a record: for a weight exercise
 * by `beatsOnWeight`, otherwise by a strictly better score on `measure`.
 * The first scored session only sets the baseline. */
function findRecords(
  exercise: Exercise,
  key: SeriesKey,
  measure: Measure,
): boolean[] {
  const assisted = exercise.assisted === true;
  if (exercise.metric === "weight") {
    let best: { weight: number; reps: number[] } | undefined;
    return exercise.sessions.map((session) => {
      const top = topSets(setsFor(session, key), assisted);
      if (!top) return false;
      const record = best !== undefined && beatsOnWeight(top, best, assisted);
      if (best === undefined || record) best = top;
      return record;
    });
  }
  let best: number | undefined;
  return exercise.sessions.map((session) => {
    const value = scoreSets(setsFor(session, key), measure);
    if (value === undefined) return false;
    const record = best !== undefined && value > best;
    if (best === undefined || record) best = value;
    return record;
  });
}

/** Every session's score per series, oldest first, with its records. */
export function buildProgress(exercise: Exercise, measure: Measure): Progress {
  const keys = seriesKeys(exercise);
  const assisted = exercise.assisted === true;
  const records = new Map(
    keys.map((key) => [key, findRecords(exercise, key, measure)]),
  );
  const points = exercise.sessions.map((session, index) => {
    const point: ProgressPoint = {
      session: index + 1,
      date: session.date,
      values: {},
      records: {},
    };
    for (const key of keys) {
      const value = scoreSets(setsFor(session, key), measure, assisted);
      if (value === undefined) continue;
      point.values[key] = value;
      if (records.get(key)?.[index]) point.records[key] = true;
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
 * The exercise's best: for weights, the best session by `beatsOnWeight` —
 * its top weight and the reps done at it; otherwise the most reps in a set
 * or the longest hold.
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
  const assisted = exercise.assisted === true;
  let best: { weight: number; reps: number[] } | undefined;
  for (const session of exercise.sessions) {
    const top = topSets(session.sets, assisted);
    if (top && (!best || beatsOnWeight(top, best, assisted))) best = top;
  }
  return best && { kind: "weight", ...best };
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
