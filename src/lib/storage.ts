import {
  decryptJson,
  encryptJson,
  isEncryptedBlob,
} from "@maat-apps/core/crypto";
import { isRecord } from "@maat-apps/core/validation";

import {
  getSettingsSnapshot,
  whenLoaded as whenSettingsLoaded,
} from "./app-settings";
import { encryptionKey } from "./encryption-key";
import {
  fetchGymData,
  isValidRepo,
  type DataSource,
  type FetchError,
} from "./github";
import { kvGet, kvSet } from "./idb-store";
import { DATA_VERSION, parseGymData, type GymData } from "./schemas";
import { DATA_KEY } from "./storage-keys";

// The data source (repo, path, token), the last downloaded copy of the data
// and when it was fetched — in memory once loaded, written through to
// IndexedDB (maat-core's docs/storage.md), encrypted with the lock's key.
// The token lives here rather than in app-settings so it is encrypted too.
// Screens subscribe through src/hooks/use-gym-data.ts.

export type GymState = {
  source: DataSource | null;
  data: GymData | null;
  /** ISO time of the last successful download. */
  syncedAt: string | null;
  syncing: boolean;
  /** Why the last download failed; cleared by the next success. */
  error: FetchError | null;
};

const EMPTY: GymState = {
  source: null,
  data: null,
  syncedAt: null,
  syncing: false,
  error: null,
};

const listeners = new Set<() => void>();
let state: GymState = EMPTY;
let loaded: Promise<void> | null = null;
let ready = false;
let syncedThisRun = false;

function emitChange(): void {
  for (const listener of listeners) {
    listener();
  }
}

function update(changes: Partial<GymState>): void {
  state = { ...state, ...changes };
  emitChange();
}

function parseSource(value: unknown): DataSource | null {
  if (!isRecord(value)) return null;
  const { repo, path, token } = value;
  return typeof repo === "string" &&
    isValidRepo(repo) &&
    typeof path === "string" &&
    typeof token === "string"
    ? { repo, path, token }
    : null;
}

function parseStored(value: unknown): Partial<GymState> {
  if (!isRecord(value)) return {};
  return {
    source: parseSource(value.source),
    data: parseGymData(value.data),
    syncedAt: typeof value.syncedAt === "string" ? value.syncedAt : null,
  };
}

async function load(): Promise<void> {
  await whenSettingsLoaded();
  if (getSettingsSnapshot().lock?.encryptionSupported) {
    // The app sits behind the lock screen until unlock succeeds, so the
    // data is never needed — and never readable — before the key is.
    await encryptionKey.whenSet();
  }
  try {
    const stored = await kvGet<unknown>(DATA_KEY);
    const key = encryptionKey.get();
    const value =
      key && isEncryptedBlob(stored)
        ? await decryptJson<unknown>(key, stored)
        : stored;
    state = { ...state, ...parseStored(value) };
  } catch {
    // Keep what's in memory — same fallback as a corrupt or missing value.
  } finally {
    ready = true;
    emitChange();
  }
}

/** Starts the background read on first use; test-only to await directly. */
export function whenLoaded(): Promise<void> {
  loaded ??= load();
  return loaded;
}

export function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getGymSnapshot(): GymState {
  void whenLoaded();
  return state;
}

export function getServerGymSnapshot(): GymState {
  return EMPTY;
}

/** Whether the initial read has finished — until then "no data" can't be
 * told apart from "not loaded yet". */
export function isGymReady(): boolean {
  void whenLoaded();
  return ready;
}

export function isGymReadyOnServer(): boolean {
  return false;
}

/** Writes what's in memory now (also the lock's re-encrypting rewrite). */
export async function persist(): Promise<void> {
  const { source, data, syncedAt } = state;
  const value = {
    source,
    data: data && { version: DATA_VERSION, ...data },
    syncedAt,
  };
  try {
    const key = encryptionKey.get();
    await kvSet(DATA_KEY, key ? await encryptJson(key, value) : value);
  } catch {
    // Best-effort — the in-memory copy (and this tab) already reflects it.
  }
}

/** Downloads the data file from the configured source. */
export async function sync(now = () => new Date()): Promise<void> {
  await whenLoaded();
  const { source } = state;
  if (!source || state.syncing) return;
  update({ syncing: true });
  const result = await fetchGymData(source);
  if (result.ok) {
    update({
      data: result.data,
      syncedAt: now().toISOString(),
      syncing: false,
      error: null,
    });
    await persist();
  } else {
    update({ syncing: false, error: result.error });
  }
}

/** The first call per app run syncs; later ones don't. */
export function syncOnStart(): Promise<void> {
  if (syncedThisRun) return Promise.resolve();
  syncedThisRun = true;
  return sync();
}

/** Saves a new source and downloads from it straight away. */
export async function connect(source: DataSource): Promise<void> {
  await whenLoaded();
  update({ source, error: null });
  await persist();
  await sync();
}

/** Forgets the token and every downloaded copy (also the lock's erase). */
export async function disconnect(): Promise<void> {
  await whenLoaded();
  update({ source: null, data: null, syncedAt: null, error: null });
  await persist();
}
