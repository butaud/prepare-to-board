import { useState, useEffect } from "react";
import { Navigate } from "react-router-dom";
import {
  DragDropContext,
  Droppable,
  Draggable,
  type DropResult,
} from "@hello-pangea/dnd";
import { useMutation } from "convex/react";
import { useMeeting } from "../../hooks/Meeting";
import { useLoadedAccount } from "../../hooks/Account";
import { computeProjectedEndTime } from "../../util/data";
import { renderMarkdownBlocks } from "../../util/markdown";
import { Topic } from "../../schema";
import { api } from "../../convexClient";
import { MeetingPresent } from "./MeetingPresent";
import { PlanAgendaEditor } from "./PlanAgendaEditor";
import { MeetingDetailsAccordion } from "../../ui/MeetingDetailsAccordion";
import { DateTimeField } from "../../ui/DateTimeField";
import { TimeOfDayInput } from "../../ui/TimeOfDayInput";

import "./MeetingView.css";
import "../meeting/MeetingPresent.css";
import "../meeting/MeetingMinutes.css";
import { NoteDisplay } from "../../ui/NoteDisplay";

const formatDuration = (totalSeconds: number): string => {
  const sign = totalSeconds < 0 ? "-" : "";
  const abs = Math.abs(totalSeconds);
  const h = Math.floor(abs / 3600);
  const m = Math.floor((abs % 3600) / 60);
  const s = abs % 60;
  if (h > 0) return `${sign}${h}h ${m}m ${s}s`;
  return `${sign}${m}m ${s}s`;
};

const formatTime = (date: Date): string =>
  date.toLocaleTimeString(undefined, { timeStyle: "short" });

export const MeetingView = () => {
  const me = useLoadedAccount();
  const meeting = useMeeting();
  const [now, setNow] = useState(() => new Date());
  const [showAddTopic, setShowAddTopic] = useState(false);
  const [newTopicTitle, setNewTopicTitle] = useState("");
  const [newTopicDuration, setNewTopicDuration] = useState(5);
  const [editingTopicId, setEditingTopicId] = useState<string | null>(null);
  const [editingDuration, setEditingDuration] = useState("");
  const addTopic = useMutation(api.app.addTopic);
  const updateTopic = useMutation(api.app.updateTopic);
  const reorderTopics = useMutation(api.app.reorderTopics);
  const skipTopic = useMutation(api.app.skipTopic);
  const updateExpectedDuration = useMutation(api.app.updateExpectedDuration);
  const updateMeetingDate = useMutation(api.app.updateMeetingDate);
  const [carriedForwardIds, setCarriedForwardIds] = useState<Set<string>>(
    new Set()
  );

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  if (!me.root.selectedOrganization) {
    return <p>No organization selected</p>;
  }

  if (meeting.status === "completed") {
    return <Navigate to="minutes" replace />;
  }

  const isOfficer = me.canWrite(meeting);

  if (meeting.status === "live" && !isOfficer) {
    return <MeetingPresent />;
  }

  if (meeting.status === "live") {
    if (!meeting.liveAgenda) {
      return <p>No live agenda available.</p>;
    }

    const liveAgenda = meeting.liveAgenda;
    const minutes = meeting.minutes ?? [];
    const liveStartTime = meeting.liveStartTime;
    const completedCount = minutes.filter((m) => m !== null).length;
    const currentTopicIndex = liveAgenda.findIndex(
      (topic, index) =>
        index >= completedCount && !topic.cancelled && !topic.deferred
    );
    const currentTopic: Topic | null =
      currentTopicIndex === -1 ? null : liveAgenda[currentTopicIndex];
    const remainingStartIndex =
      currentTopicIndex === -1 ? completedCount : currentTopicIndex + 1;

    const sumCompletedMinutes = minutes
      .filter((m) => m !== null)
      .reduce((sum, m) => sum + (m.durationMinutes ?? 0), 0);

    const elapsedSeconds = liveStartTime
      ? Math.floor((now.getTime() - liveStartTime.getTime()) / 1000)
      : 0;

    const currentTopicActiveSeconds = liveStartTime
      ? Math.floor(
          (now.getTime() -
            (liveStartTime.getTime() + sumCompletedMinutes * 60 * 1000)) /
            1000
        )
      : 0;

    const allRemainingRaw = liveAgenda
      .filter((t) => t !== null)
      .slice(remainingStartIndex);
    const cancelledTopics = allRemainingRaw.filter((t) => t.cancelled);
    const allRemaining = allRemainingRaw.filter((t) => !t.cancelled);
    const remainingTopics = allRemaining.filter((t) => !t.deferred);
    const deferredTopics = allRemaining.filter((t) => t.deferred);

    const currentTopicPlannedMinutes = currentTopic?.durationMinutes ?? 0;
    const plannedCurrentTopicEnd = liveStartTime
      ? new Date(
          liveStartTime.getTime() +
            (sumCompletedMinutes + currentTopicPlannedMinutes) * 60 * 1000
        )
      : null;
    let remainingProjectedBase = plannedCurrentTopicEnd
      ? new Date(Math.max(plannedCurrentTopicEnd.getTime(), now.getTime()))
      : null;

    const remainingDurationMs = remainingTopics.reduce(
      (sum, t) => sum + (t.durationMinutes ?? 0) * 60 * 1000,
      0
    );
    const projectedEnd = remainingProjectedBase
      ? new Date(remainingProjectedBase.getTime() + remainingDurationMs)
      : computeProjectedEndTime(meeting);

    const remainingWithTimes: { topic: Topic; projectedStart: Date | null }[] =
      remainingTopics.map((topic) => {
        const projectedStart = remainingProjectedBase
          ? new Date(remainingProjectedBase)
          : null;
        if (remainingProjectedBase) {
          remainingProjectedBase = new Date(
            remainingProjectedBase.getTime() +
              (topic.durationMinutes ?? 0) * 60 * 1000
          );
        }
        return { topic, projectedStart };
      });

    const completedMinutes = minutes.filter((m) => m !== null);

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

    return (
      <div className="meeting-present">
        {/* Header bar */}
        <div className="present-header">
          <span className="present-date">
            {meeting.date.toLocaleDateString(undefined, {
              weekday: "long",
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </span>
          <span className="present-elapsed">
            Elapsed: {formatDuration(elapsedSeconds)}
          </span>
          {projectedEnd && (
            <span className="present-projected-end">
              Projected end: {formatTime(projectedEnd)}
            </span>
          )}
        </div>

        {/* Current topic */}
        {currentTopic ? (
          <div className="present-current-topic">
            <div className="present-section-label">Now discussing</div>
            <h2 className="present-current-title">{currentTopic.title}</h2>
            {currentTopic.outcome && (
              <p className="present-topic-outcome">{currentTopic.outcome}</p>
            )}
            {currentTopic.details && (
              <div className="present-topic-details">
                {renderMarkdownBlocks(currentTopic.details)}
              </div>
            )}
            {(meeting.currentNotes ?? []).filter((n) => n !== null).length > 0 && (
              <div className="present-current-notes">
                {(meeting.currentNotes ?? []).filter((n) => n !== null).map((note, i) => (
                  <NoteDisplay key={i} note={note} />
                ))}
              </div>
            )}
            <div className="present-current-meta">
              <span className="present-planned-duration">
                Planned:{" "}
                {isOfficer && editingTopicId === currentTopic.id ? (
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
                          topicId: currentTopic.id,
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
                    onDoubleClick={isOfficer ? () => {
                      setEditingTopicId(currentTopic.id);
                      setEditingDuration(String(currentTopic.durationMinutes ?? ""));
                    } : undefined}
                    title={isOfficer ? "Double-click to edit" : undefined}
                  >
                    {currentTopic.durationMinutes ?? "?"} min
                  </span>
                )}
              </span>
              <span className="present-active-timer">
                Active:{" "}
                <span
                  className={
                    currentTopicActiveSeconds >
                    (currentTopic.durationMinutes ?? 0) * 60
                      ? "overtime"
                      : ""
                  }
                >
                  {formatDuration(currentTopicActiveSeconds)}
                </span>
              </span>
              {isOfficer && (
                <button
                  className="btn-small btn-secondary"
                  onClick={() => void skipTopic({ meetingId: meeting.id })}
                >
                  Defer
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="present-current-topic present-no-topic">
            <p>All topics have been covered.</p>
          </div>
        )}

        {/* Up next */}
        {(remainingWithTimes.length > 0 || isOfficer) && (
          <div className="present-section">
            <h3 className="present-section-heading">Up Next</h3>
            {remainingWithTimes.length === 0 ? (
              <p className="present-empty">No remaining topics.</p>
            ) : isOfficer ? (
              <DragDropContext onDragEnd={onDragEnd}>
                <Droppable droppableId="live-remaining">
                  {(provided) => (
                    <ol
                      className="present-topic-list"
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                    >
                      {remainingWithTimes.map(({ topic, projectedStart }, index) => (
                        <Draggable key={topic.id} draggableId={topic.id} index={index}>
                          {(provided, snapshot) => (
                            <li
                              className={`present-topic-item${snapshot.isDragging ? " dragging" : ""}`}
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                            >
                              <span
                                className="drag-handle"
                                {...provided.dragHandleProps}
                              >
                                ⠿
                              </span>
                              <span className="present-topic-title">{topic.title}</span>
                              <span className="present-topic-meta">
                                {isOfficer && editingTopicId === topic.id ? (
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
                                    onDoubleClick={isOfficer ? () => {
                                      setEditingTopicId(topic.id);
                                      setEditingDuration(String(topic.durationMinutes ?? ""));
                                    } : undefined}
                                    title={isOfficer ? "Double-click to edit" : undefined}
                                  >
                                    {topic.durationMinutes ?? "?"} min
                                  </span>
                                )}
                                {projectedStart &&
                                  ` · starts ~${formatTime(projectedStart)}`}
                              </span>
                              <div className="present-topic-actions">
                                <button
                                  className="btn-small btn-secondary"
                                  onClick={() =>
                                    void updateTopic({
                                      meetingId: meeting.id,
                                      list: "liveAgenda",
                                      topicId: topic.id,
                                      deferred: true,
                                    })
                                  }
                                >
                                  Defer
                                </button>
                                <button
                                  className="btn-small danger"
                                  onClick={() =>
                                    void updateTopic({
                                      meetingId: meeting.id,
                                      list: "liveAgenda",
                                      topicId: topic.id,
                                      cancelled: true,
                                    })
                                  }
                                >
                                  Cancel
                                </button>
                              </div>
                            </li>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                    </ol>
                  )}
                </Droppable>
              </DragDropContext>
            ) : (
              <ol className="present-topic-list">
                {remainingWithTimes.map(({ topic, projectedStart }) => (
                  <li key={topic.id} className="present-topic-item">
                    <span className="present-topic-title">{topic.title}</span>
                    <span className="present-topic-meta">
                      {topic.durationMinutes ?? "?"} min
                      {projectedStart &&
                        ` · starts ~${formatTime(projectedStart)}`}
                    </span>
                  </li>
                ))}
              </ol>
            )}

            {/* Deferred topics — officers only */}
            {isOfficer && deferredTopics.length > 0 && (
              <>
                <h4 className="present-deferred-heading">Deferred</h4>
                <ol className="present-topic-list">
                  {deferredTopics.map((topic) => (
                    <li
                      key={topic.id}
                      className="present-topic-item present-deferred-item"
                    >
                      <span className="present-topic-title">{topic.title}</span>
                      <span className="present-topic-meta">
                        {topic.durationMinutes ?? "?"} min
                      </span>
                      <div className="present-topic-actions">
                        <button
                          className="btn-small btn-secondary"
                          onClick={() =>
                            void updateTopic({
                              meetingId: meeting.id,
                              list: "liveAgenda",
                              topicId: topic.id,
                              deferred: false,
                            })
                          }
                        >
                          Restore
                        </button>
                      </div>
                    </li>
                  ))}
                </ol>
              </>
            )}

            {/* Cancelled topics — officers only */}
            {isOfficer && cancelledTopics.length > 0 && (
              <>
                <h4 className="present-cancelled-heading">Cancelled</h4>
                <ol className="present-topic-list">
                  {cancelledTopics.map((topic) => (
                    <li
                      key={topic.id}
                      className="present-topic-item present-cancelled-item"
                    >
                      <span className="present-topic-title">{topic.title}</span>
                      <span className="present-topic-meta">
                        {topic.durationMinutes ?? "?"} min
                      </span>
                      <div className="present-topic-actions">
                        <button
                          className="btn-small btn-secondary"
                          onClick={() =>
                            void updateTopic({
                              meetingId: meeting.id,
                              list: "liveAgenda",
                              topicId: topic.id,
                              cancelled: false,
                            })
                          }
                        >
                          Restore
                        </button>
                      </div>
                    </li>
                  ))}
                </ol>
              </>
            )}

            {/* Add topic — officers only */}
            {isOfficer && (
              <div className="present-add-topic">
                {showAddTopic ? (
                  <div className="present-add-topic-form">
                    <input
                      type="text"
                      value={newTopicTitle}
                      onChange={(e) => setNewTopicTitle(e.target.value)}
                      placeholder="Topic title"
                      autoFocus
                    />
                    <input
                      type="number"
                      min={1}
                      value={newTopicDuration}
                      onChange={(e) =>
                        setNewTopicDuration(Number(e.target.value))
                      }
                    />
                    <span className="present-add-topic-unit">min</span>
                    <button
                      className="btn-small btn-primary"
                      onClick={handleAddTopic}
                    >
                      Add
                    </button>
                    <button
                      className="btn-small btn-secondary"
                      onClick={() => setShowAddTopic(false)}
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button
                    className="btn-small btn-secondary"
                    onClick={() => setShowAddTopic(true)}
                  >
                    + Add Topic
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {/* Completed */}
        {completedMinutes.length > 0 && (
          <div className="present-section">
            <h3 className="present-section-heading">Completed</h3>
            <ol className="present-topic-list present-completed-list">
              {completedMinutes.map((minute, idx) => {
                const topic = minute.topic;
                const planned =
                  topic?.plannedTopic?.durationMinutes ??
                  topic?.durationMinutes;
                const actual = minute.durationMinutes;
                const diff = planned !== undefined ? actual - planned : null;
                const notes = minute.notes
                  ? (minute.notes.filter((n) => n !== null))
                  : [];
                return (
                  <li
                    key={idx}
                    className="present-topic-item present-completed"
                  >
                    <div className="present-completed-body">
                      <div className="present-completed-header">
                        <span className="present-topic-title">
                          {topic?.title ?? "(unknown)"}
                        </span>
                        <span className="present-topic-meta">
                          {actual} min actual
                          {planned !== undefined && ` / ${planned} min planned`}
                          {diff !== null && diff !== 0 && (
                            <span className={diff > 0 ? "overtime" : "undertime"}>
                              {" "}
                              ({diff > 0 ? "+" : ""}
                              {diff} min)
                            </span>
                          )}
                        </span>
                      </div>
                      {notes.length > 0 && (
                        <div className="present-completed-notes">
                          {notes.map((note, ni) => (
                            <NoteDisplay key={ni} note={note} />
                          ))}
                        </div>
                      )}
                    </div>
                  </li>
                );
              })}
            </ol>
          </div>
        )}
      </div>
    );
  }

  if (!meeting.plannedAgenda) {
    return <p>No topics</p>;
  }

  const totalPlannedMinutes = meeting.plannedAgenda.reduce(
    (sum, topic) => sum + (topic.durationMinutes ?? 0),
    0
  );
  const targetEndTime =
    meeting.expectedDurationMinutes !== undefined
      ? new Date(meeting.date.getTime() + meeting.expectedDurationMinutes * 60 * 1000)
      : null;
  const isOverrun =
    meeting.expectedDurationMinutes !== undefined &&
    totalPlannedMinutes > meeting.expectedDurationMinutes;

  const handleTargetEndTimeChange = (picked: Date | null) => {
    if (!picked) {
      void updateExpectedDuration({
        meetingId: meeting.id,
        expectedDurationMinutes: undefined,
      });
      return;
    }
    const combined = new Date(meeting.date);
    combined.setHours(picked.getHours(), picked.getMinutes(), 0, 0);
    let diffMinutes = Math.round(
      (combined.getTime() - meeting.date.getTime()) / (60 * 1000)
    );
    // A target end time earlier in the clock than the start time means it's
    // meant to land after midnight, the next day.
    if (diffMinutes <= 0) diffMinutes += 24 * 60;
    void updateExpectedDuration({
      meetingId: meeting.id,
      expectedDurationMinutes: diffMinutes,
    });
  };

  const handleStartDateChange = (picked: Date | null) => {
    if (!picked) return;
    void updateMeetingDate({ meetingId: meeting.id, date: picked.getTime() });
  };

  const lastCompletedMeeting = [...(me.root.selectedOrganization?.meetings ?? [])]
    .filter((candidate) => candidate.status === "completed")
    .sort((a, b) => b.date.getTime() - a.date.getTime())[0];
  const carryForwardTopics = (lastCompletedMeeting?.liveAgenda ?? []).filter(
    (topic) => topic.deferred && !topic.cancelled
  );

  const targetEndTimeControl = isOfficer ? (
    <label className="target-end-time-field">
      Target end time:
      <TimeOfDayInput
        selected={targetEndTime}
        onChange={handleTargetEndTimeChange}
        aria-label="Target end time"
      />
    </label>
  ) : (
    targetEndTime && <span>Target end time: {formatTime(targetEndTime)}</span>
  );

  const members = me.root.selectedOrganization.members;

  return (
    <div className="meeting-view-content">
      <div className="plan-header">
        <div className="plan-header-times">
          <div className="plan-field-row plan-start-time">
            <span className="plan-field-label">Start Time:</span>
            {isOfficer ? (
              <DateTimeField
                selected={meeting.date}
                onChange={(picked) => handleStartDateChange(picked)}
              />
            ) : (
              <span>
                {meeting.date.toLocaleString(undefined, {
                  dateStyle: "long",
                  timeStyle: "short",
                })}
              </span>
            )}
          </div>
          <div className="plan-field-row">
            {targetEndTimeControl}
            {isOverrun && (
              <span className="overrun-warning">
                ⚠ {totalPlannedMinutes - (meeting.expectedDurationMinutes ?? 0)} min
                over target
              </span>
            )}
          </div>
        </div>
        <MeetingDetailsAccordion
          meeting={meeting}
          members={members}
          isOfficer={isOfficer}
          showAttendance={false}
        />
      </div>
      <PlanAgendaEditor
        meeting={meeting}
        isOfficer={isOfficer}
        organization={me.root.selectedOrganization}
        startTime={meeting.date}
        targetEndTime={targetEndTime}
      >
        {isOfficer && carryForwardTopics.length > 0 && (
          <div className="carry-forward-suggestions">
            <h4>Carried forward from last meeting</h4>
            <ul>
              {carryForwardTopics.map((topic) => {
                const added = carriedForwardIds.has(topic.id);
                return (
                  <li key={topic.id}>
                    <span>
                      {topic.title}
                      {topic.durationMinutes
                        ? ` (${topic.durationMinutes} min)`
                        : ""}
                    </span>
                    <button
                      className="btn-small btn-secondary"
                      disabled={added}
                      onClick={() => {
                        void addTopic({
                          meetingId: meeting.id,
                          list: "plannedAgenda",
                          title: topic.title,
                          durationMinutes: topic.durationMinutes,
                        }).then(() => {
                          setCarriedForwardIds((prev) => new Set(prev).add(topic.id));
                        });
                      }}
                    >
                      {added ? "Added" : "+ Add to agenda"}
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </PlanAgendaEditor>
    </div>
  );
};
