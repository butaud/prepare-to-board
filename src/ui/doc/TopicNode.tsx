import { FC } from "react";
import { DraftTopic, Topic } from "../../schema";
import { EditableText } from "./EditableText";
import { useAccount } from "jazz-react";

import "./TopicNode.css";

export type TopicNodeProps = {
  topic: Topic;
  onPublish?: () => void;
  onCancel?: () => void;
  onDelete?: () => void;
};

export const TopicNode: FC<TopicNodeProps> = ({
  topic,
  onCancel,
  onDelete,
  onPublish,
}) => {
  const { me } = useAccount();
  const canEdit = me.canWrite(topic);
  const isDraft = topic instanceof DraftTopic;
  return (
    <div className="topic-node">
      <EditableText
        as="h4"
        text={topic.title}
        onTextChange={(newText) => {
          topic.title = newText;
          if (isDraft && onPublish) {
            onPublish();
          }
          if (topic.title === "" && isDraft && onCancel) {
            onCancel();
          }
        }}
        onDelete={onDelete}
        onCancel={onCancel}
        canEdit={canEdit}
        editingByDefault={isDraft}
      />
    </div>
  );
};
