import { expect, test } from "@playwright/test";

import {
  closeSettings,
  connect,
  goHome,
  installPrfAuthenticator,
  mockGitHub,
} from "./utils";

test.use({ serviceWorkers: "block" });

test.beforeEach(async ({ page }) => {
  await installPrfAuthenticator(page);
});

test("connecting downloads the data and lists the first plan", async ({
  page,
}) => {
  await mockGitHub(page);
  await goHome(page);
  await connect(page);

  await expect(page.getByText("Updated", { exact: false })).toBeVisible();
  await closeSettings(page);

  const plan = page.getByRole("list", { name: "Plan A" });
  await expect(plan.getByRole("button", { name: /Squat/ })).toBeVisible();
  await expect(plan.getByText("Best 57.5 kg × 3 · Sessions: 4")).toBeVisible();
  await expect(plan.getByText("inactive")).toBeVisible();

  await page.getByRole("button", { name: "Plan B" }).click();
  await expect(
    page.getByRole("list", { name: "Plan B" }).getByText("Hold"),
  ).toBeVisible();

  // The data and the chosen plan survive a reload.
  await page.reload();
  await expect(
    page.getByRole("list", { name: "Plan B" }).getByText("Hold"),
  ).toBeVisible();
});

test("an exercise shows its chart, records and sessions", async ({ page }) => {
  await mockGitHub(page);
  await goHome(page);
  await connect(page);
  await closeSettings(page);

  await page.getByRole("button", { name: /Squat/ }).click();

  await expect(page.getByRole("heading", { name: "Squat" })).toBeVisible();
  await expect(
    page.getByRole("img", { name: "Weight per session" }),
  ).toBeVisible();
  const sessions = page.getByRole("list", { name: "Sessions" });
  await expect(sessions.getByRole("listitem")).toHaveCount(4);
  await expect(sessions.getByRole("listitem").first()).toContainText(
    "Session 4",
  );
  await expect(sessions.getByRole("listitem").first()).toContainText("Record");
  await expect(sessions.getByText("50 kg × 5, 4")).toBeVisible();

  await page.getByRole("button", { name: "Est. 1RM" }).click();
  await expect(
    page.getByRole("img", { name: "Est. 1RM per session" }),
  ).toBeVisible();

  await page.getByRole("button", { name: "Back" }).click();
  await expect(page.getByRole("list", { name: "Plan A" })).toBeVisible();
});

test("a refused token is explained and the old data stays", async ({
  page,
}) => {
  await mockGitHub(page);
  await goHome(page);
  await connect(page);
  await closeSettings(page);
  await expect(page.getByRole("button", { name: /Squat/ })).toBeVisible();

  await mockGitHub(page, 401, { message: "Bad credentials" });
  await page.getByRole("button", { name: "Refresh" }).click();

  await expect(page.getByRole("alert")).toContainText(
    "GitHub refused the token",
  );
  await expect(page.getByRole("button", { name: /Squat/ })).toBeVisible();
});

test("disconnecting forgets the data", async ({ page }) => {
  await mockGitHub(page);
  await goHome(page);
  await connect(page);

  await page.getByRole("button", { name: "Disconnect" }).click();
  await page.getByRole("button", { name: "Disconnect" }).last().click();

  await expect(page.getByRole("button", { name: "Connect" })).toBeVisible();
  await closeSettings(page);
  await expect(
    page.getByRole("heading", { name: "Connect your data" }),
  ).toBeVisible();
});
