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

import "./TopicList.css";

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
  let currentTopicStartTime = meeting.date;
  return (
    <div className="topic-list">
      <h3>Topics</h3>
      <div className="topic-list-container">
        {topicListWithDrafts.map((topic) => {
          const node = (
            <TopicNode
              key={topic.id}
              topic={topic}
              startTime={new Date(currentTopicStartTime)}
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
          );
          if (topic.durationMinutes) {
            currentTopicStartTime = new Date(
              currentTopicStartTime.getTime() +
                topic.durationMinutes * 60 * 1000
            );
          }
          return node;
        })}
        {isOfficer && (
          <div className="add-topic">
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
          </div>
        )}
        {topicList.length === 0 && (
          <div>No topics have been scheduled yet.</div>
        )}
      </div>
    </div>
  );
};
