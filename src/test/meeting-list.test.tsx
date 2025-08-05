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

    it("should not show meetings that aren't published", async () => {
      await addTestMeeting(new Date("2023-10-01T12:00:00Z"), "draft");
      await addTestMeeting(new Date("2023-10-08T12:00:00Z"), "published");
      await render(<App />, { startingPath: "/meetings" });
      expect(
        screen.queryByRole("link", { name: "10/1/2023" })
      ).not.toBeInTheDocument();
      expect(
        screen.getByRole("link", { name: "10/8/2023" })
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

    it("should show meetings in calendar view when toggled", async () => {
      const today = new Date();
      const meetingDate = new Date(
        today.getFullYear(),
        today.getMonth(),
        today.getDate(),
        12,
        0,
        0
      );
      await addTestMeeting(meetingDate);

      await render(<App />, { startingPath: "/meetings" });

      const calendarButton = screen.getByRole("button", { name: "Calendar" });
      await userEvent.click(calendarButton);

      expect(
        screen.getByRole("link", {
          name: "12:00 PM",
        })
      ).toBeInTheDocument();
    });

    it("should navigate months in calendar view", async () => {
      const today = new Date();
      const previousMonthDate = new Date(
        today.getFullYear(),
        today.getMonth() - 1,
        10,
        12,
        0,
        0
      );
      const nextMonthDate = new Date(
        today.getFullYear(),
        today.getMonth() + 1,
        10,
        12,
        0,
        0
      );
      await addTestMeeting(previousMonthDate);
      await addTestMeeting(nextMonthDate);

      await render(<App />, { startingPath: "/meetings" });

      const calendarButton = screen.getByRole("button", { name: "Calendar" });
      await userEvent.click(calendarButton);

      expect(
        screen.queryByRole("link", {
          name: previousMonthDate.toLocaleDateString(),
        })
      ).not.toBeInTheDocument();
      expect(
        screen.queryByRole("link", {
          name: nextMonthDate.toLocaleDateString(),
        })
      ).not.toBeInTheDocument();

      const prevButton = screen.getByRole("button", { name: "<" });
      await userEvent.click(prevButton);
      expect(
        screen.getByRole("link", {
          name: "12:00 PM",
        })
      ).toBeInTheDocument();

      const nextButton = screen.getByRole("button", { name: ">" });
      await userEvent.click(nextButton); // back to current
      await userEvent.click(nextButton); // move to next month
      expect(
        screen.getByRole("link", {
          name: "12:00 PM",
        })
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

    it("should show published and draft meetings", async () => {
      await addTestMeeting(new Date("2023-10-01T12:00:00Z"), "draft");
      await addTestMeeting(new Date("2023-10-08T12:00:00Z"), "published");

      await render(<App />, { startingPath: "/meetings" });

      expect(
        screen.getByRole("link", { name: "10/1/2023" })
      ).toBeInTheDocument();
      expect(
        screen.getByRole("link", { name: "10/8/2023" })
      ).toBeInTheDocument();
    });

    it("should set date when adding meeting from calendar cell", async () => {
      const today = new Date();
      const meetingDate = new Date(
        today.getFullYear(),
        today.getMonth(),
        10,
        12,
        0,
        0
      );
      await addTestMeeting(meetingDate);

      await render(<App />, { startingPath: "/meetings" });

      const calendarButton = screen.getByRole("button", { name: "Calendar" });
      await userEvent.click(calendarButton);

      const targetDate = new Date(
        today.getFullYear(),
        today.getMonth(),
        15,
        12,
        0,
        0
      );

      const addButton = screen.getByRole("button", {
        name: `Add meeting on ${targetDate.toLocaleDateString()}`,
      });
      await userEvent.click(addButton);

      const meetingDateInput = screen.getByRole<HTMLInputElement>("textbox", {
        name: "Meeting date",
      });
      expect(meetingDateInput.value).toBe(targetDate.toLocaleDateString());
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

    it("should be able to publish a draft meeting", async () => {
      const meeting = await addTestMeeting(
        new Date("2023-10-01T12:00:00Z"),
        "draft"
      );
      await render(<App />, { startingPath: `/meetings/${meeting.id}` });

      expect(screen.getByText("(Draft)", { exact: false })).toBeInTheDocument();

      const publishButton = screen.getByRole("button", {
        name: "Publish",
      });
      await userEvent.click(publishButton);

      expect(
        screen.getByText("(Scheduled)", { exact: false })
      ).toBeInTheDocument();
    });

    it("should not be able to publish a meeting that is already published", async () => {
      const meeting = await addTestMeeting(
        new Date("2023-10-01T12:00:00Z"),
        "published"
      );
      await render(<App />, { startingPath: `/meetings/${meeting.id}` });

      expect(
        screen.getByText("(Scheduled)", { exact: false })
      ).toBeInTheDocument();

      const publishButton = screen.queryByRole("button", {
        name: "Publish",
      });
      expect(publishButton).not.toBeInTheDocument();
    });
  });

  describe("admin", () => {
    beforeEach(async () => {
      await addTestOrganization("Test Org", "admin");
    });
    it("should handle no meetings", async () => {
      await render(<App />, { startingPath: "/meetings" });

      expect(
        screen.getByText("No meetings have been scheduled yet.")
      ).toBeInTheDocument();
    });
    it("should show meeting list when there are meetings", async () => {
      await addTestMeeting(new Date("2023-10-01T12:00:00Z"), "draft");
      await addTestMeeting(new Date("2023-10-08T12:00:00Z"), "published");

      await render(<App />, { startingPath: "/meetings" });

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
});
