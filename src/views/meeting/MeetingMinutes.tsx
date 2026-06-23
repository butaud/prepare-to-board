import { useEffect, useState } from "react";
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
import { BoardMember, Note, Topic } from "../../schema";
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

  const [now, setNow] = useState(() => new Date());
  const [selectedAgendaItemId, setSelectedAgendaItemId] = useState<string | null>(null);
  const [isAgendaPaneOpen, setIsAgendaPaneOpen] = useState(false);
  const [newTopicTitle, setNewTopicTitle] = useState("");
  const [newTopicDuration, setNewTopicDuration] = useState<number>(5);
  const [showAddTopic, setShowAddTopic] = useState(false);
  const [editingTopicId, setEditingTopicId] = useState<string | null>(null);
  const [editingDuration, setEditingDuration] = useState("");
  const [noteFormType, setNoteFormType] = useState<"text" | "action_item" | "motion" | null>(null);
  const [editingCurrentNoteId, setEditingCurrentNoteId] = useState<string | null>(null);
  const advanceTopic = useMutation(api.app.advanceTopic);
  const skipTopic = useMutation(api.app.skipTopic);
  const addTopic = useMutation(api.app.addTopic);
  const updateTopic = useMutation(api.app.updateTopic);
  const reorderTopics = useMutation(api.app.reorderTopics);
  const makeActive = useMutation(api.app.makeActive);
  const addCurrentNote = useMutation(api.app.addCurrentNote);
  const updateCurrentNote = useMutation(api.app.updateCurrentNote);
  const removeCurrentNote = useMutation(api.app.removeCurrentNote);

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

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

  const sumCompletedMinutes = minutes
    .filter((m) => m !== null)
    .reduce((sum, m) => sum + (m.durationMinutes ?? 0), 0);

  const currentTopicActiveSeconds = liveStartTime
    ? Math.max(
        0,
        Math.floor(
          (now.getTime() -
            (liveStartTime.getTime() + sumCompletedMinutes * 60 * 1000)) /
            1000
        )
      )
    : 0;

  const handleCompleteTopic = () => {
    const actualDuration = Math.round(currentTopicActiveSeconds / 60);
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
    });
    setNewTopicTitle("");
    setNewTopicDuration(5);
    setShowAddTopic(false);
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
    agendaMenuItems.find((item) => item.key === selectedAgendaItemId) ??
    meetingActiveAgendaItem ??
    agendaMenuItems[0] ??
    null;

  useEffect(() => {
    if (!agendaMenuItems.length) {
      if (selectedAgendaItemId !== null) {
        setSelectedAgendaItemId(null);
      }
      return;
    }
    if (!selectedAgendaItemId || !agendaMenuItems.some((item) => item.key === selectedAgendaItemId)) {
      setSelectedAgendaItemId((meetingActiveAgendaItem ?? agendaMenuItems[0]).key);
    }
  }, [
    selectedAgendaItemId,
    meetingActiveAgendaItem?.key,
    agendaMenuItems.map((item) => item.key).join("|"),
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
        ref={(el) => el?.select()}
        onChange={(e) => setEditingDuration(e.target.value)}
        onBlur={() => {
          const v = parseInt(editingDuration);
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

  const handleSelectAgendaItem = (key: string) => {
    setSelectedAgendaItemId(key);
    if (window.matchMedia("(max-width: 600px)").matches) {
      setIsAgendaPaneOpen(false);
    }
  };

  return (
    <div className="meeting-minutes">
      <section className="minutes-section minutes-topic-detail-section">
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
                  Actual: {selectedAgendaItem.minute.durationMinutes} min
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

      {/* Agenda */}
      <button
        className={`minutes-agenda-pane-backdrop${isAgendaPaneOpen ? " is-open" : ""}`}
        aria-label="Dismiss agenda"
        onClick={() => setIsAgendaPaneOpen(false)}
      />
      <aside
        id="minutes-agenda-pane"
        className={`minutes-section minutes-topic-tray${isAgendaPaneOpen ? " is-open" : ""}`}
        aria-label="Meeting agenda tray"
      >
        <div className="minutes-agenda-pane-header">
          <h2>Agenda</h2>
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
        {completedMinutes.length > 0 && (
          <div className="minutes-agenda-group">
            <h3 className="minutes-agenda-heading">Completed</h3>
            <ol className="minutes-list minutes-agenda-list">
              {completedAgendaItems.map((item) => {
                const minute = item.minute;
                const topic = minute.topic;
                const planned =
                  topic?.plannedTopic?.durationMinutes ?? topic?.durationMinutes;
                const actual = minute.durationMinutes;
                const diff = planned !== undefined ? actual - planned : null;
                return (
                  <li key={item.key} className="minutes-agenda-menu-row">
                    <button
                      className={`minutes-agenda-menu-item minutes-agenda-completed-item${selectedAgendaItem?.key === item.key ? " is-selected" : ""}`}
                      onClick={() => handleSelectAgendaItem(item.key)}
                    >
                      <span className="minutes-agenda-menu-title">{topic?.title ?? "(unknown)"}</span>
                      <span className="minutes-agenda-menu-meta">
                        {actual} min actual
                        {planned !== undefined && ` / ${planned} min planned`}
                        {diff !== null && diff !== 0 && (
                          <span className={diff > 0 ? "overtime" : "undertime"}>
                            {" "}
                            ({diff > 0 ? "+" : ""}
                            {diff})
                          </span>
                        )}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ol>
          </div>
        )}

        {meetingActiveTopic && meetingActiveAgendaItem && (
          <div className="minutes-agenda-group">
            <h3 className="minutes-agenda-heading">Current</h3>
            <button
              className={`minutes-agenda-menu-item minutes-agenda-current-item is-meeting-active${selectedAgendaItem?.key === meetingActiveAgendaItem.key ? " is-selected" : ""}`}
              onClick={() => handleSelectAgendaItem(meetingActiveAgendaItem.key)}
            >
              <span className="minutes-agenda-current-kicker">Now discussing</span>
              <span className="minutes-remaining-title">{meetingActiveTopic.title}</span>
              <span className="minutes-remaining-duration">
                {meetingActiveTopic.durationMinutes ?? "?"} min planned
              </span>
            </button>
          </div>
        )}

        <div className="minutes-agenda-group">
          <h3 className="minutes-agenda-heading">Remaining</h3>
        {remainingTopics.length === 0 ? (
          <p>No remaining topics.</p>
        ) : (
          <DragDropContext onDragEnd={onDragEnd}>
            <Droppable droppableId="minutes-remaining">
              {(provided) => (
                <ul
                  className="minutes-remaining-list"
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                >
                  {remainingTopics.map((topic, index) => (
                    <Draggable key={topic.id} draggableId={topic.id} index={index}>
                      {(provided, snapshot) => (
                        <li
                          className={`minutes-remaining-item${snapshot.isDragging ? " dragging" : ""}`}
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                        >
                          <span className="drag-handle" {...provided.dragHandleProps}>⠿</span>
                          <button
                            className={`minutes-agenda-menu-item${selectedAgendaItem?.key === `remaining:${topic.id}` ? " is-selected" : ""}`}
                            onClick={() => handleSelectAgendaItem(`remaining:${topic.id}`)}
                          >
                            <span className="minutes-agenda-menu-title">{topic.title}</span>
                            <span className="minutes-agenda-menu-meta">{topic.durationMinutes ?? "?"} min planned</span>
                          </button>
                          <button
                            className="btn-small btn-primary"
                            onClick={() =>
                              void makeActive({
                                meetingId: meeting.id,
                                topicId: topic.id,
                              })
                            }
                            disabled={!meetingActiveTopic}
                          >
                            Make Active
                          </button>
                          <button
                            className="btn-small btn-danger"
                            onClick={() =>
                              void updateTopic({
                                meetingId: meeting.id,
                                list: "liveAgenda",
                                topicId: topic.id,
                                deferred: true,
                              })
                            }
                          >
                            Skip
                          </button>
                        </li>
                      )}
                    </Draggable>
                  ))}
                  {provided.placeholder}
                </ul>
              )}
            </Droppable>
          </DragDropContext>
        )}
        </div>

        {deferredTopics.length > 0 && (
          <div className="minutes-agenda-group">
            <h3 className="minutes-deferred-heading">Deferred</h3>
            <ul className="minutes-remaining-list">
              {deferredTopics.map((topic) => (
                <li key={topic.id} className="minutes-remaining-item minutes-deferred-item">
                  <button
                    className={`minutes-agenda-menu-item${selectedAgendaItem?.key === `deferred:${topic.id}` ? " is-selected" : ""}`}
                    onClick={() => handleSelectAgendaItem(`deferred:${topic.id}`)}
                  >
                    <span className="minutes-agenda-menu-title">{topic.title}</span>
                    <span className="minutes-agenda-menu-meta">{topic.durationMinutes ?? "?"} min planned</span>
                  </button>
                  <button
                    className="btn-small btn-primary"
                    onClick={() =>
                      void makeActive({ meetingId: meeting.id, topicId: topic.id })
                    }
                    disabled={!meetingActiveTopic}
                  >
                    Make Active
                  </button>
                  <button
                    className="btn-small btn-danger"
                    onClick={() =>
                      void updateTopic({
                        meetingId: meeting.id,
                        list: "liveAgenda",
                        topicId: topic.id,
                        deferred: true,
                      })
                    }
                  >
                    Skip
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        {showAddTopic ? (
          <div className="minutes-add-topic-form">
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
                onClick={() => setShowAddTopic(false)}
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <button
            className="btn-secondary"
            onClick={() => setShowAddTopic(true)}
          >
            + Add Topic
          </button>
        )}
      </aside>

    </div>
  );
};
