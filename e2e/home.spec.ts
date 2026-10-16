import { expect, test } from "@playwright/test";

import { goHome } from "./utils";

// A minimal smoke test so `npm run test:e2e` has something to run against
// the freshly scaffolded app, before any real screens exist — replace with
// real specs as views are built.
test("home screen renders", async ({ page }) => {
  await goHome(page);
  await expect(page.getByRole("heading", { name: "Welcome" })).toBeVisible();
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
