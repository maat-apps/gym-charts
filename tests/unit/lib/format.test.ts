import { describe, expect, it } from "vitest";

import {
  formatDate,
  formatDateTime,
  formatList,
  formatNumber,
  formatPersonalBest,
  unitOf,
} from "@/lib/format";

describe("formatNumber", () => {
  it("uses the locale's decimal separator, one decimal at most", () => {
    expect(formatNumber(57.5, "pl")).toBe("57,5");
    expect(formatNumber(57.5, "en")).toBe("57.5");
    expect(formatNumber(41.33, "en")).toBe("41.3");
  });
});

describe("unitOf", () => {
  it("maps each measure to its unit", () => {
    expect(unitOf("topWeight")).toBe("kg");
    expect(unitOf("estimatedMax")).toBe("kg");
    expect(unitOf("volume")).toBe("kg");
    expect(unitOf("bestReps")).toBe("reps");
    expect(unitOf("totalReps")).toBe("reps");
    expect(unitOf("longest")).toBe("s");
    expect(unitOf("totalTime")).toBe("s");
  });
});

describe("formatPersonalBest", () => {
  it("formats each kind", () => {
    expect(
      formatPersonalBest({ kind: "weight", weight: 57.5, reps: 3 }, "pl"),
    ).toBe("57,5 kg × 3");
    expect(formatPersonalBest({ kind: "reps", reps: 20 }, "en")).toBe("20");
    expect(formatPersonalBest({ kind: "time", seconds: 61 }, "en")).toBe(
      "61 s",
    );
  });
});

describe("formatList", () => {
  it("joins with commas", () => {
    expect(formatList([6, 5.5], "en")).toBe("6, 5.5");
  });
});

describe("formatDate / formatDateTime", () => {
  it("formats in the locale", () => {
    expect(formatDate("2026-10-16", "en")).toBe("Oct 16, 2026");
    expect(formatDateTime("2026-10-16T12:00:00Z", "en")).toMatch(/2026/);
  });
});
