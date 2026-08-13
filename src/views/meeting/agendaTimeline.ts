import type { CSSProperties } from "react";

// Shared layout primitives for the day-view agenda timeline, used by both
// the live Take Minutes page and the pre-meeting Plan page so the two stay
// visually and numerically consistent.

export const AGENDA_BASE_SLOT_MINUTES = 5;
export const AGENDA_SLOT_HEIGHT_PX = 72;
export const AGENDA_TARGET_VISIBLE_MINUTES = 90;
export const AGENDA_EVENT_MIN_HEIGHT_PX = 14;
export const AGENDA_EVENT_GAP_PX = 3;

export const timelineGridStyle = (slotCount: number): CSSProperties =>
  ({ "--slot-count": slotCount }) as CSSProperties;

export const timelineEventStyle = (
  startSlot: number,
  slotSpan: number,
  topPx = startSlot * AGENDA_SLOT_HEIGHT_PX
): CSSProperties => ({
  "--start-slot": startSlot,
  "--slot-span": slotSpan,
  top: `${topPx}px`,
  height: `${Math.max(AGENDA_EVENT_MIN_HEIGHT_PX, slotSpan * AGENDA_SLOT_HEIGHT_PX - 2)}px`,
}) as CSSProperties;

export const timelineDisplayEventStyle = (
  startSlot: number,
  slotSpan: number,
  displayTopPx: number,
  displayHeightPx: number
): CSSProperties =>
  ({
    ...timelineEventStyle(startSlot, slotSpan, displayTopPx),
    height: `${displayHeightPx}px`,
  }) as CSSProperties;

export const floorToAgendaSlot = (date: Date, slotMinutes: number): Date => {
  const floored = new Date(date);
  floored.setSeconds(0, 0);
  floored.setMinutes(
    Math.floor(floored.getMinutes() / slotMinutes) * slotMinutes
  );
  return floored;
};

export const ceilMinutesToAgendaSlotCount = (
  minutes: number,
  slotMinutes: number
): number => Math.max(1, Math.ceil(minutes / slotMinutes));

export const getAgendaSlotMinutesForHeight = (availableHeight: number): number => {
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

export const formatAgendaTime = (date: Date): string =>
  date.toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  });

export const formatMinuteCount = (minutes: number): string =>
  minutes === 1 ? "1 min" : `${minutes} min`;
