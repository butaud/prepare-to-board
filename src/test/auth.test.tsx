import { describe, expect, it } from "vitest";
import { render, screen } from "./test-utils";
import App from "../App";

describe("Auth", () => {
  it("should show sign in button when not signed in", async () => {
    await render(<App />, { isSignedIn: false });

    await screen.findByRole("heading", { name: "Welcome!" });
    expect(screen.getByRole("button")).toHaveTextContent("Sign in");
  });

  it("should show log out button when signed in", async () => {
    await render(<App />);

    expect(screen.getByRole("button", { name: "Log out" })).toBeInTheDocument();
  });

  it("should show user's name when signed in", async () => {
    await render(<App />, {
      userName: "Test User",
    });

    expect(screen.getByText("Hello, Mr. User")).toBeInTheDocument();
  });
});
