import { FC } from "react";
import { Schema, Topic, topicIsDraft } from "../../schema";
import { EditableText } from "./EditableText";
import { useAccount } from "jazz-tools/react";

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
  const { me } = useAccount(Schema.UserAccount);
  const canEdit = !!me?.canWrite(topic);
  const isDraft = topicIsDraft(topic);
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
        label="Topic"
      />
    </div>
  );
};
