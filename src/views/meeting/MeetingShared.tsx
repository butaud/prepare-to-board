import { useCoState } from "jazz-react";
import { Outlet, useParams } from "react-router-dom";
import { Meeting } from "../../schema";
import { ID } from "jazz-tools";
import { Breadcrumbs } from "../../ui/Breadcrumbs";

export const MeetingShared = () => {
  const { meetingId } = useParams();
  const meeting = useCoState(Meeting, meetingId as ID<Meeting>, {
    resolve: {
      plannedAgenda: { $each: true },
    },
  });
  return (
    <div>
      <Breadcrumbs dynamicTitle={meeting?.date?.toLocaleDateString()} />
      <Outlet context={meeting} />
    </div>
  );
};
