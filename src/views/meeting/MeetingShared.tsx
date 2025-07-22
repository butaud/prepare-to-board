import { Breadcrumbs } from "../../ui/Breadcrumbs";
import { useLoadMeetingFromParams } from "../../hooks/Meeting";

export const MeetingShared = () => {
  const { meeting, outlet } = useLoadMeetingFromParams();
  if (meeting === undefined) {
    return <p>Loading...</p>;
  }
  if (meeting === null) {
    return <p>Meeting not found</p>;
  }
  return (
    <div>
      <Breadcrumbs dynamicTitle={meeting?.date?.toLocaleDateString()} />
      {outlet}
    </div>
  );
};
