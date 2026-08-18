// Adapts prepare-to-board's Meeting/Organization/BoardMember data into the
// local Session shape that doc.ts knows how to render.
import {
  BoardMember,
  getBoardMemberLastName,
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
): Person => {
  if (member) {
    // Only split off a last name once a salutation is set - otherwise fall
    // back to the full name, since "title: '', lastName: <first+last>" is
    // how makeSpeakerReference already renders a plain full name.
    return {
      title: member.salutation ?? "",
      firstName: "",
      lastName: member.salutation
        ? (getBoardMemberLastName(member) ?? member.name)
        : member.name,
    };
  }
  return { title: "", firstName: "", lastName: fallbackName ?? "Unknown" };
};

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

// A meeting's actual end, for deciding whether an action item was already
// reported as closed by the time of the previous meeting. Falls back to the
// scheduled date if the meeting was never actually run live.
const computeMeetingEndTime = (meeting: Meeting): number => {
  const start = meeting.liveStartTime ?? meeting.date;
  const totalMinutes = (meeting.minutes ?? [])
    .filter((m) => m !== null)
    .reduce((sum, m) => sum + m.durationMinutes, 0);
  return start.getTime() + totalMinutes * 60 * 1000;
};

// Action items carry their completion status in place on the original
// minute/note they were created on - completing one from an older meeting's
// always-editable minutes page mutates that same note rather than creating a
// new one, so the note's current completedOn is always up to date.
//
// An item belongs in this meeting's carried-forward list when it was
// created in an earlier meeting (per its createdInMeetingId, not raw
// timestamps - action items can only be created during a meeting, so
// meeting order is what "before/after" means here) and it wasn't *already*
// reported as closed by the end of the immediately preceding meeting. That
// second condition keeps items that were just resolved since the last
// meeting (worth reporting as newly "Done") without re-listing items that
// were already closed out and reported done long ago.
const buildPastActionItems = (
  meeting: Meeting,
  organization: Organization
): PastActionItem[] => {
  const meetingsById = new Map(organization.meetings.map((m) => [m.id, m]));
  const previousMeeting = organization.meetings
    .filter((m) => m.id !== meeting.id && m.date.getTime() < meeting.date.getTime())
    .sort((a, b) => b.date.getTime() - a.date.getTime())[0];
  const previousMeetingEndTime = previousMeeting
    ? computeMeetingEndTime(previousMeeting)
    : undefined;

  const pastActionItems: PastActionItem[] = [];
  for (const sourceMeeting of organization.meetings) {
    for (const minute of sourceMeeting.minutes ?? []) {
      if (!minute) continue;
      for (const note of minute.notes ?? []) {
        if (!note || note.type !== "action_item") continue;
        if (note.dueDate === undefined) continue;

        const createdInMeeting = note.createdInMeetingId
          ? (meetingsById.get(note.createdInMeetingId) ?? sourceMeeting)
          : sourceMeeting;
        if (createdInMeeting.date.getTime() >= meeting.date.getTime()) continue;

        const alreadyClosedAsOfPreviousMeeting =
          note.completedOn !== undefined &&
          previousMeetingEndTime !== undefined &&
          note.completedOn < previousMeetingEndTime;
        if (alreadyClosedAsOfPreviousMeeting) continue;

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
    // The caller is always a board member; their roster "title" (President,
    // Treasurer, etc.) doubles as their caller role rather than asking the
    // officer to type one in separately. Fall back to a generic role when
    // that board member has no title set.
    role: callerMember?.title ? `the ${callerMember.title}` : "a board member",
  };
};

const DEFAULT_CALENDAR_CONTEXT_MONTHS = 2;

// Builds the calendar entries for the months around `referenceDate` - the
// trailing `contextMonths`, the current month, and the upcoming
// `contextMonths` - in chronological order, wrapping across year
// boundaries (e.g. Nov/Dec/Jan/Feb/Mar). calendarItems only carry a month
// number (1-12), not a year, so "trailing"/"upcoming" is relative to the
// reference month only.
const buildCalendar = (
  organization: Organization,
  referenceDate: Date,
  contextMonths: number
): CalendarMonthEntry[] => {
  const itemsByMonth = new Map<number, Organization["calendarItems"]>();
  for (const item of organization.calendarItems) {
    const existing = itemsByMonth.get(item.month) ?? [];
    existing.push(item);
    itemsByMonth.set(item.month, existing);
  }
  const referenceMonth = referenceDate.getMonth() + 1;
  const entries: CalendarMonthEntry[] = [];
  const seenMonths = new Set<number>();
  for (let offset = -contextMonths; offset <= contextMonths; offset++) {
    const month = (((referenceMonth - 1 + offset) % 12) + 12) % 12 + 1;
    if (seenMonths.has(month)) continue;
    seenMonths.add(month);
    const items = itemsByMonth.get(month);
    if (!items || items.length === 0) continue;
    entries.push({
      month: MONTH_NAMES[month - 1],
      items: items.map((item) => ({ text: item.text, completed: item.completed })),
    });
  }
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
    calendar: buildCalendar(
      organization,
      meeting.date,
      organization.calendarContextMonths ?? DEFAULT_CALENDAR_CONTEXT_MONTHS
    ),
    topics,
    committees: buildCommittees(organization),
    pastActionItems: buildPastActionItems(meeting, organization),
  };
};
