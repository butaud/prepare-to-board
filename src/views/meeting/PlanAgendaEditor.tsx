import { CSSProperties, FC, ReactNode, useEffect, useRef, useState } from "react";
import {
  DragDropContext,
  Draggable,
  Droppable,
  type DropResult,
} from "@hello-pangea/dnd";
import { useMutation } from "convex/react";
import { Meeting, Topic } from "../../schema";
import { api } from "../../convexClient";
import { EditableInteger, EditableString } from "../../ui/doc/EditableValue";
import {
  AGENDA_EVENT_GAP_PX,
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
import "./PlanAgendaEditor.css";

const AGENDA_INSERTION_RESERVED_HEIGHT_PX = 9;
const AGENDA_INSERTION_FORM_GAP_PX = 230;
const PLAN_TIMELINE_ASSUMED_HEIGHT_PX = 640;

const insertionCursorStyle = (topPx: number): CSSProperties =>
  ({
    top: `${topPx}px`,
    height: `${AGENDA_INSERTION_RESERVED_HEIGHT_PX}px`,
  }) as CSSProperties;

const insertionFormStyle = (): CSSProperties =>
  ({
    top: `${AGENDA_INSERTION_RESERVED_HEIGHT_PX + 4}px`,
  }) as CSSProperties;

const formatMinutes = (totalMinutes: number): string => {
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
};

const getConnectionPath = (connection: {
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

type Entry = {
  topic: Topic;
  start: Date;
  end: Date;
  durationMinutes: number;
  startSlot: number;
  slotSpan: number;
  displayTopPx: number;
  displayHeightPx: number;
};

export type PlanAgendaEditorProps = {
  meeting: Meeting;
  isOfficer: boolean;
  startTime: Date;
  targetEndTime: Date | null;
  children?: ReactNode;
};

export const PlanAgendaEditor: FC<PlanAgendaEditorProps> = ({
  meeting,
  isOfficer,
  startTime,
  targetEndTime,
  children,
}) => {
  const topics = meeting.plannedAgenda;

  const addTopic = useMutation(api.app.addTopic);
  const updateTopic = useMutation(api.app.updateTopic);
  const deleteTopic = useMutation(api.app.deleteTopic);
  const reorderTopics = useMutation(api.app.reorderTopics);

  const layoutRef = useRef<HTMLDivElement | null>(null);
  const topicDetailRef = useRef<HTMLElement | null>(null);
  const paneRef = useRef<HTMLElement | null>(null);
  const paneViewportTopRef = useRef<number | null>(null);
  const connectionRef = useRef<SVGPathElement | null>(null);
  const hasScrolledInitialRef = useRef(false);

  const [selectedTopicId, setSelectedTopicId] = useState<string | null>(null);
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [isPanelSettling, setIsPanelSettling] = useState(false);
  const [addingAfterTopicId, setAddingAfterTopicId] = useState<string | null>(
    null
  );
  const [isAddingFirstTopic, setIsAddingFirstTopic] = useState(false);
  const [hoveredInsertionAfterTopicId, setHoveredInsertionAfterTopicId] =
    useState<string | null>(null);
  const [newTopicTitle, setNewTopicTitle] = useState("");
  const [newTopicDuration, setNewTopicDuration] = useState(5);
  const [slotMinutes, setSlotMinutes] = useState(
    getAgendaSlotMinutesForHeight(PLAN_TIMELINE_ASSUMED_HEIGHT_PX)
  );

  const selectedTopic =
    topics.find((t) => t.id === selectedTopicId) ?? topics[0] ?? null;
  const effectiveSelectedId = selectedTopic?.id ?? null;

  const findTopicElement = (topicId: string): HTMLElement | null => {
    const pane = paneRef.current;
    if (!pane) return null;
    return (
      Array.from(
        pane.querySelectorAll<HTMLElement>("[data-agenda-topic-id]")
      ).find((el) => el.dataset.agendaTopicId === topicId) ?? null
    );
  };

  const handleSelectTopic = (topicId: string, scroll = false) => {
    setSelectedTopicId(topicId);
    if (scroll) {
      window.requestAnimationFrame(() => {
        findTopicElement(topicId)?.scrollIntoView({
          block: "center",
          inline: "nearest",
        });
      });
    }
    if (window.matchMedia("(max-width: 750px)").matches) {
      setIsPanelOpen(false);
    }
  };

  // --- Sequential timeline entries, packed to leave room for insertion cursors ---
  const gridStart = floorToAgendaSlot(startTime, slotMinutes);
  const entries: Entry[] = [];
  let cursor = new Date(startTime);
  topics.forEach((topic) => {
    const durationMinutes = Math.max(1, topic.durationMinutes ?? 5);
    const start = new Date(cursor);
    const end = new Date(start.getTime() + durationMinutes * 60 * 1000);
    const startSlot =
      (start.getTime() - gridStart.getTime()) / (slotMinutes * 60 * 1000);
    const slotSpan = Math.max(
      0.2,
      (end.getTime() - start.getTime()) / (slotMinutes * 60 * 1000)
    );
    entries.push({
      topic,
      start,
      end,
      durationMinutes,
      startSlot,
      slotSpan,
      displayTopPx: 0,
      displayHeightPx: 0,
    });
    cursor = end;
  });
  let packedBottom = 0;
  entries.forEach((entry, index) => {
    const actualTop = entry.startSlot * AGENDA_SLOT_HEIGHT_PX;
    const desiredHeight = Math.max(
      AGENDA_EVENT_MIN_HEIGHT_PX,
      entry.slotSpan * AGENDA_SLOT_HEIGHT_PX - 2
    );
    const nextActualTop = entries[index + 1]
      ? entries[index + 1].startSlot * AGENDA_SLOT_HEIGHT_PX
      : undefined;
    const displayTop = Math.max(actualTop, packedBottom);
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
      entry.topic.id === addingAfterTopicId
        ? AGENDA_INSERTION_FORM_GAP_PX
        : AGENDA_INSERTION_RESERVED_HEIGHT_PX;
    packedBottom = displayTop + displayHeight + AGENDA_EVENT_GAP_PX + insertionGap;
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
    targetSlot !== null ? Math.ceil(targetSlot) + 1 : 0,
    Math.ceil(packedBottom / AGENDA_SLOT_HEIGHT_PX)
  );
  const timeSlots = Array.from({ length: slotCount + 1 }, (_, index) => ({
    key: `slot:${index}`,
    label: formatAgendaTime(
      new Date(gridStart.getTime() + index * slotMinutes * 60 * 1000)
    ),
    gridLine: index + 1,
  }));
  const totalPlannedMinutes = topics.reduce(
    (sum, topic) => sum + (topic.durationMinutes ?? 0),
    0
  );

  const handleAddTopic = (insertAfterTopicId: string | undefined) => {
    if (!newTopicTitle.trim()) return;
    void addTopic({
      meetingId: meeting.id,
      list: "plannedAgenda",
      title: newTopicTitle.trim(),
      durationMinutes: newTopicDuration,
      insertAfterTopicId,
    }).then((newTopicId: string) => {
      setSelectedTopicId(newTopicId);
    });
    setNewTopicTitle("");
    setNewTopicDuration(5);
    setAddingAfterTopicId(null);
    setHoveredInsertionAfterTopicId(null);
    setIsAddingFirstTopic(false);
  };

  const handleCancelAdd = () => {
    setNewTopicTitle("");
    setNewTopicDuration(5);
    setAddingAfterTopicId(null);
    setHoveredInsertionAfterTopicId(null);
    setIsAddingFirstTopic(false);
  };

  const handleDeleteSelected = () => {
    if (!selectedTopic) return;
    const idx = topics.findIndex((t) => t.id === selectedTopic.id);
    const fallback = topics[idx + 1]?.id ?? topics[idx - 1]?.id ?? null;
    setSelectedTopicId(fallback);
    void deleteTopic({
      meetingId: meeting.id,
      list: "plannedAgenda",
      topicId: selectedTopic.id,
    });
  };

  const onDragEnd = (result: DropResult) => {
    if (!result.destination) return;
    const srcIdx = result.source.index;
    const destIdx = result.destination.index;
    if (srcIdx === destIdx) return;
    const next = [...topics];
    const [moved] = next.splice(srcIdx, 1);
    next.splice(destIdx, 0, moved);
    void reorderTopics({
      meetingId: meeting.id,
      list: "plannedAgenda",
      topicIds: next.map((t) => t.id),
    });
  };

  // Settle flag lets the connector line hide gracefully during the mobile
  // tray's slide transition instead of jumping mid-animation.
  useEffect(() => {
    setIsPanelSettling(true);
    const t = window.setTimeout(() => setIsPanelSettling(false), 220);
    return () => window.clearTimeout(t);
  }, [isPanelOpen]);

  // Adaptive slot sizing: zoom the timeline to fit the pane's actual height.
  useEffect(() => {
    const pane = paneRef.current;
    if (!pane) return;

    const updateMetrics = (remeasureTop = false) => {
      if (remeasureTop || paneViewportTopRef.current === null) {
        paneViewportTopRef.current = Math.max(
          16,
          pane.getBoundingClientRect().top
        );
      }
      const paneTop = paneViewportTopRef.current;
      const paneMaxHeight = Math.max(
        AGENDA_SLOT_HEIGHT_PX,
        window.innerHeight - paneTop - 24
      );
      pane.style.setProperty("--agenda-pane-max-height", `${paneMaxHeight}px`);
      const header = pane.querySelector<HTMLElement>(
        ".minutes-agenda-pane-header"
      );
      const availableHeight = Math.max(
        AGENDA_SLOT_HEIGHT_PX,
        paneMaxHeight - (header?.offsetHeight ?? 0) - 28
      );
      setSlotMinutes((current) => {
        const next = getAgendaSlotMinutesForHeight(availableHeight);
        return current === next ? current : next;
      });
    };

    updateMetrics(true);
    if (typeof ResizeObserver === "undefined") {
      const onResize = () => updateMetrics(true);
      window.addEventListener("resize", onResize);
      return () => window.removeEventListener("resize", onResize);
    }
    const resizeObserver = new ResizeObserver(() => updateMetrics());
    resizeObserver.observe(pane);
    const onResize = () => updateMetrics(true);
    window.addEventListener("resize", onResize);
    return () => {
      resizeObserver.disconnect();
      window.removeEventListener("resize", onResize);
    };
  }, [addingAfterTopicId, isAddingFirstTopic]);

  // Scroll the initially-selected topic into view once, on first load.
  useEffect(() => {
    if (!effectiveSelectedId || hasScrolledInitialRef.current) return;
    if (window.matchMedia("(max-width: 750px)").matches) return;
    const frameId = window.requestAnimationFrame(() => {
      findTopicElement(effectiveSelectedId)?.scrollIntoView({
        block: "center",
        inline: "nearest",
      });
      hasScrolledInitialRef.current = true;
    });
    return () => window.cancelAnimationFrame(frameId);
  }, [effectiveSelectedId, entries.length]);

  // Draw the connector line from the detail panel to the selected topic.
  useEffect(() => {
    let frameId = 0;
    const hide = (path: SVGPathElement | null) => path?.classList.add("is-hidden");
    const show = (
      path: SVGPathElement | null,
      connection: { x1: number; y1: number; x2: number; y2: number }
    ) => {
      if (!path) return;
      path.setAttribute("d", getConnectionPath(connection));
      path.classList.remove("is-hidden");
    };
    const update = () => {
      const isMobile = window.matchMedia("(max-width: 750px)").matches;
      if (isMobile && (isPanelOpen || isPanelSettling)) {
        hide(connectionRef.current);
        return;
      }
      const layout = layoutRef.current;
      const source = topicDetailRef.current;
      if (!layout || !source || !effectiveSelectedId) {
        hide(connectionRef.current);
        return;
      }
      const target = findTopicElement(effectiveSelectedId);
      if (!target) {
        hide(connectionRef.current);
        return;
      }
      const layoutRect = layout.getBoundingClientRect();
      const sourceRect = source.getBoundingClientRect();
      const targetRect = target.getBoundingClientRect();
      const pane = paneRef.current;
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
        isMobile && !isPanelOpen && paneRect
          ? paneRect.left - layoutRect.left
          : targetRect.left - layoutRect.left;
      show(connectionRef.current, {
        x1: sourceRect.right - layoutRect.left,
        y1,
        x2: targetX,
        y2,
      });
    };
    const schedule = () => {
      window.cancelAnimationFrame(frameId);
      frameId = window.requestAnimationFrame(update);
    };
    schedule();
    const postTransitionId = window.setTimeout(schedule, 220);
    window.addEventListener("resize", schedule);
    window.addEventListener("scroll", schedule, true);
    const resizeObserver = new ResizeObserver(schedule);
    [layoutRef.current, topicDetailRef.current, paneRef.current].forEach(
      (el) => el && resizeObserver.observe(el)
    );
    return () => {
      window.cancelAnimationFrame(frameId);
      window.clearTimeout(postTransitionId);
      window.removeEventListener("resize", schedule);
      window.removeEventListener("scroll", schedule, true);
      resizeObserver.disconnect();
    };
  }, [effectiveSelectedId, entries.length, slotMinutes, isPanelOpen, isPanelSettling]);

  const renderAddTopicForm = (style: CSSProperties | undefined, isFirst: boolean) => (
    <div className="minutes-add-topic-form minutes-add-topic-form-inline" style={style}>
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
        <button
          className="btn-primary"
          onClick={() => handleAddTopic(isFirst ? undefined : addingAfterTopicId ?? undefined)}
        >
          Add
        </button>
        <button className="btn-secondary" onClick={handleCancelAdd}>
          Cancel
        </button>
      </div>
    </div>
  );

  const renderInsertionCursor = (entry: Entry) => {
    if (!isOfficer) return null;
    const topicId = entry.topic.id;
    const insertionTop =
      entry.displayTopPx + entry.displayHeightPx + AGENDA_EVENT_GAP_PX;
    const isAddingHere = addingAfterTopicId === topicId;
    const isHoveredHere = hoveredInsertionAfterTopicId === topicId;
    return (
      <div
        key={`insert:${topicId}`}
        className={`minutes-agenda-insertion-slot${isAddingHere ? " is-open" : ""}${isHoveredHere ? " is-hovered" : ""}`}
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
          aria-label={`Add topic after ${entry.topic.title}`}
          onClick={() => {
            setAddingAfterTopicId(topicId);
            setHoveredInsertionAfterTopicId(topicId);
          }}
        >
          <span aria-hidden="true">+</span>
        </button>
        {isAddingHere && renderAddTopicForm(insertionFormStyle(), false)}
      </div>
    );
  };

  return (
    <div className="meeting-minutes plan-agenda-layout" ref={layoutRef}>
      <svg className="minutes-agenda-connections" aria-hidden="true" focusable="false">
        <path ref={connectionRef} className="minutes-agenda-connection-line is-active is-hidden" />
      </svg>
      <div className="minutes-topic-main">
        {children}
        <section ref={topicDetailRef} className="minutes-section minutes-topic-detail-section">
          {selectedTopic ? (
            <div className="minutes-current-topic">
              <h2>Planned Topic</h2>
              <EditableString
                as="h3"
                value={selectedTopic.title}
                onValueChange={(newValue) =>
                  void updateTopic({
                    meetingId: meeting.id,
                    list: "plannedAgenda",
                    topicId: selectedTopic.id,
                    title: newValue,
                  })
                }
                canEdit={isOfficer}
                label="Topic"
                autoFocus
              />
              <div className="minutes-current-meta">
                <span>
                  Planned:{" "}
                  <EditableInteger
                    as="span"
                    value={selectedTopic.durationMinutes ?? 0}
                    onValueChange={(newDuration) =>
                      void updateTopic({
                        meetingId: meeting.id,
                        list: "plannedAgenda",
                        topicId: selectedTopic.id,
                        durationMinutes: newDuration,
                      })
                    }
                    canEdit={isOfficer}
                    label="Duration"
                  />{" "}
                  min
                </span>
              </div>
              <div className="plan-detail-outcome">
                <EditableString
                  as="span"
                  value={selectedTopic.outcome ?? ""}
                  onValueChange={(newValue) =>
                    void updateTopic({
                      meetingId: meeting.id,
                      list: "plannedAgenda",
                      topicId: selectedTopic.id,
                      outcome: newValue,
                    })
                  }
                  canEdit={isOfficer}
                  className="outcome-display"
                  label="Outcome/Goal"
                  emptyClickBehavior="single"
                />
              </div>
              {isOfficer && (
                <div className="minutes-actions">
                  <button className="btn-danger" onClick={handleDeleteSelected}>
                    Delete Topic
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="minutes-current-topic">
              <p>No topics have been scheduled yet.</p>
            </div>
          )}
        </section>
      </div>

      <button
        className={`minutes-agenda-pane-backdrop${isPanelOpen ? " is-open" : ""}`}
        aria-label="Dismiss timeline"
        onClick={() => setIsPanelOpen(false)}
      />
      <aside
        ref={paneRef}
        id="plan-agenda-pane"
        className={`minutes-section minutes-topic-tray${isPanelOpen ? " is-open" : ""}`}
        aria-label="Meeting timeline"
        onClick={() => {
          if (window.matchMedia("(max-width: 750px)").matches && !isPanelOpen) {
            setIsPanelOpen(true);
          }
        }}
        onKeyDown={(event) => {
          if (
            window.matchMedia("(max-width: 750px)").matches &&
            !isPanelOpen &&
            (event.key === "Enter" || event.key === " ")
          ) {
            event.preventDefault();
            setIsPanelOpen(true);
          }
        }}
        tabIndex={isPanelOpen ? undefined : 0}
      >
        <div className="minutes-agenda-pane-header">
          <h2>
            Timeline
            {topics.length > 0 && (
              <span className="plan-timeline-planned">
                {formatMinutes(totalPlannedMinutes)} planned
              </span>
            )}
          </h2>
          <button
            className="minutes-agenda-pane-close"
            aria-label={isPanelOpen ? "Close timeline" : "Open timeline"}
            aria-expanded={isPanelOpen}
            aria-controls="plan-agenda-pane"
            onClick={() => setIsPanelOpen((open) => !open)}
          >
            <span aria-hidden="true">{isPanelOpen ? ">>" : "<<"}</span>
          </button>
        </div>
        {topics.length === 0 ? (
          <div className="plan-agenda-timeline-empty">
            {isAddingFirstTopic ? (
              renderAddTopicForm(undefined, true)
            ) : isOfficer ? (
              <button className="btn-small btn-secondary" onClick={() => setIsAddingFirstTopic(true)}>
                + Add Topic
              </button>
            ) : (
              "No topics scheduled yet."
            )}
          </div>
        ) : (
          <div className="minutes-day-view-grid" style={timelineGridStyle(slotCount)}>
            {timeSlots.map((slot) => (
              <div key={slot.key} className="minutes-day-view-tick" style={{ gridRow: slot.gridLine }}>
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
            <DragDropContext onDragEnd={onDragEnd}>
              <Droppable droppableId="plan-agenda">
                {(provided) => (
                  <ul className="minutes-day-view-list" ref={provided.innerRef} {...provided.droppableProps}>
                    {entries.map((entry, index) => (
                      <Draggable
                        key={entry.topic.id}
                        draggableId={entry.topic.id}
                        index={index}
                        isDragDisabled={!isOfficer}
                      >
                        {(provided, snapshot) => {
                          const timelineStyle = timelineDisplayEventStyle(
                            entry.startSlot,
                            entry.slotSpan,
                            entry.displayTopPx,
                            entry.displayHeightPx
                          );
                          const draggableStyle = snapshot.isDragging
                            ? { ...provided.draggableProps.style, height: `${entry.displayHeightPx}px` }
                            : { ...provided.draggableProps.style, ...timelineStyle };
                          const isSelected = effectiveSelectedId === entry.topic.id;
                          const isOverTarget = targetEndTime
                            ? entry.end.getTime() > targetEndTime.getTime()
                            : false;
                          return (
                            <li
                              className={`minutes-day-view-draggable${isSelected ? " is-selected" : ""}${snapshot.isDragging ? " dragging" : ""}`}
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              style={draggableStyle}
                            >
                              <div
                                className={`minutes-day-view-event${isSelected ? " is-selected" : ""}${isOverTarget ? " plan-agenda-event-overrun" : ""}`}
                                data-agenda-topic-id={entry.topic.id}
                                role="button"
                                tabIndex={0}
                                style={{ height: `${entry.displayHeightPx}px` }}
                                title={`${entry.topic.title} (${formatAgendaTime(entry.start)} - ${formatAgendaTime(entry.end)})`}
                                onClick={() => handleSelectTopic(entry.topic.id)}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter" || e.key === " ") {
                                    e.preventDefault();
                                    handleSelectTopic(entry.topic.id);
                                  }
                                }}
                              >
                                {isOfficer && (
                                  <span
                                    className="drag-handle"
                                    {...provided.dragHandleProps}
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    ⠿
                                  </span>
                                )}
                                <span className="minutes-day-view-title">{entry.topic.title}</span>
                                <span className="minutes-day-view-meta">
                                  {formatMinuteCount(entry.durationMinutes)}
                                </span>
                              </div>
                            </li>
                          );
                        }}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </ul>
                )}
              </Droppable>
            </DragDropContext>
            {entries.map(renderInsertionCursor)}
          </div>
        )}
      </aside>
    </div>
  );
};
