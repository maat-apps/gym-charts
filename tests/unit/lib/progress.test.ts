import { describe, expect, it } from "vitest";

import {
  buildProgress,
  countRecords,
  estimateOneRepMax,
  groupSets,
  lowerIsBetter,
  measuresFor,
  personalBest,
  scoreSets,
  seriesKeys,
} from "@/lib/progress";
import type { Exercise } from "@/lib/schemas";

import { assisted, crunch, hold, squat } from "../fixtures/gym-data";

describe("measuresFor", () => {
  it("offers weight measures for a lift", () => {
    expect(measuresFor(squat)).toEqual(["topWeight", "estimatedMax", "volume"]);
  });

  it("offers assistance and reps for an assisted lift", () => {
    expect(measuresFor(assisted)).toEqual(["topWeight", "totalReps"]);
  });

  it("offers reps measures and time measures", () => {
    expect(measuresFor(crunch)).toEqual(["bestReps", "totalReps"]);
    expect(measuresFor(hold)).toEqual(["longest", "totalTime"]);
  });
});

describe("lowerIsBetter", () => {
  it("is true only for an assisted exercise's weight", () => {
    expect(lowerIsBetter(assisted, "topWeight")).toBe(true);
    expect(lowerIsBetter(assisted, "totalReps")).toBe(false);
    expect(lowerIsBetter(squat, "topWeight")).toBe(false);
  });
});

describe("estimateOneRepMax", () => {
  it("uses Epley's formula, rounded to 0.1", () => {
    expect(estimateOneRepMax(100, 5)).toBe(116.7);
  });

  it("is the weight itself for a single", () => {
    expect(estimateOneRepMax(100, 1)).toBe(100);
  });
});

describe("scoreSets", () => {
  const sets = [
    { weight: 40, reps: 10 },
    { weight: 50, reps: 5 },
  ];

  it("scores each measure", () => {
    expect(scoreSets(sets, "topWeight")).toBe(50);
    expect(scoreSets(sets, "topWeight", true)).toBe(40);
    expect(scoreSets(sets, "estimatedMax")).toBe(58.3);
    expect(scoreSets(sets, "volume")).toBe(650);
    expect(scoreSets(sets, "bestReps")).toBe(10);
    expect(scoreSets(sets, "totalReps")).toBe(15);
    expect(scoreSets([{ seconds: 20 }, { seconds: 30 }], "longest")).toBe(30);
    expect(scoreSets([{ seconds: 20 }, { seconds: 30 }], "totalTime")).toBe(50);
  });

  it("counts a set without weight as bodyweight", () => {
    expect(scoreSets([{ reps: 8 }], "topWeight")).toBe(0);
  });

  it("is undefined without a matching set", () => {
    for (const measure of [
      "topWeight",
      "estimatedMax",
      "volume",
      "bestReps",
      "totalReps",
    ] as const) {
      expect(scoreSets([{ seconds: 10 }], measure)).toBeUndefined();
    }
    expect(scoreSets([{ reps: 3 }], "longest")).toBeUndefined();
    expect(scoreSets([{ reps: 3 }], "totalTime")).toBeUndefined();
  });
});

describe("seriesKeys", () => {
  it("is one line without sides, one per side otherwise", () => {
    expect(seriesKeys(squat)).toEqual(["value"]);
    expect(seriesKeys(hold)).toEqual(["right", "left"]);
  });
});

describe("buildProgress", () => {
  it("scores sessions oldest first and marks only improvements as records", () => {
    const { keys, points } = buildProgress(squat, "topWeight");
    expect(keys).toEqual(["value"]);
    expect(points.map((point) => point.values.value)).toEqual([40, 50, 45, 55]);
    expect(points.map((point) => point.records.value ?? false)).toEqual([
      false,
      true,
      false,
      true,
    ]);
  });

  it("treats a tie as no record", () => {
    const tie: Exercise = {
      ...squat,
      sessions: [squat.sessions[1]!, squat.sessions[1]!],
    };
    expect(buildProgress(tie, "topWeight").points[1]?.records).toEqual({});
  });

  it("counts less assistance as a record", () => {
    const { points } = buildProgress(assisted, "topWeight");
    expect(points.map((point) => point.values.value)).toEqual([30, 25, 27]);
    expect(points.map((point) => point.records.value ?? false)).toEqual([
      false,
      true,
      false,
    ]);
  });

  it("keeps a series per side", () => {
    const { points } = buildProgress(hold, "longest");
    expect(points[1]?.values).toEqual({ right: 30, left: 22 });
    expect(points[1]?.records).toEqual({ right: true });
  });

  it("skips a session with nothing to score", () => {
    const timedOnly: Exercise = {
      ...squat,
      sessions: [{ sets: [{ seconds: 5 }] }, ...squat.sessions],
    };
    const { points } = buildProgress(timedOnly, "topWeight");
    expect(points[0]?.values).toEqual({});
    expect(points[2]?.records).toEqual({ value: true });
  });

  it("carries the session date", () => {
    const dated: Exercise = {
      ...crunch,
      sessions: [{ date: "2026-10-01", sets: [{ reps: 1 }] }],
    };
    expect(buildProgress(dated, "bestReps").points[0]?.date).toBe("2026-10-01");
  });
});

describe("countRecords", () => {
  it("counts sessions with a record in any series", () => {
    expect(countRecords(buildProgress(squat, "topWeight"))).toBe(2);
    expect(countRecords(buildProgress(hold, "longest"))).toBe(1);
  });
});

describe("personalBest", () => {
  it("is the heaviest weight with the most reps at it", () => {
    const best = personalBest({
      ...squat,
      sessions: [...squat.sessions, { sets: [{ weight: 55, reps: 5 }] }],
    });
    expect(best).toEqual({ kind: "weight", weight: 55, reps: 5 });
  });

  it("is the lightest assistance for an assisted lift", () => {
    expect(personalBest(assisted)).toEqual({
      kind: "weight",
      weight: 25,
      reps: 5,
    });
  });

  it("is the most reps or the longest hold", () => {
    expect(personalBest(crunch)).toEqual({ kind: "reps", reps: 15 });
    expect(personalBest(hold)).toEqual({ kind: "time", seconds: 30 });
  });

  it("is undefined without sessions", () => {
    expect(personalBest({ ...squat, sessions: [] })).toBeUndefined();
    expect(personalBest({ ...crunch, sessions: [] })).toBeUndefined();
    expect(personalBest({ ...hold, sessions: [] })).toBeUndefined();
  });
});

describe("groupSets", () => {
  it("groups consecutive sets of the same weight", () => {
    expect(
      groupSets([
        { weight: 40, reps: 10 },
        { weight: 50, reps: 6 },
        { weight: 50, reps: 5 },
      ]),
    ).toEqual([
      { side: undefined, weight: 40, reps: [10], seconds: [] },
      { side: undefined, weight: 50, reps: [6, 5], seconds: [] },
    ]);
  });

  it("groups timed sets per side", () => {
    expect(groupSets(hold.sessions[0]!.sets)).toEqual([
      { side: "right", weight: undefined, reps: [], seconds: [20] },
      { side: "left", weight: undefined, reps: [], seconds: [25] },
    ]);
  });

  it("keeps timed and rep sets apart", () => {
    expect(groupSets([{ seconds: 20 }, { reps: 5 }])).toHaveLength(2);
  });
});
