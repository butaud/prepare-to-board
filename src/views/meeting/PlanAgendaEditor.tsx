import { CSSProperties, FC, ReactNode, useEffect, useRef, useState } from "react";
import {
  DragDropContext,
  Draggable,
  Droppable,
  type DropResult,
} from "@hello-pangea/dnd";
import { useMutation } from "convex/react";
import { MdDelete } from "react-icons/md";
import { getCanonicalTopicId, Meeting, Topic } from "../../schema";
import { api } from "../../convexClient";
import { usePlanAgendaEditMode } from "../../hooks/PlanAgendaEditMode";
import { usePrivateNotes } from "../../hooks/PrivateNotes";
import { EditableInteger, EditableString } from "../../ui/doc/EditableValue";
import { PrivateNoteEditor } from "../../ui/PrivateNoteEditor";
import { renderMarkdownBlocks } from "../../util/markdown";
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
const AGENDA_ADD_AT_END_HEIGHT_PX = 44;
const PLAN_TIMELINE_ASSUMED_HEIGHT_PX = 640;

const insertionCursorStyle = (
  topPx: number,
  heightPx: number = AGENDA_INSERTION_RESERVED_HEIGHT_PX
): CSSProperties =>
  ({
    top: `${topPx}px`,
    height: `${heightPx}px`,
  }) as CSSProperties;

const insertionFormStyle = (
  baseHeightPx: number = AGENDA_INSERTION_RESERVED_HEIGHT_PX
): CSSProperties =>
  ({
    top: `${baseHeightPx + 4}px`,
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
  const dx = connection.x2 - connection.x1;
  const direction = dx >= 0 ? 1 : -1;
  // A fixed minimum offset here produces a visible hook right at each
  // endpoint when the two points are nearly vertically aligned (small dx,
  // large dy) — e.g. the collapsed mobile timeline, which is tall and
  // narrow. Scale the floor down with dx instead so a near-vertical
  // connection renders as a gentle, mostly-straight curve.
  const controlOffset = direction * Math.max(8, Math.min(160, Math.abs(dx) * 0.5));
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

  // View is the default for everyone (identical for officers and
  // non-officers); Edit is an officer-only mode entered explicitly via the
  // "Edit Agenda" action in the meeting's action bar (MeetingShared), so
  // public-field editing never shows up alongside private notes.
  const { isEditingAgenda } = usePlanAgendaEditMode();
  const privateNotes = usePrivateNotes(meeting.id);

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
  const wasPanelOpenRef = useRef(isPanelOpen);
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
  const [isEditingDetails, setIsEditingDetails] = useState(false);
  const [draftDetails, setDraftDetails] = useState("");

  const selectedTopic =
    topics.find((t) => t.id === selectedTopicId) ?? topics[0] ?? null;
  const effectiveSelectedId = selectedTopic?.id ?? null;

  // Close any open details editor when the selected topic changes, so a
  // stale draft doesn't linger over the wrong topic.
  useEffect(() => {
    setIsEditingDetails(false);
  }, [effectiveSelectedId]);

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
    const isLastEntry = index === entries.length - 1;
    const insertionGap =
      entry.topic.id === addingAfterTopicId
        ? AGENDA_INSERTION_FORM_GAP_PX
        : isLastEntry
          ? AGENDA_ADD_AT_END_HEIGHT_PX
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
      if (isMobile && isPanelOpen) {
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
          ? paneRect.right - layoutRect.left
          : targetRect.right - layoutRect.left;
      show(connectionRef.current, {
        x1: sourceRect.left - layoutRect.left,
        y1,
        x2: targetX,
        y2,
      });
    };
    const schedule = () => {
      window.cancelAnimationFrame(frameId);
      frameId = window.requestAnimationFrame(update);
    };

    // Track transitions with a ref (rather than separate state) so hiding
    // during the mobile tray's slide animation can't get out of sync with
    // this effect's own re-run: a second piece of state updated from its
    // own effect could flip back to "settled" after this effect had already
    // torn down the timer that was waiting to redraw, leaving the connector
    // hidden indefinitely.
    const isMobileNow = window.matchMedia("(max-width: 750px)").matches;
    const justClosedOnMobile = isMobileNow && wasPanelOpenRef.current && !isPanelOpen;
    wasPanelOpenRef.current = isPanelOpen;

    let settleTimeoutId = 0;
    if (isMobileNow && isPanelOpen) {
      hide(connectionRef.current);
    } else if (justClosedOnMobile) {
      // Give the tray's slide-closed CSS transition time to finish before
      // measuring final positions, instead of drawing mid-animation.
      hide(connectionRef.current);
      settleTimeoutId = window.setTimeout(schedule, 220);
    } else {
      schedule();
    }

    window.addEventListener("resize", schedule);
    window.addEventListener("scroll", schedule, true);
    const resizeObserver = new ResizeObserver(schedule);
    [layoutRef.current, topicDetailRef.current, paneRef.current].forEach(
      (el) => el && resizeObserver.observe(el)
    );
    return () => {
      window.cancelAnimationFrame(frameId);
      window.clearTimeout(settleTimeoutId);
      window.removeEventListener("resize", schedule);
      window.removeEventListener("scroll", schedule, true);
      resizeObserver.disconnect();
    };
  }, [effectiveSelectedId, entries.length, slotMinutes, isPanelOpen]);

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

  const renderInsertionCursor = (entry: Entry, isTrailing: boolean) => {
    if (!isOfficer) return null;
    const topicId = entry.topic.id;
    const insertionTop =
      entry.displayTopPx + entry.displayHeightPx + AGENDA_EVENT_GAP_PX;
    const isAddingHere = addingAfterTopicId === topicId;
    const isHoveredHere = hoveredInsertionAfterTopicId === topicId;
    // The trailing slot (after the last topic) is the golden path for
    // building an agenda — most topics get added there, in order — so it
    // stays permanently visible and sized like a real timeline item instead
    // of the thin hover-reveal strip used between existing topics.
    const baseHeightPx = isTrailing
      ? AGENDA_ADD_AT_END_HEIGHT_PX
      : AGENDA_INSERTION_RESERVED_HEIGHT_PX;
    return (
      <div
        key={`insert:${topicId}`}
        className={`minutes-agenda-insertion-slot${isTrailing ? " is-trailing" : ""}${isAddingHere ? " is-open" : ""}${isHoveredHere ? " is-hovered" : ""}`}
        style={insertionCursorStyle(insertionTop, baseHeightPx)}
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
          aria-label={
            isTrailing
              ? "Add topic"
              : `Add topic after ${entry.topic.title}`
          }
          onClick={() => {
            setAddingAfterTopicId(topicId);
            setHoveredInsertionAfterTopicId(topicId);
          }}
        >
          <span aria-hidden="true">+</span>
          {isTrailing && <span>Add Topic</span>}
        </button>
        {isAddingHere && renderAddTopicForm(insertionFormStyle(baseHeightPx), false)}
      </div>
    );
  };

  if (!isEditingAgenda || !isOfficer) {
    return (
      <div className="plan-agenda-view">
        <div className="plan-agenda-view-header">
          <h2>Agenda</h2>
        </div>
        {entries.length === 0 ? (
          <p className="minutes-hint">No topics have been scheduled yet.</p>
        ) : (
          <ol className="minutes-list plan-agenda-view-list">
            {entries.map((entry) => (
              <li key={entry.topic.id} className="minutes-item">
                <div className="minutes-item-header">
                  <span className="minutes-item-title">{entry.topic.title}</span>
                  <span className="minutes-item-duration">
                    {formatAgendaTime(entry.start)} – {formatAgendaTime(entry.end)}
                    {" · "}
                    {formatMinuteCount(entry.durationMinutes)}
                  </span>
                </div>
                {entry.topic.outcome && (
                  <div className="minutes-item-notes">{entry.topic.outcome}</div>
                )}
                {entry.topic.details && (
                  <div className="plan-details-display">
                    {renderMarkdownBlocks(entry.topic.details)}
                  </div>
                )}
                {!privateNotes.isLoading && (
                  <PrivateNoteEditor
                    initialText={privateNotes.getNote(
                      getCanonicalTopicId(entry.topic)
                    )}
                    onSave={(text) =>
                      void privateNotes.saveNote(
                        getCanonicalTopicId(entry.topic),
                        text
                      )
                    }
                  />
                )}
              </li>
            ))}
          </ol>
        )}
      </div>
    );
  }

  return (
    <div className="meeting-minutes plan-agenda-layout" ref={layoutRef}>
      <svg className="minutes-agenda-connections" aria-hidden="true" focusable="false">
        <path ref={connectionRef} className="minutes-agenda-connection-line is-active is-hidden" />
      </svg>
      <div className="minutes-topic-main">
        <div className="plan-edit-mode-bar">
          <span className="plan-edit-mode-label">Editing Agenda</span>
        </div>
        {children}
        <section ref={topicDetailRef} className="minutes-section minutes-topic-detail-section">
          {selectedTopic && isOfficer && (
            <button
              className="plan-topic-delete"
              onClick={handleDeleteSelected}
              aria-label="Delete Topic"
              title="Delete Topic"
            >
              <MdDelete />
            </button>
          )}
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
                    className="plan-duration-display"
                    autoFocus
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
              {(selectedTopic.details || isOfficer) && (
                <div className="plan-detail-details">
                  <h4>Details</h4>
                  {isEditingDetails ? (
                    <form
                      className="plan-details-form"
                      onSubmit={(e) => {
                        e.preventDefault();
                        void updateTopic({
                          meetingId: meeting.id,
                          list: "plannedAgenda",
                          topicId: selectedTopic.id,
                          details: draftDetails,
                        });
                        setIsEditingDetails(false);
                      }}
                    >
                      <div className="minutes-form-row">
                        <label htmlFor="plan-topic-details">
                          Supports **bold**, *italic*, [link](url), and "- " bullet lists
                        </label>
                        <textarea
                          id="plan-topic-details"
                          rows={4}
                          autoFocus
                          value={draftDetails}
                          onChange={(e) => setDraftDetails(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Escape") setIsEditingDetails(false);
                          }}
                        />
                      </div>
                      <div className="minutes-actions">
                        <button type="submit" className="btn-primary">
                          Save
                        </button>
                        <button
                          type="button"
                          className="btn-secondary"
                          onClick={() => setIsEditingDetails(false)}
                        >
                          Cancel
                        </button>
                      </div>
                    </form>
                  ) : selectedTopic.details ? (
                    <>
                      <div className="plan-details-display">
                        {renderMarkdownBlocks(selectedTopic.details)}
                      </div>
                      {isOfficer && (
                        <button
                          className="btn-small btn-secondary"
                          onClick={() => {
                            setDraftDetails(selectedTopic.details ?? "");
                            setIsEditingDetails(true);
                          }}
                        >
                          Edit Details
                        </button>
                      )}
                    </>
                  ) : (
                    isOfficer && (
                      <button
                        className="btn-small btn-secondary"
                        onClick={() => {
                          setDraftDetails("");
                          setIsEditingDetails(true);
                        }}
                      >
                        + Add Details
                      </button>
                    )
                  )}
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
            <span aria-hidden="true">{isPanelOpen ? "<<" : ">>"}</span>
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
            {entries.map((entry, index) =>
              renderInsertionCursor(entry, index === entries.length - 1)
            )}
          </div>
        )}
      </aside>
    </div>
  );
};
