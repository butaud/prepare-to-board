// Adapts prepare-to-board's Meeting/Organization/BoardMember data into the
// local Session shape that doc.ts knows how to render.
import {
  BoardMember,
  Meeting,
  MotionNote as SourceMotionNote,
  Note as SourceNote,
  Organization,
} from "../schema";
import {
  ActionItemNote,
  Caller,
  CalendarMonthEntry,
  Committee,
  MotionNote,
  Note,
  PastActionItem,
  Person,
  Session,
  SessionMetadata,
  TextNote,
  Topic,
} from "./model";

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
] as const;

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
      // undefined (not false) for open items: these are the current
      // meeting's own new topics, so "(Added)" is the correct marker rather
      // than "(Carried forward)" - see buildPastActionItems for how earlier
      // meetings' action items (which do use true/false) are combined in.
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

// Action items carry their completion status in place on the original
// minute/note they were created on - completing one from an older meeting's
// always-editable minutes page mutates that same note rather than creating a
// new one. So the current, correct completion status of every past action
// item is just whatever's on the note right now: no separate "completed
// since last meeting" tracking is needed, this naturally covers both
// still-open carried-forward items and ones resolved since.
const buildPastActionItems = (
  meeting: Meeting,
  organization: Organization
): PastActionItem[] => {
  const pastActionItems: PastActionItem[] = [];
  for (const otherMeeting of organization.meetings) {
    if (otherMeeting.id === meeting.id) continue;
    if (otherMeeting.date.getTime() >= meeting.date.getTime()) continue;
    for (const minute of otherMeeting.minutes ?? []) {
      if (!minute) continue;
      for (const note of minute.notes ?? []) {
        if (!note || note.type !== "action_item") continue;
        if (note.dueDate === undefined) continue;
        pastActionItems.push({
          text: note.text,
          assignee: personFromBoardMemberOrName(note.assignee),
          dueDate: new Date(note.dueDate),
          completed: note.completedOn !== undefined,
        });
      }
    }
  }
  return pastActionItems;
};

const buildAttendance = (
  meeting: Meeting,
  members: BoardMember[]
): Pick<
  SessionMetadata,
  "membersPresent" | "membersAbsent" | "administrationPresent"
> => {
  const attendanceByMember = new Map(
    (meeting.attendance ?? []).map((entry) => [entry.boardMemberId, entry.present])
  );
  const membersPresent: Person[] = [];
  const membersAbsent: Person[] = [];
  const administrationPresent: Person[] = [];
  for (const member of members) {
    const present = attendanceByMember.get(member.id);
    if (present === undefined) continue;
    // Roster entries created before the `type` field existed have no type
    // set - treat them as "board", matching AttendanceEditor's UI grouping.
    const type = member.type ?? "board";
    if (type === "board") {
      (present ? membersPresent : membersAbsent).push(
        personFromBoardMemberOrName(member)
      );
    } else if (type === "administration" && present) {
      administrationPresent.push(personFromBoardMemberOrName(member));
    }
    // type === "other" has no corresponding attendance line in doc.ts (only
    // membersPresent/membersAbsent/administrationPresent exist) - tracked in
    // the UI regardless since attendance-taking covers any roster type, but
    // "other" entries are intentionally omitted from the exported document.
  }
  return { membersPresent, membersAbsent, administrationPresent };
};

const buildCaller = (
  meeting: Meeting,
  members: BoardMember[]
): Caller | undefined => {
  if (!meeting.callerName) return undefined;
  const callerMember = members.find((member) => member.id === meeting.callerId);
  return {
    person: personFromBoardMemberOrName(callerMember, meeting.callerName),
    role: meeting.callerRole ?? "",
  };
};

const buildCalendar = (organization: Organization): CalendarMonthEntry[] => {
  const itemsByMonth = new Map<number, Organization["calendarItems"]>();
  for (const item of organization.calendarItems) {
    const existing = itemsByMonth.get(item.month) ?? [];
    existing.push(item);
    itemsByMonth.set(item.month, existing);
  }
  const entries: CalendarMonthEntry[] = [];
  MONTH_NAMES.forEach((name, index) => {
    const items = itemsByMonth.get(index + 1);
    if (!items || items.length === 0) return;
    entries.push({
      month: name,
      items: items.map((item) => ({ text: item.text, completed: item.completed })),
    });
  });
  return entries;
};

const buildCommittees = (organization: Organization): Committee[] =>
  organization.committees.map((committee) => ({
    name: committee.name,
    type: committee.type,
  }));

export const mapMeetingToSession = (
  meeting: Meeting,
  organization: Organization
): Session => {
  const members = organization.members;
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
      ...buildAttendance(meeting, members),
      location: meeting.location ?? "",
      startTime,
      organization: organization.name,
      title: meeting.title ?? "Board Meeting",
      subtitle: meeting.subtitle ?? "Regular Session",
      caller: buildCaller(meeting, members),
      committeeDocUrl: organization.committeeDocUrl,
    },
    calendar: buildCalendar(organization),
    topics,
    committees: buildCommittees(organization),
    pastActionItems: buildPastActionItems(meeting, organization),
  };
};
