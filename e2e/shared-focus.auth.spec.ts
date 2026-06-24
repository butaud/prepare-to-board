import { expect, test } from "@playwright/test";
import { allTestUsersConfigured } from "./test-users";

test.skip(!allTestUsersConfigured, "Shared highlight review needs admin, officer, and member Clerk test users.");
test.setTimeout(120_000);

test("present view follows the topic highlighted by the minute taker", async ({
  browser,
  baseURL,
}) => {
  test.skip(
    test.info().project.name !== "admin",
    "Run this multi-user review once from the admin project."
  );

  const runId = Date.now().toString(36);
  let orgName = `E2E Highlight Board ${runId}`;
  const firstTopic = `Opening Highlight ${runId}`;
  const secondTopic = `Treasurer Highlight ${runId}`;
  const dateSeed = Date.now();
  const meetingDate = new Date(
    2090 + (dateSeed % 100),
    dateSeed % 12,
    (dateSeed % 27) + 1
  );
  const meetingDateInput = `${meetingDate.getMonth() + 1}/${meetingDate.getDate()}/${meetingDate.getFullYear()}`;
  const meetingDatePattern = new RegExp(
    `${meetingDate.getMonth() + 1}\\/${meetingDate.getDate()}\\/${meetingDate.getFullYear()}`
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
  if ((await orgSelector.count()) > 0) {
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
  await admin.getByLabel("Meeting date").fill(meetingDateInput);
  await admin.getByLabel("Meeting time").fill("7:00 PM");
  await admin.getByRole("button", { name: "Save" }).click();
  await admin.getByRole("link", { name: meetingDatePattern }).last().click();
  await admin.getByRole("button", { name: "Add Topic" }).click();
  await admin.getByRole("heading", { name: "New Topic" }).dblclick();
  await admin.getByRole("textbox", { name: "Topic" }).fill(firstTopic);
  await admin.getByRole("textbox", { name: "Topic" }).press("Enter");
  await expect(admin.getByRole("heading", { name: firstTopic })).toBeVisible();

  await admin.getByRole("button", { name: "Add Topic" }).click();
  await admin.getByRole("heading", { name: "New Topic" }).dblclick();
  await admin.getByRole("textbox", { name: "Topic" }).fill(secondTopic);
  await admin.getByRole("textbox", { name: "Topic" }).press("Enter");
  await expect(admin.getByRole("heading", { name: secondTopic })).toBeVisible();

  await admin.getByRole("button", { name: /publish/i }).click();
  await admin.getByRole("button", { name: /start meeting/i }).click();
  await expect(admin.getByText("Now discussing")).toBeVisible();

  const meetingPath = new URL(admin.url()).pathname;
  await admin.goto(`${meetingPath}/present`);
  await officer.goto(`${meetingPath}/minutes`);
  await member.goto(meetingPath);

  const adminFirstTopic = admin.getByRole("button", { name: new RegExp(firstTopic) });
  const adminSecondTopic = admin.getByRole("button", { name: new RegExp(secondTopic) });
  const memberFirstTopic = member.getByRole("button", { name: new RegExp(firstTopic) });
  const memberSecondTopic = member.getByRole("button", { name: new RegExp(secondTopic) });
  await expect(adminFirstTopic).toHaveAttribute("aria-expanded", "true");
  await expect(member.getByRole("button", { name: "Present" })).toHaveCount(0);
  await expect(member.getByRole("button", { name: "Manage Agenda" })).toHaveCount(0);
  await expect(member.getByRole("button", { name: "Take Minutes" })).toHaveCount(0);
  await expect(memberFirstTopic).toHaveAttribute("aria-expanded", "true");

  const officerAgendaTopic = (topic: string) =>
    officer.locator(".minutes-day-view-event").filter({ hasText: topic });

  await officerAgendaTopic(secondTopic).click();
  await expect(adminFirstTopic).toHaveAttribute("aria-expanded", "true");
  await expect(memberFirstTopic).toHaveAttribute("aria-expanded", "true");

  await officer.getByRole("button", { name: "Highlight for everyone" }).click();
  await expect(adminSecondTopic).toHaveAttribute("aria-expanded", "true", {
    timeout: 15_000,
  });
  await expect(adminFirstTopic).toHaveAttribute("aria-expanded", "false");
  await expect(memberSecondTopic).toHaveAttribute("aria-expanded", "true", {
    timeout: 15_000,
  });
  await expect(memberFirstTopic).toHaveAttribute("aria-expanded", "false");

  await officerAgendaTopic(firstTopic).click();
  await expect(officer.getByRole("button", { name: "Highlight for everyone" })).toHaveCount(0);
  await expect(adminFirstTopic).toHaveAttribute("aria-expanded", "true", {
    timeout: 15_000,
  });
  await expect(adminSecondTopic).toHaveAttribute("aria-expanded", "false");
  await expect(memberFirstTopic).toHaveAttribute("aria-expanded", "true", {
    timeout: 15_000,
  });
  await expect(memberSecondTopic).toHaveAttribute("aria-expanded", "false");

  await officerAgendaTopic(secondTopic).click();
  await officer.getByRole("button", { name: "Highlight for everyone" }).click();
  await expect(adminSecondTopic).toHaveAttribute("aria-expanded", "true", {
    timeout: 15_000,
  });
  await officer.getByRole("button", { name: "Unhighlight" }).click();
  await expect(adminFirstTopic).toHaveAttribute("aria-expanded", "true", {
    timeout: 15_000,
  });
  await expect(memberFirstTopic).toHaveAttribute("aria-expanded", "true", {
    timeout: 15_000,
  });

  await adminContext.close();
  await officerContext.close();
  await memberContext.close();
});
