import { useState } from "react";
import { Link } from "react-router-dom";
import { useMutation } from "convex/react";
import { api } from "../convexClient";
import { BoardMember, getBoardMemberFormalName, Meeting } from "../schema";
import {
  type ActionItemWithContext,
  formatRelativeMeetingDate,
  meetingLink,
  stripTrailingPeriod,
} from "../util/actionItems";
import { DateOnlyInput } from "./DateOnlyInput";
import { NoteDisplay } from "./NoteDisplay";
import "./ActionItemRow.css";

const formatMeetingOption = (meeting: Meeting): string =>
  meeting.date.toLocaleDateString(undefined, {
    dateStyle: "medium",
  });

export const ActionItemRow = ({
  item,
  canToggle,
  canEdit,
  members,
  meetings,
}: {
  item: ActionItemWithContext;
  canToggle: boolean;
  canEdit: boolean;
  members: BoardMember[];
  meetings: Meeting[];
}) => {
  const setActionItemCompletedOn = useMutation(api.app.setActionItemCompletedOn);
  const updateActionItem = useMutation(api.app.updateActionItem);
  const removeMinuteNote = useMutation(api.app.removeMinuteNote);

  const [isEditing, setIsEditing] = useState(false);
  const [text, setText] = useState(item.text);
  const [assigneeId, setAssigneeId] = useState(item.assignee?.id ?? "");
  const [dueDate, setDueDate] = useState<Date | null>(
    item.dueDate !== undefined ? new Date(item.dueDate) : null
  );
  const [isCompleted, setIsCompleted] = useState(item.completedOn !== undefined);
  const [completedOn, setCompletedOn] = useState<Date | null>(
    item.completedOn !== undefined ? new Date(item.completedOn) : new Date()
  );
  const [createdInMeetingId, setCreatedInMeetingId] = useState(item.createdInMeeting.id);

  const sortedMeetings = [...meetings].sort(
    (a, b) => a.date.getTime() - b.date.getTime()
  );

  const startEditing = () => {
    setText(item.text);
    setAssigneeId(item.assignee?.id ?? "");
    setDueDate(item.dueDate !== undefined ? new Date(item.dueDate) : null);
    setIsCompleted(item.completedOn !== undefined);
    setCompletedOn(item.completedOn !== undefined ? new Date(item.completedOn) : new Date());
    setCreatedInMeetingId(item.createdInMeeting.id);
    setIsEditing(true);
  };

  const canSubmit = text.trim().length > 0 && assigneeId !== "" && dueDate !== null;

  const handleSave = () => {
    const assignee = members.find((member) => member.id === assigneeId);
    if (!canSubmit || !assignee || !dueDate) return;
    void updateActionItem({
      meetingId: item.meeting.id,
      minuteId: item.minuteId,
      noteId: item.id,
      text: stripTrailingPeriod(text.trim()),
      assigneeId: assignee.id,
      assigneeName: assignee.name,
      dueDate: dueDate.getTime(),
      completedOn: isCompleted ? (completedOn ?? new Date()).getTime() : undefined,
      createdInMeetingId,
    }).then(() => setIsEditing(false));
  };

  const handleDelete = () => {
    if (!confirm(`Delete the action item "${item.text}"? This can't be undone.`)) return;
    void removeMinuteNote({
      meetingId: item.meeting.id,
      minuteId: item.minuteId,
      noteId: item.id,
    });
  };

  if (isEditing) {
    return (
      <div className="action-item action-item-editing">
        <div className="action-item-edit-row">
          <select
            id={`action-item-assignee-${item.id}`}
            aria-label="Assignee"
            value={assigneeId}
            onChange={(e) => setAssigneeId(e.target.value)}
            autoFocus
          >
            <option value="">Assignee</option>
            {members.map((member) => (
              <option key={member.id} value={member.id}>
                {member.name}
              </option>
            ))}
          </select>
          <span>to</span>
          <input
            id={`action-item-text-${item.id}`}
            type="text"
            aria-label="Action"
            value={text}
            onChange={(e) => setText(e.target.value)}
            autoCapitalize="off"
          />
          <span>by</span>
          <DateOnlyInput
            id={`action-item-due-${item.id}`}
            selected={dueDate}
            onChange={setDueDate}
            aria-label="Due date"
          />
        </div>
        <div className="action-item-edit-row">
          <label htmlFor={`action-item-created-${item.id}`}>Created in meeting:</label>
          <select
            id={`action-item-created-${item.id}`}
            value={createdInMeetingId}
            onChange={(e) => setCreatedInMeetingId(e.target.value)}
          >
            {sortedMeetings.map((meeting) => (
              <option key={meeting.id} value={meeting.id}>
                {formatMeetingOption(meeting)}
              </option>
            ))}
          </select>
        </div>
        <div className="action-item-edit-row">
          <label htmlFor={`action-item-completed-${item.id}`}>
            <input
              id={`action-item-completed-${item.id}`}
              type="checkbox"
              checked={isCompleted}
              onChange={(e) => setIsCompleted(e.target.checked)}
            />
            Completed
          </label>
          {isCompleted && (
            <DateOnlyInput
              selected={completedOn}
              onChange={(date) => date && setCompletedOn(date)}
              aria-label="Completed on"
            />
          )}
        </div>
        <div className="action-item-edit-actions">
          <button className="btn-small" disabled={!canSubmit} onClick={handleSave}>
            Save
          </button>
          <button className="btn-small btn-secondary" onClick={() => setIsEditing(false)}>
            Cancel
          </button>
        </div>
      </div>
    );
  }

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
          <span className="action-item-assignee">
            {getBoardMemberFormalName(item.assignee)}
          </span>
        ) : (
          <span>Unassigned</span>
        )}
        <span>·</span>
        <Link to={meetingLink(item.meeting)}>
          {formatRelativeMeetingDate(item.meeting.date)}
        </Link>
        <span>·</span>
        <span>{item.topicTitle}</span>
        {canEdit && (
          <>
            <span>·</span>
            <button className="action-item-link-btn" onClick={startEditing}>
              Edit
            </button>
            <button className="action-item-link-btn action-item-delete-btn" onClick={handleDelete}>
              Delete
            </button>
          </>
        )}
      </div>
    </div>
  );
};
