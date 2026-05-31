import { DraftTopic, Meeting, PendingNote, Topic } from "../schema";

export type { PendingNote };

const nextLocalId = () =>
  Math.random().toString(36).slice(2) + Date.now().toString(36);

export type MeetingShadow = {
  draftTopics: DraftTopic[];
};

export const startMeeting = () => {
  throw new Error("startMeeting is now a Convex mutation");
};

export const getCurrentLiveTopic = (meeting: Meeting): Topic | null => {
  const currentIndex = meeting.minutes.length;
  return meeting.liveAgenda[currentIndex] ?? null;
};

export const advanceTopic = () => {
  throw new Error("advanceTopic is now a Convex mutation");
};

export const skipTopic = () => {
  throw new Error("skipTopic is now a Convex mutation");
};

export const addLiveTopic = () => {
  throw new Error("addLiveTopic is now a Convex mutation");
};

export const deferCurrentAndActivate = () => {
  throw new Error("deferCurrentAndActivate is now a Convex mutation");
};

export const computeProjectedEndTime = (meeting: Meeting): Date | null => {
  if (!meeting.liveStartTime) return null;
  const minutesDone = meeting.minutes.reduce(
    (sum, minute) => sum + (minute.durationMinutes ?? 0),
    0
  );
  const currentIndex = meeting.minutes.length;
  const remainingTopics = meeting.liveAgenda
    .slice(currentIndex)
    .filter((topic) => !topic.cancelled && !topic.deferred);
  const minutesRemaining = remainingTopics.reduce(
    (sum, topic) => sum + (topic.durationMinutes ?? 0),
    0
  );
  return new Date(
    meeting.liveStartTime.getTime() +
      (minutesDone + minutesRemaining) * 60 * 1000
  );
};

export const computePlannedEndTime = (meeting: Meeting): Date | null => {
  const totalMinutes = meeting.plannedAgenda.reduce(
    (sum, topic) => sum + (topic.durationMinutes ?? 0),
    0
  );
  return new Date(meeting.date.getTime() + totalMinutes * 60 * 1000);
};

export const createDraftTopic = (
  meetingShadow: MeetingShadow,
  anchor?: { topic: Topic; index: number }
) => {
  const draftTopic: DraftTopic = {
    id: nextLocalId(),
    isDraft: true,
    title: "",
    anchor: anchor?.topic,
    anchorIndex: anchor?.index,
  };
  meetingShadow.draftTopics.push(draftTopic);
  return draftTopic;
};

export const deleteDraftTopic = (
  draftTopic: DraftTopic,
  meetingShadow: MeetingShadow
) => {
  const draftTopicIndex = meetingShadow.draftTopics.findIndex(
    (topic) => topic.id === draftTopic.id
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
  void meeting;
  void draftTopic;
  void meetingShadow;
  throw new Error("publishDraftTopic is now handled by a Convex mutation");
};

export const getTopicListWithDrafts = (
  topicList: Topic[],
  meetingShadow: MeetingShadow
) => {
  if (!meetingShadow.draftTopics || meetingShadow.draftTopics.length === 0) {
    return topicList;
  }
  const draftTopics: DraftTopic[] = meetingShadow.draftTopics;
  const topicsWithDrafts: Array<Topic | DraftTopic> = [];
  topicList.forEach((topic) => {
    topicsWithDrafts.push(topic);
    const anchoredDraftTopics = draftTopics.filter(
      (draftTopic: DraftTopic) => draftTopic.anchor?.id === topic.id
    );
    if (anchoredDraftTopics.length > 0) {
      topicsWithDrafts.push(...anchoredDraftTopics);
    }
  });
  draftTopics.forEach((draftTopic: DraftTopic) => {
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
