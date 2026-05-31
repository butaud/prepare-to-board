import { FC } from "react";
import { TopicNode } from "../../ui/doc/TopicNode";
import { useMutation } from "convex/react";
import { Meeting, Topic } from "../../schema";
import { useLoadedAccount } from "../../hooks/Account";
import { api } from "../../convexClient";

import "./TopicList.css";
import {
  DragDropContext,
  Droppable,
  OnDragEndResponder,
} from "@hello-pangea/dnd";

export type TopicListProps = {
  topicList: Topic[];
  meeting: Meeting;
  useDrafts?: boolean;
  lockedCount?: number;
};

export const TopicList: FC<TopicListProps> = ({
  topicList,
  meeting,
  lockedCount = 0,
}) => {
  const me = useLoadedAccount();
  const addTopic = useMutation(api.app.addTopic);
  const deleteTopic = useMutation(api.app.deleteTopic);
  const updateTopic = useMutation(api.app.updateTopic);
  const reorderTopics = useMutation(api.app.reorderTopics);

  const isOfficer = me.canWrite(meeting);

  const onDragEnd: OnDragEndResponder<string> = (result) => {
    if (!result.destination) return;
    const sourceIndex = result.source.index;
    const destinationIndex = result.destination.index;
    if (sourceIndex === destinationIndex) return;
    const nextTopics = [...topicList];
    const [movedTopic] = nextTopics.splice(sourceIndex, 1);
    nextTopics.splice(destinationIndex, 0, movedTopic);
    void reorderTopics({
      meetingId: meeting.id,
      list: "plannedAgenda",
      topicIds: nextTopics.map((topic) => topic.id),
    });
  };

  const lastTopicIndex = topicList.length - 1;
  const lastTopic = topicList[lastTopicIndex];

  const meetingStartTimes: Record<string, Date> = (() => {
    const startTimes: Record<string, Date> = {};
    let currentTime = new Date(meeting.date);
    topicList.forEach((topic) => {
      startTimes[topic.id] = new Date(currentTime);
      if (topic.durationMinutes) {
        currentTime = new Date(
          currentTime.getTime() + topic.durationMinutes * 60 * 1000
        );
      }
    });
    return startTimes;
  })();

  return (
    <div className="topic-list">
      <h3>Topics</h3>
      <DragDropContext onDragEnd={onDragEnd}>
        <Droppable droppableId="topic-list">
          {(provided, snapshot) => (
            <div
              className={[
                "topic-list-container",
                snapshot.isDraggingOver ? "dragging-over" : "",
              ].join(" ")}
              ref={provided.innerRef}
              {...provided.droppableProps}
            >
              {topicList.map((topic, index) => {
                const currentTopicStartTime = meetingStartTimes[topic.id];
                const isLocked = index < lockedCount;
                return (
                  <TopicNode
                    key={topic.id}
                    topic={topic}
                    index={index}
                    startTime={new Date(currentTopicStartTime)}
                    locked={isLocked}
                    canEdit={isOfficer}
                    onUpdate={
                      isOfficer
                        ? (patch) =>
                            void updateTopic({
                              meetingId: meeting.id,
                              list: "plannedAgenda",
                              topicId: topic.id,
                              ...patch,
                            })
                        : undefined
                    }
                    onDelete={
                      isOfficer && !isLocked
                        ? () =>
                            void deleteTopic({
                              meetingId: meeting.id,
                              list: "plannedAgenda",
                              topicId: topic.id,
                            })
                        : undefined
                    }
                  />
                );
              })}
              {provided.placeholder}
              {isOfficer && (
                <div className="add-topic">
                  <button
                    onClick={() =>
                      void addTopic({
                        meetingId: meeting.id,
                        list: "plannedAgenda",
                        title: "New Topic",
                        durationMinutes: lastTopic?.durationMinutes ?? 5,
                      })
                    }
                  >
                    Add Topic
                  </button>
                </div>
              )}
              {topicList.length === 0 && (
                <div>No topics have been scheduled yet.</div>
              )}
            </div>
          )}
        </Droppable>
      </DragDropContext>
    </div>
  );
};
