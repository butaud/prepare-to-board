import { co } from "jazz-tools";
import { DraftTopic, Meeting, Schema, Topic } from "../schema";

type AccountWithMeetingShadows = co.loaded<
  typeof Schema.UserAccount,
  {
    root: {
      meetingShadows: {
        $each: {
          meeting: true;
          notes: true;
          draftTopics: true;
        };
      };
    };
  }
>;
export const createDraftTopic = (
  me: AccountWithMeetingShadows,
  meeting: Meeting,
  anchor?: { topic: Topic; index: number }
) => {
  const draftTopic = Schema.DraftTopic.create({
    isDraft: true,
    title: "",
    anchor: anchor?.topic,
    anchorIndex: anchor?.index,
  });

  let meetingShadow = me.root.meetingShadows.find(
    (shadow) => shadow.meeting.id === meeting.id
  );
  if (!meetingShadow) {
    meetingShadow = Schema.MeetingShadow.create({
      meeting: meeting,
      notes: Schema.ListOfNotes.create([]),
      draftTopics: Schema.ListOfDraftTopics.create([]),
    }) as AccountWithMeetingShadows["root"]["meetingShadows"][0];
    me.root.meetingShadows.push(meetingShadow);
  }
  meetingShadow.draftTopics.push(draftTopic);
  return draftTopic;
};

export const deleteDraftTopic = (
  me: AccountWithMeetingShadows,
  meeting: Meeting,
  draftTopic: DraftTopic
) => {
  const meetingShadow = me.root.meetingShadows.find(
    (shadow) => shadow.meeting.id === meeting.id
  );
  if (!meetingShadow) {
    return;
  }
  const draftTopicIndex = meetingShadow.draftTopics.findIndex(
    (topic) => topic?.id === draftTopic.id
  );
  if (draftTopicIndex !== -1) {
    meetingShadow.draftTopics.splice(draftTopicIndex, 1);
  }
};

export const publishDraftTopic = (
  me: AccountWithMeetingShadows,
  meeting: Meeting,
  draftTopic: DraftTopic
) => {
  const meetingShadow = me.root.meetingShadows.find(
    (shadow) => shadow.meeting.id === meeting.id
  );
  if (!meetingShadow) {
    return;
  }
  deleteDraftTopic(me, meeting, draftTopic);
  const topic = Schema.Topic.create(
    {
      title: draftTopic.title,
      plannedTopic: draftTopic.plannedTopic ?? undefined,
      durationMinutes: draftTopic.durationMinutes,
      outcome: draftTopic.outcome,
      cancelled: draftTopic.cancelled,
    },
    meetingShadow.meeting._owner
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

type ResolvedMeetingShadowList = co.loaded<
  typeof Schema.ListOfMeetingShadows,
  {
    $each: {
      meeting: true;
      notes: true;
      draftTopics: { $each: { anchor: true } };
    };
  }
>;

export const getTopicListWithDrafts = (
  topicList: co.loaded<typeof Schema.ListOfTopics, { $each: true }>,
  meeting: Meeting,
  meetingShadows: ResolvedMeetingShadowList
) => {
  const meetingShadow = meetingShadows.find(
    (shadow) => shadow.meeting.id === meeting.id
  );
  if (
    !meetingShadow ||
    !meetingShadow.draftTopics ||
    meetingShadow.draftTopics.length === 0
  ) {
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
