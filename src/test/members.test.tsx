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

describe("Members", () => {
  beforeEach(async () => {
    await setupTestAccount("Test User");
    await addTestOrganization("Test Org", "reader");
    await render(<App />);

    const membersLink = screen.getByRole("link", { name: "Members" });
    await userEvent.click(membersLink);
  });

  afterEach(() => {
    resetTestAccount();
    vi.clearAllMocks();
  });

  describe("Members", () => {
    beforeEach(async () => {
      await act(async () => {
        await addMemberToTestOrganization("Test User 2", "writer");
        await addMemberToTestOrganization("Test User 3", "reader");
      });
    });

    it("should show all members of the organization with their roles", async () => {
      const membersList = await screen.findAllByRole("row");
      expect(membersList).toHaveLength(5); // header + 3 test users + self

      within(membersList[1]).getByText("Other Account");
      within(membersList[1]).getByText("Admin");

      within(membersList[2]).getByText("Test User (me)");
      within(membersList[2]).getByText("Reader");

      within(membersList[3]).getByText("Test User 2");
      within(membersList[3]).getByText("Writer");

      within(membersList[4]).getByText("Test User 3");
      within(membersList[4]).getByText("Reader");
    });
  });
});
