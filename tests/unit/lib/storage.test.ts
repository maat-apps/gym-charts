import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { rawData } from "../fixtures/gym-data";
import { resetIndexedDb } from "../reset-indexeddb";

const source = { repo: "someone/gym", path: "gym-data.json", token: "t0k" };
const CONTENTS =
  "https://api.github.com/repos/someone/gym/contents/gym-data.json";

function base64(text: string): string {
  return btoa(String.fromCharCode(...new TextEncoder().encode(text)));
}

function respond(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), { status });
}

/** GitHub's contents API answering with the data file (or `status`). */
function stubGitHub(status = 200, data: unknown = rawData) {
  const fetchImpl = vi.fn(async (url: string) => {
    if (status !== 200) return respond(status, {});
    if (String(url).startsWith(CONTENTS)) {
      return respond(200, {
        sha: "s1",
        encoding: "base64",
        content: base64(JSON.stringify(data)),
      });
    }
    return respond(200, {});
  });
  vi.stubGlobal("fetch", fetchImpl);
  return fetchImpl;
}

async function testKey() {
  const { deriveKey, randomBytes } = await import("@maat-apps/core/crypto");
  return deriveKey(randomBytes(32), randomBytes(16), "test-data-v1");
}

let lockKey: CryptoKey | null = null;

// Module-level state everywhere, so each test (and each "relaunch") gets a
// fresh module graph over the same IndexedDB. `encrypting` enrols a lock
// that encrypts and unlocks it with the same key across relaunches.
async function launch({ encrypting = true } = {}) {
  vi.resetModules();
  const settings = await import("@/lib/app-settings");
  await settings.whenLoaded();
  if (encrypting) {
    if (!settings.getSettingsSnapshot().lock) {
      settings.setLockEnrolment({
        credentialId: "c1",
        userId: "u1",
        createdAt: "now",
        encryptionSupported: true,
        prfSalt: "c2FsdA",
      });
    }
    lockKey ??= await testKey();
    const { encryptionKey } = await import("@/lib/encryption-key");
    encryptionKey.set(lockKey);
  }
  const storage = await import("@/lib/storage");
  await storage.whenLoaded();
  return storage;
}

async function stored(key: "DATA_KEY" | "GITHUB_KEY"): Promise<unknown> {
  const { kvGet } = await import("@/lib/idb-store");
  const keys = await import("@/lib/storage-keys");
  return kvGet(keys[key]);
}

async function seed(value: unknown) {
  vi.resetModules();
  const { kvSet } = await import("@/lib/idb-store");
  const { DATA_KEY } = await import("@/lib/storage-keys");
  await kvSet(DATA_KEY, value);
}

beforeEach(async () => {
  lockKey = null;
  await resetIndexedDb();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("loading", () => {
  it("starts empty and ready", async () => {
    const storage = await launch({ encrypting: false });
    expect(storage.getGymSnapshot()).toMatchObject({
      source: null,
      data: null,
      syncedAt: null,
      syncing: false,
      error: null,
    });
    expect(storage.isGymReady()).toBe(true);
    expect(storage.isGymReadyOnServer()).toBe(false);
    expect(storage.getServerGymSnapshot().data).toBeNull();
  });

  it("reads the last downloaded copy", async () => {
    await seed({ data: rawData, syncedAt: "2026-10-16T10:00:00Z" });
    const storage = await launch({ encrypting: false });
    const state = storage.getGymSnapshot();
    expect(state.data?.exercises).toHaveLength(4);
    expect(state.syncedAt).toBe("2026-10-16T10:00:00Z");
  });

  it("ignores a corrupt or non-object stored value", async () => {
    await seed({ data: "x", syncedAt: 5 });
    const storage = await launch({ encrypting: false });
    expect(storage.getGymSnapshot()).toMatchObject({
      data: null,
      syncedAt: null,
    });

    await seed("garbage");
    expect((await launch({ encrypting: false })).getGymSnapshot().data).toBe(
      null,
    );
  });

  it("keeps one snapshot object until something changes", async () => {
    const storage = await launch({ encrypting: false });
    expect(storage.getGymSnapshot()).toBe(storage.getGymSnapshot());
  });
});

describe("the old source kept with the data", () => {
  it("moves into the encrypted connection, and out of the data", async () => {
    await seed({ source, data: rawData, syncedAt: "then" });

    const storage = await launch();

    expect(storage.getGymSnapshot().source).toEqual(source);
    expect(storage.getGymSnapshot().data?.exercises).toHaveLength(4);
    const { isEncryptedBlob } = await import("@maat-apps/core/crypto");
    expect(isEncryptedBlob(await stored("GITHUB_KEY"))).toBe(true);
    expect(await stored("DATA_KEY")).not.toHaveProperty("source");
  });

  it("is dropped without an encrypting lock to keep the token", async () => {
    await seed({ source, data: rawData, syncedAt: "then" });

    const storage = await launch({ encrypting: false });

    expect(storage.getGymSnapshot().source).toBeNull();
    expect(storage.getGymSnapshot().data?.exercises).toHaveLength(4);
    expect(await stored("DATA_KEY")).not.toHaveProperty("source");
    expect(await stored("GITHUB_KEY")).toBeUndefined();
  });
});

describe("connect / sync", () => {
  it("is refused without an encrypting lock", async () => {
    const fetchImpl = stubGitHub();
    const storage = await launch({ encrypting: false });

    expect(storage.canConnect()).toBe(false);
    await expect(storage.connect(source)).rejects.toThrow();

    expect(fetchImpl).not.toHaveBeenCalled();
    expect(storage.getGymSnapshot().source).toBeNull();
  });

  it("saves the source encrypted and downloads the data", async () => {
    stubGitHub();
    const storage = await launch();
    const listener = vi.fn();
    storage.subscribe(listener);

    await storage.connect(source);

    const state = storage.getGymSnapshot();
    expect(state.source).toEqual(source);
    expect(state.data?.plans).toHaveLength(2);
    expect(state.syncedAt).not.toBeNull();
    expect(state.syncing).toBe(false);
    expect(listener).toHaveBeenCalled();

    const reloaded = await launch();
    expect(reloaded.getGymSnapshot().source).toEqual(source);
    expect(reloaded.getGymSnapshot().data?.exercises).toHaveLength(4);
  });

  it("isn't saved when GitHub refuses the token", async () => {
    stubGitHub(401);
    const storage = await launch();

    await expect(storage.connect(source)).rejects.toMatchObject({
      kind: "unauthorized",
    });

    expect(storage.getGymSnapshot().source).toBeNull();
  });

  it("keeps the old data and reports the error when a download fails", async () => {
    stubGitHub();
    await (await launch()).connect(source);
    stubGitHub(401);
    const storage = await launch();
    const syncedAt = storage.getGymSnapshot().syncedAt;

    await storage.sync();

    const state = storage.getGymSnapshot();
    expect(state.error).toBe("unauthorized");
    expect(state.data?.exercises).toHaveLength(4);
    expect(state.syncedAt).toBe(syncedAt);
  });

  it("reports a file that isn't gym data", async () => {
    stubGitHub(200, { not: "gym data" });
    const storage = await launch();

    await storage.connect(source);

    expect(storage.getGymSnapshot().error).toBe("invalid");
  });

  it("does nothing without a source", async () => {
    const fetchImpl = stubGitHub();
    const storage = await launch();
    await storage.sync();
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("syncs on start only once per run", async () => {
    stubGitHub();
    await (await launch()).connect(source);
    const fetchImpl = stubGitHub();
    const storage = await launch();

    await storage.syncOnStart();
    await storage.syncOnStart();

    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it("stops notifying after unsubscribing", async () => {
    stubGitHub();
    const storage = await launch();
    const listener = vi.fn();
    storage.subscribe(listener)();

    await storage.connect(source);

    expect(listener).not.toHaveBeenCalled();
  });
});

describe("disconnect", () => {
  it("forgets the source and the data", async () => {
    stubGitHub();
    await (await launch()).connect(source);
    const storage = await launch();

    await storage.disconnect();

    expect(storage.getGymSnapshot()).toMatchObject({
      source: null,
      data: null,
      syncedAt: null,
    });
    const reloaded = await launch();
    expect(reloaded.getGymSnapshot().source).toBeNull();
    expect(reloaded.getGymSnapshot().data).toBeNull();
  });
});

describe("encryption", () => {
  it("encrypts the downloaded copy and reads it back after unlocking", async () => {
    stubGitHub();
    await (await launch()).connect(source);

    const { isEncryptedBlob } = await import("@maat-apps/core/crypto");
    expect(isEncryptedBlob(await stored("DATA_KEY"))).toBe(true);
    expect((await launch()).getGymSnapshot().data?.plans).toHaveLength(2);
  });
});
