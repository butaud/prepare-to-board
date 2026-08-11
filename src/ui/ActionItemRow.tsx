import { Link } from "react-router-dom";
import { useMutation } from "convex/react";
import { api } from "../convexClient";
import {
  type ActionItemWithContext,
  formatRelativeMeetingDate,
  meetingLink,
} from "../util/actionItems";
import { NoteDisplay } from "./NoteDisplay";
import "./ActionItemRow.css";

export const ActionItemRow = ({
  item,
  canToggle,
}: {
  item: ActionItemWithContext;
  canToggle: boolean;
}) => {
  const setActionItemCompletedOn = useMutation(api.app.setActionItemCompletedOn);
  return (
    <div className="action-item">
      <NoteDisplay
        note={item}
        hideAssignee
        completion={{
          canToggle,
          onToggle: (completedOn) =>
            void setActionItemCompletedOn({
              meetingId: item.meeting.id,
              minuteId: item.minuteId,
              noteId: item.id,
              completedOn,
            }),
        }}
      />
      <div className="action-item-context">
        {item.assignee ? (
          <span className="action-item-assignee">{item.assignee.name}</span>
        ) : (
          <span>Unassigned</span>
        )}
        <span>·</span>
        <Link to={meetingLink(item.meeting)}>
          {formatRelativeMeetingDate(item.meeting.date)}
        </Link>
        <span>·</span>
        <span>{item.topicTitle}</span>
      </div>
    </div>
  );
};
