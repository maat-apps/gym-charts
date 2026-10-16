import { describe, expect, it } from "vitest";

import { parseGymData } from "@/lib/schemas";

import { rawData } from "../fixtures/gym-data";

describe("parseGymData", () => {
  it("reads a valid file", () => {
    const data = parseGymData(rawData);
    expect(data?.plans.map((plan) => plan.id)).toEqual(["a", "b"]);
    expect(data?.exercises).toHaveLength(4);
  });

  it("rejects anything that isn't version 1", () => {
    expect(parseGymData({ ...rawData, version: 2 })).toBeNull();
    expect(parseGymData(null)).toBeNull();
    expect(parseGymData([])).toBeNull();
  });

  it("drops a malformed exercise and its plan reference", () => {
    const data = parseGymData({
      ...rawData,
      exercises: [...rawData.exercises.slice(1), { id: "squat" }],
    });
    expect(data?.exercises.map((exercise) => exercise.id)).not.toContain(
      "squat",
    );
    expect(data?.plans[0]?.exercises).toEqual(["assisted"]);
  });

  it("drops sets without reps or seconds and negative numbers", () => {
    const data = parseGymData({
      version: 1,
      plans: [],
      exercises: [
        {
          id: "x",
          name: "X",
          metric: "weight",
          sessions: [
            {
              sets: [
                { weight: 10 },
                { weight: -5, reps: 3 },
                { weight: 10, reps: 5, side: "middle" },
              ],
            },
          ],
        },
      ],
    });
    expect(data?.exercises[0]?.sessions[0]?.sets).toEqual([
      { weight: 10, reps: 5 },
    ]);
  });

  it("keeps a valid date and drops a malformed one", () => {
    const data = parseGymData({
      version: 1,
      plans: [],
      exercises: [
        {
          id: "x",
          name: "X",
          metric: "reps",
          sessions: [
            { date: "2026-10-01", sets: [{ reps: 5 }] },
            { date: "yesterday", sets: [{ reps: 6 }] },
          ],
        },
      ],
    });
    const sessions = data?.exercises[0]?.sessions;
    expect(sessions?.[0]?.date).toBe("2026-10-01");
    expect(sessions?.[1]?.date).toBeUndefined();
  });

  it("treats non-array lists as empty", () => {
    const data = parseGymData({ version: 1, plans: "x", exercises: {} });
    expect(data).toEqual({ plans: [], exercises: [] });
  });
});
