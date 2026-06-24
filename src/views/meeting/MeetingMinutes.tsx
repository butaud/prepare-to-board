import { useEffect, useRef, useState, type CSSProperties } from "react";
import {
  DragDropContext,
  Droppable,
  Draggable,
  type DropResult,
} from "@hello-pangea/dnd";
import { useMutation } from "convex/react";
import { useMeeting } from "../../hooks/Meeting";
import { useLoadedAccount } from "../../hooks/Account";
import { PendingNote } from "../../util/data";
import { BoardMember, Meeting, Note, Topic } from "../../schema";
import { api } from "../../convexClient";

import "./MeetingMinutes.css";
import { NoteDisplay } from "../../ui/NoteDisplay";

const formatDuration = (totalSeconds: number): string => {
  const sign = totalSeconds < 0 ? "-" : "";
  const abs = Math.abs(totalSeconds);
  const h = Math.floor(abs / 3600);
  const m = Math.floor((abs % 3600) / 60);
  const s = abs % 60;
  if (h > 0) {
    return `${sign}${h}h ${m}m ${s}s`;
  }
  return `${sign}${m}m ${s}s`;
};

const formatAgendaTime = (date: Date): string =>
  date.toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  });

const formatTimeInputValue = (date: Date): string => {
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${hours}:${minutes}`;
};

const AGENDA_BASE_SLOT_MINUTES = 5;
const AGENDA_SLOT_HEIGHT_PX = 72;
const AGENDA_TARGET_VISIBLE_MINUTES = 90;
const AGENDA_EVENT_MIN_HEIGHT_PX = 14;
const AGENDA_EVENT_GAP_PX = 3;
const AGENDA_INSERTION_RESERVED_HEIGHT_PX = 9;
const AGENDA_INSERTION_FORM_GAP_PX = 230;

const timelineGridStyle = (slotCount: number): CSSProperties =>
  ({ "--slot-count": slotCount }) as CSSProperties;

const timelineEventStyle = (
  startSlot: number,
  slotSpan: number,
  topPx = startSlot * AGENDA_SLOT_HEIGHT_PX
): CSSProperties => ({
  "--start-slot": startSlot,
  "--slot-span": slotSpan,
  top: `${topPx}px`,
  height: `${Math.max(AGENDA_EVENT_MIN_HEIGHT_PX, slotSpan * AGENDA_SLOT_HEIGHT_PX - 2)}px`,
}) as CSSProperties;

const timelineDisplayEventStyle = (
  startSlot: number,
  slotSpan: number,
  displayTopPx: number,
  displayHeightPx: number
): CSSProperties =>
  ({
    ...timelineEventStyle(startSlot, slotSpan, displayTopPx),
    height: `${displayHeightPx}px`,
  }) as CSSProperties;

const insertionCursorStyle = (topPx: number): CSSProperties =>
  ({
    top: `${topPx}px`,
    height: `${AGENDA_INSERTION_RESERVED_HEIGHT_PX}px`,
  }) as CSSProperties;

const insertionFormStyle = (): CSSProperties =>
  ({
    top: `${AGENDA_INSERTION_RESERVED_HEIGHT_PX + 4}px`,
  }) as CSSProperties;

const floorToAgendaSlot = (date: Date, slotMinutes: number): Date => {
  const floored = new Date(date);
  floored.setSeconds(0, 0);
  floored.setMinutes(
    Math.floor(floored.getMinutes() / slotMinutes) * slotMinutes
  );
  return floored;
};

const ceilMinutesToAgendaSlotCount = (
  minutes: number,
  slotMinutes: number
): number => Math.max(1, Math.ceil(minutes / slotMinutes));

const getAgendaSlotMinutesForHeight = (availableHeight: number): number => {
  const visibleSlotCount = Math.max(
    1,
    Math.floor(availableHeight / AGENDA_SLOT_HEIGHT_PX)
  );
  const slotMinutes = Math.ceil(
    AGENDA_TARGET_VISIBLE_MINUTES /
      visibleSlotCount /
      AGENDA_BASE_SLOT_MINUTES
  ) * AGENDA_BASE_SLOT_MINUTES;
  return Math.max(AGENDA_BASE_SLOT_MINUTES, slotMinutes);
};

const formatMinuteCount = (minutes: number): string =>
  minutes === 1 ? "1 min" : `${minutes} min`;

const formatDiff = (diff: number): string =>
  diff === 0 ? "" : ` (${diff > 0 ? "+" : ""}${diff})`;

// --- Note Forms ---

interface TextNoteFormProps {
  onAdd: (note: PendingNote) => void;
  onCancel: () => void;
  initialNote?: Extract<Note, { type: "text" }>;
  submitLabel?: string;
}

const TextNoteForm = ({
  onAdd,
  onCancel,
  initialNote,
  submitLabel = "Add",
}: TextNoteFormProps) => {
  const [text, setText] = useState(initialNote?.text ?? "");
  return (
    <div className="note-form">
      <h5 className="note-form-title">Text Note</h5>
      <div className="minutes-form-row">
        <label>Text (supports **bold**, *italic*, [link](url)):</label>
        <textarea
          rows={3}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Enter note text..."
          autoFocus
        />
      </div>
      <div className="minutes-actions">
        <button
          className="btn-primary"
          onClick={() => {
            if (!text.trim()) return;
            onAdd({ type: "text", text: text.trim() });
          }}
        >
          {submitLabel}
        </button>
        <button className="btn-secondary" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </div>
  );
};

interface ActionItemFormProps {
  onAdd: (note: PendingNote) => void;
  onCancel: () => void;
  members: BoardMember[];
  initialNote?: Extract<Note, { type: "action_item" }>;
  submitLabel?: string;
}

const ActionItemForm = ({
  onAdd,
  onCancel,
  members,
  initialNote,
  submitLabel = "Add",
}: ActionItemFormProps) => {
  const [text, setText] = useState(initialNote?.text ?? "");
  const [selectedMemberId, setSelectedMemberId] = useState<string>(
    initialNote?.assignee?.id ?? ""
  );
  return (
    <div className="note-form">
      <h5 className="note-form-title">Action Item</h5>
      <div className="minutes-form-row">
        <label>Action:</label>
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="What needs to be done?"
          autoFocus
          style={{ width: "100%", maxWidth: 500 }}
        />
      </div>
      <div className="minutes-form-row">
        <label>Assignee (optional):</label>
        <select
          value={selectedMemberId}
          onChange={(e) => setSelectedMemberId(e.target.value)}
          style={{ padding: "6px 8px", borderRadius: 4, border: "1px solid var(--color-border, #ddd)" }}
        >
          <option value="">— None —</option>
          {members.map((m) => (
            <option key={m.id} value={m.id}>{m.name}</option>
          ))}
        </select>
      </div>
      <div className="minutes-actions">
        <button
          className="btn-primary"
          onClick={() => {
            if (!text.trim()) return;
            const assignee = members.find((m) => m.id === selectedMemberId);
            onAdd({ type: "action_item", text: text.trim(), assignee });
          }}
        >
          {submitLabel}
        </button>
        <button className="btn-secondary" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </div>
  );
};

interface MotionFormProps {
  onAdd: (note: PendingNote) => void;
  onCancel: () => void;
  members: BoardMember[];
  initialNote?: Extract<Note, { type: "motion" }>;
  submitLabel?: string;
}

const MotionForm = ({
  onAdd,
  onCancel,
  members,
  initialNote,
  submitLabel = "Add",
}: MotionFormProps) => {
  const completedMotionStatuses = new Set(["passed", "failed", "tabled"]);
  const [text, setText] = useState(initialNote?.text ?? "");
  const [selectedMoverId, setSelectedMoverId] = useState(
    initialNote?.moverMember?.id ??
      members.find((member) => member.name === initialNote?.mover)?.id ??
      ""
  );
  const [selectedSeconderId, setSelectedSeconderId] = useState(
    initialNote?.seconderMember?.id ??
      members.find((member) => member.name === initialNote?.seconder)?.id ??
      ""
  );
  const [status, setStatus] = useState<"proposed" | "under_discussion" | "passed" | "failed" | "tabled">(initialNote?.status ?? "proposed");
  const [votesFor, setVotesFor] = useState(String(initialNote?.votesFor ?? 0));
  const [votesAgainst, setVotesAgainst] = useState(String(initialNote?.votesAgainst ?? 0));
  const [votesAbstain, setVotesAbstain] = useState(String(initialNote?.votesAbstain ?? 0));
  const selectedMover = members.find((member) => member.id === selectedMoverId);
  const selectedSeconder = members.find((member) => member.id === selectedSeconderId);
  const shouldRecordVotes = completedMotionStatuses.has(status);
  const parseVoteCount = (value: string) => {
    const parsed = Number.parseInt(value, 10);
    return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
  };
  return (
    <div className="note-form">
      <h5 className="note-form-title">Motion</h5>
      <div className="minutes-form-row">
        <label>Motion text (after "moves..."):</label>
        <textarea
          rows={2}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="e.g. to approve the budget"
          autoFocus
        />
      </div>
      <div className="minutes-form-row">
        <label>Mover:</label>
        <select
          value={selectedMoverId}
          onChange={(e) => setSelectedMoverId(e.target.value)}
          style={{ padding: "6px 8px", borderRadius: 4, border: "1px solid var(--color-border, #ddd)" }}
        >
          <option value="">Select a board member</option>
          {members.map((member) => (
            <option key={member.id} value={member.id}>{member.name}</option>
          ))}
        </select>
      </div>
      <div className="minutes-form-row">
        <label>Seconder (optional):</label>
        <select
          value={selectedSeconderId}
          onChange={(e) => setSelectedSeconderId(e.target.value)}
          style={{ padding: "6px 8px", borderRadius: 4, border: "1px solid var(--color-border, #ddd)" }}
        >
          <option value="">— None —</option>
          {members.map((member) => (
            <option key={member.id} value={member.id}>{member.name}</option>
          ))}
        </select>
      </div>
      <div className="minutes-form-row">
        <label>Status:</label>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value as typeof status)}
          style={{ padding: "6px 8px", borderRadius: 4, border: "1px solid var(--color-border, #ddd)" }}
        >
          <option value="proposed">Proposed</option>
          <option value="under_discussion">Under Discussion</option>
          <option value="passed">Passed</option>
          <option value="failed">Failed</option>
          <option value="tabled">Tabled</option>
        </select>
      </div>
      {shouldRecordVotes && (
        <div className="motion-vote-counts">
          <div className="minutes-form-row">
            <label>For:</label>
            <input
              type="number"
              min={0}
              value={votesFor}
              onChange={(e) => setVotesFor(e.target.value)}
            />
          </div>
          <div className="minutes-form-row">
            <label>Against:</label>
            <input
              type="number"
              min={0}
              value={votesAgainst}
              onChange={(e) => setVotesAgainst(e.target.value)}
            />
          </div>
          <div className="minutes-form-row">
            <label>Abstain:</label>
            <input
              type="number"
              min={0}
              value={votesAbstain}
              onChange={(e) => setVotesAbstain(e.target.value)}
            />
          </div>
        </div>
      )}
      <div className="minutes-actions">
        <button
          className="btn-primary"
          onClick={() => {
            if (!text.trim() || !selectedMover) return;
            onAdd({
              type: "motion",
              text: text.trim(),
              mover: selectedMover.name,
              seconder: selectedSeconder?.name,
              moverMember: selectedMover,
              seconderMember: selectedSeconder,
              votesFor: shouldRecordVotes ? parseVoteCount(votesFor) : undefined,
              votesAgainst: shouldRecordVotes ? parseVoteCount(votesAgainst) : undefined,
              votesAbstain: shouldRecordVotes ? parseVoteCount(votesAbstain) : undefined,
              status,
            });
          }}
        >
          {submitLabel}
        </button>
        <button className="btn-secondary" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </div>
  );
};

const toStoredNote = (note: PendingNote) => {
  if (note.type === "action_item") {
    return {
      type: note.type,
      text: note.text,
      assigneeId: note.assignee?.id,
      assigneeName: note.assignee?.name,
    };
  }
  if (note.type === "motion") {
    return {
      type: note.type,
      text: note.text,
      mover: note.mover,
      moverId: note.moverMember?.id,
      moverName: note.moverMember?.name ?? note.mover,
      seconder: note.seconder,
      seconderId: note.seconderMember?.id,
      seconderName: note.seconderMember?.name ?? note.seconder,
      votesFor: note.votesFor,
      votesAgainst: note.votesAgainst,
      votesAbstain: note.votesAbstain,
      status: note.status,
    };
  }
  return note;
};

type EditableNoteProps = {
  note: Note;
  members: BoardMember[];
  isEditing: boolean;
  onStartEdit: () => void;
  onStopEdit: () => void;
  onUpdate: (note: PendingNote) => void;
  onDelete: () => void;
};

const EditableNote = ({
  note,
  members,
  isEditing,
  onStartEdit,
  onStopEdit,
  onUpdate,
  onDelete,
}: EditableNoteProps) => {
  if (isEditing) {
    const handleSave = (updatedNote: PendingNote) => {
      onUpdate(updatedNote);
      onStopEdit();
    };

    return (
      <div className="minutes-note-edit">
        {note.type === "text" && (
          <TextNoteForm
            initialNote={note}
            submitLabel="Save"
            onAdd={handleSave}
            onCancel={onStopEdit}
          />
        )}
        {note.type === "action_item" && (
          <ActionItemForm
            initialNote={note}
            submitLabel="Save"
            onAdd={handleSave}
            onCancel={onStopEdit}
            members={members}
          />
        )}
        {note.type === "motion" && (
          <MotionForm
            initialNote={note}
            submitLabel="Save"
            onAdd={handleSave}
            onCancel={onStopEdit}
            members={members}
          />
        )}
      </div>
    );
  }

  return (
    <div className="minutes-note-item">
      <NoteDisplay note={note} />
      <button
        className="note-edit-btn"
        title="Edit note"
        aria-label="Edit note"
        onClick={onStartEdit}
      >
        Edit
      </button>
      <button
        className="note-delete-btn"
        title="Remove note"
        aria-label="Remove note"
        onClick={onDelete}
      >
        ×
      </button>
    </div>
  );
};

// --- CompletedMinuteNotes — for adding notes to already-completed minutes ---

interface CompletedMinuteNotesProps {
  minute: NonNullable<NonNullable<ReturnType<typeof useMeeting>["minutes"]>[number]>;
  meeting: ReturnType<typeof useMeeting>;
  members: BoardMember[];
}

const CompletedMinuteNotes = ({ minute, meeting, members }: CompletedMinuteNotesProps) => {
  const [noteFormType, setNoteFormType] = useState<"text" | "action_item" | "motion" | null>(null);
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const addMinuteNote = useMutation(api.app.addMinuteNote);
  const updateMinuteNote = useMutation(api.app.updateMinuteNote);
  const removeMinuteNote = useMutation(api.app.removeMinuteNote);

  const addNoteToMinute = (pn: PendingNote) => {
    void addMinuteNote({
      meetingId: meeting.id,
      minuteId: minute.id,
      note: toStoredNote(pn),
    }).then(() => setNoteFormType(null));
  };

  const existingNotes = minute.notes ? minute.notes.filter((n) => n !== null) : [];

  return (
    <div className="minutes-notes-section">
      {existingNotes.map((note, i) => (
        <EditableNote
          key={note.id}
          note={note}
          members={members}
          isEditing={editingNoteId === note.id}
          onStartEdit={() => {
            setNoteFormType(null);
            setEditingNoteId(note.id);
          }}
          onStopEdit={() => setEditingNoteId(null)}
          onUpdate={(updatedNote) =>
            void updateMinuteNote({
              meetingId: meeting.id,
              minuteId: minute.id,
              noteId: note.id,
              note: toStoredNote(updatedNote),
            })
          }
          onDelete={() => {
            void removeMinuteNote({
              meetingId: meeting.id,
              minuteId: minute.id,
              index: i,
            });
          }}
        />
      ))}

      {!noteFormType && !editingNoteId && (
        <div className="minutes-note-add-buttons">
          <button className="btn-small btn-secondary" onClick={() => setNoteFormType("text")}>+ Text</button>
          <button className="btn-small btn-secondary" onClick={() => setNoteFormType("action_item")}>+ Action Item</button>
          <button className="btn-small btn-secondary" onClick={() => setNoteFormType("motion")}>+ Motion</button>
        </div>
      )}

      {noteFormType === "text" && (
        <TextNoteForm onAdd={addNoteToMinute} onCancel={() => setNoteFormType(null)} />
      )}
      {noteFormType === "action_item" && (
        <ActionItemForm onAdd={addNoteToMinute} onCancel={() => setNoteFormType(null)} members={members} />
      )}
      {noteFormType === "motion" && (
        <MotionForm onAdd={addNoteToMinute} onCancel={() => setNoteFormType(null)} members={members} />
      )}
    </div>
  );
};

// --- PostMeetingMinutes ---

const PostMeetingMinutes = () => {
  const meeting = useMeeting();
  const me = useLoadedAccount();
  const isOfficer = me?.canWrite(meeting);
  const minutes = meeting.minutes ?? [];
  const completedMinutes = minutes.filter((m) => m !== null);

  // Build planned agenda topics that have no minute (not covered)
  const coveredTopicIds = new Set(
    completedMinutes.map((m) => m.topic?.plannedTopic?.id).filter(Boolean)
  );

  const plannedNotCovered = (meeting.plannedAgenda ?? [])
    .filter((t) => t !== null)
    .filter((t) => !coveredTopicIds.has(t.id));

  // unplanned = live topics with no plannedTopic that have a minute
  return (
    <div className="meeting-minutes-completed">
      <h2>Meeting Minutes</h2>
      <p className="minutes-date">
        {meeting.date.toLocaleDateString(undefined, {
          weekday: "long",
          year: "numeric",
          month: "long",
          day: "numeric",
        })}
      </p>

      <section className="minutes-section">
        <h3>Official Minutes</h3>
        {completedMinutes.length === 0 ? (
          <p>No minutes recorded.</p>
        ) : (
          <ol className="minutes-list">
            {completedMinutes.map((minute, idx) => {
              const topic = minute.topic;
              const planned =
                topic?.plannedTopic?.durationMinutes ?? topic?.durationMinutes;
              const actual = minute.durationMinutes;
              const diff = planned !== undefined ? actual - planned : null;
              const notes = minute.notes ? minute.notes.filter((n) => n !== null) : [];
              return (
                <li key={idx} className="minutes-item">
                  <div className="minutes-item-header">
                    <span className="minutes-item-title">
                      {topic?.title ?? "(unknown)"}
                    </span>
                    <span className="minutes-item-duration">
                      {actual} min
                      {planned !== undefined && ` / ${planned} min planned`}
                      {diff !== null && diff !== 0 && (
                        <span className={diff > 0 ? "overtime" : "undertime"}>
                          {" "}
                          ({diff > 0 ? "+" : ""}
                          {diff})
                        </span>
                      )}
                    </span>
                  </div>
                  {topic?.outcome && (
                    <div className="minutes-item-notes">{topic.outcome}</div>
                  )}
                  {notes.length > 0 && (
                    <div className="minutes-item-structured-notes">
                      {notes.map((note, ni) => (
                        <NoteDisplay key={ni} note={note} />
                      ))}
                    </div>
                  )}
                </li>
              );
            })}
          </ol>
        )}
      </section>

      {plannedNotCovered.length > 0 && (
        <section className="minutes-section">
          <h3>Skipped</h3>
          <p className="minutes-hint">
            These planned topics were not reached during the meeting.
          </p>
          <ul className="minutes-list">
            {plannedNotCovered.map((topic) => (
              <li key={topic.id} className="minutes-item">
                <div className="minutes-item-header">
                  <span className="minutes-item-title">
                    <span className="badge badge-skipped">Skipped</span>
                    {topic.title}
                  </span>
                  <span className="minutes-item-duration">
                    {topic.durationMinutes ?? "?"} min planned
                  </span>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Comparison table — officers only */}
      {isOfficer && <section className="minutes-section">
        <h3>Agenda Comparison</h3>
        <table className="minutes-comparison-table">
          <thead>
            <tr>
              <th>Topic</th>
              <th>Planned</th>
              <th>Actual</th>
              <th>Diff</th>
              <th>Notes</th>
            </tr>
          </thead>
          <tbody>
            {completedMinutes.map((minute, idx) => {
              const topic = minute.topic;
              const isUnplanned = !topic?.plannedTopic;
              const isSkipped = topic?.cancelled;
              const planned =
                topic?.plannedTopic?.durationMinutes ?? topic?.durationMinutes;
              const actual = minute.durationMinutes;
              const diff = planned !== undefined ? actual - planned : null;
              return (
                <tr
                  key={idx}
                  className={isSkipped ? "row-skipped" : ""}
                >
                  <td>
                    {isUnplanned && (
                      <span className="badge badge-unplanned">Unplanned</span>
                    )}
                    {isSkipped && (
                      <span className="badge badge-skipped">Skipped</span>
                    )}{" "}
                    {topic?.title ?? "(unknown)"}
                  </td>
                  <td>{planned !== undefined ? `${planned} min` : "—"}</td>
                  <td>{actual} min</td>
                  <td>
                    {diff !== null ? (
                      <span className={diff > 0 ? "overtime" : diff < 0 ? "undertime" : ""}>
                        {diff === 0 ? "—" : `${diff > 0 ? "+" : ""}${diff} min`}
                      </span>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td>{topic?.outcome ?? ""}</td>
                </tr>
              );
            })}
            {plannedNotCovered.map((topic) => (
              <tr key={topic.id} className="row-not-covered">
                <td>
                  <span className="badge badge-skipped">Skipped</span>{" "}
                  {topic.title}
                </td>
                <td>{topic.durationMinutes ?? "?"} min</td>
                <td>—</td>
                <td>—</td>
                <td></td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>}
    </div>
  );
};

export const MeetingMinutes = () => {
  const meeting = useMeeting();
  const me = useLoadedAccount();

  const minutesLayoutRef = useRef<HTMLDivElement | null>(null);
  const topicDetailRef = useRef<HTMLElement | null>(null);
  const activeBannerRef = useRef<HTMLButtonElement | null>(null);
  const agendaPaneRef = useRef<HTMLElement | null>(null);
  const selectedConnectionRef = useRef<SVGPathElement | null>(null);
  const activeConnectionRef = useRef<SVGPathElement | null>(null);
  const agendaPaneViewportTopRef = useRef<number | null>(null);
  const hasScrolledInitialTopicIntoViewRef = useRef(false);
  const [now, setNow] = useState(() => new Date());
  const focusedTopicId = meeting.focusedTopicId ?? null;
  const [isAgendaPaneOpen, setIsAgendaPaneOpen] = useState(false);
  const [isAgendaPaneSettling, setIsAgendaPaneSettling] = useState(false);
  const [agendaSlotMinutes, setAgendaSlotMinutes] = useState(
    AGENDA_BASE_SLOT_MINUTES
  );
  const [newTopicTitle, setNewTopicTitle] = useState("");
  const [newTopicDuration, setNewTopicDuration] = useState<number>(5);
  const [addingAfterTopicId, setAddingAfterTopicId] = useState<string | null>(
    null
  );
  const [hoveredInsertionAfterTopicId, setHoveredInsertionAfterTopicId] =
    useState<string | null>(null);
  const [editingTopicId, setEditingTopicId] = useState<string | null>(null);
  const [editingDuration, setEditingDuration] = useState("");
  const [editingMinuteId, setEditingMinuteId] = useState<string | null>(null);
  const [editingActualDuration, setEditingActualDuration] = useState("");
  const [isEditingMeetingStartTime, setIsEditingMeetingStartTime] =
    useState(false);
  const [editingMeetingStartTime, setEditingMeetingStartTime] = useState("");
  const [noteFormType, setNoteFormType] = useState<"text" | "action_item" | "motion" | null>(null);
  const [editingCurrentNoteId, setEditingCurrentNoteId] = useState<string | null>(null);
  const advanceTopic = useMutation(api.app.advanceTopic);
  const skipTopic = useMutation(api.app.skipTopic);
  const addTopic = useMutation(api.app.addTopic).withOptimisticUpdate(
    (localStore, rawArgs) => {
      const args = rawArgs as {
        durationMinutes?: number;
        insertAfterTopicId?: string;
        list: "plannedAgenda" | "liveAgenda";
        meetingId: string;
        title: string;
      };
      if (args.list !== "liveAgenda") return;
      const currentMeeting = localStore.getQuery(api.app.meeting, {
        meetingId: args.meetingId,
      }) as Meeting | undefined | null;
      if (!currentMeeting) return;
      const topic: Topic = {
        id: `optimistic-${Date.now().toString(36)}`,
        title: args.title,
        durationMinutes: args.durationMinutes,
      };
      const topics = [...currentMeeting.liveAgenda];
      const afterIndex = args.insertAfterTopicId
        ? topics.findIndex(
            (candidate: Topic) => candidate.id === args.insertAfterTopicId
          )
        : -1;
      const completedCount = currentMeeting.minutes.filter(
        (minute) => minute !== null
      ).length;
      const currentIndex = topics.findIndex(
        (candidate: Topic, index: number) =>
          index >= completedCount && !candidate.cancelled && !candidate.deferred
      );
      const liveMinimumIndex =
        currentMeeting.status === "live" && currentIndex !== -1
          ? currentIndex + 1
          : 0;
      const insertIndex =
        afterIndex === -1
          ? topics.length
          : Math.max(afterIndex + 1, liveMinimumIndex);
      topics.splice(insertIndex, 0, topic);
      localStore.setQuery(
        api.app.meeting,
        { meetingId: args.meetingId },
        {
          ...currentMeeting,
          liveAgenda: topics,
        }
      );
    }
  );
  const updateTopic = useMutation(api.app.updateTopic);
  const reorderTopics = useMutation(api.app.reorderTopics).withOptimisticUpdate(
    (localStore, rawArgs) => {
      const args = rawArgs as {
        list: "plannedAgenda" | "liveAgenda";
        meetingId: string;
        topicIds: string[];
      };
      if (args.list !== "liveAgenda") return;
      const currentMeeting = localStore.getQuery(api.app.meeting, {
        meetingId: args.meetingId,
      }) as Meeting | undefined | null;
      if (!currentMeeting) return;
      const byId = new Map(
        currentMeeting.liveAgenda.map((topic: Topic) => [topic.id, topic])
      );
      const reordered = args.topicIds
        .map((topicId: string) => byId.get(topicId))
        .filter((topic: Topic | undefined): topic is Topic => Boolean(topic));
      localStore.setQuery(
        api.app.meeting,
        { meetingId: args.meetingId },
        {
          ...currentMeeting,
          liveAgenda: reordered,
        }
      );
    }
  );
  const makeActive = useMutation(api.app.makeActive);
  const addCurrentNote = useMutation(api.app.addCurrentNote);
  const updateCurrentNote = useMutation(api.app.updateCurrentNote);
  const removeCurrentNote = useMutation(api.app.removeCurrentNote);
  const setFocusedTopic = useMutation(api.app.setFocusedTopic);
  const updateLiveStartTime = useMutation(api.app.updateLiveStartTime);
  const updateMinuteDuration = useMutation(api.app.updateMinuteDuration);

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    setIsAgendaPaneSettling(true);
    const timeoutId = window.setTimeout(() => {
      setIsAgendaPaneSettling(false);
    }, 220);
    return () => window.clearTimeout(timeoutId);
  }, [isAgendaPaneOpen]);

  useEffect(() => {
    const pane = agendaPaneRef.current;
    if (!pane) return;

    const updateAgendaPaneMetrics = (remeasurePaneTop = false) => {
      if (remeasurePaneTop || agendaPaneViewportTopRef.current === null) {
        agendaPaneViewportTopRef.current = Math.max(
          16,
          pane.getBoundingClientRect().top
        );
      }
      const paneTop = agendaPaneViewportTopRef.current;
      const paneMaxHeight = Math.max(
        AGENDA_SLOT_HEIGHT_PX,
        window.innerHeight - paneTop - 24
      );
      pane.style.setProperty("--agenda-pane-max-height", `${paneMaxHeight}px`);
      const header = pane.querySelector<HTMLElement>(
        ".minutes-agenda-pane-header"
      );
      const footer =
        pane.querySelector<HTMLElement>(":scope > .minutes-add-topic-form") ??
        pane.querySelector<HTMLElement>(":scope > .btn-secondary");
      const availableHeight = Math.max(
        AGENDA_SLOT_HEIGHT_PX,
        paneMaxHeight -
          (header?.offsetHeight ?? 0) -
          (footer?.offsetHeight ?? 0) -
          28
      );
      setAgendaSlotMinutes((current) => {
        const next = getAgendaSlotMinutesForHeight(availableHeight);
        return current === next ? current : next;
      });
    };

    updateAgendaPaneMetrics(true);
    if (typeof ResizeObserver === "undefined") {
      const handleResize = () => updateAgendaPaneMetrics(true);
      window.addEventListener("resize", handleResize);
      return () => {
        window.removeEventListener("resize", handleResize);
      };
    }

    const resizeObserver = new ResizeObserver(() => updateAgendaPaneMetrics());
    resizeObserver.observe(pane);
    const handleResize = () => updateAgendaPaneMetrics(true);
    window.addEventListener("resize", handleResize);
    return () => {
      resizeObserver.disconnect();
      window.removeEventListener("resize", handleResize);
    };
  }, [addingAfterTopicId, hoveredInsertionAfterTopicId]);

  // Derive the meeting-active topic before any early returns so hook count stays stable.
  // "Meeting active" means the topic currently being discussed in the live meeting.
  // "Selected" means the agenda item the minute taker has opened in the detail pane.
  const liveAgenda = meeting.liveAgenda ?? [];
  const minutes = meeting.minutes ?? [];
  const completedCount = minutes.filter((m) => m !== null).length;
  const meetingActiveTopicIndex = liveAgenda.findIndex(
    (topic, index) =>
      index >= completedCount && !topic.cancelled && !topic.deferred
  );
  const meetingActiveTopic: Topic | null =
    meetingActiveTopicIndex === -1 ? null : liveAgenda[meetingActiveTopicIndex];
  const remainingStartIndex =
    meetingActiveTopicIndex === -1 ? completedCount : meetingActiveTopicIndex + 1;
  const meetingActiveTopicId = meetingActiveTopic?.id ?? null;

  useEffect(() => {
    setNoteFormType(null);
    setEditingCurrentNoteId(null);
  }, [meetingActiveTopicId]);

  const isOfficer = me?.canWrite(meeting);

  const members = (me.root.selectedOrganization?.members ?? []).filter((m) => m !== null);

  const liveStartTime = meeting.liveStartTime;
  const meetingActualStartTime = liveStartTime ?? meeting.date;

  const sumCompletedMinutes = minutes
    .filter((m) => m !== null)
    .reduce((sum, m) => sum + (m.durationMinutes ?? 0), 0);

  const currentTopicActiveSeconds = liveStartTime
    ? Math.max(
        0,
        Math.floor(
          (now.getTime() -
            (meetingActualStartTime.getTime() + sumCompletedMinutes * 60 * 1000)) /
            1000
        )
      )
    : 0;

  const handleCompleteTopic = () => {
    const actualDuration = Math.max(1, Math.round(currentTopicActiveSeconds / 60));
    void advanceTopic({
      meetingId: meeting.id,
      actualDurationMinutes: actualDuration,
    }).then(() => {
      setNoteFormType(null);
    });
  };

  const handleSkipTopic = () => {
    void skipTopic({ meetingId: meeting.id }).then(() => {
      setNoteFormType(null);
    });
  };

  const onDragEnd = (result: DropResult) => {
    if (!result.destination) return;
    const srcIdx = result.source.index;
    const destIdx = result.destination.index;
    if (srcIdx === destIdx) return;
    const nextRemaining = [...remainingTopics];
    const [topic] = nextRemaining.splice(srcIdx, 1);
    nextRemaining.splice(destIdx, 0, topic);
    const remainingIds = new Set(remainingTopics.map((t) => t.id));
    const nextIds = [
      ...liveAgenda.filter((topic) => !remainingIds.has(topic.id)).map((topic) => topic.id),
      ...nextRemaining.map((topic) => topic.id),
    ];
    void reorderTopics({ meetingId: meeting.id, list: "liveAgenda", topicIds: nextIds });
  };

  const handleAddTopic = () => {
    if (!newTopicTitle.trim()) return;
    void addTopic({
      meetingId: meeting.id,
      list: "liveAgenda",
      title: newTopicTitle.trim(),
      durationMinutes: newTopicDuration,
      insertAfterTopicId: addingAfterTopicId ?? undefined,
    });
    setNewTopicTitle("");
    setNewTopicDuration(5);
    setAddingAfterTopicId(null);
    setHoveredInsertionAfterTopicId(null);
  };

  // Remaining topics (after current), split into deferred and upcoming
  const allRemaining = liveAgenda
    .filter((t) => t !== null)
    .slice(remainingStartIndex)
    .filter((t) => !t.cancelled);
  const remainingTopics = allRemaining.filter((t) => !t.deferred);
  const deferredTopics = allRemaining.filter((t) => t.deferred);

  const completedMinutes = minutes.filter((m) => m !== null);

  type CompletedAgendaMenuItem =
    {
      key: string;
      kind: "completed";
      topic: Topic;
      minute: NonNullable<(typeof completedMinutes)[number]>;
    };
  type AgendaMenuItem =
    | CompletedAgendaMenuItem
    | {
        key: string;
        kind: "meeting-active" | "remaining" | "deferred";
        topic: Topic;
      };

  const completedAgendaItems: CompletedAgendaMenuItem[] = completedMinutes.map((minute) => ({
    key: `completed:${minute.id}`,
    kind: "completed",
    topic: minute.topic,
    minute,
  }));
  const meetingActiveAgendaItem: AgendaMenuItem | null = meetingActiveTopic
    ? {
        key: `meeting-active:${meetingActiveTopic.id}`,
        kind: "meeting-active",
        topic: meetingActiveTopic,
      }
    : null;
  const remainingAgendaItems: AgendaMenuItem[] = remainingTopics.map((topic) => ({
    key: `remaining:${topic.id}`,
    kind: "remaining",
    topic,
  }));
  const deferredAgendaItems: AgendaMenuItem[] = deferredTopics.map((topic) => ({
    key: `deferred:${topic.id}`,
    kind: "deferred",
    topic,
  }));
  const agendaMenuItems = [
    ...completedAgendaItems,
    ...(meetingActiveAgendaItem ? [meetingActiveAgendaItem] : []),
    ...remainingAgendaItems,
    ...deferredAgendaItems,
  ];
  const selectedAgendaItem =
    agendaMenuItems.find((item) => item.topic.id === focusedTopicId) ??
    meetingActiveAgendaItem ??
    agendaMenuItems[0] ??
    null;
  const selectedTopicId = selectedAgendaItem?.topic.id ?? null;
  const isSelectedTopicActive =
    selectedTopicId !== null && selectedTopicId === meetingActiveTopicId;
  const shouldShowActiveTopicBanner =
    Boolean(meetingActiveTopicId) && !isSelectedTopicActive;
  const hasFocusedAgendaTopic = focusedTopicId
    ? agendaMenuItems.some((item) => item.topic.id === focusedTopicId)
    : false;
  const fallbackFocusedTopicId =
    (meetingActiveAgendaItem ?? agendaMenuItems[0])?.topic.id ?? null;

  type AgendaTimelineEntry = {
    item: AgendaMenuItem;
    start: Date;
    end: Date;
    durationMinutes: number;
    startSlot: number;
    slotSpan: number;
    displayTopPx: number;
    displayHeightPx: number;
    plannedMinutes?: number;
  };

  const agendaTimelineEntries: AgendaTimelineEntry[] = [];
  const agendaGridStart = floorToAgendaSlot(
    meetingActualStartTime,
    agendaSlotMinutes
  );
  let agendaCursor = new Date(meetingActualStartTime);

  const appendAgendaTimelineEntry = (
    item: AgendaMenuItem,
    durationMinutes: number,
    plannedMinutes?: number
  ) => {
    const normalizedDuration = Math.max(1, Math.round(durationMinutes));
    const start = new Date(agendaCursor);
    const end = new Date(start.getTime() + normalizedDuration * 60 * 1000);
    const startSlot =
      (start.getTime() - agendaGridStart.getTime()) /
      (agendaSlotMinutes * 60 * 1000);
    const slotSpan = Math.max(
      0.2,
      (end.getTime() - start.getTime()) /
        (agendaSlotMinutes * 60 * 1000)
    );
    agendaTimelineEntries.push({
      item,
      start,
      end,
      durationMinutes: normalizedDuration,
      startSlot,
      slotSpan,
      displayTopPx: startSlot * AGENDA_SLOT_HEIGHT_PX,
      displayHeightPx: Math.max(
        AGENDA_EVENT_MIN_HEIGHT_PX,
        slotSpan * AGENDA_SLOT_HEIGHT_PX - 2
      ),
      plannedMinutes,
    });
    agendaCursor = end;
  };

  completedAgendaItems.forEach((item) => {
    const planned =
      item.topic.plannedTopic?.durationMinutes ?? item.topic.durationMinutes;
    appendAgendaTimelineEntry(item, item.minute.durationMinutes, planned);
  });

  if (meetingActiveAgendaItem) {
    const planned = meetingActiveAgendaItem.topic.durationMinutes;
    const elapsedMinutes = Math.max(1, Math.ceil(currentTopicActiveSeconds / 60));
    appendAgendaTimelineEntry(
      meetingActiveAgendaItem,
      Math.max(elapsedMinutes, planned ?? elapsedMinutes),
      planned
    );
  }

  remainingAgendaItems.forEach((item) => {
    const planned = item.topic.durationMinutes;
    appendAgendaTimelineEntry(item, planned ?? 5, planned);
  });

  deferredAgendaItems.forEach((item) => {
    const planned = item.topic.durationMinutes;
    appendAgendaTimelineEntry(item, planned ?? 5, planned);
  });

  const timelineEntryByKey = new Map(
    agendaTimelineEntries.map((entry) => [entry.item.key, entry])
  );
  const getInsertionGap = (topicId: string) => {
    if (topicId === addingAfterTopicId) {
      return AGENDA_INSERTION_FORM_GAP_PX;
    }
    return AGENDA_INSERTION_RESERVED_HEIGHT_PX;
  };
  let packedAgendaBottom = 0;
  agendaTimelineEntries.forEach((entry, index) => {
    const actualTop = entry.startSlot * AGENDA_SLOT_HEIGHT_PX;
    const desiredHeight = Math.max(
      AGENDA_EVENT_MIN_HEIGHT_PX,
      entry.slotSpan * AGENDA_SLOT_HEIGHT_PX - 2
    );
    const nextActualTop =
      agendaTimelineEntries[index + 1]?.startSlot === undefined
        ? undefined
        : agendaTimelineEntries[index + 1].startSlot * AGENDA_SLOT_HEIGHT_PX;
    const displayTop = Math.max(actualTop, packedAgendaBottom);
    const availableHeight =
      nextActualTop === undefined
        ? desiredHeight
        : nextActualTop - displayTop - AGENDA_EVENT_GAP_PX;
    const displayHeight = Math.max(
      AGENDA_EVENT_MIN_HEIGHT_PX,
      Math.min(desiredHeight, availableHeight)
    );
    entry.displayTopPx = displayTop;
    entry.displayHeightPx = displayHeight;
    const insertionGap =
      entry.item.kind === "completed" ? 0 : getInsertionGap(entry.item.topic.id);
    packedAgendaBottom =
      displayTop + displayHeight + AGENDA_EVENT_GAP_PX + insertionGap;
  });
  const agendaSlotCount = Math.max(
    1,
    ceilMinutesToAgendaSlotCount(
      (agendaCursor.getTime() - agendaGridStart.getTime()) / (60 * 1000),
      agendaSlotMinutes
    ),
    Math.ceil(packedAgendaBottom / AGENDA_SLOT_HEIGHT_PX)
  );
  const agendaTimeSlots = Array.from({ length: agendaSlotCount + 1 }, (_, index) => ({
    key: `slot:${index}`,
    label: formatAgendaTime(
      new Date(agendaGridStart.getTime() + index * agendaSlotMinutes * 60 * 1000)
    ),
    gridLine: index + 1,
  }));

  const getAgendaConnectionPath = (connection: {
    x1: number;
    y1: number;
    x2: number;
    y2: number;
  }) => {
    const controlOffset = Math.max(
      36,
      Math.min(160, Math.abs(connection.x2 - connection.x1) * 0.45)
    );
    return `M ${connection.x1} ${connection.y1} C ${
      connection.x1 + controlOffset
    } ${connection.y1}, ${connection.x2 - controlOffset} ${connection.y2}, ${
      connection.x2
    } ${connection.y2}`;
  };

  const findAgendaTopicElement = (topicId: string): HTMLElement | null => {
    const pane = agendaPaneRef.current;
    if (!pane) return null;
    return (
      Array.from(
        pane.querySelectorAll<HTMLElement>("[data-agenda-topic-id]")
      ).find((element) => element.dataset.agendaTopicId === topicId) ?? null
    );
  };

  const scrollAgendaTopicIntoView = (topicId: string) => {
    window.requestAnimationFrame(() => {
      findAgendaTopicElement(topicId)?.scrollIntoView({
        block: "center",
        inline: "nearest",
      });
    });
  };

  useEffect(() => {
    if (!selectedTopicId || hasScrolledInitialTopicIntoViewRef.current) return;
    if (window.matchMedia("(max-width: 750px)").matches) return;

    const frameId = window.requestAnimationFrame(() => {
      const selectedElement = findAgendaTopicElement(selectedTopicId);
      if (!selectedElement) return;
      selectedElement.scrollIntoView({
        block: "center",
        inline: "nearest",
      });
      hasScrolledInitialTopicIntoViewRef.current = true;
    });

    return () => window.cancelAnimationFrame(frameId);
  }, [selectedTopicId, agendaTimelineEntries.length]);

  useEffect(() => {
    let frameId = 0;
    const hideConnection = (path: SVGPathElement | null) => {
      path?.classList.add("is-hidden");
    };
    const showConnection = (
      path: SVGPathElement | null,
      connection: { x1: number; y1: number; x2: number; y2: number }
    ) => {
      if (!path) return;
      path.setAttribute("d", getAgendaConnectionPath(connection));
      path.classList.remove("is-hidden");
    };
    const updateConnections = () => {
      const isMobile = window.matchMedia("(max-width: 750px)").matches;
      if (isMobile && (isAgendaPaneOpen || isAgendaPaneSettling)) {
        hideConnection(selectedConnectionRef.current);
        hideConnection(activeConnectionRef.current);
        return;
      }

      const layout = minutesLayoutRef.current;
      if (!layout) return;

      const layoutRect = layout.getBoundingClientRect();
      const getConnection = (
        source: HTMLElement | null,
        topicId: string | null
      ): { x1: number; y1: number; x2: number; y2: number } | null => {
        if (!source || !topicId) return null;
        const target = findAgendaTopicElement(topicId);
        if (!target) return null;
        const sourceRect = source.getBoundingClientRect();
        const targetRect = target.getBoundingClientRect();
        const pane = agendaPaneRef.current;
        const paneRect = pane?.getBoundingClientRect();
        const paneHeaderRect = pane
          ?.querySelector<HTMLElement>(".minutes-agenda-pane-header")
          ?.getBoundingClientRect();
        const y1 = sourceRect.top + sourceRect.height / 2 - layoutRect.top;
        const targetCenterY = targetRect.top + targetRect.height / 2;
        const paneVisibleTop =
          paneRect && paneHeaderRect
            ? Math.max(paneRect.top, paneHeaderRect.bottom + 8)
            : paneRect?.top;
        const cappedTargetY = paneRect
          ? Math.min(
              Math.max(targetCenterY, paneVisibleTop ?? paneRect.top),
              paneRect.bottom
            )
          : targetCenterY;
        const y2 = cappedTargetY - layoutRect.top;
        const targetX =
          isMobile && !isAgendaPaneOpen && paneRect
            ? paneRect.left - layoutRect.left
            : targetRect.left - layoutRect.left;
        return {
          x1: sourceRect.right - layoutRect.left,
          y1,
          x2: targetX,
          y2,
        };
      };

      const selectedConnection = getConnection(
        topicDetailRef.current,
        selectedTopicId
      );
      if (selectedConnection) {
        showConnection(selectedConnectionRef.current, selectedConnection);
      } else {
        hideConnection(selectedConnectionRef.current);
      }

      if (shouldShowActiveTopicBanner) {
        const activeConnection = getConnection(
          activeBannerRef.current,
          meetingActiveTopicId
        );
        if (activeConnection) {
          showConnection(activeConnectionRef.current, activeConnection);
        } else {
          hideConnection(activeConnectionRef.current);
        }
      } else {
        hideConnection(activeConnectionRef.current);
      }
    };
    const scheduleUpdate = () => {
      window.cancelAnimationFrame(frameId);
      frameId = window.requestAnimationFrame(updateConnections);
    };

    scheduleUpdate();
    const postTransitionUpdateId = window.setTimeout(scheduleUpdate, 220);
    window.addEventListener("resize", scheduleUpdate);
    window.addEventListener("scroll", scheduleUpdate, true);

    const resizeObserver = new ResizeObserver(scheduleUpdate);
    [
      minutesLayoutRef.current,
      topicDetailRef.current,
      activeBannerRef.current,
      agendaPaneRef.current,
    ].forEach((element) => {
      if (element) resizeObserver.observe(element);
    });

    return () => {
      window.cancelAnimationFrame(frameId);
      window.clearTimeout(postTransitionUpdateId);
      window.removeEventListener("resize", scheduleUpdate);
      window.removeEventListener("scroll", scheduleUpdate, true);
      resizeObserver.disconnect();
    };
  }, [
    selectedTopicId,
    meetingActiveTopicId,
    shouldShowActiveTopicBanner,
    agendaTimelineEntries.length,
    agendaSlotMinutes,
    isAgendaPaneOpen,
    isAgendaPaneSettling,
  ]);

  useEffect(() => {
    if (!isOfficer) return;
    if (!agendaMenuItems.length) {
      if (focusedTopicId) {
        void setFocusedTopic({ meetingId: meeting.id, topicId: undefined });
      }
      return;
    }
    if (!hasFocusedAgendaTopic && fallbackFocusedTopicId) {
      void setFocusedTopic({
        meetingId: meeting.id,
        topicId: fallbackFocusedTopicId,
      });
    }
  }, [
    isOfficer,
    focusedTopicId,
    hasFocusedAgendaTopic,
    agendaMenuItems.length,
    fallbackFocusedTopicId,
    meeting.id,
    setFocusedTopic,
  ]);

  // Completed meeting view
  if (meeting.status === "completed") {
    return <PostMeetingMinutes />;
  }

  if (meeting.status !== "live") {
    return <p>Meeting has not started yet.</p>;
  }

  if (!isOfficer) {
    return <p>You do not have permission to take minutes.</p>;
  }

  const formatDurationOvertime = (seconds: number, plannedMinutes: number) => {
    const formatted = formatDuration(seconds);
    if (seconds > plannedMinutes * 60) {
      return <span className="overtime">{formatted}</span>;
    }
    return <span>{formatted}</span>;
  };

  const renderEditableDuration = (topic: Topic) =>
    editingTopicId === topic.id ? (
      <input
        className="inline-duration-input"
        type="number"
        min={1}
        value={editingDuration}
        autoFocus
        onChange={(e) => setEditingDuration(e.target.value)}
        onBlur={(e) => {
          const v = parseInt(e.currentTarget.value);
          if (!isNaN(v) && v > 0) {
            void updateTopic({
              meetingId: meeting.id,
              list: "liveAgenda",
              topicId: topic.id,
              durationMinutes: v,
            });
          }
          setEditingTopicId(null);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") e.currentTarget.blur();
          if (e.key === "Escape") setEditingTopicId(null);
        }}
      />
    ) : (
      <span
        onDoubleClick={() => {
          setEditingTopicId(topic.id);
          setEditingDuration(String(topic.durationMinutes ?? ""));
        }}
        title="Double-click to edit"
      >
        {topic.durationMinutes ?? "?"} min
      </span>
    );

  const renderEditableActualDuration = (
    minute: NonNullable<(typeof completedMinutes)[number]>
  ) =>
    editingMinuteId === minute.id ? (
      <input
        className="inline-duration-input"
        type="number"
        min={1}
        value={editingActualDuration}
        autoFocus
        onChange={(e) => setEditingActualDuration(e.target.value)}
        onBlur={(e) => {
          const v = parseInt(e.currentTarget.value);
          if (!isNaN(v) && v > 0) {
            void updateMinuteDuration({
              meetingId: meeting.id,
              minuteId: minute.id,
              durationMinutes: v,
            });
          }
          setEditingMinuteId(null);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") e.currentTarget.blur();
          if (e.key === "Escape") setEditingMinuteId(null);
        }}
      />
    ) : (
      <span
        onDoubleClick={() => {
          setEditingMinuteId(minute.id);
          setEditingActualDuration(String(minute.durationMinutes));
        }}
        title="Double-click to edit"
      >
        {minute.durationMinutes} min
      </span>
    );

  const commitMeetingStartTime = (value = editingMeetingStartTime) => {
    const match = value.match(/^(\d{2}):(\d{2})$/);
    if (match) {
      const next = new Date(meetingActualStartTime);
      next.setHours(Number(match[1]), Number(match[2]), 0, 0);
      void updateLiveStartTime({
        meetingId: meeting.id,
        liveStartTime: next.getTime(),
      });
    }
    setIsEditingMeetingStartTime(false);
  };

  const renderTimelineButtonContent = (entry: AgendaTimelineEntry) => {
    const { item } = entry;
    const topic = item.topic;
    const isCompleted = item.kind === "completed";
    const diff =
      isCompleted && entry.plannedMinutes !== undefined
        ? entry.durationMinutes - entry.plannedMinutes
        : null;
    const statusLabel =
      item.kind === "meeting-active"
        ? "Now discussing"
        : item.kind === "completed"
          ? "Completed"
          : item.kind === "deferred"
            ? "Deferred"
            : "Projected";

    return (
      <>
        <span className="minutes-day-view-status">{statusLabel}</span>
        <span className="minutes-day-view-title">{topic.title}</span>
        <span className="minutes-day-view-meta">
          {isCompleted
            ? `${formatMinuteCount(entry.durationMinutes)}${formatDiff(
                diff ?? 0
              )}`
            : item.kind === "meeting-active"
              ? formatDuration(currentTopicActiveSeconds)
              : formatMinuteCount(entry.durationMinutes)}
        </span>
        <span className="minutes-day-view-range">
          {formatAgendaTime(entry.start)} - {formatAgendaTime(entry.end)}
        </span>
      </>
    );
  };

  const getTimelineEntryTitle = (entry: AgendaTimelineEntry) =>
    `${entry.item.topic.title} (${formatAgendaTime(entry.start)} - ${formatAgendaTime(
      entry.end
    )})`;

  const renderAddTopicForm = (
    className = "minutes-add-topic-form",
    style?: CSSProperties
  ) => (
    <div className={className} style={style}>
      <h4>Add Topic</h4>
      <div className="minutes-form-row">
        <label htmlFor="new-topic-title">Title:</label>
        <input
          id="new-topic-title"
          type="text"
          value={newTopicTitle}
          onChange={(e) => setNewTopicTitle(e.target.value)}
          placeholder="Topic title"
          autoFocus
        />
      </div>
      <div className="minutes-form-row">
        <label htmlFor="new-topic-duration">Duration (min):</label>
        <input
          id="new-topic-duration"
          type="number"
          min={1}
          value={newTopicDuration}
          onChange={(e) => setNewTopicDuration(Number(e.target.value))}
        />
      </div>
      <div className="minutes-actions">
        <button className="btn-primary" onClick={handleAddTopic}>
          Add
        </button>
        <button
          className="btn-secondary"
          onClick={() => {
            setAddingAfterTopicId(null);
            setHoveredInsertionAfterTopicId(null);
          }}
        >
          Cancel
        </button>
      </div>
    </div>
  );

  const renderInsertionCursor = (entry: AgendaTimelineEntry) => {
    if (entry.item.kind === "completed") return null;
    const topicId = entry.item.topic.id;
    const insertionTop =
      entry.displayTopPx + entry.displayHeightPx + AGENDA_EVENT_GAP_PX;
    const isAddingHere = addingAfterTopicId === topicId;
    const isHoveredHere = hoveredInsertionAfterTopicId === topicId;
    return (
      <div
        key={`insert:${entry.item.key}`}
        className={`minutes-agenda-insertion-slot${
          isAddingHere ? " is-open" : ""
        }${isHoveredHere ? " is-hovered" : ""}`}
        style={insertionCursorStyle(insertionTop)}
        onMouseEnter={() => setHoveredInsertionAfterTopicId(topicId)}
        onMouseLeave={() => {
          if (addingAfterTopicId !== topicId) {
            setHoveredInsertionAfterTopicId((current) =>
              current === topicId ? null : current
            );
          }
        }}
        onFocus={() => setHoveredInsertionAfterTopicId(topicId)}
        onBlur={(event) => {
          if (
            addingAfterTopicId !== topicId &&
            !event.currentTarget.contains(event.relatedTarget as Node | null)
          ) {
            setHoveredInsertionAfterTopicId((current) =>
              current === topicId ? null : current
            );
          }
        }}
      >
        <button
          className="minutes-agenda-insertion-button"
          type="button"
          aria-label={`Add topic after ${entry.item.topic.title}`}
          onClick={() => {
            setAddingAfterTopicId(topicId);
            setHoveredInsertionAfterTopicId(topicId);
          }}
        >
          <span aria-hidden="true">+</span>
        </button>
        {isAddingHere &&
          renderAddTopicForm(
            "minutes-add-topic-form minutes-add-topic-form-inline",
            insertionFormStyle()
          )}
      </div>
    );
  };

  const handleFocusTopic = (topicId: string, scrollAgenda = false) => {
    void setFocusedTopic({ meetingId: meeting.id, topicId });
    if (scrollAgenda) {
      scrollAgendaTopicIntoView(topicId);
    }
    if (window.matchMedia("(max-width: 750px)").matches) {
      setIsAgendaPaneOpen(false);
    }
  };

  return (
    <div className="meeting-minutes" ref={minutesLayoutRef}>
      <svg
        className={`minutes-agenda-connections${
          isAgendaPaneOpen || isAgendaPaneSettling ? " is-tray-open" : ""
        }`}
        aria-hidden="true"
        focusable="false"
      >
        <path
          ref={selectedConnectionRef}
          className={`minutes-agenda-connection-line${
            isSelectedTopicActive ? " is-active" : ""
          } is-hidden`}
        />
        <path
          ref={activeConnectionRef}
          className="minutes-agenda-connection-line is-active is-hidden"
        />
      </svg>
      <div className="minutes-topic-main">
        {shouldShowActiveTopicBanner && meetingActiveTopic && (
          <button
            ref={activeBannerRef}
            type="button"
            className="minutes-active-topic-banner"
            onClick={() => handleFocusTopic(meetingActiveTopic.id, true)}
          >
            <span className="minutes-active-topic-banner-label">
              Active topic
            </span>
            <span className="minutes-active-topic-banner-title">
              {meetingActiveTopic.title}
            </span>
          </button>
        )}
        <section
          ref={topicDetailRef}
          className="minutes-section minutes-topic-detail-section"
        >
          {selectedAgendaItem ? (
            <div className="minutes-current-topic">
            <h2>
              {selectedAgendaItem.kind === "meeting-active"
                ? "Active Topic"
                : selectedAgendaItem.kind === "completed"
                  ? "Completed Topic"
                  : selectedAgendaItem.kind === "deferred"
                    ? "Deferred Topic"
                    : "Planned Topic"}
            </h2>
            <h3>{selectedAgendaItem.topic.title}</h3>
            <div className="minutes-current-meta">
              <span>
                Planned:{" "}
                {selectedAgendaItem.kind === "completed" ? (
                  <span>
                    {selectedAgendaItem.topic.plannedTopic?.durationMinutes ??
                      selectedAgendaItem.topic.durationMinutes ??
                      "?"} min
                  </span>
                ) : (
                  renderEditableDuration(selectedAgendaItem.topic)
                )}
              </span>
              {selectedAgendaItem.kind === "meeting-active" && (
                <span className="minutes-timer">
                  Active:{" "}
                  {formatDurationOvertime(
                    currentTopicActiveSeconds,
                    selectedAgendaItem.topic.durationMinutes ?? 0
                  )}
                </span>
              )}
              {selectedAgendaItem.kind === "completed" && (
                <span className="minutes-timer">
                  Actual:{" "}
                  {renderEditableActualDuration(selectedAgendaItem.minute)}
                </span>
              )}
            </div>

            {selectedAgendaItem.kind === "meeting-active" && (
              <div className="minutes-actions">
                <button className="btn-primary" onClick={handleCompleteTopic}>
                  Complete Topic
                </button>
                <button className="btn-secondary" onClick={handleSkipTopic}>
                  Skip Topic
                </button>
              </div>
            )}

            {selectedAgendaItem.kind === "remaining" && (
              <div className="minutes-actions">
                <button
                  className="btn-primary"
                  onClick={() =>
                    void makeActive({
                      meetingId: meeting.id,
                      topicId: selectedAgendaItem.topic.id,
                    })
                  }
                  disabled={!meetingActiveTopic}
                >
                  Make Active
                </button>
                <button
                  className="btn-secondary"
                  onClick={() =>
                    void updateTopic({
                      meetingId: meeting.id,
                      list: "liveAgenda",
                      topicId: selectedAgendaItem.topic.id,
                      deferred: true,
                    })
                  }
                >
                  Skip Topic
                </button>
              </div>
            )}

            {selectedAgendaItem.kind === "deferred" && (
              <div className="minutes-actions">
                <button
                  className="btn-primary"
                  onClick={() =>
                    void makeActive({
                      meetingId: meeting.id,
                      topicId: selectedAgendaItem.topic.id,
                    })
                  }
                  disabled={!meetingActiveTopic}
                >
                  Make Active
                </button>
              </div>
            )}

            {selectedAgendaItem.kind === "completed" && (
              <CompletedMinuteNotes minute={selectedAgendaItem.minute} meeting={meeting} members={members} />
            )}

            {selectedAgendaItem.kind === "meeting-active" && (
              <div className="minutes-notes-section">
                <h4>Notes for this topic</h4>

                {(meeting.currentNotes ?? []).filter((n) => n !== null).map((note, i) => (
                  <EditableNote
                    key={note.id}
                    note={note}
                    members={members}
                    isEditing={editingCurrentNoteId === note.id}
                    onStartEdit={() => {
                      setNoteFormType(null);
                      setEditingCurrentNoteId(note.id);
                    }}
                    onStopEdit={() => setEditingCurrentNoteId(null)}
                    onUpdate={(updatedNote) =>
                      void updateCurrentNote({
                        meetingId: meeting.id,
                        noteId: note.id,
                        note: toStoredNote(updatedNote),
                      })
                    }
                    onDelete={() => {
                      void removeCurrentNote({ meetingId: meeting.id, index: i });
                    }}
                  />
                ))}

                {!noteFormType && !editingCurrentNoteId && (
                  <div className="minutes-note-add-buttons">
                    <button className="btn-small btn-secondary" onClick={() => setNoteFormType("text")}>+ Text</button>
                    <button className="btn-small btn-secondary" onClick={() => setNoteFormType("action_item")}>+ Action Item</button>
                    <button className="btn-small btn-secondary" onClick={() => setNoteFormType("motion")}>+ Motion</button>
                  </div>
                )}

                {noteFormType === "text" && (
                  <TextNoteForm
                    onAdd={(pn) => {
                      void addCurrentNote({
                        meetingId: meeting.id,
                        note: toStoredNote(pn),
                      }).then(() => setNoteFormType(null));
                    }}
                    onCancel={() => setNoteFormType(null)}
                  />
                )}
                {noteFormType === "action_item" && (
                  <ActionItemForm
                    onAdd={(pn) => {
                      void addCurrentNote({
                        meetingId: meeting.id,
                        note: toStoredNote(pn),
                      }).then(() => setNoteFormType(null));
                    }}
                    onCancel={() => setNoteFormType(null)}
                    members={members}
                  />
                )}
                {noteFormType === "motion" && (
                  <MotionForm
                    onAdd={(pn) => {
                      void addCurrentNote({
                        meetingId: meeting.id,
                        note: toStoredNote(pn),
                      }).then(() => setNoteFormType(null));
                    }}
                    onCancel={() => setNoteFormType(null)}
                    members={members}
                  />
                )}
              </div>
            )}
            </div>
          ) : (
            <p>All topics have been covered. You can end the meeting.</p>
          )}
        </section>
      </div>

      {/* Agenda */}
      <button
        className={`minutes-agenda-pane-backdrop${isAgendaPaneOpen ? " is-open" : ""}`}
        aria-label="Dismiss agenda"
        onClick={() => setIsAgendaPaneOpen(false)}
      />
      <aside
        ref={agendaPaneRef}
        id="minutes-agenda-pane"
        className={`minutes-section minutes-topic-tray${isAgendaPaneOpen ? " is-open" : ""}`}
        aria-label="Meeting agenda tray"
        onClick={() => {
          if (window.matchMedia("(max-width: 750px)").matches && !isAgendaPaneOpen) {
            setIsAgendaPaneOpen(true);
          }
        }}
        onKeyDown={(event) => {
          if (
            window.matchMedia("(max-width: 750px)").matches &&
            !isAgendaPaneOpen &&
            (event.key === "Enter" || event.key === " ")
          ) {
            event.preventDefault();
            setIsAgendaPaneOpen(true);
          }
        }}
        tabIndex={isAgendaPaneOpen ? undefined : 0}
      >
        <div className="minutes-agenda-pane-header">
          <h2>Agenda</h2>
          <span className="minutes-agenda-pane-subtitle">
            Starting{" "}
            {isEditingMeetingStartTime ? (
              <input
                className="minutes-start-time-input"
                type="time"
                value={editingMeetingStartTime}
                autoFocus
                onChange={(e) => setEditingMeetingStartTime(e.target.value)}
                onBlur={(e) => commitMeetingStartTime(e.currentTarget.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    e.currentTarget.blur();
                  }
                  if (e.key === "Escape") setIsEditingMeetingStartTime(false);
                }}
              />
            ) : (
              <button
                className="minutes-inline-edit-button"
                type="button"
                title="Edit actual start time"
                onClick={() => {
                  setEditingMeetingStartTime(
                    formatTimeInputValue(meetingActualStartTime)
                  );
                  setIsEditingMeetingStartTime(true);
                }}
              >
                {formatAgendaTime(meetingActualStartTime)}
              </button>
            )}
          </span>
          <button
            className="minutes-agenda-pane-close"
            aria-label={isAgendaPaneOpen ? "Close agenda" : "Open agenda"}
            aria-expanded={isAgendaPaneOpen}
            aria-controls="minutes-agenda-pane"
            onClick={() => setIsAgendaPaneOpen((open) => !open)}
          >
            <span aria-hidden="true">{isAgendaPaneOpen ? ">>" : "<<"}</span>
          </button>
        </div>
        <div
          className="minutes-day-view-grid"
          style={timelineGridStyle(agendaSlotCount)}
        >
          {agendaTimeSlots.map((slot) => (
            <div
              key={slot.key}
              className="minutes-day-view-tick"
              style={{ gridRow: slot.gridLine }}
            >
              <span>{slot.label}</span>
            </div>
          ))}
          {completedAgendaItems.map((item) => {
            const entry = timelineEntryByKey.get(item.key);
            if (!entry) return null;
            return (
              <button
                key={item.key}
                className={`minutes-day-view-event minutes-agenda-completed-item${selectedTopicId === item.topic.id ? " is-selected" : ""}`}
                data-agenda-topic-id={item.topic.id}
                style={timelineDisplayEventStyle(
                  entry.startSlot,
                  entry.slotSpan,
                  entry.displayTopPx,
                  entry.displayHeightPx
                )}
                title={getTimelineEntryTitle(entry)}
                onClick={() => handleFocusTopic(item.topic.id)}
              >
                {renderTimelineButtonContent(entry)}
              </button>
            );
          })}

          {meetingActiveAgendaItem &&
            (() => {
              const entry = timelineEntryByKey.get(meetingActiveAgendaItem.key);
              if (!entry) return null;
              return (
                <button
                  className={`minutes-day-view-event minutes-agenda-current-item is-meeting-active${selectedTopicId === meetingActiveAgendaItem.topic.id ? " is-selected" : ""}`}
                  data-agenda-topic-id={meetingActiveAgendaItem.topic.id}
                  style={timelineDisplayEventStyle(
                    entry.startSlot,
                    entry.slotSpan,
                    entry.displayTopPx,
                    entry.displayHeightPx
                  )}
                  title={getTimelineEntryTitle(entry)}
                  onClick={() =>
                    handleFocusTopic(meetingActiveAgendaItem.topic.id)
                  }
                >
                  {renderTimelineButtonContent(entry)}
                </button>
              );
            })()}

          {remainingTopics.length > 0 ? (
            <DragDropContext onDragEnd={onDragEnd}>
              <Droppable droppableId="minutes-remaining">
                {(provided) => (
                  <ul
                    className="minutes-day-view-list"
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                  >
                    {remainingAgendaItems.map((item, index) => {
                      const entry = timelineEntryByKey.get(item.key);
                      if (!entry) return null;
                      const topic = item.topic;
                      return (
                        <Draggable key={topic.id} draggableId={topic.id} index={index}>
                          {(provided, snapshot) => {
                            const timelineStyle = timelineDisplayEventStyle(
                              entry.startSlot,
                              entry.slotSpan,
                              entry.displayTopPx,
                              entry.displayHeightPx
                            );
                            const draggableStyle = snapshot.isDragging
                              ? {
                                  ...provided.draggableProps.style,
                                  height: `${entry.displayHeightPx}px`,
                                }
                              : {
                                  ...provided.draggableProps.style,
                                  ...timelineStyle,
                                };
                            return (
                              <li
                                className={`minutes-day-view-draggable${selectedTopicId === topic.id ? " is-selected" : ""}${snapshot.isDragging ? " dragging" : ""}`}
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                style={draggableStyle}
                              >
                              <div
                                className={`minutes-day-view-event${selectedTopicId === topic.id ? " is-selected" : ""}`}
                                data-agenda-topic-id={topic.id}
                                role="button"
                                tabIndex={0}
                                style={{ height: `${entry.displayHeightPx}px` }}
                                title={getTimelineEntryTitle(entry)}
                                onClick={() => handleFocusTopic(topic.id)}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter" || e.key === " ") {
                                    e.preventDefault();
                                    handleFocusTopic(topic.id);
                                  }
                                }}
                              >
                                <span
                                  className="drag-handle"
                                  {...provided.dragHandleProps}
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  ⠿
                                </span>
                                {renderTimelineButtonContent(entry)}
                              </div>
                              </li>
                            );
                          }}
                        </Draggable>
                      );
                    })}
                    {provided.placeholder}
                  </ul>
                )}
              </Droppable>
            </DragDropContext>
          ) : (
            <p className="minutes-day-view-empty">No remaining topics.</p>
          )}

          {deferredAgendaItems.map((item) => {
            const entry = timelineEntryByKey.get(item.key);
            if (!entry) return null;
            const topic = item.topic;
            return (
              <div
                key={item.key}
                className={`minutes-day-view-event minutes-deferred-item${selectedTopicId === topic.id ? " is-selected" : ""}`}
                data-agenda-topic-id={topic.id}
                style={timelineDisplayEventStyle(
                  entry.startSlot,
                  entry.slotSpan,
                  entry.displayTopPx,
                  entry.displayHeightPx
                )}
                role="button"
                tabIndex={0}
                title={getTimelineEntryTitle(entry)}
                onClick={() => handleFocusTopic(topic.id)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    handleFocusTopic(topic.id);
                  }
                  }}
                >
                  {renderTimelineButtonContent(entry)}
              </div>
            );
          })}

          {agendaTimelineEntries.map(renderInsertionCursor)}
        </div>
      </aside>

    </div>
  );
};
