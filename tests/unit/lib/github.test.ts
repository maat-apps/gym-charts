import { describe, expect, it, vi } from "vitest";

import { fetchGymData, isValidRepo } from "@/lib/github";

import { rawData } from "../fixtures/gym-data";

const source = {
  repo: "someone/gym",
  path: "data/gym data.json",
  token: "t0k",
};

function respond(status: number, body: unknown, headers = {}) {
  return vi
    .fn()
    .mockResolvedValue(new Response(JSON.stringify(body), { status, headers }));
}

describe("isValidRepo", () => {
  it("accepts owner/repo only", () => {
    expect(isValidRepo("someone/gym-data")).toBe(true);
    expect(isValidRepo("gym-data")).toBe(false);
    expect(isValidRepo("a/b/c")).toBe(false);
    expect(isValidRepo("a/b?x")).toBe(false);
  });
});

describe("fetchGymData", () => {
  it("asks GitHub's contents API for the raw file with the token", async () => {
    const fetchImpl = respond(200, rawData);

    const result = await fetchGymData(source, fetchImpl);

    expect(result.ok).toBe(true);
    const [url, init] = fetchImpl.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(
      "https://api.github.com/repos/someone/gym/contents/data/gym%20data.json",
    );
    expect(init.headers).toMatchObject({
      Accept: "application/vnd.github.raw+json",
      Authorization: "Bearer t0k",
    });
  });

  it("maps HTTP failures to errors", async () => {
    const cases: [number, Record<string, string>, string][] = [
      [401, {}, "unauthorized"],
      [403, {}, "unauthorized"],
      [403, { "x-ratelimit-remaining": "0" }, "rateLimited"],
      [429, {}, "rateLimited"],
      [404, {}, "notFound"],
      [500, {}, "server"],
    ];
    for (const [status, headers, error] of cases) {
      expect(await fetchGymData(source, respond(status, {}, headers))).toEqual({
        ok: false,
        error,
      });
    }
  });

  it("reports a network failure", async () => {
    const fetchImpl = vi.fn().mockRejectedValue(new TypeError("offline"));
    expect(await fetchGymData(source, fetchImpl)).toEqual({
      ok: false,
      error: "network",
    });
  });

  it("reports a file that isn't valid data", async () => {
    expect(await fetchGymData(source, respond(200, { version: 9 }))).toEqual({
      ok: false,
      error: "invalid",
    });
    const notJson = vi.fn().mockResolvedValue(new Response("not json"));
    expect(await fetchGymData(source, notJson)).toEqual({
      ok: false,
      error: "invalid",
    });
  });

  it("uses the global fetch by default", async () => {
    const fetchImpl = respond(200, rawData);
    vi.stubGlobal("fetch", fetchImpl);
    expect((await fetchGymData(source)).ok).toBe(true);
    vi.unstubAllGlobals();
  });
});
