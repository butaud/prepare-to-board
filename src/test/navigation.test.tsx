import { beforeEach, describe, expect, it } from "vitest";
import { render, screen } from "./test-utils";
import App from "../App";
import userEvent from "@testing-library/user-event";

describe("Navigation", () => {
  describe("unsigned in", () => {
    it("should not show any nav links when not signed in", async () => {
      await render(<App />, { isSignedIn: false });

      await screen.findByRole("heading", { name: "Welcome!" });
      expect(
        screen.queryByRole("link", { name: "Members" })
      ).not.toBeInTheDocument();
    });
  });

  describe("signed in non-admin", () => {
    beforeEach(async () => {
      await render(<App />, {
        isSignedIn: true,
        organization: { name: "Test Org", isAdmin: false },
      });
    });

    it("should not show manage link", async () => {
      expect(
        screen.queryByRole("link", { name: "Manage" })
      ).not.toBeInTheDocument();
    });

    it("should have working members link", async () => {
      const membersLink = screen.getByRole("link", { name: "Members" });
      expect(membersLink).toBeInTheDocument();

      await userEvent.click(membersLink);
      expect(
        await screen.findByRole("heading", { name: "Members" })
      ).toBeInTheDocument();
    });

    it("should have working meetings link", async () => {
      const meetingsLink = screen.getByRole("link", { name: "Meetings" });
      expect(meetingsLink).toBeInTheDocument();

      await userEvent.click(meetingsLink);
      expect(
        await screen.findByRole("heading", { name: "Meetings" })
      ).toBeInTheDocument();
    });

    it("should have working action items link", async () => {
      const actionItemsLink = screen.getByRole("link", {
        name: "Action Items",
      });
      expect(actionItemsLink).toBeInTheDocument();

      await userEvent.click(actionItemsLink);
      expect(
        await screen.findByRole("heading", { name: "Action Items" })
      ).toBeInTheDocument();
    });

    it("should have working calendar link", async () => {
      const calendarLink = screen.getByRole("link", {
        name: "Annual Calendar",
      });
      expect(calendarLink).toBeInTheDocument();

      await userEvent.click(calendarLink);
      expect(
        await screen.findByRole("heading", { name: "Annual Calendar" })
      ).toBeInTheDocument();
    });
  });

  describe("signed in admin", () => {
    beforeEach(async () => {
      await render(<App />, {
        isSignedIn: true,
        organization: { name: "Test Org", isAdmin: true },
      });
    });

    it("should not show members link", async () => {
      expect(
        screen.queryByRole("link", { name: "Members" })
      ).not.toBeInTheDocument();
    });

    it("should have working manage link", async () => {
      const manageLink = screen.getByRole("link", { name: "Manage" });
      expect(manageLink).toBeInTheDocument();

      await userEvent.click(manageLink);
      expect(
        await screen.findByRole("heading", { name: "Manage" })
      ).toBeInTheDocument();
    });

    it("should have working meetings link", async () => {
      const meetingsLink = screen.getByRole("link", { name: "Meetings" });
      expect(meetingsLink).toBeInTheDocument();

      await userEvent.click(meetingsLink);
      expect(
        await screen.findByRole("heading", { name: "Meetings" })
      ).toBeInTheDocument();
    });

    it("should have working action items link", async () => {
      const actionItemsLink = screen.getByRole("link", {
        name: "Action Items",
      });
      expect(actionItemsLink).toBeInTheDocument();

      await userEvent.click(actionItemsLink);
      expect(
        await screen.findByRole("heading", { name: "Action Items" })
      ).toBeInTheDocument();
    });

    it("should have working calendar link", async () => {
      const calendarLink = screen.getByRole("link", {
        name: "Annual Calendar",
      });
      expect(calendarLink).toBeInTheDocument();

      await userEvent.click(calendarLink);
      expect(
        await screen.findByRole("heading", { name: "Annual Calendar" })
      ).toBeInTheDocument();
    });
  });
});
