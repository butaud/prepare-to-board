import { useAccount } from "jazz-tools/react";
import {
  DraftTopic,
  ListOfTopics,
  Meeting,
  Topic,
  Schema,
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
  const { me } = useAccount(Schema.UserAccount, {
    resolve: {
      root: {
        meetingShadows: {
          $each: {
            meeting: true,
            notes: true,
            draftTopics: { $each: { anchor: true } },
          },
        },
      },
    },
  });

  if (!me) {
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
    publishDraftTopic(me, meeting, topic);
  };

  const handleCancelDraftTopic = (topic: DraftTopic) => {
    deleteDraftTopic(me, meeting, topic);
  };

  const topicListWithDrafts = useDrafts
    ? getTopicListWithDrafts(topicList, meeting, me.root.meetingShadows)
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
                  me,
                  meeting,
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
