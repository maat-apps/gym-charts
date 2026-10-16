import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { rawData } from "../fixtures/gym-data";
import { resetIndexedDb } from "../reset-indexeddb";

const source = { repo: "someone/gym", path: "gym-data.json", token: "t0k" };

function stubFetch(status: number, body: unknown) {
  const fetchImpl = vi
    .fn()
    .mockImplementation(() =>
      Promise.resolve(new Response(JSON.stringify(body), { status })),
    );
  vi.stubGlobal("fetch", fetchImpl);
  return fetchImpl;
}

// storage.ts keeps module-level state; a fresh module per test.
async function freshStorage() {
  vi.resetModules();
  const storage = await import("@/lib/storage");
  await storage.whenLoaded();
  return storage;
}

async function seed(value: unknown) {
  vi.resetModules();
  const { kvSet } = await import("@/lib/idb-store");
  const { DATA_KEY } = await import("@/lib/storage-keys");
  await kvSet(DATA_KEY, value);
}

beforeEach(async () => {
  await resetIndexedDb();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("loading", () => {
  it("starts empty", async () => {
    const storage = await freshStorage();
    expect(storage.getGymSnapshot()).toMatchObject({
      source: null,
      data: null,
      syncedAt: null,
    });
    expect(storage.isGymReady()).toBe(true);
    expect(storage.isGymReadyOnServer()).toBe(false);
    expect(storage.getServerGymSnapshot().data).toBeNull();
  });

  it("reads what was stored", async () => {
    await seed({ source, data: rawData, syncedAt: "2026-10-16T10:00:00Z" });
    const storage = await freshStorage();
    const state = storage.getGymSnapshot();
    expect(state.source).toEqual(source);
    expect(state.data?.exercises).toHaveLength(4);
    expect(state.syncedAt).toBe("2026-10-16T10:00:00Z");
  });

  it("ignores a corrupt stored value", async () => {
    await seed({ source: { repo: "nope" }, data: "x", syncedAt: 5 });
    const storage = await freshStorage();
    expect(storage.getGymSnapshot()).toMatchObject({
      source: null,
      data: null,
      syncedAt: null,
    });
  });

  it("survives a non-object stored value", async () => {
    await seed("garbage");
    const storage = await freshStorage();
    expect(storage.getGymSnapshot().source).toBeNull();
  });

  it("keeps an empty state when the read fails", async () => {
    vi.resetModules();
    const { keyValueStore } = await import("@/lib/idb-store");
    vi.spyOn(keyValueStore, "get").mockRejectedValueOnce(new Error("boom"));
    const storage = await import("@/lib/storage");
    await storage.whenLoaded();
    expect(storage.getGymSnapshot().data).toBeNull();
    expect(storage.isGymReady()).toBe(true);
  });
});

describe("connect / sync", () => {
  it("saves the source and downloads the data", async () => {
    stubFetch(200, rawData);
    const storage = await freshStorage();
    const listener = vi.fn();
    storage.subscribe(listener);

    await storage.connect(source);

    const state = storage.getGymSnapshot();
    expect(state.source).toEqual(source);
    expect(state.data?.plans).toHaveLength(2);
    expect(state.syncedAt).not.toBeNull();
    expect(state.syncing).toBe(false);
    expect(listener).toHaveBeenCalled();

    const reloaded = await freshStorage();
    expect(reloaded.getGymSnapshot().data?.exercises).toHaveLength(4);
  });

  it("keeps the old data and reports the error when a download fails", async () => {
    await seed({ source, data: rawData, syncedAt: "then" });
    stubFetch(401, {});
    const storage = await freshStorage();

    await storage.sync();

    const state = storage.getGymSnapshot();
    expect(state.error).toBe("unauthorized");
    expect(state.data?.exercises).toHaveLength(4);
    expect(state.syncedAt).toBe("then");
  });

  it("does nothing without a source", async () => {
    const fetchImpl = stubFetch(200, rawData);
    const storage = await freshStorage();
    await storage.sync();
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("doesn't start a second download while one runs", async () => {
    await seed({ source, data: null, syncedAt: null });
    const fetchImpl = stubFetch(200, rawData);
    const storage = await freshStorage();
    await Promise.all([storage.sync(), storage.sync()]);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it("syncs on start only once per run", async () => {
    await seed({ source, data: null, syncedAt: null });
    const fetchImpl = stubFetch(200, rawData);
    const storage = await freshStorage();
    await storage.syncOnStart();
    await storage.syncOnStart();
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it("stamps the sync time", async () => {
    await seed({ source, data: null, syncedAt: null });
    stubFetch(200, rawData);
    const storage = await freshStorage();
    await storage.sync(() => new Date("2026-10-16T08:00:00Z"));
    expect(storage.getGymSnapshot().syncedAt).toBe("2026-10-16T08:00:00.000Z");
  });

  it("stops notifying after unsubscribing", async () => {
    const storage = await freshStorage();
    const listener = vi.fn();
    storage.subscribe(listener)();
    await storage.disconnect();
    expect(listener).not.toHaveBeenCalled();
  });
});

describe("disconnect", () => {
  it("forgets the source and the data", async () => {
    await seed({ source, data: rawData, syncedAt: "then" });
    const storage = await freshStorage();

    await storage.disconnect();

    expect(storage.getGymSnapshot()).toMatchObject({
      source: null,
      data: null,
      syncedAt: null,
    });
    const reloaded = await freshStorage();
    expect(reloaded.getGymSnapshot().source).toBeNull();
  });
});

describe("encryption", () => {
  it("encrypts what it writes once a key is set, and reads it back", async () => {
    vi.resetModules();
    const { encryptionKey } = await import("@/lib/encryption-key");
    const key = await crypto.subtle.generateKey(
      { name: "AES-GCM", length: 256 },
      false,
      ["encrypt", "decrypt"],
    );
    encryptionKey.set(key);
    const storage = await import("@/lib/storage");
    await storage.whenLoaded();
    stubFetch(200, rawData);
    await storage.connect(source);

    const { kvGet } = await import("@/lib/idb-store");
    const { DATA_KEY } = await import("@/lib/storage-keys");
    const { isEncryptedBlob } = await import("@maat-apps/core/crypto");
    expect(isEncryptedBlob(await kvGet(DATA_KEY))).toBe(true);

    // A fresh run behind an encrypting lock waits for the key, then reads.
    const settings = await import("@/lib/app-settings");
    settings.setLockEnrolment({
      credentialId: "c1",
      userId: "u1",
      createdAt: "now",
      encryptionSupported: true,
      prfSalt: "c2FsdA",
    });
    await new Promise((resolve) => setTimeout(resolve, 20));
    vi.resetModules();
    const freshKey = await import("@/lib/encryption-key");
    const reloaded = await import("@/lib/storage");
    const loading = reloaded.whenLoaded();
    freshKey.encryptionKey.set(key);
    await loading;
    expect(reloaded.getGymSnapshot().source).toEqual(source);
  });

  it("ignores a write failure", async () => {
    const storage = await freshStorage();
    const { keyValueStore } = await import("@/lib/idb-store");
    vi.spyOn(keyValueStore, "set").mockRejectedValueOnce(new Error("full"));
    await expect(storage.persist()).resolves.toBeUndefined();
  });
});
