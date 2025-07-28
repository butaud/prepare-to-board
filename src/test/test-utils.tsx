import { act, render, RenderOptions } from "@testing-library/react";
import { createJazzTestAccount, linkAccounts } from "jazz-tools/testing";
import { ReactElement } from "react";
import { Schema, Meeting, Organization, UserAccount } from "../schema";
import { JazzTestProvider } from "jazz-tools/react/testing";
import { Group } from "jazz-tools";
import { MemoryRouter } from "react-router-dom";

let testAccount: UserAccount | null = null;
const organizations: Organization[] = [];

export const resetTestAccount = () => {
  testAccount = null;
  organizations.length = 0;
};

export const setupTestAccount = async (name: string) => {
  const account = await createJazzTestAccount({
    AccountSchema: Schema.UserAccount,
    isCurrentActiveAccount: true,
    creationProps: { name },
  });

  testAccount = account;
};

export const addTestOrganization = async (
  name: string,
  role: "admin" | "writer" | "reader"
) => {
  if (!testAccount) {
    throw new Error("Test account not set up. Call setupTestAccount first.");
  }

  const isAdmin = role === "admin";
  const owningAccount = isAdmin
    ? testAccount
    : await createJazzTestAccount({
        AccountSchema: Schema.UserAccount,
        isCurrentActiveAccount: false,
        creationProps: { name: "Other Account" },
      });

  if (owningAccount !== testAccount) {
    await linkAccounts(testAccount, owningAccount);
  }
  await owningAccount.waitForSync();
  const owningGroup = Group.create(owningAccount);
  await owningGroup.waitForSync();
  if (!isAdmin) {
    owningGroup.addMember(testAccount, role);
  }

  const org = Schema.Organization.create(
    {
      name,
      meetings: Schema.ListOfMeetings.create([], owningGroup),
    },
    owningGroup
  );

  const resolvedTestAccount = await testAccount.ensureLoaded({
    resolve: {
      root: {
        organizations: true,
        selectedOrganization: true,
      },
    },
  });
  resolvedTestAccount.root.organizations.push(org);
  resolvedTestAccount.root.selectedOrganization = org;
  await resolvedTestAccount.waitForSync();

  organizations.push(org);
};

export const addMemberToTestOrganization = async (
  name: string,
  role: "admin" | "writer" | "reader"
) => {
  if (!testAccount) {
    throw new Error("Test account not set up. Call setupTestAccount first.");
  }

  const newMember = await createJazzTestAccount({
    AccountSchema: Schema.UserAccount,
    isCurrentActiveAccount: false,
    creationProps: { name },
  });

  await linkAccounts(testAccount, newMember);
  await newMember.waitForSync();

  const owningGroup = organizations[0]._owner.castAs(Group);
  owningGroup.addMember(newMember, role);
  await owningGroup.waitForSync();
};

export const addTestMeeting = async (date: Date) => {
  if (!testAccount) {
    throw new Error("Test account not set up. Call setupTestAccount first.");
  }

  const org = organizations[0];

  if (!org) {
    throw new Error(
      "No test organization found. Call addTestOrganization first."
    );
  }

  const owningGroup = org._owner.castAs(Group);
  const meeting = Schema.Meeting.create(
    {
      date,
      plannedAgenda: Schema.ListOfTopics.create([], owningGroup),
      liveAgenda: Schema.ListOfTopics.create([], owningGroup),
      minutes: Schema.ListOfMinutes.create([], owningGroup),
    },
    owningGroup
  );
  org.meetings?.push(meeting);
  await org.waitForSync();
  await meeting.waitForSync();
  return meeting;
};

export const addTestTopic = async (
  meeting: Meeting,
  title: string,
  durationMinutes?: number
) => {
  if (!testAccount) {
    throw new Error("Test account not set up. Call setupTestAccount first.");
  }

  const org = organizations[0];

  if (!org) {
    throw new Error(
      "No test organization found. Call addTestOrganization first."
    );
  }

  const owningGroup = org._owner.castAs(Group);
  const topic = Schema.Topic.create({ title, durationMinutes }, owningGroup);
  meeting.plannedAgenda?.push(topic);
  await meeting.waitForSync();
  await topic.waitForSync();
  return topic;
};

export type CustomRenderProps = {
  startingPath?: string;
};
const customRender = async (
  ui: ReactElement,
  options: RenderOptions & CustomRenderProps = {}
) => {
  const tempAccount = await createJazzTestAccount({
    AccountSchema: Schema.UserAccount,
    isCurrentActiveAccount: false,
    creationProps: { name: "Temp Account" },
  });
  const { startingPath, ...renderOptions } = options;
  return act(() =>
    render(ui, {
      wrapper: ({ children }) => (
        <JazzTestProvider
          account={testAccount ?? tempAccount}
          isAuthenticated={testAccount !== null}
        >
          <MemoryRouter
            initialEntries={startingPath ? [startingPath] : undefined}
          >
            {children}
          </MemoryRouter>
        </JazzTestProvider>
      ),
      ...renderOptions,
    })
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export * from "@testing-library/react";

export { customRender as render };
