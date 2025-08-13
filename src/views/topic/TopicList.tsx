import { DraftTopic, Meeting, Topic, topicIsDraft } from "../../schema";
import { FC } from "react";
import { TopicNode } from "../../ui/doc/TopicNode";
import {
  createDraftTopic,
  deleteDraftTopic,
  getTopicListWithDrafts,
  publishDraftTopic,
  startMinuteForTopic,
} from "../../util/data";
import { useLoadedAccount } from "../../hooks/Account";
import { useLoadMeetingShadow } from "../../hooks/Meeting";

import "./TopicList.css";
import {
  DragDropContext,
  Droppable,
  OnDragEndResponder,
} from "@hello-pangea/dnd";

export type TopicListProps = {
  topicList: Topic[];
  idsToOmit?: string[];
  meeting: Meeting;
  useDrafts?: boolean;
  allowMinutes?: boolean;
};

export const TopicList: FC<TopicListProps> = ({
  topicList,
  meeting,
  useDrafts,
  idsToOmit,
  allowMinutes,
}) => {
  const me = useLoadedAccount();
  const meetingShadow = useLoadMeetingShadow();

  if (!me || meetingShadow === undefined) {
    return <p>Loading...</p>;
  }
  const isOfficer = me?.canWrite(meeting);

  const handleDeleteClick = (topic: Topic) => {
    const index = topicList.findIndex((t) => t?.id === topic.id);
    if (index !== -1) {
      topicList.splice(index, 1);
    }
  };

  const handlePublishClick = (topic: DraftTopic) => {
    publishDraftTopic(meeting, topic, meetingShadow);
  };

  const handleCancelDraftTopic = (topic: DraftTopic) => {
    deleteDraftTopic(topic, meetingShadow);
  };

  const handleStartMinute = (topic: Topic) => {
    startMinuteForTopic(topic, meeting);
  };

  const topicListWithDrafts = useDrafts
    ? getTopicListWithDrafts(topicList, meetingShadow)
    : topicList;

  const onDragEnd: OnDragEndResponder<string> = (result) => {
    if (!result.destination) {
      return;
    }
    const sourceIndex = result.source.index;
    const destinationIndex = result.destination.index;
    if (sourceIndex === destinationIndex) {
      return;
    }
    const movedTopic = topicListWithDrafts[sourceIndex];
    topicListWithDrafts.splice(sourceIndex, 1);
    topicListWithDrafts.splice(destinationIndex, 0, movedTopic);
  };

  const lastTopicIndex = topicList.length - 1;
  const lastTopic = topicList[lastTopicIndex];

  const meetingStartTimes: Record<string, Date> = (() => {
    const startTimes: Record<string, Date> = {};
    let currentTime = new Date(meeting.date);
    topicListWithDrafts.forEach((topic) => {
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
              {topicListWithDrafts
                .filter((topic) => !idsToOmit?.includes(topic.id))
                .map((topic, index) => {
                  const currentTopicStartTime = meetingStartTimes[topic.id];
                  const node = (
                    <TopicNode
                      key={topic.id}
                      topic={topic}
                      index={index}
                      startTime={new Date(currentTopicStartTime)}
                      onDelete={
                        isOfficer ? () => handleDeleteClick(topic) : undefined
                      }
                      onPublish={
                        topicIsDraft(topic)
                          ? () => handlePublishClick(topic)
                          : undefined
                      }
                      onCancel={
                        topicIsDraft(topic)
                          ? () => handleCancelDraftTopic(topic)
                          : undefined
                      }
                      onStartMinute={
                        allowMinutes && !topicIsDraft(topic)
                          ? () => handleStartMinute(topic)
                          : undefined
                      }
                    />
                  );
                  return node;
                })}
              {provided.placeholder}
              {isOfficer && (
                <div className="add-topic">
                  <button
                    onClick={() => {
                      createDraftTopic(
                        meetingShadow,
                        lastTopic
                          ? {
                              topic: lastTopic,
                              index: topicList.findIndex(
                                (t) => t.id === lastTopic.id
                              ),
                            }
                          : undefined
                      );
                    }}
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
