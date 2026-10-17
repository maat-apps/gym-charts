import { expect, test } from "@playwright/test";

import { goHome } from "./utils";

test("home asks to connect the data repo first", async ({ page }) => {
  await goHome(page);
  await expect(
    page.getByRole("heading", { name: "Connect your data" }),
  ).toBeVisible();
});

// Guards maat-core#78: the font has to reach the production build, or the
// app silently falls back to the system font. load() fetches the face and
// rejects (or finds none) when its file is missing.
test("renders in Outfit", async ({ page }) => {
  await goHome(page);
  const loadedFaces = await page.evaluate(() =>
    document.fonts
      .load('16px "Outfit Variable"')
      .then((faces) => faces.length)
      .catch(() => 0),
  );
  expect(loadedFaces).toBeGreaterThan(0);
});

test("connecting a repo needs the lock that encrypts", async ({ page }) => {
  await goHome(page);
  await page.getByRole("button", { name: "Settings" }).first().click();

  await expect(
    page.getByText(/Connecting a repo needs the app lock with encryption/),
  ).toBeVisible();
  await expect(page.getByLabel("Token")).toHaveCount(0);
});
