import userEvent from "@testing-library/user-event";
import App from "../App";
import {
  act,
  addMemberToTestOrganization,
  addTestOrganization,
  render,
  resetTestAccount,
  screen,
  setupTestAccount,
  within,
} from "./test-utils";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

describe("Manage", () => {
  beforeEach(async () => {
    await setupTestAccount("Test User");
    await addTestOrganization("Test Org", "admin");
    await render(<App />);

    const manageLink = screen.getByRole("link", { name: "Manage" });
    await userEvent.click(manageLink);
  });

  afterEach(() => {
    resetTestAccount();
    vi.clearAllMocks();
  });
  describe("Organization", () => {
    it("should allow changing organization name", async () => {
      const orgSelector = screen.getByRole("combobox", {
        name: "Organization",
      });
      expect(orgSelector.textContent).toBe("Test Org");

      const nameInput = screen.getByRole("textbox", { name: "Name" });
      await userEvent.clear(nameInput);
      await userEvent.type(nameInput, "New Org Name");

      expect(orgSelector.textContent).toBe("New Org Name");
    });
  });

  describe("Members", () => {
    beforeEach(async () => {
      await act(async () => {
        await addMemberToTestOrganization("Test User 1", "admin");
        await addMemberToTestOrganization("Test User 2", "writer");
        await addMemberToTestOrganization("Test User 3", "reader");
      });
    });

    it("should show all members of the organization with their roles", async () => {
      const membersList = await screen.findAllByRole("row");
      expect(membersList).toHaveLength(5); // header + 3 test users + self

      within(membersList[1]).getByText("Test User (me)");
      within(membersList[1]).getByText("Admin");

      within(membersList[2]).getByText("Test User 1");
      within(membersList[2]).getByText("Admin");

      within(membersList[3]).getByText("Test User 2");
      expect(
        within(membersList[3]).getByRole<HTMLOptionElement>("option", {
          name: "Writer",
        }).selected
      ).toBe(true);

      within(membersList[4]).getByText("Test User 3");
      expect(
        within(membersList[4]).getByRole<HTMLOptionElement>("option", {
          name: "Reader",
        }).selected
      ).toBe(true);
    });

    it("should allow changing non-admin roles", async () => {
      const membersList = await screen.findAllByRole("row");
      const nonAdminMember = within(membersList[4]);
      const roleSelector = nonAdminMember.getByRole<HTMLSelectElement>(
        "combobox",
        { name: "Role" }
      );
      await userEvent.selectOptions(roleSelector, "Writer");
      expect(roleSelector.value).toBe("writer");
    });

    it("should confirm before changing role to admin and not change role if cancelled", async () => {
      const membersList = await screen.findAllByRole("row");
      const nonAdminMember = within(membersList[4]);
      const roleSelector = nonAdminMember.getByRole<HTMLSelectElement>(
        "combobox",
        { name: "Role" }
      );

      vi.spyOn(window, "confirm").mockReturnValue(false);

      await userEvent.selectOptions(roleSelector, "Admin");

      expect(window.confirm).toHaveBeenCalledWith(
        "Are you sure you want to make this user an admin? You will not be able to change their role back."
      );

      expect(roleSelector.value).toBe("reader"); // Role should not have changed
    });

    it("should confirm before changing role to admin and change role if confirmed", async () => {
      const membersList = await screen.findAllByRole("row");
      const nonAdminMember = within(membersList[4]);
      const roleSelector = nonAdminMember.getByRole<HTMLSelectElement>(
        "combobox",
        { name: "Role" }
      );

      vi.spyOn(window, "confirm").mockReturnValue(true);

      await userEvent.selectOptions(roleSelector, "Admin");

      expect(window.confirm).toHaveBeenCalledWith(
        "Are you sure you want to make this user an admin? You will not be able to change their role back."
      );

      expect(roleSelector.value).toBe("admin"); // Role should have changed
    });

    it("should not allow changing admin roles", async () => {
      const membersList = await screen.findAllByRole("row");
      const adminMember = within(membersList[2]);
      expect(
        adminMember.queryByRole("combobox", { name: "Role" })
      ).not.toBeInTheDocument();
    });

    it("should not allow changing self role", async () => {
      const membersList = await screen.findAllByRole("row");
      const selfMember = within(membersList[1]);
      expect(
        selfMember.queryByRole("combobox", { name: "Role" })
      ).not.toBeInTheDocument();
    });

    it("should allow removing non-admin members from the organization", async () => {
      const membersList = await screen.findAllByRole("row");
      const nonAdminMember = within(membersList[4]);
      const removeButton = nonAdminMember.getByRole("button", {
        name: "Remove",
      });

      vi.spyOn(window, "confirm").mockReturnValue(true);
      await userEvent.click(removeButton);

      expect(window.confirm).toHaveBeenCalledWith(
        "Are you sure you want to remove this member from the organization?"
      );

      expect(await screen.queryByText("Test User 3")).not.toBeInTheDocument();
    });

    it("should not allow removing admin members from the organization", async () => {
      const membersList = await screen.findAllByRole("row");
      const adminMember = within(membersList[2]);
      const removeButton = adminMember.getByRole("button", {
        name: "Remove",
      });
      expect(removeButton).toBeDisabled();
      await userEvent.click(removeButton);
      expect(window.confirm).not.toHaveBeenCalledWith(
        "Are you sure you want to remove this member from the organization?"
      );
      expect(await screen.queryByText("Test User 2")).toBeInTheDocument();
    });

    it("should not allow removing self from the organization", async () => {
      const membersList = await screen.findAllByRole("row");
      const selfMember = within(membersList[1]);
      const removeButton = selfMember.queryByRole("button", {
        name: "Remove",
      });
      expect(removeButton).not.toBeInTheDocument();
    });

    it("should allow creating an invite link for the organization", async () => {
      const inviteLinkButton = screen.getByRole("button", {
        name: "Invite a new user",
      });

      await userEvent.click(inviteLinkButton);

      const inviteLinkInput = await screen.findByLabelText<HTMLInputElement>(
        "Invite link"
      );
      expect(inviteLinkInput.value).toContain("invite#/invite");
    });
  });
});
