import "@testing-library/jest-dom";
import { vi } from "vitest";
import "@clerk/clerk-react";

vi.mock("@clerk/clerk-react", async (importActual) => {
  const actual = await importActual<typeof import("@clerk/clerk-react")>();
  return {
    ...actual,
    SignInButton: () => {
      return <button>Sign in</button>;
    },
    SignOutButton: ({ children }: { children: React.ReactNode }) => {
      return <button>{children}</button>;
    },
  };
});
