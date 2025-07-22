import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  render,
  resetTestAccount,
  screen,
  setupTestAccount,
} from "./test-utils";
import userEvent from "@testing-library/user-event";
import App from "../App";

describe("Organization", () => {
  beforeEach(async () => {
    await setupTestAccount("Test User");
    await render(<App />);
  });

  afterEach(() => {
    resetTestAccount();
  });

  it("should show organization create form when no organizations exist", async () => {
    expect(
      screen.getByText("You aren't a member of any organizations yet.", {
        exact: false,
      })
    ).toBeInTheDocument();
    expect(
      await screen.findByRole("textbox", { name: "Name" })
    ).toBeInTheDocument();
  });

  it("should allow user to create an organization from the home page", async () => {
    await screen.findByRole("textbox", { name: "Name" });
    const input = screen.getByRole("textbox", { name: "Name" });
    await userEvent.type(input, "Test Organization");
    const button = screen.getByRole("button", { name: "Save" });
    await userEvent.click(button);

    expect(
      await screen.findByRole("option", {
        name: "Test Organization",
      })
    ).toBeInTheDocument();
  });

  it("should allow user to create a second organization from the settings page", async () => {
    await screen.findByRole("textbox", { name: "Name" });
    const orgNameInput = screen.getByRole("textbox", { name: "Name" });
    await userEvent.type(orgNameInput, "Test Organization");
    const saveButton = screen.getByRole("button", { name: "Save" });
    await userEvent.click(saveButton);

    await userEvent.click(screen.getByTestId("mock-clerk-user-button"));

    await userEvent.click(
      screen.getByRole("button", { name: "Create Organization" })
    );
    await userEvent.type(screen.getByLabelText("Name"), "Test Organization 2");
    await userEvent.click(screen.getByRole("button", { name: "Save" }));

    expect(
      await screen.findByRole("option", {
        name: "Test Organization 2",
      })
    ).toBeInTheDocument();
  });

  it("should allow user to delete an organization which they created", async () => {
    await screen.findByRole("textbox", { name: "Name" });
    const input = screen.getByRole("textbox", { name: "Name" });
    await userEvent.type(input, "Test Organization");
    const button = screen.getByRole("button", { name: "Save" });
    await userEvent.click(button);

    await userEvent.click(screen.getByTestId("mock-clerk-user-button"));

    const listItem = (await screen.findAllByRole("listitem"))[0];
    expect(listItem).toHaveTextContent("Test Organization");

    vi.spyOn(window, "confirm").mockReturnValue(true);
    await userEvent.click(screen.getByRole("button", { name: "Remove" }));

    expect(screen.queryAllByRole("listitem")).toHaveLength(1);
  });
});
