import { useAccount } from "jazz-react";
import { useState } from "react";
import { CreateMeetingDialog } from "../../ui/dialogs/CreateMeetingDialog";
import { Link } from "react-router-dom";
import { Breadcrumbs } from "../../ui/Breadcrumbs";
import { SlPlus } from "react-icons/sl";

export const MeetingList = () => {
  const { me } = useAccount({
    resolve: {
      root: {
        selectedOrganization: {
          meetings: {
            $each: true,
          },
        },
      },
    },
  });

  const [isCreateMeetingOpen, setCreateMeetingOpen] = useState(false);

  const meetings = me?.root.selectedOrganization?.meetings ?? [];

  const isOfficer =
    me?.root.selectedOrganization && me.canWrite(me.root.selectedOrganization);

  return (
    <div>
      {isCreateMeetingOpen && (
        <CreateMeetingDialog closeDialog={() => setCreateMeetingOpen(false)} />
      )}
      <Breadcrumbs />
      <ul>
        {isOfficer && (
          <li>
            <button onClick={() => setCreateMeetingOpen(true)}>
              <SlPlus /> Create a new meeting
            </button>
          </li>
        )}
        {meetings.map((meeting) => (
          <li key={meeting.id}>
            <Link to={`/meetings/${meeting.id}`}>
              {meeting.date?.toLocaleDateString() ?? "No date"}
            </Link>
          </li>
        ))}
        {meetings.length === 0 && <li>No meetings have been scheduled yet.</li>}
      </ul>
    </div>
  );
};
