import { act, render, RenderOptions } from "@testing-library/react";
import { createJazzTestAccount, linkAccounts } from "jazz-tools/testing";
import { ReactElement } from "react";
import { ListOfMeetings, Organization, UserAccount } from "../schema";
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

const customRender = async (ui: ReactElement, options: RenderOptions = {}) => {
  const tempAccount = await createJazzTestAccount({
    AccountSchema: UserAccount,
    isCurrentActiveAccount: false,
    creationProps: { name: "Temp Account" },
  });
  return act(() =>
    render(ui, {
      wrapper: ({ children }) => (
        <JazzTestProvider
          account={testAccount ?? tempAccount}
          isAuthenticated={testAccount !== null}
        >
          <MemoryRouter>{children}</MemoryRouter>
        </JazzTestProvider>
      ),
      ...options,
    })
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export * from "@testing-library/react";

export { customRender as render };
