import { useNavigate } from "react-router-dom";
import { SlTrash } from "react-icons/sl";
import { TopicList } from "../topic/TopicList";
import { useMeeting } from "../../hooks/Meeting";
import { useLoadedAccount } from "../../hooks/Account";

import "./MeetingView.css";
import { MdPublish } from "react-icons/md";

export const MeetingView = () => {
  const me = useLoadedAccount();
  const meeting = useMeeting();
  const navigate = useNavigate();

  if (!me.root.selectedOrganization) {
    return <p>No organization selected</p>;
  }

  if (!meeting.plannedAgenda) {
    return <p>No topics</p>;
  }

  const isOfficer = me?.canWrite(me.root.selectedOrganization);

  const onPublishClick = () => {
    meeting.status = "published";
  };

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
  return (
    <>
      {isOfficer && (
        <div className="meeting-view-actions">
          {meeting.status === "draft" && (
            <button onClick={onPublishClick}>
              <MdPublish />
              Publish Meeting
            </button>
          )}
          <button className="danger" onClick={onDeleteClick}>
            <SlTrash />
            Delete Meeting
          </button>
        </div>
      )}
      <div className="meeting-view-content">
        <h3>Start Time: {meeting.date.toLocaleTimeString()}</h3>
        <TopicList
          topicList={meeting.plannedAgenda}
          meeting={meeting}
          useDrafts
        />
      </div>
    </>
  );
};
