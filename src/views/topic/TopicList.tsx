import {
  DraftTopic,
  ListOfTopics,
  Meeting,
  Topic,
  topicIsDraft,
} from "../../schema";
import { FC } from "react";
import { TopicNode } from "../../ui/doc/TopicNode";
import { Resolved } from "jazz-tools";
import {
  createDraftTopic,
  deleteDraftTopic,
  getTopicListWithDrafts,
  publishDraftTopic,
} from "../../util/data";
import { useLoadedAccount } from "../../hooks/Account";
import { useLoadMeetingShadow } from "../../hooks/Meeting";

export type TopicListProps = {
  topicList: Resolved<
    ListOfTopics,
    {
      $each: true;
    }
  >;
  meeting: Meeting;
  useDrafts?: boolean;
};

export const TopicList: FC<TopicListProps> = ({
  topicList,
  meeting,
  useDrafts,
}) => {
  const me = useLoadedAccount();
  const meetingShadow = useLoadMeetingShadow();

  if (!me || meetingShadow === undefined) {
    return <p>Loading...</p>;
  }
  const isOfficer = me?.canWrite(topicList);

  const handleDeleteClick = (topic: Topic) => {
    const index = topicList.findIndex((t) => t?.id === topic.id);
    if (index !== -1) {
      topicList.splice(index, 1);
    }
  };

  const handlePublishClick = (topic: DraftTopic) => {
    publishDraftTopic(meeting, topic, meetingShadow);
  };

  const handleCancelDraftTopic = (topic: DraftTopic) => {
    deleteDraftTopic(topic, meetingShadow);
  };

  const topicListWithDrafts = useDrafts
    ? getTopicListWithDrafts(topicList, meetingShadow)
    : topicList;

  const lastTopicIndex = topicList.length - 1;
  const lastTopic = topicList[lastTopicIndex];
  return (
    <div className="topic-list">
      <h4>Topics</h4>
      <ul>
        {topicListWithDrafts.map((topic) => (
          <li key={topic.id}>
            <TopicNode
              topic={topic}
              onDelete={isOfficer ? () => handleDeleteClick(topic) : undefined}
              onPublish={
                topicIsDraft(topic)
                  ? () => handlePublishClick(topic)
                  : undefined
              }
              onCancel={
                topicIsDraft(topic)
                  ? () => handleCancelDraftTopic(topic)
                  : undefined
              }
            />
          </li>
        ))}
        {isOfficer && (
          <li>
            <button
              onClick={() => {
                createDraftTopic(
                  meetingShadow,
                  lastTopic
                    ? {
                        topic: lastTopic,
                        index: topicList.findIndex(
                          (t) => t.id === lastTopic.id
                        ),
                      }
                    : undefined
                );
              }}
            >
              Add Topic
            </button>
          </li>
        )}
        {topicList.length === 0 && <li>No topics have been scheduled yet.</li>}
      </ul>
    </div>
  );
};
