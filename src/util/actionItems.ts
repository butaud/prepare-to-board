import { type ActionItemNote, type Meeting } from "../schema";

export type ActionItemWithContext = ActionItemNote & {
  /** The meeting whose minutes this item's note is physically stored under. */
  meeting: Meeting;
  /**
   * The meeting credited as this item's origin - normally the same as
   * `meeting`, but editable independently (e.g. correcting a
   * backdated/misfiled item) without moving the note itself. Falls back to
   * `meeting` for items recorded before this field existed.
   */
  createdInMeeting: Meeting;
  minuteId: string;
  topicTitle: string;
};

export const extractActionItems = (meetings: Meeting[]): ActionItemWithContext[] => {
  const meetingsById = new Map(meetings.map((meeting) => [meeting.id, meeting]));
  return meetings.flatMap((meeting) =>
    meeting.minutes.flatMap((minute) =>
      (minute.notes ?? [])
        .filter((note): note is ActionItemNote => note.type === "action_item")
        .map((note) => ({
          ...note,
          meeting,
          createdInMeeting:
            (note.createdInMeetingId
              ? meetingsById.get(note.createdInMeetingId)
              : undefined) ?? meeting,
          minuteId: minute.id,
          topicTitle: minute.topic.title,
        }))
    )
  );
};

export const meetingLink = (meeting: Meeting): string => {
  if (meeting.status === "live") return `/meetings/${meeting.id}/present`;
  if (meeting.status === "completed") return `/meetings/${meeting.id}/minutes`;
  return `/meetings/${meeting.id}`;
};

export const formatRelativeMeetingDate = (date: Date): string => {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const meetingDay = new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate()
  );
  const diffDays = Math.round(
    (meetingDay.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
  );

  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Tomorrow";
  if (diffDays === -1) return "Yesterday";
  if (diffDays > 1 && diffDays <= 13) return `In ${diffDays} days`;
  if (diffDays < -1 && diffDays >= -13) return `${Math.abs(diffDays)} days ago`;

  return date.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
};
