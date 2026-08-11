// Adapts prepare-to-board's Meeting/Organization/BoardMember data into the
// local Session shape that doc.ts knows how to render. Several
// SessionMetadata fields (location, title, subtitle, caller, attendance)
// have no equivalent in our data model yet - they're tracked as follow-up
// issues (#32-#36) and left as empty placeholders here, matching the
// milestone's explicit scope.
import {
  BoardMember,
  Meeting,
  MotionNote as SourceMotionNote,
  Note as SourceNote,
  Organization,
} from "../schema";
import {
  ActionItemNote,
  MotionNote,
  Note,
  Person,
  Session,
  TextNote,
  Topic,
} from "./model";

const personFromBoardMemberOrName = (
  member: BoardMember | undefined,
  fallbackName?: string
): Person => ({
  title: "",
  firstName: "",
  lastName: member?.name ?? fallbackName ?? "Unknown",
});

const mapMotionOutcome = (
  status: SourceMotionNote["status"]
): MotionNote["outcome"] => {
  switch (status) {
    case "proposed":
    case "under_discussion":
      return "active";
    case "passed":
      return "passed";
    case "failed":
      return "failed";
    case "tabled":
      return "tabled";
  }
};

const mapNote = (note: SourceNote): Note => {
  if (note.type === "text") {
    const textNote: TextNote = { type: "text", text: note.text };
    return textNote;
  }
  if (note.type === "action_item") {
    const actionItemNote: ActionItemNote = {
      type: "actionItem",
      text: note.text,
      assignee: personFromBoardMemberOrName(note.assignee),
      dueDate: note.dueDate !== undefined ? new Date(note.dueDate) : new Date(),
      // undefined (not false) for open items: these come from the current
      // meeting's own topics, not a carried-forward past-action-items list
      // (which prepare-to-board doesn't track yet), so "(Added)" is the
      // correct marker rather than "(Carried forward)".
      completed: note.completedOn !== undefined ? true : undefined,
    };
    return actionItemNote;
  }
  const motionNote: MotionNote = {
    type: "motion",
    text: note.text,
    mover: personFromBoardMemberOrName(note.moverMember, note.mover),
    seconder: note.seconder
      ? personFromBoardMemberOrName(note.seconderMember, note.seconder)
      : undefined,
    inFavorCount: note.votesFor,
    opposedCount: note.votesAgainst,
    abstainedCount: note.votesAbstain,
    outcome: mapMotionOutcome(note.status),
  };
  return motionNote;
};

export const mapMeetingToSession = (
  meeting: Meeting,
  organization: Organization
): Session => {
  const completedMinutes = (meeting.minutes ?? []).filter((m) => m !== null);
  const startTime = meeting.liveStartTime ?? meeting.date;

  let topicCursor = new Date(startTime);
  const topics: Topic[] = completedMinutes.map((minute) => {
    const topicStart = new Date(topicCursor);
    topicCursor = new Date(
      topicCursor.getTime() + minute.durationMinutes * 60 * 1000
    );
    const notes = (minute.notes ?? []).filter((n) => n !== null).map(mapNote);
    return {
      title: minute.topic?.title ?? "(untitled)",
      notes,
      startTime: topicStart,
      durationMinutes: minute.durationMinutes,
    };
  });

  return {
    metadata: {
      membersPresent: [],
      membersAbsent: [],
      administrationPresent: [],
      othersReferenced: [],
      location: "",
      startTime,
      organization: organization.name,
      title: "Board Meeting",
      subtitle: "Regular Session",
    },
    calendar: [],
    topics,
    committees: [],
    pastActionItems: [],
  };
};
