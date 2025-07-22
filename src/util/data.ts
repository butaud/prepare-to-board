import { co } from "jazz-tools";
import { DraftTopic, Meeting, MeetingShadow, Schema, Topic } from "../schema";

export const createDraftTopic = (
  meetingShadow: MeetingShadow,
  anchor?: { topic: Topic; index: number }
) => {
  const draftTopic = Schema.DraftTopic.create({
    isDraft: true,
    title: "",
    anchor: anchor?.topic,
    anchorIndex: anchor?.index,
  });
  meetingShadow.draftTopics.push(draftTopic);
  return draftTopic;
};

export const deleteDraftTopic = (
  draftTopic: DraftTopic,
  meetingShadow: MeetingShadow
) => {
  const draftTopicIndex = meetingShadow.draftTopics.findIndex(
    (topic) => topic?.id === draftTopic.id
  );
  if (draftTopicIndex !== -1) {
    meetingShadow.draftTopics.splice(draftTopicIndex, 1);
  }
};

export const publishDraftTopic = (
  meeting: Meeting,
  draftTopic: DraftTopic,
  meetingShadow: MeetingShadow
) => {
  deleteDraftTopic(draftTopic, meetingShadow);
  const topic = Schema.Topic.create(
    {
      title: draftTopic.title,
      plannedTopic: draftTopic.plannedTopic ?? undefined,
      durationMinutes: draftTopic.durationMinutes,
      outcome: draftTopic.outcome,
      cancelled: draftTopic.cancelled,
    },
    meeting._owner
  );

  const currentAnchorIndex =
    meeting.plannedAgenda?.findIndex(
      (topic) => topic?.id === draftTopic.anchor?.id
    ) ?? -1;
  const insertIndex =
    currentAnchorIndex !== -1
      ? currentAnchorIndex + 1
      : Math.max(
          draftTopic.anchorIndex ?? 0,
          meeting.plannedAgenda?.length ?? 0
        );
  meeting.plannedAgenda?.splice(insertIndex, 0, topic);
};

export const getTopicListWithDrafts = (
  topicList: co.loaded<typeof Schema.ListOfTopics, { $each: true }>,
  meetingShadow: MeetingShadow
) => {
  if (!meetingShadow.draftTopics || meetingShadow.draftTopics.length === 0) {
    return topicList;
  }
  const draftTopics = meetingShadow.draftTopics as DraftTopic[];
  const topicsWithDrafts: Topic[] = [];
  topicList.forEach((topic) => {
    topicsWithDrafts.push(topic);
    const anchoredDraftTopics = draftTopics.filter(
      (draftTopic) => draftTopic.anchor?.id === topic.id
    );
    if (anchoredDraftTopics.length > 0) {
      topicsWithDrafts.push(...anchoredDraftTopics);
    }
  });
  draftTopics.forEach((draftTopic) => {
    if (!topicsWithDrafts.find((topic) => topic.id === draftTopic.id)) {
      if (draftTopic.anchorIndex) {
        topicsWithDrafts.splice(draftTopic.anchorIndex + 1, 0, draftTopic);
      } else {
        topicsWithDrafts.push(draftTopic);
      }
    }
  });
  return topicsWithDrafts;
};
