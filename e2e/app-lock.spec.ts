import { expect, test } from "@playwright/test";

import { goHome } from "./utils";

test.describe("app lock", () => {
  test("enrolling turns the lock on and unlocking with the same authenticator works", async ({
    page,
  }) => {
    // Playwright's native virtual WebAuthn authenticator, installed before
    // navigation so the app's real create()/get() calls succeed against it.
    await page.context().credentials.install();
    await goHome(page);

    const lockSwitch = page.getByRole("switch", { name: "App lock" });
    await expect(lockSwitch).toBeEnabled();
    await lockSwitch.click();
    await expect(lockSwitch).toBeChecked();

    // Enrolling counts as unlocked, but that's per-session memory — a
    // reload locks again, and the lock screen prompts by itself.
    await page.reload();
    await expect(page.getByRole("heading", { name: "Welcome" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Unlock" })).toBeHidden();
  });
});
