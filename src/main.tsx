import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.tsx";
import { ClerkProvider, useClerk } from "@clerk/clerk-react";
import { UserAccount } from "./schema.ts";
import { JazzProviderWithClerk } from "jazz-react-auth-clerk";
import { BrowserRouter } from "react-router-dom";

const CLERK_PUBLISHABLE_KEY = import.meta.env
  .VITE_CLERK_PUBLISHABLE_KEY as string;
const JAZZ_API_KEY = import.meta.env.VITE_JAZZ_API_KEY as string;

if (!CLERK_PUBLISHABLE_KEY) {
  throw new Error("Add your Clerk Publishable Key to the .env file");
}

if (!JAZZ_API_KEY) {
  throw new Error("Add your Jazz API Key to the .env file");
}

// eslint-disable-next-line react-refresh/only-export-components
const JazzProvider = ({ children }: { children: React.ReactNode }) => {
  const clerk = useClerk();
  return (
    <JazzProviderWithClerk
      clerk={clerk}
      AccountSchema={UserAccount}
      sync={{
        peer: `wss://cloud.jazz.tools/?key=${JAZZ_API_KEY}`,
      }}
    >
      {children}
    </JazzProviderWithClerk>
  );
};

declare module "jazz-react" {
  interface Register {
    Account: UserAccount;
  }
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ClerkProvider publishableKey={CLERK_PUBLISHABLE_KEY} afterSignOutUrl={"/"}>
      <JazzProvider>
        <BrowserRouter basename={import.meta.env.BASE_URL}>
          <App />
        </BrowserRouter>
      </JazzProvider>
    </ClerkProvider>
  </StrictMode>
);
