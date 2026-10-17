import {
  createRepoConnection,
  createRepoMirror,
  parseRepo,
  type GitHubErrorKind,
  type MirrorCopy,
  type RepoLocation,
} from "@maat-apps/core/github";
import { createLocalStore } from "@maat-apps/core/local";
import { isRecord } from "@maat-apps/core/validation";

import {
  getSettingsSnapshot,
  whenLoaded as whenSettingsLoaded,
} from "./app-settings";
import { encryptionKey } from "./encryption-key";
import { keyValueStore } from "./idb-store";
import { DATA_VERSION, parseGymData, type GymData } from "./schemas";
import { DATA_KEY, GITHUB_KEY } from "./storage-keys";

// The data file in the user's private GitHub repo, read-only
// (@maat-apps/core/github's mirror, maat-core's docs/storage-github.md):
// the last downloaded copy and when it came live in a /local store under
// DATA_KEY, encrypted with the lock's key; the connection (repo, path,
// token) is only ever stored encrypted, under GITHUB_KEY — no connection
// without a lock that encrypts. Screens subscribe through
// src/hooks/use-gym-data.ts.

/** Where the data comes from, as Settings asks for it. */
export type DataSource = {
  /** "owner/repo" */
  repo: string;
  /** Path of the JSON file inside the repo. */
  path: string;
  token: string;
};

export type GymState = {
  source: DataSource | null;
  data: GymData | null;
  /** ISO time of the last successful download. */
  syncedAt: string | null;
  syncing: boolean;
  /** Why the last download failed; cleared by the next success. */
  error: GitHubErrorKind | null;
};

export const DEFAULT_DATA_PATH = "gym-data.json";

export function isValidRepo(repo: string): boolean {
  return parseRepo(repo) !== null;
}

/** Whether the enrolled lock encrypts — then the first read waits for its key. */
async function lockEncrypts(): Promise<boolean> {
  await whenSettingsLoaded();
  return getSettingsSnapshot().lock?.encryptionSupported === true;
}

// Before core's GitHub pattern, the source (token included) was kept with
// the data — encrypted only when the lock encrypted. Read once, it moves to
// the encrypted connection, or is dropped when there's no key to keep it.
let legacySource: DataSource | null = null;

function parseLegacySource(value: unknown): DataSource | null {
  if (!isRecord(value)) return null;
  const { repo, path, token } = value;
  return typeof repo === "string" &&
    isValidRepo(repo) &&
    typeof path === "string" &&
    typeof token === "string"
    ? { repo, path, token }
    : null;
}

type StoredCopy = {
  data: (GymData & { version: number }) | null;
  syncedAt: string | null;
};

const copyStore = createLocalStore<MirrorCopy<GymData>, StoredCopy>({
  storage: keyValueStore,
  key: DATA_KEY,
  empty: { data: null, syncedAt: null },
  parse: (stored) => {
    if (!isRecord(stored)) return { data: null, syncedAt: null };
    legacySource = parseLegacySource(stored.source);
    return {
      data: parseGymData(stored.data),
      syncedAt: typeof stored.syncedAt === "string" ? stored.syncedAt : null,
    };
  },
  serialize: ({ data, syncedAt }) => ({
    data: data && { version: DATA_VERSION, ...data },
    syncedAt,
  }),
  encryption: { keyHolder: encryptionKey, encrypts: lockEncrypts },
});

const connection = createRepoConnection({
  storage: keyValueStore,
  key: GITHUB_KEY,
  keyHolder: encryptionKey,
  encrypts: lockEncrypts,
  extra: { initial: {}, parse: () => ({}) },
});

function toLocation({ repo, path, token }: DataSource): RepoLocation {
  const parsed = parseRepo(repo) ?? { owner: "", repo: "" };
  // No branch: the repository's default one.
  return { ...parsed, branch: "", path: path.trim(), token };
}

const mirror = createRepoMirror({
  connection,
  store: copyStore,
  parseFile: (text) => {
    const data = parseGymData(JSON.parse(text));
    if (!data) throw new Error("Not a gym data file.");
    return data;
  },
});

async function migrateLegacySource(): Promise<void> {
  await Promise.all([copyStore.whenLoaded(), connection.whenLoaded()]);
  const source = legacySource;
  if (!source) return;
  legacySource = null;
  if (connection.canConnect() && !connection.get()) {
    await connection.save(toLocation(source));
  }
  // Writes the copy again without the source (and its token).
  await copyStore.rewrite();
}

let loaded: Promise<void> | null = null;

/** Starts the background reads on first use; test-only to await directly. */
export function whenLoaded(): Promise<void> {
  loaded ??= migrateLegacySource();
  return loaded;
}

const EMPTY: GymState = {
  source: null,
  data: null,
  syncedAt: null,
  syncing: false,
  error: null,
};

let snapshot = EMPTY;
let snapshotParts: unknown[] = [];

/** The copy, the connection and the download status, as one stable value. */
export function getGymSnapshot(): GymState {
  void whenLoaded();
  const copy = copyStore.getSnapshot();
  const location = connection.get();
  const status = mirror.getStatus();
  const parts = [copy, location, status];
  if (parts.some((part, index) => part !== snapshotParts[index])) {
    snapshotParts = parts;
    snapshot = {
      source: location && {
        repo: `${location.owner}/${location.repo}`,
        path: location.path,
        token: location.token,
      },
      data: copy.data,
      syncedAt: copy.syncedAt,
      syncing: status.syncing,
      error: status.error,
    };
  }
  return snapshot;
}

export function getServerGymSnapshot(): GymState {
  return EMPTY;
}

export function subscribe(listener: () => void): () => void {
  const unsubscribers = [
    copyStore.subscribe(listener),
    connection.subscribe(listener),
    mirror.subscribeStatus(listener),
  ];
  return () => {
    for (const unsubscribe of unsubscribers) unsubscribe();
  };
}

/** Whether the stored copy and connection have been read — until then "no
 * data" can't be told apart from "not loaded yet". */
export function isGymReady(): boolean {
  void whenLoaded();
  return copyStore.isReady() && connection.isReady();
}

export function isGymReadyOnServer(): boolean {
  return false;
}

/** Whether a token may be stored: the lock is on, encrypts, and is unlocked. */
export const canConnect = connection.canConnect;

/** Downloads the data file from the connected repo. */
export async function sync(): Promise<void> {
  await whenLoaded();
  await mirror.sync();
}

/** The first call per app run syncs; later ones don't. */
export async function syncOnStart(): Promise<void> {
  await whenLoaded();
  await mirror.syncOnStart();
}

/**
 * Checks the token can read the repo, stores the connection (encrypted) and
 * downloads from it straight away. Throws core's `GitHubError` for a token
 * or repo GitHub refuses, `RepoConnectionError` without an encrypting lock.
 */
export async function connect(source: DataSource): Promise<void> {
  await whenLoaded();
  await connection.connect(toLocation(source));
  await mirror.sync();
}

/** Forgets the token and every downloaded copy. */
export async function disconnect(): Promise<void> {
  await whenLoaded();
  await Promise.all([connection.disconnect(), copyStore.erase()]);
}

/** For the app lock (`lockData`): the copy and the connection. */
export const lockParts = [copyStore, connection] as const;
