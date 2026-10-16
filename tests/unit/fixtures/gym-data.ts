import type { Exercise } from "@/lib/schemas";

// Made-up training data — never the owner's real numbers (they live in a
// private repo).

export const squat: Exercise = {
  id: "squat",
  name: "Squat",
  metric: "weight",
  sessions: [
    {
      sets: [
        { weight: 40, reps: 10 },
        { weight: 40, reps: 8 },
      ],
    },
    { sets: [{ weight: 50, reps: 5 }] },
    { sets: [{ weight: 45, reps: 12 }] },
    {
      sets: [
        { weight: 50, reps: 8 },
        { weight: 55, reps: 3 },
      ],
    },
  ],
};

export const assisted: Exercise = {
  id: "assisted",
  name: "Assisted dip",
  metric: "weight",
  assisted: true,
  sessions: [
    { sets: [{ weight: 30, reps: 6 }] },
    {
      sets: [
        { weight: 25, reps: 5 },
        { weight: 30, reps: 8 },
      ],
    },
    { sets: [{ weight: 27, reps: 6 }] },
  ],
};

export const hold: Exercise = {
  id: "hold",
  name: "Hold",
  metric: "time",
  sessions: [
    {
      sets: [
        { seconds: 20, side: "right" },
        { seconds: 25, side: "left" },
      ],
    },
    {
      sets: [
        { seconds: 30, side: "right" },
        { seconds: 22, side: "left" },
      ],
    },
  ],
};

export const crunch: Exercise = {
  id: "crunch",
  name: "Crunch",
  metric: "reps",
  sessions: [
    {
      sets: [
        { weight: 0, reps: 10 },
        { weight: 0, reps: 12 },
      ],
    },
    { sets: [{ weight: 0, reps: 15 }] },
  ],
};

/** The file format, as the private repo would hold it. */
export const rawData = {
  version: 1,
  plans: [
    { id: "a", name: "Plan A", exercises: ["squat", "assisted"] },
    { id: "b", name: "Plan B", exercises: ["hold", "crunch"] },
  ],
  exercises: [squat, assisted, hold, crunch],
};
