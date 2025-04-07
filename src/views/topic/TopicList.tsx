import { useAccount } from "jazz-react";
import { ListOfTopics, Topic } from "../../schema";
import { FC } from "react";
import { TopicNode } from "../../ui/doc/TopicNode";

export type TopicListProps = {
  topicList: ListOfTopics;
};

export const TopicList: FC<TopicListProps> = ({ topicList }) => {
  const { me } = useAccount();
  const isOfficer = me?.canWrite(topicList);

  const handleDeleteClick = (topic: Topic) => {
    const index = topicList.findIndex((t) => t?.id === topic.id);
    if (index !== -1) {
      topicList.splice(index, 1);
    }
  };
  return (
    <div className="topic-list">
      <h4>Topics</h4>
      <ul>
        {topicList
          .filter(Boolean)
          .filter((topic) => isOfficer || !topic?.isDraft)
          .map((topic) => (
            <li key={topic!.id}>
              <TopicNode
                topic={topic!}
                onDelete={
                  isOfficer ? () => handleDeleteClick(topic!) : undefined
                }
              />
            </li>
          ))}
        {isOfficer && (
          <li>
            <button
              onClick={() => {
                const newTopic = Topic.create(
                  {
                    title: "New Topic",
                    isDraft: true,
                  },
                  topicList._owner
                );
                topicList.push(newTopic);
              }}
            >
              Add Topic
            </button>
          </li>
        )}
      </ul>
    </div>
  );
};
