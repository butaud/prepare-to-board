import { useEffect, useState } from "react";
import {
  DragDropContext,
  Droppable,
  Draggable,
  type DropResult,
} from "@hello-pangea/dnd";
import { useMeeting } from "../../hooks/Meeting";
import { useLoadedAccount } from "../../hooks/Account";
import { advanceTopic, addLiveTopic, skipTopic, deferCurrentAndActivate } from "../../util/data";
import { PendingNote } from "../../util/data";
import { Topic, Note, Schema } from "../../schema";

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
}

const TextNoteForm = ({ onAdd, onCancel }: TextNoteFormProps) => {
  const [text, setText] = useState("");
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
          Add
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
}

const ActionItemForm = ({ onAdd, onCancel }: ActionItemFormProps) => {
  const [text, setText] = useState("");
  const [assignee, setAssignee] = useState("");
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
        <input
          type="text"
          value={assignee}
          onChange={(e) => setAssignee(e.target.value)}
          placeholder="Who is responsible?"
          style={{ width: "100%", maxWidth: 300 }}
        />
      </div>
      <div className="minutes-actions">
        <button
          className="btn-primary"
          onClick={() => {
            if (!text.trim()) return;
            onAdd({ type: "action_item", text: text.trim(), assignee: assignee.trim() || undefined });
          }}
        >
          Add
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
}

const MotionForm = ({ onAdd, onCancel }: MotionFormProps) => {
  const [text, setText] = useState("");
  const [mover, setMover] = useState("");
  const [seconder, setSeconder] = useState("");
  const [status, setStatus] = useState<"proposed" | "under_discussion" | "passed" | "failed" | "tabled">("proposed");
  return (
    <div className="note-form">
      <h5 className="note-form-title">Motion</h5>
      <div className="minutes-form-row">
        <label>Motion text (after "moves that..."):</label>
        <textarea
          rows={2}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="e.g. the board approves the budget"
          autoFocus
        />
      </div>
      <div className="minutes-form-row">
        <label>Mover:</label>
        <input
          type="text"
          value={mover}
          onChange={(e) => setMover(e.target.value)}
          placeholder="Who moved the motion?"
          style={{ width: "100%", maxWidth: 300 }}
        />
      </div>
      <div className="minutes-form-row">
        <label>Seconder (optional):</label>
        <input
          type="text"
          value={seconder}
          onChange={(e) => setSeconder(e.target.value)}
          placeholder="Who seconded?"
          style={{ width: "100%", maxWidth: 300 }}
        />
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
      <div className="minutes-actions">
        <button
          className="btn-primary"
          onClick={() => {
            if (!text.trim() || !mover.trim()) return;
            onAdd({
              type: "motion",
              text: text.trim(),
              mover: mover.trim(),
              seconder: seconder.trim() || undefined,
              status,
            });
          }}
        >
          Add
        </button>
        <button className="btn-secondary" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </div>
  );
};

// --- CompletedMinuteNotes — for adding notes to already-completed minutes ---

interface CompletedMinuteNotesProps {
  minute: NonNullable<NonNullable<ReturnType<typeof useMeeting>["minutes"]>[number]>;
  meeting: ReturnType<typeof useMeeting>;
}

const CompletedMinuteNotes = ({ minute, meeting }: CompletedMinuteNotesProps) => {
  const [noteFormType, setNoteFormType] = useState<"text" | "action_item" | "motion" | null>(null);

  const addNoteToMinute = (pn: PendingNote) => {
    let noteObj;
    if (pn.type === "text") {
      noteObj = Schema.TextNote.create({ type: "text", text: pn.text }, meeting._owner);
    } else if (pn.type === "action_item") {
      noteObj = Schema.ActionItemNote.create(
        { type: "action_item", text: pn.text, assignee: pn.assignee },
        meeting._owner
      );
    } else {
      noteObj = Schema.MotionNote.create(
        { type: "motion", text: pn.text, mover: pn.mover, seconder: pn.seconder, status: pn.status },
        meeting._owner
      );
    }
    if (!minute.notes) {
      minute.notes = Schema.ListOfNotes.create([noteObj], meeting._owner);
    } else {
      minute.notes.push(noteObj);
    }
    setNoteFormType(null);
  };

  const existingNotes = minute.notes ? minute.notes.filter((n) => n !== null) as Note[] : [];

  return (
    <div className="minutes-notes-section">
      {existingNotes.map((note, i) => (
        <div key={i} className="minutes-note-item">
          <NoteDisplay note={note} />
          <button
            className="note-delete-btn"
            title="Remove note"
            onClick={() => {
              if (!minute.notes) return;
              const idx = minute.notes.findIndex((_, j) => j === i);
              if (idx !== -1) minute.notes.splice(idx, 1);
            }}
          >
            ×
          </button>
        </div>
      ))}

      {!noteFormType && (
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
        <ActionItemForm onAdd={addNoteToMinute} onCancel={() => setNoteFormType(null)} />
      )}
      {noteFormType === "motion" && (
        <MotionForm onAdd={addNoteToMinute} onCancel={() => setNoteFormType(null)} />
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
  const completedMinutes = minutes.filter((m) => m !== null) as NonNullable<
    (typeof minutes)[number]
  >[];

  // Build planned agenda topics that have no minute (not covered)
  const coveredTopicIds = new Set(
    completedMinutes.map((m) => m.topic?.plannedTopic?.id).filter(Boolean)
  );

  const plannedNotCovered = (meeting.plannedAgenda ?? [])
    .filter((t) => t !== null)
    .filter((t) => !coveredTopicIds.has(t!.id)) as Topic[];

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
              const notes = minute.notes ? minute.notes.filter((n) => n !== null) as Note[] : [];
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
  const [notes, setNotes] = useState("");
  const [newTopicTitle, setNewTopicTitle] = useState("");
  const [newTopicDuration, setNewTopicDuration] = useState<number>(5);
  const [showAddTopic, setShowAddTopic] = useState(false);
  const [editingTopicId, setEditingTopicId] = useState<string | null>(null);
  const [editingDuration, setEditingDuration] = useState("");
  const [noteFormType, setNoteFormType] = useState<"text" | "action_item" | "motion" | null>(null);

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  // Derive current topic id before any early returns so hook count stays stable
  const liveAgenda = meeting.liveAgenda ?? [];
  const minutes = meeting.minutes ?? [];
  const completedCount = minutes.filter((m) => m !== null).length;
  const currentTopicId = (liveAgenda[completedCount] ?? null)?.id ?? null;

  useEffect(() => {
    setNotes("");
    setNoteFormType(null);
    meeting.currentNotes = undefined;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentTopicId]);

  const isOfficer = me?.canWrite(meeting);

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

  const liveStartTime = meeting.liveStartTime;

  const currentTopicIndex = completedCount;
  const currentTopic: Topic | null = liveAgenda[currentTopicIndex] ?? null;

  const sumCompletedMinutes = minutes
    .filter((m) => m !== null)
    .reduce((sum, m) => sum + (m!.durationMinutes ?? 0), 0);

  const currentTopicActiveSeconds = liveStartTime
    ? Math.floor(
        (now.getTime() -
          (liveStartTime.getTime() + sumCompletedMinutes * 60 * 1000)) /
          1000
      )
    : 0;

  const handleCompleteTopic = () => {
    const actualDuration = Math.round(currentTopicActiveSeconds / 60);
    advanceTopic(meeting, actualDuration, notes || undefined);
    setNotes("");
    setNoteFormType(null);
  };

  const handleSkipTopic = () => {
    skipTopic(meeting);
    setNotes("");
    setNoteFormType(null);
  };

  const onDragEnd = (result: DropResult) => {
    if (!result.destination) return;
    const srcIdx = result.source.index;
    const destIdx = result.destination.index;
    if (srcIdx === destIdx) return;
    const topic = remainingTopics[srcIdx];
    const liveSrcIdx = liveAgenda.findIndex((t) => t?.id === topic.id);
    const liveDestIdx = liveAgenda.findIndex(
      (t) => t?.id === remainingTopics[destIdx].id
    );
    liveAgenda.splice(liveSrcIdx, 1);
    liveAgenda.splice(liveDestIdx, 0, topic);
  };

  const handleAddTopic = () => {
    if (!newTopicTitle.trim()) return;
    addLiveTopic(meeting, newTopicTitle.trim(), newTopicDuration);
    setNewTopicTitle("");
    setNewTopicDuration(5);
    setShowAddTopic(false);
  };

  // Remaining topics (after current), split into deferred and upcoming
  const allRemaining = liveAgenda
    .filter((t) => t !== null)
    .slice(currentTopicIndex + 1)
    .filter((t) => !t!.cancelled) as Topic[];
  const remainingTopics = allRemaining.filter((t) => !t.deferred);
  const deferredTopics = allRemaining.filter((t) => t.deferred);

  const completedMinutes = minutes.filter((m) => m !== null) as NonNullable<
    (typeof minutes)[number]
  >[];

  const formatDurationOvertime = (seconds: number, plannedMinutes: number) => {
    const formatted = formatDuration(seconds);
    if (seconds > plannedMinutes * 60) {
      return <span className="overtime">{formatted}</span>;
    }
    return <span>{formatted}</span>;
  };

  return (
    <div className="meeting-minutes">
      {/* Current Topic */}
      <section className="minutes-section minutes-current-section">
        <h2>Current Topic</h2>
        {currentTopic ? (
          <div className="minutes-current-topic">
            <h3>{currentTopic.title}</h3>
            <div className="minutes-current-meta">
              <span>
                Planned:{" "}
                {editingTopicId === currentTopic.id ? (
                  <input
                    className="inline-duration-input"
                    type="number"
                    min={1}
                    value={editingDuration}
                    ref={(el) => el?.select()}
                    onChange={(e) => setEditingDuration(e.target.value)}
                    onBlur={() => {
                      const v = parseInt(editingDuration);
                      if (!isNaN(v) && v > 0) currentTopic.durationMinutes = v;
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
                      setEditingTopicId(currentTopic.id);
                      setEditingDuration(String(currentTopic.durationMinutes ?? ""));
                    }}
                    title="Double-click to edit"
                  >
                    {currentTopic.durationMinutes ?? "?"} min
                  </span>
                )}
              </span>
              <span className="minutes-timer">
                Active:{" "}
                {formatDurationOvertime(
                  currentTopicActiveSeconds,
                  currentTopic.durationMinutes ?? 0
                )}
              </span>
            </div>

            <div className="minutes-form-row">
              <label htmlFor="topic-notes">Notes / outcome:</label>
              <textarea
                id="topic-notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                placeholder="Optional notes or outcome for this topic..."
              />
            </div>

            <div className="minutes-actions">
              <button className="btn-primary" onClick={handleCompleteTopic}>
                Complete Topic
              </button>
              <button className="btn-secondary" onClick={handleSkipTopic}>
                Skip Topic
              </button>
            </div>

            {/* Notes section */}
            <div className="minutes-notes-section">
              <h4>Notes for this topic</h4>

              {(meeting.currentNotes ?? []).filter((n) => n !== null).map((note, i) => (
                <div key={i} className="minutes-note-item">
                  <NoteDisplay note={note as Note} />
                  <button
                    className="note-delete-btn"
                    title="Remove note"
                    onClick={() => {
                      if (!meeting.currentNotes) return;
                      meeting.currentNotes.splice(i, 1);
                    }}
                  >
                    ×
                  </button>
                </div>
              ))}

              {!noteFormType && (
                <div className="minutes-note-add-buttons">
                  <button className="btn-small btn-secondary" onClick={() => setNoteFormType("text")}>+ Text</button>
                  <button className="btn-small btn-secondary" onClick={() => setNoteFormType("action_item")}>+ Action Item</button>
                  <button className="btn-small btn-secondary" onClick={() => setNoteFormType("motion")}>+ Motion</button>
                </div>
              )}

              {noteFormType === "text" && (
                <TextNoteForm
                  onAdd={(pn) => {
                    const note = Schema.TextNote.create({ type: "text", text: pn.text }, meeting._owner);
                    if (!meeting.currentNotes) meeting.currentNotes = Schema.ListOfNotes.create([note], meeting._owner);
                    else meeting.currentNotes.push(note);
                    setNoteFormType(null);
                  }}
                  onCancel={() => setNoteFormType(null)}
                />
              )}
              {noteFormType === "action_item" && (
                <ActionItemForm
                  onAdd={(pn) => {
                    const note = Schema.ActionItemNote.create({ type: "action_item", text: pn.text, assignee: (pn as { type: "action_item"; text: string; assignee?: string }).assignee }, meeting._owner);
                    if (!meeting.currentNotes) meeting.currentNotes = Schema.ListOfNotes.create([note], meeting._owner);
                    else meeting.currentNotes.push(note);
                    setNoteFormType(null);
                  }}
                  onCancel={() => setNoteFormType(null)}
                />
              )}
              {noteFormType === "motion" && (
                <MotionForm
                  onAdd={(pn) => {
                    const mn = pn as { type: "motion"; text: string; mover: string; seconder?: string; status: "proposed" | "under_discussion" | "passed" | "failed" | "tabled" };
                    const note = Schema.MotionNote.create({ type: "motion", text: mn.text, mover: mn.mover, seconder: mn.seconder, status: mn.status }, meeting._owner);
                    if (!meeting.currentNotes) meeting.currentNotes = Schema.ListOfNotes.create([note], meeting._owner);
                    else meeting.currentNotes.push(note);
                    setNoteFormType(null);
                  }}
                  onCancel={() => setNoteFormType(null)}
                />
              )}
            </div>
          </div>
        ) : (
          <p>All topics have been covered. You can end the meeting.</p>
        )}
      </section>

      {/* Live Agenda (remaining) */}
      <section className="minutes-section">
        <h2>Remaining Topics</h2>
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
                          <span className="minutes-remaining-title">{topic.title}</span>
                          <span className="minutes-remaining-duration">
                            {editingTopicId === topic.id ? (
                              <input
                                className="inline-duration-input"
                                type="number"
                                min={1}
                                value={editingDuration}
                                ref={(el) => el?.select()}
                                onChange={(e) => setEditingDuration(e.target.value)}
                                onBlur={() => {
                                  const v = parseInt(editingDuration);
                                  if (!isNaN(v) && v > 0) topic.durationMinutes = v;
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
                            )}
                          </span>
                          <button
                            className="btn-small btn-primary"
                            onClick={() => deferCurrentAndActivate(meeting, topic)}
                            disabled={!currentTopic}
                          >
                            Make Active
                          </button>
                          <button
                            className="btn-small btn-danger"
                            onClick={() => { topic.deferred = true; }}
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

        {deferredTopics.length > 0 && (
          <>
            <h3 className="minutes-deferred-heading">Deferred Topics</h3>
            <ul className="minutes-remaining-list">
              {deferredTopics.map((topic) => (
                <li key={topic.id} className="minutes-remaining-item minutes-deferred-item">
                  <span className="minutes-remaining-title">{topic.title}</span>
                  <span className="minutes-remaining-duration">
                    {topic.durationMinutes ?? "?"} min
                  </span>
                  <button
                    className="btn-small btn-primary"
                    onClick={() => deferCurrentAndActivate(meeting, topic)}
                    disabled={!currentTopic}
                  >
                    Make Active
                  </button>
                  <button
                    className="btn-small btn-danger"
                    onClick={() => { topic.deferred = true; }}
                  >
                    Skip
                  </button>
                </li>
              ))}
            </ul>
          </>
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
      </section>

      {/* Completed */}
      {completedMinutes.length > 0 && (
        <section className="minutes-section">
          <h2>Completed</h2>
          <ol className="minutes-list">
            {completedMinutes.map((minute, idx) => {
              const topic = minute.topic;
              const planned =
                topic?.plannedTopic?.durationMinutes ?? topic?.durationMinutes;
              const actual = minute.durationMinutes;
              const diff = planned !== undefined ? actual - planned : null;
              return (
                <li key={idx} className="minutes-item">
                  <div className="minutes-item-header">
                    <span className="minutes-item-title">
                      {topic?.title ?? "(unknown)"}
                    </span>
                    <span className="minutes-item-duration">
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
                  </div>
                  {topic?.outcome && (
                    <div className="minutes-item-notes">{topic.outcome}</div>
                  )}
                  <CompletedMinuteNotes minute={minute} meeting={meeting} />
                </li>
              );
            })}
          </ol>
        </section>
      )}
    </div>
  );
};
