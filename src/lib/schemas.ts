import { isRecord, parseEach } from "@maat-apps/core/validation";
import * as v from "valibot";

// The data file's format (the private data repo's gym-data.json, version 1)
// and the app's types. Parsed entry by entry, so one malformed set, session
// or exercise is dropped without taking the rest down with it.

export const DATA_VERSION = 1;

export const METRICS = ["weight", "reps", "time"] as const;
export const SIDES = ["right", "left"] as const;

const PositiveNumber = v.pipe(v.number(), v.minValue(0), v.finite());

const SetSchema = v.pipe(
  v.object({
    weight: v.optional(PositiveNumber),
    reps: v.optional(PositiveNumber),
    seconds: v.optional(PositiveNumber),
    side: v.fallback(v.optional(v.picklist(SIDES)), undefined),
  }),
  v.check(
    (set) => set.reps !== undefined || set.seconds !== undefined,
    "A set needs reps or seconds",
  ),
);

const SessionSchema = v.object({
  date: v.fallback(v.optional(v.pipe(v.string(), v.isoDate())), undefined),
  sets: v.pipe(
    v.unknown(),
    v.transform((sets) => parseEach(SetSchema, sets)),
  ),
});

const ExerciseSchema = v.object({
  id: v.pipe(v.string(), v.nonEmpty()),
  name: v.pipe(v.string(), v.nonEmpty()),
  metric: v.picklist(METRICS),
  description: v.fallback(v.optional(v.string()), undefined),
  inactive: v.fallback(v.optional(v.boolean()), undefined),
  assisted: v.fallback(v.optional(v.boolean()), undefined),
  sessions: v.pipe(
    v.unknown(),
    v.transform((sessions) => parseEach(SessionSchema, sessions)),
  ),
});

const PlanSchema = v.object({
  id: v.pipe(v.string(), v.nonEmpty()),
  name: v.pipe(v.string(), v.nonEmpty()),
  exercises: v.pipe(
    v.unknown(),
    v.transform((ids) => parseEach(v.string(), ids)),
  ),
});

export type WorkoutSet = v.InferOutput<typeof SetSchema>;
export type Session = v.InferOutput<typeof SessionSchema>;
export type Exercise = v.InferOutput<typeof ExerciseSchema>;
export type Plan = v.InferOutput<typeof PlanSchema>;
export type Metric = Exercise["metric"];
export type Side = (typeof SIDES)[number];

export type GymData = {
  plans: Plan[];
  exercises: Exercise[];
};

/**
 * The data file's contents, or `null` when it isn't this format's version.
 * A plan only keeps exercise ids that exist.
 */
export function parseGymData(value: unknown): GymData | null {
  if (!isRecord(value) || value.version !== DATA_VERSION) return null;
  const exercises = parseEach(ExerciseSchema, value.exercises);
  const ids = new Set(exercises.map((exercise) => exercise.id));
  const plans = parseEach(PlanSchema, value.plans).map((plan) => ({
    ...plan,
    exercises: plan.exercises.filter((id) => ids.has(id)),
  }));
  return { plans, exercises };
}
