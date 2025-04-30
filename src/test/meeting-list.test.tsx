import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  addTestMeeting,
  addTestOrganization,
  render,
  resetTestAccount,
  screen,
  setupTestAccount,
} from "./test-utils";
import App from "../App";
import userEvent from "@testing-library/user-event";

describe("Meeting List", () => {
  beforeEach(async () => {
    await setupTestAccount("Test User");
  });

  afterEach(() => {
    resetTestAccount();
  });

  describe("member", () => {
    beforeEach(async () => {
      await addTestOrganization("Test Org", "reader");
    });

    it("should handle no meetings", async () => {
      await render(<App />, { startingPath: "/meetings" });

      expect(
        screen.getByText("No meetings have been scheduled yet.")
      ).toBeInTheDocument();
    });

    it("should show meeting list when there are meetings", async () => {
      await addTestMeeting(new Date("2023-10-01T12:00:00Z"));
      await addTestMeeting(new Date("2023-10-08T12:00:00Z"));

      await render(<App />, { startingPath: "/meetings" });

      expect(
        screen.queryByText("No meetings have been scheduled yet.")
      ).not.toBeInTheDocument();

      expect(
        screen.getByRole("link", { name: "10/1/2023" })
      ).toBeInTheDocument();
      expect(
        screen.getByRole("link", { name: "10/8/2023" })
      ).toBeInTheDocument();
    });

    it("should not be able to create meeting", async () => {
      await render(<App />, { startingPath: "/meetings" });

      expect(
        screen.queryByRole("button", { name: "Create a new meeting" })
      ).not.toBeInTheDocument();
    });
  });

  describe("officer", () => {
    beforeEach(async () => {
      await addTestOrganization("Test Org", "writer");
    });

    it("should handle no meetings", async () => {
      await render(<App />, { startingPath: "/meetings" });

      expect(
        screen.getByText("No meetings have been scheduled yet.")
      ).toBeInTheDocument();
    });

    it("should show meeting list when there are meetings", async () => {
      await addTestMeeting(new Date("2023-10-01T12:00:00Z"));
      await addTestMeeting(new Date("2023-10-08T12:00:00Z"));

      await render(<App />, { startingPath: "/meetings" });

      expect(
        screen.queryByText("No meetings have been scheduled yet.")
      ).not.toBeInTheDocument();

      expect(
        screen.getByRole("link", { name: "10/1/2023" })
      ).toBeInTheDocument();
      expect(
        screen.getByRole("link", { name: "10/8/2023" })
      ).toBeInTheDocument();
    });

    it("should be able to create meeting", async () => {
      await render(<App />, { startingPath: "/meetings" });

      const createMeetingButton = await screen.findByRole("button", {
        name: "Create a new meeting",
      });
      await userEvent.click(createMeetingButton);

      const meetingDateInput = screen.getByRole("textbox", {
        name: "Meeting date",
      });
      await userEvent.clear(meetingDateInput);
      await userEvent.type(meetingDateInput, "04/10/2023");
      // Really annoying but the date picker doesn't register the change until
      // we also click on the corresponding date in the calendar
      await userEvent.click(await screen.findByText(10));

      const meetingTimeInput = screen.getByRole("textbox", {
        name: "Meeting time",
      });
      await userEvent.type(meetingTimeInput, "12:00 PM");

      const saveButton = screen.getByText("Save");
      await userEvent.click(saveButton);

      expect(
        await screen.findByRole("link", { name: "4/10/2023" })
      ).toBeInTheDocument();
    });
  });

  describe("admin", () => {
    beforeEach(async () => {
      await addTestOrganization("Test Org", "admin");
    });
    it("should handle no meetings", async () => {});
    it("should show meeting list when there are meetings", async () => {});
    it("should show button to create meeting", async () => {});
  });
});
