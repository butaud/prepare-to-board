import { useMeeting } from "../../hooks/Meeting";
import { TopicList } from "../topic/TopicList";

export const MeetingScheduled = () => {
  const meeting = useMeeting();

  if (!meeting.plannedAgenda) {
    return <p>No topics</p>;
  }
  return (
    <>
      <h3>Start Time: {meeting.date.toLocaleTimeString()}</h3>
      <TopicList
        topicList={meeting.plannedAgenda}
        meeting={meeting}
        useDrafts
      />
    </>
  );
};
