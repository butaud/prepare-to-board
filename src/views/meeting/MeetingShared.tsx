import { useCoState } from "jazz-react";
import { Outlet, useParams } from "react-router-dom";
import { Meeting } from "../../schema";
import { ID } from "jazz-tools";

export const MeetingShared = () => {
  const { meetingId } = useParams();
  const meeting = useCoState(Meeting, meetingId as ID<Meeting>);
  return (
    <div>
      <h1>{meeting?.date?.toLocaleDateString()} Meeting</h1>
      <Outlet context={meeting} />
    </div>
  );
};
