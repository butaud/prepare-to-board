import { useCoState } from "jazz-tools/react";
import { Outlet, useParams } from "react-router-dom";
import { Meeting, Schema } from "../../schema";
import { ID } from "jazz-tools";
import { Breadcrumbs } from "../../ui/Breadcrumbs";

export const MeetingShared = () => {
  const { meetingId } = useParams();
  const meeting = useCoState(Schema.Meeting, meetingId as ID<Meeting>, {
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
