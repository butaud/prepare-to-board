import { chromium, FullConfig } from "@playwright/test";
import { mkdir } from "node:fs/promises";
import { signInWithClerk } from "./auth";
import { configuredRoles, testUsers } from "./test-users";

export default async function globalSetup(config: FullConfig) {
  if (configuredRoles.length === 0) return;

  await mkdir(".auth", { recursive: true });
  const browser = await chromium.launch();
  const baseURL = config.projects[0].use.baseURL ?? "http://localhost:5173";

  for (const role of configuredRoles) {
    const user = testUsers[role];
    if (!user) continue;

    const page = await browser.newPage({ baseURL });
    await signInWithClerk(page, user);
    await page.context().storageState({ path: `.auth/${role}.json` });
    await page.close();
  }

  await browser.close();
}
