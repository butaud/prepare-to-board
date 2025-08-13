import { useLoadedAccount } from "../../hooks/Account";
import { useMeeting } from "../../hooks/Meeting";
import { TopicList } from "../topic/TopicList";

import "./MeetingMinutes.css";

export const MeetingMinutes = () => {
  const me = useLoadedAccount();
  const meeting = useMeeting();

  if (!me.root.selectedOrganization) {
    return <p>No organization selected</p>;
  }

  if (!meeting.liveAgenda) {
    return <p>No topics</p>;
  }
  return (
    <div className="meeting-minutes-content">
      <div>
        <h3>Minutes</h3>
        <TopicList
          topicList={meeting.minutes?.map((minute) => minute.topic) || []}
          meeting={meeting}
        />
      </div>
      <div>
        <h3>Remaining Topics</h3>
        <TopicList
          topicList={meeting.liveAgenda}
          idsToOmit={meeting.minutes?.map((minute) => minute.topic.id)}
          meeting={meeting}
          allowMinutes
        />
      </div>
    </div>
  );
};
