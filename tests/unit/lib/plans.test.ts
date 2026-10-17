import { describe, expect, it } from "vitest";

import { OTHER_PLAN_ID, planTabs } from "@/lib/plans";
import { parseGymData } from "@/lib/schemas";

import { rawData } from "../fixtures/gym-data";

const data = parseGymData(rawData)!;

describe("planTabs", () => {
  it("is just the plans when each exercise is in one", () => {
    expect(planTabs(data, "Other")).toEqual(data.plans);
  });

  it("adds Other with the exercises no plan lists", () => {
    const tabs = planTabs(
      { ...data, plans: [{ id: "a", name: "Plan A", exercises: ["squat"] }] },
      "Other",
    );
    expect(tabs.map((tab) => tab.name)).toEqual(["Plan A", "Other"]);
    expect(tabs[1]).toEqual({
      id: OTHER_PLAN_ID,
      name: "Other",
      exercises: ["assisted", "hold", "crunch"],
    });
  });

  it("is only Other without plans", () => {
    expect(
      planTabs({ ...data, plans: [] }, "Other").map((tab) => tab.id),
    ).toEqual([OTHER_PLAN_ID]);
  });
});
