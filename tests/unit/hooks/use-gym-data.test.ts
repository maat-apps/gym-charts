import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { rawData } from "../fixtures/gym-data";
import { resetIndexedDb } from "../reset-indexeddb";

async function freshModules() {
  vi.resetModules();
  const hooks = await import("@/hooks/use-gym-data");
  const storage = await import("@/lib/storage");
  await storage.whenLoaded();
  return { ...hooks, storage };
}

beforeEach(async () => {
  await resetIndexedDb();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("useGymData / useExercise / useGymReady", () => {
  it("follows the store", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response(JSON.stringify(rawData))),
    );
    const { useGymData, useExercise, useGymReady, storage } =
      await freshModules();
    const { result } = renderHook(() => ({
      data: useGymData(),
      squat: useExercise("squat"),
      ready: useGymReady(),
    }));
    expect(result.current.ready).toBe(true);
    expect(result.current.squat).toBeUndefined();

    await act(() =>
      storage.connect({ repo: "a/b", path: "gym-data.json", token: "t" }),
    );

    await waitFor(() => expect(result.current.squat?.name).toBe("Squat"));
    expect(result.current.data.source?.repo).toBe("a/b");
  });
});
