import { useNavigate } from "react-router-dom";
import { SlTrash } from "react-icons/sl";
import { TopicList } from "../topic/TopicList";
import { useMeeting } from "../../hooks/Meeting";
import { useLoadedAccount } from "../../hooks/Account";

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
        <button className="danger" onClick={onDeleteClick}>
          <SlTrash />
          Delete Meeting
        </button>
      )}
      <TopicList
        topicList={meeting.plannedAgenda}
        meeting={meeting}
        useDrafts
      />
    </>
  );
};
