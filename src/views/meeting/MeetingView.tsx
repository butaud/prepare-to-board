import { useAccount } from "jazz-react";
import { useNavigate, useOutletContext } from "react-router-dom";
import { Meeting } from "../../schema";
import { SlTrash } from "react-icons/sl";
import { TopicList } from "../topic/TopicList";
import { Resolved } from "jazz-tools";

export const MeetingView = () => {
  const { me } = useAccount({
    resolve: {
      root: {
        selectedOrganization: {
          meetings: true,
        },
      },
    },
  });
  const meeting =
    useOutletContext<Resolved<Meeting, { plannedAgenda: { $each: true } }>>();
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
