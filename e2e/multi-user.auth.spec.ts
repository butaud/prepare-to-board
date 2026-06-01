import { expect, test } from "@playwright/test";
import { allTestUsersConfigured } from "./test-users";

test.describe("multi-user organization flows", () => {
  test.skip(
    !allTestUsersConfigured,
    "Set E2E_ADMIN_EMAIL/PASSWORD, E2E_OFFICER_EMAIL/PASSWORD, and E2E_MEMBER_EMAIL/PASSWORD to run authenticated e2e tests."
  );

  test("authenticated users can load the app shell", async ({ page }) => {
    await page.goto("/");

    await expect(page.getByRole("navigation")).toBeVisible();
    await expect(page.getByRole("link", { name: /meetings/i })).toBeVisible();
  });
});
