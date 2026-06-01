import { expect, Page } from "@playwright/test";
import { TestUser } from "./test-users";

export const signInWithClerk = async (page: Page, user: TestUser) => {
  await page.goto("/");
  await page.getByRole("button", { name: /sign in/i }).click();

  const emailInput = page.getByRole("textbox", { name: /email/i });
  await expect(emailInput).toBeVisible();
  await emailInput.fill(user.email);

  const continueButton = page.getByRole("button", {
    name: /continue|next/i,
  });
  if (await continueButton.isVisible().catch(() => false)) {
    await continueButton.click();
  }

  const passwordInput = page.getByRole("textbox", { name: /password/i });
  await expect(passwordInput).toBeVisible();
  await passwordInput.fill(user.password);

  await page.getByRole("button", { name: /continue|sign in/i }).click();
  await expect(page.getByRole("navigation")).toBeVisible({ timeout: 30_000 });
};
