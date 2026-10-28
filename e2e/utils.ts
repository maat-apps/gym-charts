// Reusable Playwright test helpers — plain functions specs call directly,
// not test.extend() fixtures (hence "utils.ts", not "fixtures.ts" — see
// maat-core/STRUCTURE.md's Testing section for why that naming matters).
import {
  installPrfAuthenticator,
  readStored,
} from "@maat-apps/config/playwright";
import { expect, type Page } from "@playwright/test";

export async function goHome(page: Page) {
  await page.goto("");
}

/** Made-up training data in the private repo's file format. */
export const GYM_DATA = {
  version: 1,
  plans: [
    { id: "a", name: "Plan A", exercises: ["squat", "assisted-dip"] },
    { id: "b", name: "Plan B", exercises: ["hold"] },
  ],
  exercises: [
    {
      id: "squat",
      name: "Squat",
      metric: "weight",
      sessions: [
        { sets: [{ weight: 40, reps: 10 }] },
        {
          sets: [
            { weight: 50, reps: 5 },
            { weight: 50, reps: 4 },
          ],
        },
        { sets: [{ weight: 45, reps: 12 }] },
        { sets: [{ weight: 57.5, reps: 3 }] },
      ],
    },
    {
      id: "assisted-dip",
      name: "Assisted dip",
      metric: "weight",
      assisted: true,
      inactive: true,
      sessions: [
        { sets: [{ weight: 30, reps: 6 }] },
        { sets: [{ weight: 25, reps: 5 }] },
      ],
    },
    {
      id: "hold",
      name: "Hold",
      metric: "time",
      sessions: [
        {
          sets: [
            { seconds: 20, side: "right" },
            { seconds: 25, side: "left" },
          ],
        },
      ],
    },
    {
      id: "row",
      name: "Row",
      metric: "reps",
      sessions: [{ sets: [{ reps: 12 }] }],
    },
  ],
};

const CONTENTS_URL = "https://api.github.com/repos/someone/gym/contents/**";

/**
 * Answers GitHub's contents API with `status` and `body`. Specs calling it
 * block service workers — a worker's own fetches would bypass the route.
 */
export async function mockGitHub(
  page: Page,
  status = 200,
  body: unknown = GYM_DATA,
) {
  await page.unroute(CONTENTS_URL);
  await page.route(CONTENTS_URL, (route) =>
    route.fulfill({
      status,
      contentType: "application/json",
      // The contents API's own shape: the file base64-encoded.
      body: JSON.stringify(
        status === 200
          ? {
              sha: "s1",
              encoding: "base64",
              content: Buffer.from(JSON.stringify(body)).toString("base64"),
            }
          : body,
      ),
    }),
  );
}

export { installPrfAuthenticator };

/**
 * Opens Settings, turns on the lock (encrypting, through the PRF
 * authenticator `installPrfAuthenticator` set up) and connects to the
 * mocked repo.
 */
export async function connect(page: Page) {
  await page.getByRole("button", { name: "Settings" }).first().click();
  const lock = page.getByRole("switch", { name: "App lock" });
  await lock.click();
  await expect(lock).toBeChecked();
  await page.getByLabel("Repository").fill("someone/gym");
  await page.getByLabel("Token").fill("github_pat_test");
  await page.getByRole("button", { name: "Connect" }).click();
}

/** Closes the Settings drawer and waits until it's gone. */
export async function closeSettings(page: Page) {
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toBeHidden();
}

/**
 * Resolves once the chosen plan has reached IndexedDB. Settings persist in
 * the background, so a reload right after picking a plan can beat the
 * write. Database and key names are duplicated by hand: this runs in the
 * page, which can't import from src/.
 */
export async function waitForStoredPlan(page: Page, plan: string) {
  await expect
    .poll(async () => {
      const settings = (await readStored(
        page,
        "gym-charts",
        "gym-charts-settings",
      )) as { selectedPlan?: unknown } | undefined;
      return settings?.selectedPlan;
    })
    .toBe(plan);
}
