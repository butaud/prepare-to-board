import { useEffect, useState } from "react";
import { useMutation } from "convex/react";
import { useMeeting } from "../../hooks/Meeting";
import { useLoadedAccount } from "../../hooks/Account";
import { computeProjectedEndTime } from "../../util/data";
import { Minute, Note, Topic } from "../../schema";
import { NoteDisplay } from "../../ui/NoteDisplay";
import { api } from "../../convexClient";

import "./MeetingPresent.css";
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

const formatTime = (date: Date): string =>
  date.toLocaleTimeString(undefined, { timeStyle: "short" });

type PresentAgendaItem = {
  topic: Topic;
  section: "completed" | "now" | "up-next";
  minute?: Minute;
  notes: Note[];
  projectedStart?: Date | null;
  activeSeconds?: number;
};

export const MeetingPresent = () => {
  const meeting = useMeeting();
  const me = useLoadedAccount();
  const [now, setNow] = useState(() => new Date());
  const focusedTopicId = meeting.focusedTopicId ?? null;
  const setFocusedTopic = useMutation(api.app.setFocusedTopic);
  const isOfficer = me.canWrite(meeting);

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const liveAgenda = meeting.liveAgenda ?? [];
  const minutes = meeting.minutes ?? [];
  const liveStartTime = meeting.liveStartTime;

  const elapsedSeconds = liveStartTime
    ? Math.floor((now.getTime() - liveStartTime.getTime()) / 1000)
    : 0;

  const completedMinutes = minutes.filter((m) => m !== null);
  const completedCount = completedMinutes.length;
  const currentTopicIndex = liveAgenda.findIndex(
    (topic, index) =>
      index >= completedCount && !topic.cancelled && !topic.deferred
  );
  const currentTopic: Topic | null =
    currentTopicIndex === -1 ? null : liveAgenda[currentTopicIndex];
  const remainingStartIndex =
    currentTopicIndex === -1 ? completedCount : currentTopicIndex + 1;

  const sumCompletedMinutes = completedMinutes.reduce(
    (sum, m) => sum + (m.durationMinutes ?? 0),
    0
  );
  const currentTopicActiveSeconds = liveStartTime
    ? Math.floor(
        (now.getTime() -
          (liveStartTime.getTime() + sumCompletedMinutes * 60 * 1000)) /
          1000
      )
    : 0;

  const remainingTopics = liveAgenda
    .filter((t) => t !== null)
    .slice(remainingStartIndex)
    .filter((t) => !t.cancelled);

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

  const completedItems: PresentAgendaItem[] = completedMinutes.map((minute) => ({
    topic: minute.topic,
    section: "completed",
    minute,
    notes: minute.notes?.filter((n) => n !== null) ?? [],
  }));
  const nowItem: PresentAgendaItem | null = currentTopic
    ? {
        topic: currentTopic,
        section: "now",
        notes: meeting.currentNotes?.filter((n) => n !== null) ?? [],
        activeSeconds: currentTopicActiveSeconds,
      }
    : null;
  const upcomingItems: PresentAgendaItem[] = remainingWithTimes.map(
    ({ topic, projectedStart }) => ({
      topic,
      section: "up-next",
      notes: [],
      projectedStart,
    })
  );
  const allItems = [
    ...completedItems,
    ...(nowItem ? [nowItem] : []),
    ...upcomingItems,
  ];
  const focusedItem =
    allItems.find((item) => item.topic.id === focusedTopicId) ??
    nowItem ??
    allItems[0] ??
    null;
  const selectedTopicId = focusedItem?.topic.id ?? null;
  const hasFocusedAgendaTopic = focusedTopicId
    ? allItems.some((item) => item.topic.id === focusedTopicId)
    : false;
  const fallbackFocusedTopicId = (nowItem ?? allItems[0])?.topic.id ?? null;

  useEffect(() => {
    if (!isOfficer) return;
    if (!allItems.length) {
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
    allItems.length,
    fallbackFocusedTopicId,
    meeting.id,
    setFocusedTopic,
  ]);

  const focusTopic = (topicId: string) => {
    if (!isOfficer) return;
    void setFocusedTopic({ meetingId: meeting.id, topicId });
  };

  const renderAgendaItem = (item: PresentAgendaItem) => {
    const topic = item.topic;
    const isFocused = selectedTopicId === topic.id;
    const planned =
      topic.plannedTopic?.durationMinutes ?? topic.durationMinutes;
    const actual = item.minute?.durationMinutes;
    const diff =
      actual !== undefined && planned !== undefined ? actual - planned : null;
    const hasNotes = item.notes.length > 0;
    const isOvertime =
      item.activeSeconds !== undefined &&
      item.activeSeconds > (topic.durationMinutes ?? 0) * 60;

    return (
      <li key={`${item.section}:${topic.id}`} className="present-agenda-row">
        <button
          className={`present-agenda-item${item.section === "now" ? " is-meeting-active" : ""}${isFocused ? " is-focused" : ""}`}
          aria-expanded={isFocused}
          disabled={!isOfficer}
          onClick={() => focusTopic(topic.id)}
        >
          <span className="present-item-main">
            <span className="present-topic-title">{topic.title}</span>
            <span className="present-topic-meta">
              {item.section === "completed" && actual !== undefined
                ? `${actual} min actual`
                : `${topic.durationMinutes ?? "?"} min planned`}
              {item.section === "completed" &&
                planned !== undefined &&
                ` / ${planned} min planned`}
              {diff !== null && diff !== 0 && (
                <span className={diff > 0 ? "overtime" : "undertime"}>
                  {" "}
                  ({diff > 0 ? "+" : ""}
                  {diff} min)
                </span>
              )}
              {item.projectedStart && ` · starts ~${formatTime(item.projectedStart)}`}
              {topic.deferred && " · deferred"}
            </span>
          </span>
          {item.section === "now" && (
            <span className="present-now-badge">Now Discussing</span>
          )}
        </button>

        {isFocused && (
          <div className="present-focused-notes">
            {item.section === "now" && item.activeSeconds !== undefined && (
              <div className="present-focused-meta">
                <span>
                  Active:{" "}
                  <strong className={isOvertime ? "overtime" : undefined}>
                    {formatDuration(item.activeSeconds)}
                  </strong>
                </span>
              </div>
            )}
            {hasNotes ? (
              item.notes.map((note, i) => <NoteDisplay key={i} note={note} />)
            ) : (
              <p className="present-empty">No notes for this topic.</p>
            )}
          </div>
        )}
      </li>
    );
  };

  if (meeting.status !== "live" && meeting.status !== "completed") {
    return <p>Meeting is not currently live.</p>;
  }

  return (
    <div className="meeting-present">
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

      {allItems.length === 0 ? (
        <div className="present-current-topic present-no-topic">
          <p>All topics have been covered.</p>
        </div>
      ) : (
        <ol className="present-agenda-list">
          {completedItems.length > 0 && (
            <li className="present-agenda-section-label">Completed</li>
          )}
          {completedItems.map(renderAgendaItem)}

          {nowItem ? (
            <>
              <li className="present-agenda-section-label">Now Discussing</li>
              {renderAgendaItem(nowItem)}
            </>
          ) : (
            <li className="present-current-topic present-no-topic">
              <p>All topics have been covered.</p>
            </li>
          )}

          {upcomingItems.length > 0 && (
            <li className="present-agenda-section-label">Up Next</li>
          )}
          {upcomingItems.map(renderAgendaItem)}
        </ol>
      )}
    </div>
  );
};
