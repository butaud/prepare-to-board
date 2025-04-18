import { act, render, RenderOptions } from "@testing-library/react";
import { createJazzTestAccount, setupJazzTestSync } from "jazz-tools/testing";
import { ReactElement } from "react";
import { ListOfMeetings, Organization, UserAccount } from "../schema";
import { JazzTestProvider } from "jazz-react/testing";
import { Group } from "jazz-tools";
import { MemoryRouter } from "react-router-dom";

type CustomRenderOptions = {
  isSignedIn?: boolean;
  userName?: string;
  organization?: {
    name: string;
    isAdmin?: boolean;
  };
};
const customRender = async (
  ui: ReactElement,
  options: RenderOptions & CustomRenderOptions = {}
) => {
  const {
    isSignedIn = true,
    userName,
    organization,
    ...renderOptions
  } = options;

  await setupJazzTestSync();

  const testAccount = await createJazzTestAccount({
    AccountSchema: UserAccount,
    isCurrentActiveAccount: true,
    creationProps: userName ? { name: userName } : undefined,
  });

  const otherAccount = await createJazzTestAccount({
    AccountSchema: UserAccount,
    isCurrentActiveAccount: false,
    creationProps: { name: "Other Account" },
  });

  if (organization) {
    const owningGroup = Group.create(
      organization.isAdmin ? testAccount : otherAccount
    );
    await owningGroup.waitForSync();

    if (!organization.isAdmin) {
      owningGroup.addMember(testAccount, "reader");
    }

    const org = await Organization.create(
      {
        name: organization.name,
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
  }

  return act(() =>
    render(ui, {
      wrapper: ({ children }) => (
        <JazzTestProvider account={testAccount} isAuthenticated={isSignedIn}>
          <MemoryRouter>{children}</MemoryRouter>
        </JazzTestProvider>
      ),
      ...renderOptions,
    })
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export * from "@testing-library/react";

export { customRender as render };
