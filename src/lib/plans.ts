import type { GymData, Plan } from "./schemas";

/** The "Other" tab's id — not a valid id in the data file's own plans. */
export const OTHER_PLAN_ID = "@other";

/**
 * Home's tabs: the file's plans, then "Other" with every exercise no plan
 * lists — left out when there's none.
 */
export function planTabs(data: GymData, otherName: string): Plan[] {
  const planned = new Set(data.plans.flatMap((plan) => plan.exercises));
  const others = data.exercises
    .filter((exercise) => !planned.has(exercise.id))
    .map((exercise) => exercise.id);
  return others.length === 0
    ? data.plans
    : [
        ...data.plans,
        { id: OTHER_PLAN_ID, name: otherName, exercises: others },
      ];
}
