import { Navigate } from "react-router-dom";
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

  if (meeting.status === "completed") {
    return <Navigate to="minutes" replace />;
  }

  if (meeting.status === "live") {
    if (!meeting.liveAgenda) {
      return <p>No live agenda available.</p>;
    }
    const minutes = meeting.minutes ?? [];
    const completedCount = minutes.filter((m) => m !== null).length;

    return (
      <div className="meeting-view-content">
        <h3>Start Time: {meeting.date.toLocaleTimeString()}</h3>
        {meeting.liveStartTime && (
          <p className="meeting-view-live-start">
            Meeting started:{" "}
            {meeting.liveStartTime.toLocaleTimeString(undefined, {
              timeStyle: "short",
            })}
          </p>
        )}
        <TopicList
          topicList={meeting.liveAgenda}
          meeting={meeting}
          lockedCount={completedCount}
        />
      </div>
    );
  }

  if (!meeting.plannedAgenda) {
    return <p>No topics</p>;
  }
  return (
    <div className="meeting-view-content">
      <h3>Start Time: {meeting.date.toLocaleTimeString()}</h3>
      <TopicList
        topicList={meeting.plannedAgenda}
        meeting={meeting}
        useDrafts
      />
    </div>
  );
};
