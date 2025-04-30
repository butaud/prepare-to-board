import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  act,
  addTestMeeting,
  addTestOrganization,
  addTestTopic,
  fireEvent,
  render,
  resetTestAccount,
  screen,
  setupTestAccount,
} from "./test-utils";
import App from "../App";
import userEvent from "@testing-library/user-event";
import { Meeting } from "../schema";

describe("MeetingView", () => {
  beforeEach(async () => {
    await setupTestAccount("Test User");
  });

  afterEach(() => {
    resetTestAccount();
  });
  describe("Topic List", () => {
    describe("member", () => {
      let testMeeting: Meeting;
      beforeEach(async () => {
        await addTestOrganization("Test Org", "reader");
        testMeeting = await addTestMeeting(new Date("2023-10-01T12:00:00Z"));

        await render(<App />, { startingPath: "/meetings" });
        await userEvent.click(screen.getByRole("link", { name: "10/1/2023" }));
      });
      it("should show topic list when there are topics", async () => {
        if (!testMeeting) {
          throw new Error("Test meeting not set up");
        }

        await act(async () => {
          await addTestTopic(testMeeting, "Test Topic 1");
          await addTestTopic(testMeeting, "Test Topic 2");
        });

        expect(
          screen.queryByText("No topics have been scheduled yet.")
        ).not.toBeInTheDocument();
        const topic1 = screen.getByRole("heading", { name: "Test Topic 1" });
        const topic2 = screen.getByRole("heading", { name: "Test Topic 2" });

        expect(topic1).toBeInTheDocument();
        expect(topic2).toBeInTheDocument();
        expect(topic1).toPrecede(topic2);
      });

      it("should show empty state when there are no topics", () => {
        expect(
          screen.getByText("No topics have been scheduled yet.")
        ).toBeInTheDocument();
      });
    });

    describe("officer", () => {
      let testMeeting: Meeting;
      beforeEach(async () => {
        await addTestOrganization("Test Org", "writer");
        testMeeting = await addTestMeeting(new Date("2023-10-01T12:00:00Z"));

        await render(<App />, { startingPath: "/meetings" });
        await userEvent.click(screen.getByRole("link", { name: "10/1/2023" }));
      });

      it("should allow creating new topics", async () => {
        if (!testMeeting) {
          throw new Error("Test meeting not set up");
        }

        await act(async () => {
          await addTestTopic(testMeeting, "Test Topic 1");
          await addTestTopic(testMeeting, "Test Topic 2");
        });

        const topic1 = screen.getByRole("heading", { name: "Test Topic 1" });
        const topic2 = screen.getByRole("heading", { name: "Test Topic 2" });

        const addTopicButton = screen.getByRole("button", {
          name: "Add Topic",
        });
        await userEvent.click(addTopicButton);
        const newTopicInput = screen.getByRole("textbox", {
          name: "Topic",
        });
        await userEvent.type(newTopicInput, "New Topic");
        await userEvent.keyboard("{Enter}");

        const newTopic = screen.getByRole("heading", { name: "New Topic" });
        expect(newTopic).toBeInTheDocument();

        expect(topic1).toPrecede(topic2);
        expect(topic2).toPrecede(newTopic);
      });

      it("should allow deleting topics", async () => {
        if (!testMeeting) {
          throw new Error("Test meeting not set up");
        }

        await act(async () => {
          await addTestTopic(testMeeting, "Test Topic 1");
          await addTestTopic(testMeeting, "Test Topic 2");
        });

        const topic1 = screen.getByRole("heading", { name: "Test Topic 1" });
        const topic2 = screen.getByRole("heading", { name: "Test Topic 2" });

        fireEvent.contextMenu(topic1);

        const deleteButton = screen.getByRole("button", {
          name: "Delete Topic",
        });
        await userEvent.click(deleteButton);

        expect(topic1).not.toBeInTheDocument();
        expect(topic2).toBeInTheDocument();
      });

      it("should allow editing topic titles by double-clicking", async () => {
        if (!testMeeting) {
          throw new Error("Test meeting not set up");
        }

        await act(async () => {
          await addTestTopic(testMeeting, "Test Topic 1");
        });

        const topic1 = screen.getByRole("heading", { name: "Test Topic 1" });

        await userEvent.dblClick(topic1);

        const editInput = screen.getByRole("textbox", {
          name: "Topic",
        });
        await userEvent.clear(editInput);
        await userEvent.type(editInput, "Edited Topic");
        await userEvent.keyboard("{Enter}");

        expect(
          screen.getByRole("heading", { name: "Edited Topic" })
        ).toBeInTheDocument();
      });

      it("should allow editing topic titles by button click", async () => {
        if (!testMeeting) {
          throw new Error("Test meeting not set up");
        }

        await act(async () => {
          await addTestTopic(testMeeting, "Test Topic 1");
        });

        const topic1 = screen.getByRole("heading", { name: "Test Topic 1" });

        fireEvent.contextMenu(topic1);
        const editButton = screen.getByRole("button", {
          name: "Edit Topic",
        });
        await userEvent.click(editButton);

        const editInput = screen.getByRole("textbox", {
          name: "Topic",
        });
        await userEvent.clear(editInput);
        await userEvent.type(editInput, "Edited Topic");
        await userEvent.keyboard("{Enter}");

        expect(
          screen.getByRole("heading", { name: "Edited Topic" })
        ).toBeInTheDocument();
      });
    });
  });
});
