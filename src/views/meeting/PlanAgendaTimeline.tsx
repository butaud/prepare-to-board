import { FC } from "react";
import { Topic } from "../../schema";
import {
  AGENDA_EVENT_MIN_HEIGHT_PX,
  AGENDA_SLOT_HEIGHT_PX,
  ceilMinutesToAgendaSlotCount,
  floorToAgendaSlot,
  formatAgendaTime,
  formatMinuteCount,
  getAgendaSlotMinutesForHeight,
  timelineDisplayEventStyle,
  timelineGridStyle,
} from "./agendaTimeline";

import "./MeetingMinutes.css";
import "./PlanAgendaTimeline.css";

// A reasonable assumed viewport for picking a slot size, mirroring the
// adaptive zoom the live Take Minutes timeline computes from its actual
// measured pane height (see getAgendaSlotMinutesForHeight).
const PLAN_TIMELINE_ASSUMED_HEIGHT_PX = 640;

export type PlanAgendaTimelineProps = {
  topics: Topic[];
  startTime: Date;
  targetEndTime?: Date | null;
};

export const PlanAgendaTimeline: FC<PlanAgendaTimelineProps> = ({
  topics,
  startTime,
  targetEndTime,
}) => {
  if (topics.length === 0) {
    return (
      <div className="plan-agenda-timeline-empty">
        No topics scheduled yet — add one below to see the timeline.
        {targetEndTime && (
          <span> Target end time: {formatAgendaTime(targetEndTime)}.</span>
        )}
      </div>
    );
  }

  const slotMinutes = getAgendaSlotMinutesForHeight(
    PLAN_TIMELINE_ASSUMED_HEIGHT_PX
  );
  const gridStart = floorToAgendaSlot(startTime, slotMinutes);

  let cursor = new Date(startTime);
  const entries = topics.map((topic) => {
    const durationMinutes = Math.max(1, topic.durationMinutes ?? 5);
    const start = new Date(cursor);
    const end = new Date(start.getTime() + durationMinutes * 60 * 1000);
    const startSlot =
      (start.getTime() - gridStart.getTime()) / (slotMinutes * 60 * 1000);
    const slotSpan = Math.max(
      0.2,
      (end.getTime() - start.getTime()) / (slotMinutes * 60 * 1000)
    );
    cursor = end;
    return { topic, start, end, startSlot, slotSpan, durationMinutes };
  });

  const targetSlot = targetEndTime
    ? (targetEndTime.getTime() - gridStart.getTime()) /
      (slotMinutes * 60 * 1000)
    : null;

  const slotCount = Math.max(
    1,
    ceilMinutesToAgendaSlotCount(
      (cursor.getTime() - gridStart.getTime()) / (60 * 1000),
      slotMinutes
    ),
    targetSlot !== null ? Math.ceil(targetSlot) + 1 : 0
  );
  const timeSlots = Array.from({ length: slotCount + 1 }, (_, index) => ({
    key: `slot:${index}`,
    label: formatAgendaTime(
      new Date(gridStart.getTime() + index * slotMinutes * 60 * 1000)
    ),
    gridLine: index + 1,
  }));

  return (
    <div
      className="minutes-day-view-grid plan-agenda-timeline-grid"
      style={timelineGridStyle(slotCount)}
    >
      {timeSlots.map((slot) => (
        <div
          key={slot.key}
          className="minutes-day-view-tick"
          style={{ gridRow: slot.gridLine }}
        >
          <span>{slot.label}</span>
        </div>
      ))}
      {targetSlot !== null && targetSlot >= 0 && targetSlot <= slotCount && (
        <>
          <div
            className="plan-agenda-target-overflow"
            style={{ top: `${targetSlot * AGENDA_SLOT_HEIGHT_PX}px` }}
          />
          <div
            className="plan-agenda-target-line"
            style={{ top: `${targetSlot * AGENDA_SLOT_HEIGHT_PX}px` }}
          >
            <span>Target: {formatAgendaTime(targetEndTime as Date)}</span>
          </div>
        </>
      )}
      {entries.map((entry) => {
        const isOverTarget = targetEndTime
          ? entry.end.getTime() > targetEndTime.getTime()
          : false;
        return (
          <div
            key={entry.topic.id}
            className={`minutes-day-view-event plan-agenda-event${
              isOverTarget ? " plan-agenda-event-overrun" : ""
            }`}
            style={timelineDisplayEventStyle(
              entry.startSlot,
              entry.slotSpan,
              entry.startSlot * AGENDA_SLOT_HEIGHT_PX,
              Math.max(
                AGENDA_EVENT_MIN_HEIGHT_PX,
                entry.slotSpan * AGENDA_SLOT_HEIGHT_PX - 2
              )
            )}
            title={`${entry.topic.title} (${formatAgendaTime(entry.start)} - ${formatAgendaTime(entry.end)})`}
          >
            <span className="minutes-day-view-title">{entry.topic.title}</span>
            <span className="minutes-day-view-meta">
              {formatMinuteCount(entry.durationMinutes)}
            </span>
          </div>
        );
      })}
    </div>
  );
};
