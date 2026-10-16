import { parseGymData, type GymData } from "./schemas";

// Reads the data file from the user's private GitHub repo with a read-only
// token they paste into Settings. The token only ever goes to GitHub's API.

export type DataSource = {
  /** "owner/repo" */
  repo: string;
  /** Path of the JSON file inside the repo. */
  path: string;
  token: string;
};

export type FetchError =
  | "unauthorized"
  | "notFound"
  | "rateLimited"
  | "server"
  | "network"
  | "invalid";

export type FetchResult =
  { ok: true; data: GymData } | { ok: false; error: FetchError };

export const DEFAULT_DATA_PATH = "gym-data.json";

const REPO_PATTERN = /^[\w.-]+\/[\w.-]+$/;

export function isValidRepo(repo: string): boolean {
  return REPO_PATTERN.test(repo);
}

function contentsUrl({ repo, path }: DataSource): string {
  const encodedPath = path
    .split("/")
    .filter(Boolean)
    .map(encodeURIComponent)
    .join("/");
  return `https://api.github.com/repos/${repo}/contents/${encodedPath}`;
}

function errorFor(response: Response): FetchError {
  if (response.status === 401) return "unauthorized";
  if (response.status === 403 || response.status === 429) {
    return response.headers.get("x-ratelimit-remaining") === "0" ||
      response.status === 429
      ? "rateLimited"
      : "unauthorized";
  }
  // GitHub answers 404 for a private repo the token can't see, too.
  if (response.status === 404) return "notFound";
  return "server";
}

/** Downloads and validates the data file. Never throws. */
export async function fetchGymData(
  source: DataSource,
  fetchImpl: typeof fetch = fetch,
): Promise<FetchResult> {
  let response: Response;
  try {
    response = await fetchImpl(contentsUrl(source), {
      headers: {
        Accept: "application/vnd.github.raw+json",
        Authorization: `Bearer ${source.token}`,
        "X-GitHub-Api-Version": "2022-11-28",
      },
      cache: "no-store",
    });
  } catch {
    return { ok: false, error: "network" };
  }
  if (!response.ok) return { ok: false, error: errorFor(response) };
  try {
    const data = parseGymData(await response.json());
    return data ? { ok: true, data } : { ok: false, error: "invalid" };
  } catch {
    return { ok: false, error: "invalid" };
  }
}
