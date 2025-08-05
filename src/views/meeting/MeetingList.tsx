import { useState } from "react";
import { CreateMeetingDialog } from "../../ui/dialogs/CreateMeetingDialog";
import { Link } from "react-router-dom";
import { SlPlus } from "react-icons/sl";
import { useLoadedAccount } from "../../hooks/Account";
import { SubHeader } from "../../ui/SubHeader";
import { MeetingCalendar } from "./MeetingCalendar";

export const MeetingList = () => {
  const me = useLoadedAccount();
  const [isCreateMeetingOpen, setCreateMeetingOpen] = useState(false);
  const [view, setView] = useState<"list" | "calendar">("list");

  if (!me.root.selectedOrganization) {
    return <p>No organization selected</p>;
  }

  const isOfficer =
    me?.root.selectedOrganization && me.canWrite(me.root.selectedOrganization);

  const myMeetings = isOfficer
    ? me.root.selectedOrganization.meetings
    : me.root.selectedOrganization.meetings.filter(
        (meeting) => meeting.status !== "draft"
      );

  return (
    <div>
      {isCreateMeetingOpen && (
        <CreateMeetingDialog closeDialog={() => setCreateMeetingOpen(false)} />
      )}
      <SubHeader />
      <div>
        {isOfficer && (
          <button onClick={() => setCreateMeetingOpen(true)}>
            <SlPlus /> Create a new meeting
          </button>
        )}
        <button onClick={() => setView("list")} disabled={view === "list"}>
          List
        </button>
        <button
          onClick={() => setView("calendar")}
          disabled={view === "calendar"}
        >
          Calendar
        </button>
      </div>
      {view === "list" ? (
        <ul>
          {myMeetings.map((meeting) => (
            <li key={meeting.id}>
              <Link to={`/meetings/${meeting.id}`}>
                {meeting.date?.toLocaleDateString() ?? "No date"}
              </Link>
            </li>
          ))}
          {myMeetings.length === 0 && (
            <li>No meetings have been scheduled yet.</li>
          )}
        </ul>
      ) : (
        <MeetingCalendar meetings={myMeetings} />
      )}
    </div>
  );
};
