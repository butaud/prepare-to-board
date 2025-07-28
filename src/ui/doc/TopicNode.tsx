import { FC, useState } from "react";
import { Topic, topicIsDraft } from "../../schema";

import "./TopicNode.css";
import { useLoadedAccount } from "../../hooks/Account";
import { MdDelete } from "react-icons/md";
import { EditableInteger, EditableString } from "./EditableValue";

export type TopicNodeProps = {
  topic: Topic;
  startTime: Date;
  onPublish?: () => void;
  onCancel?: () => void;
  onDelete?: () => void;
};

export const TopicNode: FC<TopicNodeProps> = ({
  topic,
  startTime,
  onCancel,
  onDelete,
  onPublish,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const me = useLoadedAccount();
  const canEdit = me.canWrite(topic);
  const isDraft = topicIsDraft(topic);
  return (
    <div className="topic-node">
      <div
        className={["topic-header", isDraft ? "draft" : ""].join(" ")}
        onContextMenu={(e) => {
          e.preventDefault();
          setIsEditing(true);
        }}
      >
        <EditableString
          as="h4"
          value={topic.title}
          onValueChange={(newValue) => {
            topic.title = newValue;
            if (isDraft && onPublish) {
              onPublish();
            }
            if (topic.title === "" && isDraft && onCancel) {
              onCancel();
            }
          }}
          canEdit={canEdit}
          onCancel={onCancel}
          editingByDefault={isDraft}
          label="Topic"
        />
        <div className="duration">
          {startTime.toLocaleTimeString(undefined, { timeStyle: "short" })} for{" "}
          <EditableInteger
            value={topic.durationMinutes || 0}
            editingByDefault={isDraft}
            onValueChange={(newDuration) => {
              topic.durationMinutes = newDuration;
            }}
            autoFocus={!isDraft}
            canEdit={canEdit}
            as="span"
            className="duration-display"
            label="Duration"
          />{" "}
          minutes
        </div>
        {(isEditing || isDraft) && (
          <div
            className="topic-actions"
            autoFocus
            onBlur={() => setIsEditing(false)}
            tabIndex={0}
          >
            {isDraft && (
              <>
                <button onClick={onPublish}>Publish</button>
                <button onClick={onCancel}>Cancel</button>
              </>
            )}
            {!isDraft && onDelete && (
              <button autoFocus className="danger" onClick={onDelete}>
                <MdDelete />
                Delete Topic
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
