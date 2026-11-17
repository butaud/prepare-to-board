import { useMemo } from "react";
import { useQuery } from "convex/react";
import { api } from "../convexClient";
import type { ActionItemNote, Id, MeetingSummary } from "../schema";
import type { ActionItemWithContext } from "../util/actionItems";

export type ServerMeetingSummary = Omit<MeetingSummary, "date" | "liveStartTime"> & {
  date: number;
  liveStartTime?: number;
};

export type ServerActionItem = ActionItemNote & {
  meetingId: Id;
  minuteId: Id;
  topicTitle: string;
};

export const toMeetingSummary = (meeting: ServerMeetingSummary): MeetingSummary => ({
  ...meeting,
  date: new Date(meeting.date),
  liveStartTime:
    meeting.liveStartTime !== undefined ? new Date(meeting.liveStartTime) : undefined,
});

/** Meeting summaries for the selected organization; undefined while loading. */
export const useMeetingSummaries = (): MeetingSummary[] | undefined => {
  const serverSummaries = useQuery(api.app.meetingSummaries, {}) as
    | ServerMeetingSummary[]
    | null
    | undefined;
  return useMemo(
    () =>
      serverSummaries === undefined ? undefined : (serverSummaries ?? []).map(toMeetingSummary),
    [serverSummaries]
  );
};

// Items whose meeting isn't in `meetings` (shouldn't happen - both come from
// the same organization) are dropped rather than rendered without context.
export const joinActionItems = (
  items: ServerActionItem[],
  meetings: MeetingSummary[]
): ActionItemWithContext[] => {
  const meetingsById = new Map(meetings.map((meeting) => [meeting.id, meeting]));
  return items.flatMap((item) => {
    const meeting = meetingsById.get(item.meetingId);
    if (!meeting) return [];
    return [
      {
        ...item,
        meeting,
        createdInMeeting:
          (item.createdInMeetingId ? meetingsById.get(item.createdInMeetingId) : undefined) ??
          meeting,
      },
    ];
  });
};

/**
 * Every action item in the selected organization's minutes, with its
 * meeting context; undefined while loading.
 */
export const useActionItems = (): ActionItemWithContext[] | undefined => {
  const meetings = useMeetingSummaries();
  const serverItems = useQuery(api.app.actionItems, {}) as
    | ServerActionItem[]
    | null
    | undefined;
  return useMemo(
    () =>
      meetings === undefined || serverItems === undefined
        ? undefined
        : joinActionItems(serverItems ?? [], meetings),
    [meetings, serverItems]
  );
};
