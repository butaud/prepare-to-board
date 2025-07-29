import { Breadcrumbs } from "../../ui/Breadcrumbs";
import { useLoadMeetingFromParams } from "../../hooks/Meeting";
import { getMeetingDisplayStatus } from "../../schema";

export const MeetingShared = () => {
  const { meeting, outlet } = useLoadMeetingFromParams();
  if (meeting === undefined) {
    return <p>Loading...</p>;
  }
  if (meeting === null) {
    return <p>Meeting not found</p>;
  }
  const breadcrumbTitle = `${meeting.date.toLocaleDateString()} (${getMeetingDisplayStatus(
    meeting
  )})`;
  return (
    <div>
      <Breadcrumbs dynamicTitle={breadcrumbTitle} />
      {outlet}
    </div>
  );
};
