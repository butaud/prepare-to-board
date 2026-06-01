import { expect, test } from "@playwright/test";

test("signed-out users see the welcome screen", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("heading", { name: "Welcome!" })).toBeVisible();
  await expect(
    page.getByRole("banner").getByRole("button", { name: /sign in/i })
  ).toBeVisible();
  await expect(
    page.getByRole("main").getByRole("button", { name: /sign in/i })
  ).toBeVisible();
});
