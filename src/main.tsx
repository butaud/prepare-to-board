import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.tsx";
import { ClerkProvider, useClerk } from "@clerk/clerk-react";
import { JazzReactProviderWithClerk } from "jazz-tools/react";
import { HashRouter } from "react-router-dom";
import { Schema } from "./schema.ts";

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
    <JazzReactProviderWithClerk
      clerk={clerk}
      AccountSchema={Schema.UserAccount}
      sync={{
        peer: `wss://cloud.jazz.tools/?key=${JAZZ_API_KEY}`,
      }}
    >
      {children}
    </JazzReactProviderWithClerk>
  );
};

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ClerkProvider publishableKey={CLERK_PUBLISHABLE_KEY} afterSignOutUrl={"/"}>
      <JazzProvider>
        <HashRouter basename={import.meta.env.BASE_URL}>
          <App />
        </HashRouter>
      </JazzProvider>
    </ClerkProvider>
  </StrictMode>
);
