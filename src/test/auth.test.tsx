import { afterEach, describe, expect, it } from "vitest";
import {
  render,
  resetTestAccount,
  screen,
  setupTestAccount,
} from "./test-utils";
import App from "../App";

describe("Auth", () => {
  afterEach(() => {
    resetTestAccount();
  });

  it("should show sign in button when not signed in", async () => {
    await render(<App />);

    await screen.findByRole("heading", { name: "Welcome!" });
    expect(
      (await screen.findAllByRole("button", { name: "Sign in" }))[0]
    ).toBeInTheDocument();
  });

  it("should show user button when signed in", async () => {
    await setupTestAccount("Test User");
    await render(<App />);

    expect(screen.getByTestId("mock-clerk-user-button")).toBeInTheDocument();
  });
});
