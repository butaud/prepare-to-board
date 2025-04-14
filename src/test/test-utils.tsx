import { act, render, RenderOptions } from "@testing-library/react";
import { createJazzTestAccount } from "jazz-tools/testing";
import { ReactElement } from "react";
import { UserAccount } from "../schema";
import { JazzTestProvider } from "jazz-react/testing";

type CustomRenderOptions = {
  isSignedIn?: boolean;
  userName?: string;
};
const customRender = async (
  ui: ReactElement,
  options: RenderOptions & CustomRenderOptions = {}
) => {
  const { isSignedIn = true, userName, ...renderOptions } = options;

  const testAccount = await createJazzTestAccount({
    AccountSchema: UserAccount,
    isCurrentActiveAccount: true,
    creationProps: userName ? { name: userName } : undefined,
  });
  return act(() =>
    render(ui, {
      wrapper: ({ children }) => (
        <JazzTestProvider account={testAccount} isAuthenticated={isSignedIn}>
          {children}
        </JazzTestProvider>
      ),
      ...renderOptions,
    })
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export * from "@testing-library/react";

export { customRender as render };
