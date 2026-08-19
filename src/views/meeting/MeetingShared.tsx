import { useEffect } from "react";
import { useLoadMeetingFromParams } from "../../hooks/Meeting";
import { getMeetingDisplayStatus } from "../../schema";
import { useLoadedAccount } from "../../hooks/Account";
import { PlanAgendaEditModeContext } from "../../hooks/PlanAgendaEditMode";
import { MinutesEditModeContext } from "../../hooks/MinutesEditMode";
import { SubHeader, SubHeaderAction, SubHeaderTab } from "../../ui/SubHeader";
import { SlTrash } from "react-icons/sl";
import {
  MdEdit,
  MdOutlinePresentToAll,
  MdPlayCircleOutline,
  MdPublish,
  MdStopCircle,
} from "react-icons/md";
import { useLocation, useNavigate } from "react-router-dom";
import { useMutation } from "convex/react";
import { PiListNumbersFill } from "react-icons/pi";
import { LuNotepadText } from "react-icons/lu";
import { api } from "../../convexClient";

import "./MeetingShared.css";

export const MeetingShared = () => {
  const me = useLoadedAccount();
  const { meeting, outlet } = useLoadMeetingFromParams();
  const navigate = useNavigate();
  const location = useLocation();
  // The edit-agenda and edit-minutes pages each have their own URL rather
  // than being local component state, so they reopen on refresh and are
  // real, linkable/back-button-able pages instead of a transient toggle.
  // Exact matches (not endsWith) because both URLs end in "/edit".
  const isEditingAgenda = meeting
    ? location.pathname === `/meetings/${meeting.id}/edit`
    : false;
  const isEditingMinutes = meeting
    ? location.pathname === `/meetings/${meeting.id}/minutes/edit`
    : false;
  const deleteMeeting = useMutation(api.app.deleteMeeting);
  const startMeeting = useMutation(api.app.startMeeting);
  const setMeetingStatus = useMutation(api.app.setMeetingStatus);
  const recordMeetingViewed = useMutation(api.app.recordMeetingViewed);
  const meetingId = meeting?.id;
  useEffect(() => {
    if (meetingId) {
      void recordMeetingViewed({ meetingId });
    }
  }, [meetingId, recordMeetingViewed]);
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
    void deleteMeeting({ meetingId: meeting.id }).then(() => navigate("/meetings"));
  };

  const isOfficer = me?.canWrite(meeting);
  const tabs: SubHeaderTab[] = [];
  const actions: SubHeaderAction[] = [];
  if (isOfficer) {
    if (meeting.status === "draft") {
      actions.push({
        label: "Publish",
        onClick: () => {
          void setMeetingStatus({ meetingId: meeting.id, status: "published" });
        },
        icon: <MdPublish />,
      });
    } else if (meeting.status === "published") {
      actions.push({
        label: "Start Meeting",
        onClick: () => {
          void startMeeting({ meetingId: meeting.id });
        },
        icon: <MdPlayCircleOutline />,
      });
    } else if (meeting.status === "live") {
      tabs.push({
        label: "Present",
        icon: <MdOutlinePresentToAll />,
        destination: `/meetings/${meeting.id}/present`,
        className: "live-meeting-tab",
      });
      tabs.push({
        label: "Manage Agenda",
        icon: <PiListNumbersFill />,
        destination: `/meetings/${meeting.id}`,
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
          void setMeetingStatus({ meetingId: meeting.id, status: "completed" });
        },
        icon: <MdStopCircle />,
      });
    }
    if (meeting.status === "draft" || meeting.status === "published") {
      actions.push({
        label: isEditingAgenda ? "Done Editing" : "Edit Agenda",
        onClick: () => {
          void navigate(
            isEditingAgenda ? `/meetings/${meeting.id}` : `/meetings/${meeting.id}/edit`
          );
        },
        icon: <MdEdit />,
      });
    }
    if (meeting.status === "completed") {
      actions.push({
        label: isEditingMinutes ? "Done Editing" : "Edit Minutes",
        onClick: () => {
          void navigate(
            isEditingMinutes
              ? `/meetings/${meeting.id}/minutes`
              : `/meetings/${meeting.id}/minutes/edit`
          );
        },
        icon: <MdEdit />,
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
    <PlanAgendaEditModeContext.Provider value={{ isEditingAgenda }}>
      <MinutesEditModeContext.Provider value={{ isEditingMinutes }}>
        <div>
          <SubHeader
            dynamicTitleParts={{
              [meeting.id]: breadcrumbTitle,
              edit: isEditingMinutes ? "Edit Minutes" : "Edit Agenda",
            }}
            partsToIgnore={["present", "minutes"]}
            actions={actions}
            tabs={tabs}
          />
          {outlet}
        </div>
      </MinutesEditModeContext.Provider>
    </PlanAgendaEditModeContext.Provider>
  );
};
