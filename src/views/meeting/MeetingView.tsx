import { TopicList } from "../topic/TopicList";
import { useMeeting } from "../../hooks/Meeting";
import { useLoadedAccount } from "../../hooks/Account";

import "./MeetingView.css";

export const MeetingView = () => {
  const me = useLoadedAccount();
  const meeting = useMeeting();

  if (!me.root.selectedOrganization) {
    return <p>No organization selected</p>;
  }

  if (!meeting.plannedAgenda) {
    return <p>No topics</p>;
  }
  return (
    <div className="meeting-view-content">
      <h3>Start Time: {meeting.date.toLocaleTimeString()}</h3>
      <h3>Planned Topics</h3>
      <TopicList
        topicList={meeting.plannedAgenda}
        meeting={meeting}
        useDrafts
      />
    </div>
  );
};
