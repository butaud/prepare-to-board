import { FC } from "react";
import { Topic, topicIsDraft } from "../../schema";

import "./TopicNode.css";
import { MdDelete, MdDragHandle } from "react-icons/md";
import { EditableInteger, EditableString } from "./EditableValue";
import { Draggable } from "@hello-pangea/dnd";

export type TopicNodeProps = {
  topic: Topic;
  startTime: Date;
  index: number;
  locked?: boolean;
  onPublish?: () => void;
  onCancel?: () => void;
  onDelete?: () => void;
  onUpdate?: (patch: {
    title?: string;
    durationMinutes?: number;
    outcome?: string;
  }) => void;
  canEdit?: boolean;
};

export const TopicNode: FC<TopicNodeProps> = ({
  topic,
  startTime,
  index,
  locked = false,
  onCancel,
  onDelete,
  onPublish,
  onUpdate,
  canEdit: canEditProp,
}) => {
  const canEdit = (canEditProp ?? !!onUpdate) && !locked;
  const isDraft = topicIsDraft(topic);
  return (
    <Draggable draggableId={topic.id} index={index} isDragDisabled={!canEdit}>
      {(provided, snapshot) => (
        <div
          className={[
            "topic-node",
            snapshot.isDragging ? "dragging" : "",
            locked ? "locked" : "",
            topic.cancelled ? "cancelled" : "",
          ].join(" ")}
          ref={provided.innerRef}
          {...provided.draggableProps}
        >
          {canEdit && (
            <div
              className="drag-handle"
              {...provided.dragHandleProps}
              aria-label={`Drag ${topic.title}`}
            >
              <span className="drag-icon">
                <MdDragHandle />
              </span>
            </div>
          )}
          <div className={["topic-header", isDraft ? "draft" : ""].join(" ")}>
            <EditableString
              as="h4"
              value={topic.title}
              onValueChange={(newValue) => {
                onUpdate?.({ title: newValue });
                if (newValue === "" && isDraft && onCancel) {
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
                  onUpdate?.({ durationMinutes: newDuration });
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
            {!isDraft && (canEdit || topic.outcome) && (
              <div className="outcome">
                <EditableString
                  as="span"
                  value={topic.outcome ?? ""}
                  onValueChange={(newValue) => onUpdate?.({ outcome: newValue })}
                  canEdit={canEdit}
                  className="outcome-display"
                  label="Outcome/Goal"
                  emptyClickBehavior="single"
                  autoFocus
                />
              </div>
            )}
            {isDraft && (
              <div className="topic-actions">
                <button onClick={onPublish}>Publish</button>
                <button onClick={onCancel}>Cancel</button>
              </div>
            )}
            {!isDraft && canEdit && onDelete && (
              <button
                className="topic-delete danger"
                onClick={onDelete}
                aria-label="Delete Topic"
                title="Delete Topic"
              >
                <MdDelete />
              </button>
            )}
          </div>
        </div>
      )}
    </Draggable>
  );
};
