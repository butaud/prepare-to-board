import { act, render, RenderOptions } from "@testing-library/react";
import { createJazzTestAccount, linkAccounts } from "jazz-tools/testing";
import { ReactElement } from "react";
import {
  ListOfMeetings,
  ListOfMinutes,
  ListOfTopics,
  Meeting,
  Organization,
  UserAccount,
} from "../schema";
import { JazzTestProvider } from "jazz-react/testing";
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
    AccountSchema: UserAccount,
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
        AccountSchema: UserAccount,
        isCurrentActiveAccount: false,
        creationProps: { name: "Other Account" },
      });

  if (owningAccount !== testAccount) {
    linkAccounts(testAccount, owningAccount);
  }
  await owningAccount.waitForSync();
  const owningGroup = Group.create(owningAccount);
  await owningGroup.waitForSync();
  if (!isAdmin) {
    owningGroup.addMember(testAccount, role);
  }

  const org = await Organization.create(
    {
      name,
      meetings: ListOfMeetings.create([], owningGroup),
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
    AccountSchema: UserAccount,
    isCurrentActiveAccount: false,
    creationProps: { name },
  });

  linkAccounts(testAccount, newMember);
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
  const meeting = Meeting.create(
    {
      date,
      plannedAgenda: ListOfTopics.create([], owningGroup),
      liveAgenda: ListOfTopics.create([], owningGroup),
      minutes: ListOfMinutes.create([], owningGroup),
    },
    owningGroup
  );
  org.meetings?.push(meeting);
  await org.waitForSync();
  await meeting.waitForSync();
};

export type CustomRenderProps = {
  startingPath?: string;
};
const customRender = async (
  ui: ReactElement,
  options: RenderOptions & CustomRenderProps = {}
) => {
  const tempAccount = await createJazzTestAccount({
    AccountSchema: UserAccount,
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
