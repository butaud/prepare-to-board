import { useLoadMeetingFromParams } from "../../hooks/Meeting";
import { getMeetingDisplayStatus } from "../../schema";
import { useLoadedAccount } from "../../hooks/Account";
import { SubHeader, SubHeaderAction, SubHeaderTab } from "../../ui/SubHeader";
import { SlTrash } from "react-icons/sl";
import {
  MdOutlinePresentToAll,
  MdPlayCircleOutline,
  MdPublish,
  MdStopCircle,
} from "react-icons/md";
import { useNavigate } from "react-router-dom";
import { PiListNumbersFill } from "react-icons/pi";
import { LuNotepadText } from "react-icons/lu";

import "./MeetingShared.css";
import { startMeeting } from "../../util/data";

export const MeetingShared = () => {
  const me = useLoadedAccount();
  const { meeting, outlet } = useLoadMeetingFromParams();
  const navigate = useNavigate();
  if (meeting === undefined) {
    return <p>Loading...</p>;
  }
  if (meeting === null) {
    return <p>Meeting not found</p>;
  }
  const breadcrumbTitle = `${meeting.date.toLocaleDateString()} (${getMeetingDisplayStatus(
    meeting
  )})`;

  const onDeleteClick = () => {
    if (!confirm("Are you sure you want to delete this meeting?")) {
      return;
    }
    me.root.selectedOrganization?.meetings.splice(
      me.root.selectedOrganization?.meetings.findIndex(
        (m) => m?.id === meeting.id
      ),
      1
    );
    void navigate("/meetings");
  };

  const isOfficer = me?.canWrite(meeting);
  const tabs: SubHeaderTab[] = [];
  const actions: SubHeaderAction[] = [];
  if (isOfficer) {
    if (meeting.status === "draft") {
      actions.push({
        label: "Publish",
        onClick: () => {
          meeting.status = "published";
        },
        icon: <MdPublish />,
      });
    } else if (meeting.status === "published") {
      actions.push({
        label: "Start Meeting",
        onClick: () => {
          startMeeting(meeting);
        },
        icon: <MdPlayCircleOutline />,
      });
    } else if (meeting.status === "live") {
      tabs.push({
        label: "Manage Agenda",
        icon: <PiListNumbersFill />,
        destination: `/meetings/${meeting.id}`,
        className: "live-meeting-tab",
      });
      tabs.push({
        label: "Present",
        icon: <MdOutlinePresentToAll />,
        destination: `/meetings/${meeting.id}/present`,
        className: "live-meeting-tab",
      });
      tabs.push({
        label: "Take Minutes",
        icon: <LuNotepadText />,
        destination: `/meetings/${meeting.id}/minutes`,
        className: "live-meeting-tab",
      });
      actions.push({
        label: "End Meeting",
        onClick: () => {
          meeting.status = "completed";
        },
        icon: <MdStopCircle />,
      });
    }
    actions.push({
      label: "Delete",
      onClick: onDeleteClick,
      icon: <SlTrash />,
      danger: true,
    });
  }
  return (
    <div>
      <SubHeader
        dynamicTitleParts={{ [meeting.id]: breadcrumbTitle }}
        partsToIgnore={["present", "minutes"]}
        actions={actions}
        tabs={tabs}
      />
      {outlet}
    </div>
  );
};
