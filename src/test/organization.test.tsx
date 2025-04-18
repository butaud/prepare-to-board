import { describe, expect, it, vi } from "vitest";
import { render, screen } from "./test-utils";
import userEvent from "@testing-library/user-event";
import App from "../App";

describe("Organization", () => {
  it("should show organization create form when no organizations exist", async () => {
    await render(<App />);
    expect(
      screen.getByText("You aren't a member of any organizations yet.", {
        exact: false,
      })
    ).toBeInTheDocument();
    expect(
      await screen.findByRole("textbox", { name: "Name" })
    ).toBeInTheDocument();
  });

  it("should allow user to create an organization", async () => {
    await render(<App />);
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

  it("should allow user to delete an organization which they created", async () => {
    await render(<App />);
    await screen.findByRole("textbox", { name: "Name" });
    const input = screen.getByRole("textbox", { name: "Name" });
    await userEvent.type(input, "Test Organization");
    const button = screen.getByRole("button", { name: "Save" });
    await userEvent.click(button);

    await userEvent.click(screen.getByTestId("mock-clerk-user-button"));

    const listItem = await screen.findByRole("listitem");
    expect(listItem).toHaveTextContent("Test Organization");

    vi.spyOn(window, "confirm").mockReturnValue(true);
    await userEvent.click(screen.getByRole("button", { name: "Remove" }));

    expect(await screen.queryByRole("listitem")).not.toBeInTheDocument();
  });
});
