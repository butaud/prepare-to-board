import { useQuery } from "convex/react";
import { Outlet, useParams } from "react-router-dom";
import { createContext, useContext } from "react";
import { api } from "../convexClient";
import { Meeting } from "../schema";

const toDateMeeting = (meeting: Meeting & { date: number; liveStartTime?: number }): Meeting => ({
  ...meeting,
  date: new Date(meeting.date),
  liveStartTime: meeting.liveStartTime ? new Date(meeting.liveStartTime) : undefined,
});

export const useLoadMeetingFromParams = () => {
  const { meetingId } = useParams();
  return useLoadMeeting(meetingId);
};

export const useLoadMeeting = (meetingId: string | undefined) => {
  const serverMeeting = useQuery(
    api.app.meeting,
    meetingId ? { meetingId } : "skip"
  ) as (Meeting & { date: number; liveStartTime?: number }) | null | undefined;

  const meeting =
    serverMeeting === undefined || serverMeeting === null
      ? serverMeeting
      : toDateMeeting(serverMeeting);

  return {
    meeting,
    outlet: meeting && (
      <MeetingContext.Provider value={meeting}>
        <Outlet context={meeting satisfies Meeting} />
      </MeetingContext.Provider>
    ),
  };
};

export const useLoadMeetingShadow = () => undefined;

export const MeetingContext = createContext<Meeting | undefined>(undefined);

export const useMeeting = () => {
  const context = useContext(MeetingContext);
  if (context === undefined) {
    throw new Error("useMeeting must be used within a MeetingProvider");
  }
  return context;
};
