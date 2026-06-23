import { expect, test } from "@playwright/test";
import { allTestUsersConfigured } from "./test-users";

test.skip(
  !allTestUsersConfigured,
  "Access-control review needs admin, officer, and member Clerk test users."
);
test.setTimeout(120_000);

test("member and officer access stays aligned with organization roles", async ({
  browser,
  baseURL,
}) => {
  test.skip(
    test.info().project.name !== "admin",
    "Run this multi-user review once from the admin project."
  );

  const runId = Date.now().toString(36);
  let orgName = `E2E Access Board ${runId}`;
  const draftDate = new Date(2180, Number(runId.charCodeAt(0)) % 12, 3);
  const draftDateInput = `${draftDate.getMonth() + 1}/${draftDate.getDate()}/${draftDate.getFullYear()}`;
  const draftDatePattern = new RegExp(
    `${draftDate.getMonth() + 1}\\/${draftDate.getDate()}\\/${draftDate.getFullYear()}`
  );

  const adminContext = await browser.newContext({
    baseURL,
    storageState: ".auth/admin.json",
  });
  const officerContext = await browser.newContext({
    baseURL,
    storageState: ".auth/officer.json",
  });
  const memberContext = await browser.newContext({
    baseURL,
    storageState: ".auth/member.json",
  });

  const admin = await adminContext.newPage();
  const officer = await officerContext.newPage();
  const member = await memberContext.newPage();

  await admin.goto("/");
  await expect(admin.getByRole("navigation")).toBeVisible();
  const orgSelector = admin.getByLabel("Organization");
  if (await orgSelector.isVisible({ timeout: 15_000 }).catch(() => false)) {
    orgName = (await orgSelector.locator("option:checked").textContent()) ?? orgName;
  } else {
    await admin.getByLabel("Name").fill(orgName);
    await admin.getByRole("button", { name: "Save" }).click();
    await expect(orgSelector).toContainText(orgName);
  }

  await admin.getByRole("link", { name: /manage/i }).click();
  await admin.getByRole("button", { name: /invite a new user/i }).click();
  const inviteLink = await admin.getByLabel("Invite link").inputValue();
  await admin.keyboard.press("Escape");

  await officer.goto(inviteLink);
  await expect(officer.getByLabel("Organization")).toContainText(orgName, {
    timeout: 15_000,
  });
  await member.goto(inviteLink);
  await expect(member.getByLabel("Organization")).toContainText(orgName, {
    timeout: 15_000,
  });

  await admin.reload();
  await admin.getByRole("link", { name: /manage/i }).click();
  const officerRow = admin.getByRole("row").filter({ hasText: "Test Officer" });
  await officerRow.getByLabel("Role").selectOption("writer");
  await expect(officerRow).toContainText("Officer");

  await admin.getByRole("link", { name: /meetings/i }).click();
  await admin.getByRole("button", { name: /create a new meeting/i }).click();
  await admin.getByLabel("Meeting date").fill(draftDateInput);
  await admin.getByLabel("Meeting time").fill("6:30 PM");
  await admin.getByRole("button", { name: "Save" }).click();
  await expect(admin.getByRole("link", { name: draftDatePattern }).last()).toBeVisible();

  await member.goto("/");
  await expect(member.getByRole("link", { name: /^manage$/i })).toHaveCount(0);
  await expect(member.getByRole("link", { name: /^members$/i })).toBeVisible();
  await expect(member.getByRole("link", { name: /^meetings$/i })).toBeVisible();
  await expect(member.getByRole("link", { name: /^action items$/i })).toBeVisible();
  await expect(member.getByRole("link", { name: /^calendar$/i })).toBeVisible();

  await member.getByRole("link", { name: /^members$/i }).click();
  await expect(member.getByRole("heading", { name: /organization members/i })).toBeVisible();
  await expect(member.getByRole("row").filter({ hasText: "Test Officer" })).toContainText(
    "Officer"
  );
  await expect(member.getByRole("row").filter({ hasText: "Test Member" })).toContainText(
    "Member"
  );

  await member.getByRole("link", { name: /^meetings$/i }).click();
  await expect(member.getByRole("button", { name: /create a new meeting/i })).toHaveCount(0);
  await expect(member.getByRole("link", { name: draftDatePattern })).toHaveCount(0);

  await officer.getByRole("link", { name: /^meetings$/i }).click();
  await expect(officer.getByRole("button", { name: /create a new meeting/i })).toBeVisible();
  await expect(officer.getByRole("link", { name: draftDatePattern }).last()).toBeVisible();

  await admin.getByRole("link", { name: draftDatePattern }).last().click();
  await admin.getByRole("button", { name: /publish/i }).click();

  await member.reload();
  await expect(member.getByRole("link", { name: draftDatePattern }).last()).toBeVisible({
    timeout: 15_000,
  });

  await adminContext.close();
  await officerContext.close();
  await memberContext.close();
});
