import { FC } from "react";
import { Topic } from "../../schema";
import { EditableText } from "./EditableText";
import { useAccount } from "jazz-react";

export type TopicNodeProps = {
  topic: Topic;
  onDelete?: () => void;
};

export const TopicNode: FC<TopicNodeProps> = ({ topic, onDelete }) => {
  const { me } = useAccount();
  const canEdit = me?.canWrite(topic);
  return (
    <div className="topic-node">
      <EditableText
        as="h4"
        text={topic.title}
        onTextChange={(newText) => {
          topic.title = newText;
          topic.isDraft = false;
        }}
        onDelete={onDelete}
        canEdit={canEdit}
        editingByDefault={topic.isDraft}
      />
    </div>
  );
};
