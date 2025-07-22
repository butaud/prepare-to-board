import { useAccount, useCoState } from "jazz-tools/react-core";
import { Meeting, Schema } from "../schema";
import { Outlet, useParams } from "react-router-dom";
import { createContext, useContext } from "react";

export const useLoadMeetingFromParams = () => {
  const { meetingId } = useParams();
  return useLoadMeeting(meetingId);
};

export const useLoadMeeting = (meetingId: string | undefined) => {
  const meeting: Meeting | undefined | null = useCoState(
    Schema.Meeting,
    meetingId,
    {
      resolve: {
        plannedAgenda: {
          $each: {
            plannedTopic: true,
          },
        },
      },
    }
  );
  return {
    meeting,
    outlet: meeting && (
      <MeetingContext.Provider value={meeting}>
        <Outlet context={meeting satisfies Meeting} />
      </MeetingContext.Provider>
    ),
  };
};

export const useLoadMeetingShadow = () => {
  const meeting = useMeeting();
  const { me: meWithShadows } = useAccount(Schema.UserAccount, {
    resolve: {
      root: {
        meetingShadows: {
          $each: {
            meeting: true,
            notes: true,
            draftTopics: {
              $each: {
                anchor: true,
                plannedTopic: true,
              },
            },
          },
        },
      },
    },
  });
  if (!meWithShadows) {
    return undefined;
  }
  let meetingShadow = meWithShadows.root.meetingShadows.find(
    (shadow) => shadow.meeting.id === meeting.id
  );
  if (!meetingShadow) {
    meetingShadow = Schema.MeetingShadow.create({
      meeting: meeting,
      notes: Schema.ListOfNotes.create([]),
      draftTopics: Schema.ListOfDraftTopics.create([]),
    });
    meWithShadows.root.meetingShadows.push(meetingShadow);
  }
  return meetingShadow;
};

export const MeetingContext = createContext<Meeting | undefined>(undefined);

export const useMeeting = () => {
  const context = useContext(MeetingContext);
  if (context === undefined) {
    throw new Error("useMeeting must be used within a MeetingProvider");
  }
  return context;
};
