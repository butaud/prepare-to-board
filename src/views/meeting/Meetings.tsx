import { useAccount } from "jazz-react";
import { useState } from "react";
import { CreateMeetingDialog } from "../../ui/dialogs/CreateMeetingDialog";
import { Link } from "react-router-dom";

export const Meetings = () => {
  const { me } = useAccount({
    root: {
      selectedOrganization: {
        meetings: [{}],
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
      <h2>Meetings</h2>
      <ul>
        {isOfficer && (
          <li>
            <button onClick={() => setCreateMeetingOpen(true)}>
              Create a new meeting
            </button>
          </li>
        )}
        {meetings.map((meeting) => (
          <li key={meeting.id}>
            <Link to={`/meeting/${meeting.id}`}>
              {meeting.date?.toLocaleDateString() ?? "No date"}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
};
