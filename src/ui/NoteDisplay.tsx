import { getBoardMemberFormalName, Note } from "../schema";
import { PendingNote } from "../util/data";
import { renderMarkdownBlocks } from "../util/markdown";

const motionStatusLabel: Record<string, string> = {
  proposed: "Proposed",
  under_discussion: "Under Discussion",
  passed: "Passed",
  failed: "Failed",
  tabled: "Tabled",
};

const completedMotionStatuses = new Set(["passed", "failed", "tabled"]);

const formatDueDate = (dueDate: number): string =>
  new Date(dueDate).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

const isOverdue = (dueDate: number): boolean => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return dueDate < today.getTime();
};

export interface ActionItemCompletionControl {
  /** Whether the current viewer is allowed to toggle completion. */
  canToggle: boolean;
  /** Called with a new completedOn timestamp, or undefined to reopen. */
  onToggle: (completedOn: number | undefined) => void;
}

interface NoteDisplayProps {
  note: Note | PendingNote;
  completion?: ActionItemCompletionControl;
  /** Suppress the assignee prefix, for contexts that already show it nearby. */
  hideAssignee?: boolean;
}

export const NoteDisplay = ({ note, completion, hideAssignee }: NoteDisplayProps) => {
  if (note.type === "text") {
    return (
      <div className="note-text">
        {renderMarkdownBlocks(note.text)}
      </div>
    );
  }
  if (note.type === "action_item") {
    const isComplete = note.completedOn !== undefined;
    const overdue = !isComplete && note.dueDate !== undefined && isOverdue(note.dueDate);
    const checkboxTitle = completion?.canToggle
      ? isComplete
        ? "Reopen"
        : "Mark complete"
      : undefined;
    return (
      <div className={`note-action-item${isComplete ? " is-complete" : ""}`}>
        <span
          className={`note-action-checkbox${completion?.canToggle ? " is-interactive" : ""}`}
          role={completion?.canToggle ? "checkbox" : undefined}
          aria-checked={completion?.canToggle ? isComplete : undefined}
          tabIndex={completion?.canToggle ? 0 : undefined}
          title={checkboxTitle}
          onClick={() => {
            if (!completion?.canToggle) return;
            completion.onToggle(isComplete ? undefined : Date.now());
          }}
          onKeyDown={(e) => {
            if (!completion?.canToggle) return;
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              completion.onToggle(isComplete ? undefined : Date.now());
            }
          }}
        >
          {isComplete ? "☑" : "☐"}
        </span>
        {!hideAssignee && note.assignee?.name && (
          <span className="note-action-assignee">
            {getBoardMemberFormalName(note.assignee)}:
          </span>
        )}
        <span>{note.text}</span>
        {isComplete ? (
          <span className="note-action-due">
            Completed on {formatDueDate(note.completedOn as number)}
          </span>
        ) : (
          note.dueDate !== undefined && (
            <span className={`note-action-due${overdue ? " is-overdue" : ""}`}>
              {overdue ? "Overdue — was due by " : "Due by "}
              {formatDueDate(note.dueDate)}
            </span>
          )
        )}
      </div>
    );
  }
  if (note.type === "motion") {
    const status = note.status;
    const mover = getBoardMemberFormalName(note.moverMember) ?? note.mover;
    const seconder = getBoardMemberFormalName(note.seconderMember) ?? note.seconder;
    const showVotes = completedMotionStatuses.has(status);
    return (
      <div className="note-motion">
        <span>
          {mover} moves {note.text}.
          {seconder && ` Seconded by ${seconder}.`}
        </span>
        {" "}
        <span className={`motion-status motion-status-${status}`}>
          Status: {motionStatusLabel[status] ?? status}
        </span>
        {showVotes && (
          <span className="motion-vote-summary">
            For: {note.votesFor ?? 0} / Against: {note.votesAgainst ?? 0} / Abstain: {note.votesAbstain ?? 0}
          </span>
        )}
      </div>
    );
  }
  return null;
};
