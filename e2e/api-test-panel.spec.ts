import { expect, test } from "@playwright/test";

test("hidden API test panel is not reachable without an authenticated sysadmin session", async ({ page }) => {
  await page.goto("/sysadmin/api-test");
  await expect(page).toHaveURL(/\/login/);
});
