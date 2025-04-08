import { useAccount } from "jazz-react";
import { useNavigate, useOutletContext } from "react-router-dom";
import { Meeting } from "../../schema";
import { SlTrash } from "react-icons/sl";
import { TopicList } from "../topic/TopicList";

export const MeetingView = () => {
  const { me } = useAccount({
    root: {
      selectedOrganization: { meetings: [{}] },
    },
  });
  const meeting = useOutletContext() as Meeting;
  const navigate = useNavigate();

  if (!meeting || !me || !me.root.selectedOrganization) {
    return <p>Loading...</p>;
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
    navigate("/meetings");
  };
  return (
    <>
      {isOfficer && (
        <button className="danger" onClick={onDeleteClick}>
          <SlTrash />
          Delete Meeting
        </button>
      )}
      <TopicList topicList={meeting.plannedAgenda} />
    </>
  );
};
