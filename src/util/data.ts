import { co } from "jazz-tools";
import { DraftTopic, Meeting, MeetingShadow, Schema, Topic } from "../schema";

type PendingNote =
  | { type: "text"; text: string }
  | { type: "action_item"; text: string; assignee?: string }
  | { type: "motion"; text: string; mover: string; seconder?: string; status: "proposed" | "under_discussion" | "passed" | "failed" | "tabled" };
export type { PendingNote };

export const startMeeting = (meeting: Meeting) => {
  const liveTopics = (meeting.plannedAgenda ?? [])
    .filter((t) => t !== null)
    .map((plannedTopic) =>
      Schema.Topic.create(
        {
          title: plannedTopic!.title,
          durationMinutes: plannedTopic!.durationMinutes,
          outcome: plannedTopic!.outcome,
          cancelled: plannedTopic!.cancelled,
          plannedTopic: plannedTopic!,
        },
        meeting._owner
      )
    );
  meeting.liveAgenda = Schema.ListOfTopics.create(liveTopics, meeting._owner);
  meeting.minutes = Schema.ListOfMinutes.create([], meeting._owner);
  meeting.liveStartTime = new Date();
  meeting.status = "live";
};

export const getCurrentLiveTopic = (meeting: Meeting): Topic | null => {
  if (!meeting.liveAgenda || !meeting.minutes) return null;
  const currentIndex = meeting.minutes.length;
  return meeting.liveAgenda[currentIndex] ?? null;
};

export const advanceTopic = (
  meeting: Meeting,
  actualDurationMinutes: number,
  notes?: string,
  pendingNotes?: PendingNote[]
) => {
  if (!meeting.liveAgenda || !meeting.minutes) return;
  const currentIndex = meeting.minutes.length;
  const currentLiveTopic = meeting.liveAgenda[currentIndex];
  if (!currentLiveTopic) return;
  if (notes !== undefined) {
    currentLiveTopic.outcome = notes;
  }
  const minute = Schema.Minute.create(
    {
      topic: currentLiveTopic,
      durationMinutes: actualDurationMinutes,
    },
    meeting._owner
  );
  if (pendingNotes && pendingNotes.length > 0) {
    const noteObjects = pendingNotes.map((pn) => {
      if (pn.type === "text") {
        return Schema.TextNote.create({ type: "text", text: pn.text }, meeting._owner);
      } else if (pn.type === "action_item") {
        return Schema.ActionItemNote.create(
          { type: "action_item", text: pn.text, assignee: pn.assignee },
          meeting._owner
        );
      } else {
        return Schema.MotionNote.create(
          { type: "motion", text: pn.text, mover: pn.mover, seconder: pn.seconder, status: pn.status },
          meeting._owner
        );
      }
    });
    minute.notes = Schema.ListOfNotes.create(noteObjects, meeting._owner);
  }
  meeting.minutes.push(minute);
};

export const skipTopic = (meeting: Meeting) => {
  if (!meeting.liveAgenda || !meeting.minutes) return;
  const currentIndex = meeting.minutes.length;
  const currentTopic = meeting.liveAgenda[currentIndex];
  if (!currentTopic) return;
  // Defer rather than cancel: move to end so the next remaining topic becomes
  // active, and show it in the Deferred list for possible retrieval.
  currentTopic.deferred = true;
  meeting.liveAgenda.splice(currentIndex, 1);
  meeting.liveAgenda.push(currentTopic);
};

export const addLiveTopic = (
  meeting: Meeting,
  title: string,
  durationMinutes: number
) => {
  if (!meeting.liveAgenda) return;
  const topic = Schema.Topic.create(
    {
      title,
      durationMinutes,
    },
    meeting._owner
  );
  meeting.liveAgenda.push(topic);
};

export const computeProjectedEndTime = (meeting: Meeting): Date | null => {
  if (!meeting.liveStartTime) return null;
  const minutesDone = (meeting.minutes ?? [])
    .filter((m) => m !== null)
    .reduce((sum, m) => sum + (m!.durationMinutes ?? 0), 0);
  const currentIndex = (meeting.minutes ?? []).filter((m) => m !== null).length;
  const remainingTopics = (meeting.liveAgenda ?? [])
    .filter((t) => t !== null)
    .slice(currentIndex)
    .filter((t) => !t!.cancelled && !t!.deferred);
  const minutesRemaining = remainingTopics.reduce(
    (sum, t) => sum + (t!.durationMinutes ?? 0),
    0
  );
  return new Date(
    meeting.liveStartTime.getTime() +
      (minutesDone + minutesRemaining) * 60 * 1000
  );
};

// Make a remaining topic immediately active, deferring the current active topic.
// The deferred topic goes back into the remaining pool (shown separately) and
// can be made active again later.
export const deferCurrentAndActivate = (
  meeting: Meeting,
  targetTopic: Topic
) => {
  const liveAgenda = meeting.liveAgenda;
  if (!liveAgenda) return;
  const currentIndex = (meeting.minutes ?? []).filter((m) => m !== null).length;
  const currentTopic = liveAgenda[currentIndex];
  if (!currentTopic) return;

  const targetIndex = liveAgenda.findIndex((t) => t?.id === targetTopic.id);
  if (targetIndex === -1) return;

  // Mark the currently active topic as deferred
  currentTopic.deferred = true;
  // Clear deferred on the incoming topic (in case it was deferred before)
  targetTopic.deferred = false;

  // Rearrange so that: target moves to currentIndex, deferred topic moves to
  // the end (so it doesn't become active automatically when the next topic
  // completes — it only comes back when explicitly made active again).
  //
  // Step 1: remove currentTopic from currentIndex.
  //   targetIndex > currentIndex, so it shifts down by 1.
  liveAgenda.splice(currentIndex, 1);
  // Step 2: remove target from its shifted position.
  liveAgenda.splice(targetIndex - 1, 1);
  // Step 3: insert target at currentIndex.
  liveAgenda.splice(currentIndex, 0, targetTopic);
  // Step 4: append the deferred topic at the end.
  liveAgenda.push(currentTopic);
};

export const computePlannedEndTime = (meeting: Meeting): Date | null => {
  if (!meeting.date) return null;
  const totalMinutes = (meeting.plannedAgenda ?? [])
    .filter((t) => t !== null)
    .reduce((sum, t) => sum + (t!.durationMinutes ?? 0), 0);
  return new Date(meeting.date.getTime() + totalMinutes * 60 * 1000);
};

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
