import { describe, expect, it } from "vitest";
import { render, screen } from "./test-utils";
import App from "../App";

describe("Auth", () => {
  it("should show sign in button when not signed in", async () => {
    await render(<App />, { isSignedIn: false });

    await screen.findByRole("heading", { name: "Welcome!" });
    expect(
      (await screen.findAllByRole("button", { name: "Sign in" }))[0]
    ).toBeInTheDocument();
  });

  it("should show user button when signed in", async () => {
    await render(<App />);

    expect(screen.getByTestId("mock-clerk-user-button")).toBeInTheDocument();
  });
});
