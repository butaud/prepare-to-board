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
import { Topic } from "../../schema";

import "./MeetingMinutes.css";

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
  };

  const handleSkipTopic = () => {
    skipTopic(meeting);
    setNotes("");
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
                </li>
              );
            })}
          </ol>
        </section>
      )}
    </div>
  );
};
