import { chromium, FullConfig } from "@playwright/test";
import { access, mkdir } from "node:fs/promises";
import { signInWithClerk } from "./auth";
import { configuredRoles, Role, testUsers } from "./test-users";

const authProjects = new Set<Role>(["admin", "officer", "member"]);

const fileExists = async (path: string) => {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
};

export default async function globalSetup(config: FullConfig) {
  const requestedRoles = config.projects
    .map((project) => project.name)
    .filter((name): name is Role => authProjects.has(name as Role));
  const roles = configuredRoles.filter((role) => requestedRoles.includes(role));
  if (roles.length === 0) return;

  await mkdir(".auth", { recursive: true });
  const browser = await chromium.launch();
  const baseURL = config.projects[0].use.baseURL ?? "http://localhost:5173";

  for (const role of roles) {
    const user = testUsers[role];
    if (!user) continue;
    const storageStatePath = `.auth/${role}.json`;
    if (
      process.env.E2E_REFRESH_AUTH !== "true" &&
      (await fileExists(storageStatePath))
    ) {
      continue;
    }

    const page = await browser.newPage({ baseURL });
    await signInWithClerk(page, user);
    await page.context().storageState({ path: storageStatePath });
    await page.close();
  }

  await browser.close();
}
