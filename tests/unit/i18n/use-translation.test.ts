import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import en from "@/i18n/en.json";
import pl from "@/i18n/pl.json";

// The locale store is a module-level singleton; a fresh module per test
// keeps one test's setLocale() from leaking into the next.
async function freshUseTranslation() {
  vi.resetModules();
  return import("@/i18n/use-translation");
}

describe("useTranslation", () => {
  it("translates from the current locale's catalog", async () => {
    const { useTranslation } = await freshUseTranslation();
    const { result } = renderHook(() => useTranslation());

    expect(result.current.locale).toBe("en");
    expect(result.current.t("refresh")).toBe("Refresh");
  });

  it("re-renders after setLocale", async () => {
    const { useTranslation } = await freshUseTranslation();
    const { result } = renderHook(() => useTranslation());

    act(() => result.current.setLocale("pl"));

    expect(result.current.t("refresh")).toBe("Odśwież");
  });

  it("fills placeholders", async () => {
    const { useTranslation } = await freshUseTranslation();
    const { result } = renderHook(() => useTranslation());

    expect(result.current.t("sessionNumber", { number: 3 })).toBe("Session 3");
  });
});

describe("catalogs", () => {
  it("have the same keys", () => {
    expect(Object.keys(pl).sort()).toEqual(Object.keys(en).sort());
  });
});
