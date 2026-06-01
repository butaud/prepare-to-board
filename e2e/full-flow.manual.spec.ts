import { expect, test } from "@playwright/test";
import { allTestUsersConfigured } from "./test-users";

test.skip(!allTestUsersConfigured, "Full flow needs all three Clerk test users.");
test.setTimeout(120_000);

test("admin, officer, and member can collaborate through a full meeting lifecycle", async ({
  browser,
  baseURL,
}) => {
  const runId = Date.now().toString(36);
  let orgName = `E2E Board ${runId}`;
  const firstTopic = `Budget Review ${runId}`;
  const secondTopic = `Facilities Update ${runId}`;
  const addedLiveTopic = `Executive Session ${runId}`;
  const meetingDate = new Date(
    2027,
    Math.floor(Date.now() / 86_400_000) % 12,
    (Date.now() % 20) + 1
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

  for (const invitedPage of [officer, member]) {
    await invitedPage.goto(inviteLink);
    await expect(invitedPage.getByLabel("Organization")).toContainText(orgName, {
      timeout: 15_000,
    });
  }

  await admin.reload();
  await admin.getByRole("link", { name: /manage/i }).click();
  const officerRow = admin.getByRole("row").filter({ hasText: "Test Officer" });
  await officerRow.getByLabel("Role").selectOption("writer");
  await expect(officerRow).toContainText("Officer");

  await admin.getByRole("link", { name: /meetings/i }).click();
  const existingMeetingHrefs = new Set(
    await admin
      .getByRole("link", { name: /\d+\/\d+\/\d+/ })
      .evaluateAll((links) =>
        links.map((link) => link.getAttribute("href")).filter(Boolean)
      )
  );
  await admin.getByRole("button", { name: /create a new meeting/i }).click();
  await admin.getByLabel("Meeting date").fill(meetingDateInput);
  await admin.getByLabel("Meeting time").fill("7:00 PM");
  await admin.getByRole("button", { name: "Save" }).click();
  let createdMeetingHref: string | null = null;
  await expect
    .poll(async () => {
      createdMeetingHref = await admin.getByRole("link", { name: meetingDatePattern }).evaluateAll(
        (links, existingHrefs) => {
          const existing = new Set(existingHrefs as string[]);
          const link = links.find((candidate) => {
            const href = candidate.getAttribute("href");
            return href && !existing.has(href);
          });
          return link?.getAttribute("href") ?? null;
        },
        Array.from(existingMeetingHrefs)
      );
      return createdMeetingHref;
    })
    .not.toBeNull();
  await admin.goto(createdMeetingHref!);
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
  await expect(admin.getByRole("heading", { name: firstTopic })).toBeVisible();

  await member.goto(admin.url());
  await expect(member.getByRole("heading", { name: firstTopic })).toBeVisible({
    timeout: 15_000,
  });
  await expect(member.getByRole("button", { name: /defer/i })).toHaveCount(0);

  await officer.goto(`${admin.url()}/minutes`);
  await expect(officer.getByRole("heading", { name: "Current Topic" })).toBeVisible({
    timeout: 15_000,
  });
  await officer.getByRole("button", { name: "+ Text" }).click();
  await officer.getByPlaceholder("Enter note text...").fill(`Discussed reserves ${runId}`);
  await officer.getByRole("button", { name: "Add", exact: true }).click();
  await officer.getByRole("button", { name: "Complete Topic" }).click();

  await admin.reload();
  await expect(admin.getByRole("heading", { name: secondTopic })).toBeVisible({
    timeout: 15_000,
  });
  await expect(admin.getByText(`Discussed reserves ${runId}`)).toBeVisible();

  await officer.getByRole("button", { name: "+ Add Topic" }).click();
  await officer.getByPlaceholder("Topic title").fill(addedLiveTopic);
  await officer.getByRole("button", { name: /^Add$/ }).click();
  await expect(officer.getByText(addedLiveTopic)).toBeVisible();

  await officer.getByRole("button", { name: "Skip Topic" }).click();
  await expect(officer.getByRole("heading", { name: addedLiveTopic })).toBeVisible();
  await officer.getByRole("button", { name: "Complete Topic" }).click();
  await expect(officer.getByText("All topics have been covered. You can end the meeting.")).toBeVisible();

  await admin.reload();
  await admin.getByRole("button", { name: /end meeting/i }).click();
  await expect(admin.getByRole("heading", { name: "Meeting Minutes" })).toBeVisible({
    timeout: 15_000,
  });
  await expect(admin.getByText(firstTopic).first()).toBeVisible();
  await expect(admin.getByText(addedLiveTopic).first()).toBeVisible();

  await adminContext.close();
  await officerContext.close();
  await memberContext.close();
});
