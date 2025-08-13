import { FC, useState } from "react";
import { Topic, topicIsDraft } from "../../schema";

import "./TopicNode.css";
import { useLoadedAccount } from "../../hooks/Account";
import { MdDelete, MdDragHandle, MdPlayCircleOutline } from "react-icons/md";
import { EditableInteger, EditableString } from "./EditableValue";
import { Draggable } from "@hello-pangea/dnd";

export type TopicNodeProps = {
  topic: Topic;
  startTime: Date;
  index: number;
  onPublish?: () => void;
  onCancel?: () => void;
  onDelete?: () => void;
  onStartMinute?: () => void;
};

export const TopicNode: FC<TopicNodeProps> = ({
  topic,
  startTime,
  index,
  onCancel,
  onDelete,
  onPublish,
  onStartMinute,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const me = useLoadedAccount();
  const canEdit = me.canWrite(topic);
  const isDraft = topicIsDraft(topic);
  return (
    <Draggable draggableId={topic.id} index={index} isDragDisabled={!canEdit}>
      {(provided, snapshot) => (
        <div
          className={["topic-node", snapshot.isDragging ? "dragging" : ""].join(
            " "
          )}
          ref={provided.innerRef}
          {...provided.draggableProps}
        >
          {(canEdit || onStartMinute) && (
            <div className="hover-buttons">
              {canEdit && (
                <span
                  className="drag-icon"
                  aria-label={`Drag ${topic.title}`}
                  {...provided.dragHandleProps}
                >
                  <MdDragHandle />
                </span>
              )}
              {onStartMinute && (
                <button
                  className="start-minute"
                  onClick={onStartMinute}
                  aria-label={`Start minute for ${topic.title}`}
                >
                  <MdPlayCircleOutline />
                </button>
              )}
            </div>
          )}
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
                if (topic.title === "" && isDraft && onCancel) {
                  onCancel();
                }
              }}
              canEdit={canEdit}
              onCancel={onCancel}
              editingByDefault={isDraft}
              label="Topic"
              autoFocus
            />
            <div className="duration">
              {startTime.toLocaleTimeString(undefined, { timeStyle: "short" })}{" "}
              for{" "}
              <EditableInteger
                value={topic.durationMinutes || 0}
                editingByDefault={isDraft}
                onValueChange={(newDuration) => {
                  topic.durationMinutes = newDuration;
                  if (isDraft && onPublish) {
                    onPublish();
                  }
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
                  <button
                    autoFocus
                    className="danger"
                    onClick={onDelete}
                    aria-label="Delete Topic"
                  >
                    <MdDelete />
                    Delete
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </Draggable>
  );
};
