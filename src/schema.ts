import { co, Group, z } from "jazz-tools";

const JTextNote = co.map({
  type: z.literal("text"),
  text: z.string(),
});
export type TextNote = co.loaded<typeof JTextNote>;

const JNote = co.discriminatedUnion("type", [JTextNote]);
export type Note = co.loaded<typeof JNote>;

const JListOfNotes = co.list(JNote);
export type ListOfNotes = co.loaded<typeof JListOfNotes>;

const JTopic = co.map({
  title: z.string(),
  outcome: z.optional(z.string()),
  durationMinutes: z.optional(z.number()),
  get plannedTopic(): z.ZodOptional<typeof JTopic> {
    return co.optional(JTopic);
  },
  cancelled: z.optional(z.boolean()),
});
export type Topic = co.loaded<typeof JTopic>;

const JListOfTopics = co.list(JTopic);
export type ListOfTopics = co.loaded<typeof JListOfTopics>;

const JDraftTopic = co.map({
  ...JTopic.def.shape,
  isDraft: z.literal(true),
  anchor: co.optional(JTopic),
  anchorIndex: z.optional(z.number()),
});
export type DraftTopic = co.loaded<typeof JDraftTopic>;
export const topicIsDraft = (
  topic: Topic | DraftTopic
): topic is DraftTopic => {
  return (topic as DraftTopic).isDraft !== undefined;
};

const JListOfDraftTopics = co.list(JDraftTopic);
export type ListOfDraftTopics = co.loaded<typeof JListOfDraftTopics>;

const JMinute = co.map({
  topic: JTopic,
  durationMinutes: z.number(),
});
export type Minute = co.loaded<typeof JMinute>;

const JListOfMinutes = co.list(JMinute);
export type ListOfMinutes = co.loaded<typeof JListOfMinutes>;

const JMeeting = co
  .map({
    date: z.date(),
    status: z.literal(["draft", "published", "live", "completed"]),
    plannedAgenda: co.optional(JListOfTopics),
    liveAgenda: co.optional(JListOfTopics),
    minutes: co.optional(JListOfMinutes),
  })
  .withMigration((meeting) => {
    if (meeting.status === undefined) {
      meeting.status = "draft";
    }
  });
export type Meeting = co.loaded<
  typeof JMeeting,
  {
    plannedAgenda: { $each: { plannedTopic: true } };
    liveAgenda: { $each: { plannedTopic: true } };
    minutes: { $each: { topic: true } };
  }
>;
export const getMeetingDisplayStatus = (meeting: Meeting) => {
  if (meeting.status === "draft") return "Draft";
  if (meeting.status === "published") return "Scheduled";
  if (meeting.status === "live") return "Live";
  if (meeting.status === "completed") return "Completed";
  return "Unknown" as never;
};

const JListOfMeetings = co.list(JMeeting);
export type ListOfMeetings = co.loaded<typeof JListOfMeetings>;

const JMeetingShadow = co.map({
  meeting: JMeeting,
  notes: JListOfNotes,
  draftTopics: JListOfDraftTopics,
});
export type MeetingShadow = co.loaded<
  typeof JMeetingShadow,
  {
    draftTopics: true;
  }
>;

const JListOfMeetingShadows = co.list(JMeetingShadow);
export type ListOfMeetingShadows = co.loaded<typeof JListOfMeetingShadows>;

const JDraftMeeting = co.map({
  date: z.optional(z.date()),
});
export type DraftMeeting = co.loaded<typeof JDraftMeeting>;
export const validateDraftMeeting = (draft: DraftMeeting): string[] => {
  const errors: string[] = [];
  if (draft.date === undefined) {
    errors.push("Date is required");
  }
  return errors;
};

const JOrganization = co.map({
  name: z.string(),
  meetings: JListOfMeetings,
});
export type Organization = co.loaded<typeof JOrganization>;

const JDraftOrganization = co.map({
  name: z.optional(z.string()),
});
export type DraftOrganization = co.loaded<typeof JDraftOrganization>;
export const validateDraftOrganization = (
  draft: DraftOrganization
): string[] => {
  const errors: string[] = [];
  if (draft.name === undefined || draft.name === "") {
    errors.push("Name is required");
  }
  return errors;
};

const JListOfOrganizations = co.list(JOrganization);
export type ListOfOrganizations = co.loaded<typeof JListOfOrganizations>;

const JUserAccountRoot = co.map({
  organizations: JListOfOrganizations,
  selectedOrganization: co.optional(JOrganization),
  meetingShadows: JListOfMeetingShadows,
});
export type UserAccountRoot = co.loaded<typeof JUserAccountRoot>;

const JUserProfile = co
  .profile({
    title: z.string(),
  })
  .withMigration((profile) => {
    if (profile.title === undefined || profile.title === "") {
      profile.title = "Mr.";
    }
  });
export type UserProfile = co.loaded<typeof JUserProfile>;

export const getUserProfileFirstName = (
  profile: UserProfile | undefined
): string | undefined => {
  return profile?.name.split(" ")[0];
};
export const getUserProfileLastName = (
  profile: UserProfile | undefined
): string | undefined => {
  return profile?.name.split(" ")[1];
};
export const getUserProfileInitials = (
  profile: UserProfile | undefined
): string | undefined => {
  const first = getUserProfileFirstName(profile)?.charAt(0);
  const last = getUserProfileLastName(profile)?.charAt(0);
  if (first && last) return first + last;
  return undefined;
};
export const getUserProfileFormalName = (
  profile: UserProfile | undefined
): string | undefined => {
  if (!profile) return undefined;
  const lastName = getUserProfileLastName(profile);
  if (!lastName) return undefined;
  return `${profile.title} ${lastName}`;
};

const JUserAccount = co
  .account({
    root: JUserAccountRoot,
    profile: JUserProfile,
  })
  .withMigration((account, creationProps?: { name: string }) => {
    if (account.root === undefined) {
      account.root = JUserAccountRoot.create({
        selectedOrganization: undefined,
        organizations: JListOfOrganizations.create([]),
        meetingShadows: JListOfMeetingShadows.create([]),
      });
    }

    if (account.profile === undefined) {
      const profileGroup = Group.create();
      profileGroup.makePublic();

      account.profile = JUserProfile.create(
        {
          name: creationProps?.name || "John Doe",
          title: "Mr.",
        },
        profileGroup
      );
    }
  });
export type UserAccount = co.loaded<typeof JUserAccount>;

export const Schema = {
  TextNote: JTextNote,
  Note: JNote,
  ListOfNotes: JListOfNotes,
  Topic: JTopic,
  ListOfTopics: JListOfTopics,
  DraftTopic: JDraftTopic,
  ListOfDraftTopics: JListOfDraftTopics,
  Minute: JMinute,
  ListOfMinutes: JListOfMinutes,
  Meeting: JMeeting,
  ListOfMeetings: JListOfMeetings,
  MeetingShadow: JMeetingShadow,
  ListOfMeetingShadows: JListOfMeetingShadows,
  DraftMeeting: JDraftMeeting,
  Organization: JOrganization,
  DraftOrganization: JDraftOrganization,
  ListOfOrganizations: JListOfOrganizations,
  UserAccountRoot: JUserAccountRoot,
  UserProfile: JUserProfile,
  UserAccount: JUserAccount,
};
