import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { useMeeting } from "../../hooks/Meeting";
import { useLoadedAccount } from "../../hooks/Account";
import { computeProjectedEndTime } from "../../util/data";
import { Topic } from "../../schema";

import "./MeetingPresent.css";

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

export const MeetingPresent = () => {
  const meeting = useMeeting();
  const me = useLoadedAccount();
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  if (!me.canWrite(meeting)) {
    return <Navigate to=".." replace />;
  }

  if (meeting.status !== "live" && meeting.status !== "completed") {
    return <p>Meeting is not currently live.</p>;
  }

  const liveAgenda = meeting.liveAgenda ?? [];
  const minutes = meeting.minutes ?? [];
  const liveStartTime = meeting.liveStartTime;

  // Elapsed since start
  const elapsedSeconds = liveStartTime
    ? Math.floor((now.getTime() - liveStartTime.getTime()) / 1000)
    : 0;

  // Current topic index = minutes.length
  const completedCount = minutes.filter((m) => m !== null).length;
  const currentTopicIndex = completedCount;
  const currentTopic: Topic | null =
    liveAgenda[currentTopicIndex] ?? null;

  // How long has the current topic been active?
  // = now - (liveStartTime + sum of completed minute durations)
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

  // Remaining topics (after current)
  const remainingTopics = liveAgenda
    .filter((t) => t !== null)
    .slice(currentTopicIndex + 1)
    .filter((t) => !t!.cancelled) as Topic[];

  // Base time for projected starts of remaining topics:
  // use the later of (planned end of current topic) and (now),
  // so that projected times shift with the clock when topics run long.
  const currentTopicPlannedMinutes = currentTopic?.durationMinutes ?? 0;
  const plannedCurrentTopicEnd = liveStartTime
    ? new Date(
        liveStartTime.getTime() +
          (sumCompletedMinutes + currentTopicPlannedMinutes) * 60 * 1000
      )
    : null;
  let remainingProjectedBase =
    plannedCurrentTopicEnd
      ? new Date(Math.max(plannedCurrentTopicEnd.getTime(), now.getTime()))
      : null;

  // Projected end time: base + sum of remaining topic durations
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
          remainingProjectedBase.getTime() + (topic.durationMinutes ?? 0) * 60 * 1000
        );
      }
      return { topic, projectedStart };
    });

  // Completed topics
  const completedMinutes = minutes.filter((m) => m !== null) as NonNullable<
    (typeof minutes)[number]
  >[];

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
          <div className="present-current-meta">
            <span className="present-planned-duration">
              Planned: {currentTopic.durationMinutes ?? "?"} min
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
          </div>
        </div>
      ) : (
        <div className="present-current-topic present-no-topic">
          <p>All topics have been covered.</p>
        </div>
      )}

      {/* Up next */}
      {remainingWithTimes.length > 0 && (
        <div className="present-section">
          <h3 className="present-section-heading">Up Next</h3>
          <ol className="present-topic-list">
            {remainingWithTimes.map(({ topic, projectedStart }) => (
              <li key={topic.id} className="present-topic-item">
                <span className="present-topic-title">{topic.title}</span>
                <span className="present-topic-meta">
                  {topic.durationMinutes ?? "?"} min
                  {projectedStart && ` · starts ~${formatTime(projectedStart)}`}
                </span>
              </li>
            ))}
          </ol>
        </div>
      )}

      {/* Completed */}
      {completedMinutes.length > 0 && (
        <div className="present-section">
          <h3 className="present-section-heading">Completed</h3>
          <ol className="present-topic-list">
            {completedMinutes.map((minute, idx) => {
              const topic = minute.topic;
              const planned = topic?.plannedTopic?.durationMinutes ?? topic?.durationMinutes;
              const actual = minute.durationMinutes;
              const diff = planned !== undefined ? actual - planned : null;
              return (
                <li key={idx} className="present-topic-item present-completed">
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
                </li>
              );
            })}
          </ol>
        </div>
      )}
    </div>
  );
};
