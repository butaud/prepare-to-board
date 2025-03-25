import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.tsx";
// import { JazzProviderWithClerk } from "jazz-react-auth-clerk";
import { JazzProvider as BaseJazzProvider } from "jazz-react";
import { ClerkProvider } from "@clerk/clerk-react";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { About } from "./views/About.tsx";

const CLERK_PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;
const JAZZ_API_KEY = import.meta.env.VITE_JAZZ_API_KEY;

if (!CLERK_PUBLISHABLE_KEY) {
  throw new Error("Add your Clerk Publishable Key to the .env file");
}

if (!JAZZ_API_KEY) {
  throw new Error("Add your Jazz API Key to the .env file");
}

const JazzProvider = ({ children }: { children: React.ReactNode }) => {
  // const clerk = useClerk();
  // return (
  //   <JazzProviderWithClerk
  //     clerk={clerk}
  //     sync={{
  //       peer: `wss://cloud.jazz.tools/?key=${JAZZ_API_KEY}`,
  //     }}
  //   >
  //     {children}
  //   </JazzProviderWithClerk>
  // );
  return (
    <BaseJazzProvider
      sync={{
        peer: `wss://cloud.jazz.tools/?key=${JAZZ_API_KEY}`,
      }}
    >
      {children}
    </BaseJazzProvider>
  );
};

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ClerkProvider publishableKey={CLERK_PUBLISHABLE_KEY} afterSignOutUrl={"/"}>
      <JazzProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<App />}>
              <Route index element={<h2>Here's where the stuff goes</h2>} />
              <Route path="about" element={<About />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </JazzProvider>
    </ClerkProvider>
  </StrictMode>
);
