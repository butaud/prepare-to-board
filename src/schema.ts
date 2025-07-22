import { co, Group, z } from "jazz-tools";

const TextNote = co.map({
  type: z.literal("text"),
  text: z.string(),
});
export type TextNote = co.loaded<typeof TextNote>;

const Note = co.discriminatedUnion("type", [TextNote]);
export type Note = co.loaded<typeof Note>;

const ListOfNotes = co.list(Note);
export type ListOfNotes = co.loaded<typeof ListOfNotes>;

const Topic = co.map({
  title: z.string(),
  outcome: z.optional(z.string()),
  durationMinutes: z.optional(z.number()),
  get plannedTopic(): z.ZodOptional<typeof Topic> {
    return co.optional(Topic);
  },
  cancelled: z.optional(z.boolean()),
});
export type Topic = co.loaded<typeof Topic>;

const ListOfTopics = co.list(Topic);
export type ListOfTopics = co.loaded<typeof ListOfTopics>;

const DraftTopic = co.map({
  ...Topic.def.shape,
  isDraft: z.literal(true),
  anchor: co.optional(Topic),
  anchorIndex: z.optional(z.number()),
});
export type DraftTopic = co.loaded<typeof DraftTopic>;
export const topicIsDraft = (
  topic: Topic | DraftTopic
): topic is DraftTopic => {
  return (topic as DraftTopic).isDraft !== undefined;
};

const ListOfDraftTopics = co.list(DraftTopic);
export type ListOfDraftTopics = co.loaded<typeof ListOfDraftTopics>;

const Minute = co.map({
  topic: Topic,
  durationMinutes: z.number(),
});
export type Minute = co.loaded<typeof Minute>;

const ListOfMinutes = co.list(Minute);
export type ListOfMinutes = co.loaded<typeof ListOfMinutes>;

const Meeting = co.map({
  date: z.date(),
  status: z.optional(z.literal(["draft", "published", "live", "completed"])),
  plannedAgenda: z.optional(ListOfTopics),
  liveAgenda: z.optional(ListOfTopics),
  minutes: z.optional(ListOfMinutes),
});
export type Meeting = co.loaded<typeof Meeting>;

const ListOfMeetings = co.list(Meeting);
export type ListOfMeetings = co.loaded<typeof ListOfMeetings>;

const MeetingShadow = co.map({
  meeting: Meeting,
  notes: ListOfNotes,
  draftTopics: ListOfDraftTopics,
});
export type MeetingShadow = co.loaded<typeof MeetingShadow>;

const ListOfMeetingShadows = co.list(MeetingShadow);
export type ListOfMeetingShadows = co.loaded<typeof ListOfMeetingShadows>;

const DraftMeeting = co.map({
  date: z.optional(z.date()),
});
export type DraftMeeting = co.loaded<typeof DraftMeeting>;
export const validateDraftMeeting = (draft: DraftMeeting): string[] => {
  const errors: string[] = [];
  if (draft.date === undefined) {
    errors.push("Date is required");
  }
  return errors;
};

const Organization = co.map({
  name: z.string(),
  meetings: ListOfMeetings,
});
export type Organization = co.loaded<typeof Organization>;

const DraftOrganization = co.map({
  name: z.optional(z.string()),
});
export type DraftOrganization = co.loaded<typeof DraftOrganization>;
export const validateDraftOrganization = (
  draft: DraftOrganization
): string[] => {
  const errors: string[] = [];
  if (draft.name === undefined || draft.name === "") {
    errors.push("Name is required");
  }
  return errors;
};

const ListOfOrganizations = co.list(Organization);
export type ListOfOrganizations = co.loaded<typeof ListOfOrganizations>;

const UserAccountRoot = co.map({
  organizations: ListOfOrganizations,
  selectedOrganization: co.optional(Organization),
  meetingShadows: ListOfMeetingShadows,
});
export type UserAccountRoot = co.loaded<typeof UserAccountRoot>;

const UserProfile = co
  .profile({
    title: z.string(),
  })
  .withMigration((profile) => {
    if (profile.title === undefined || profile.title === "") {
      profile.title = "Mr.";
    }
  });
export type UserProfile = co.loaded<typeof UserProfile>;

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

const UserAccount = co
  .account({
    root: UserAccountRoot,
    profile: UserProfile,
  })
  .withMigration((account, creationProps?: { name: string }) => {
    if (account.root === undefined) {
      account.root = UserAccountRoot.create({
        selectedOrganization: undefined,
        organizations: ListOfOrganizations.create([]),
        meetingShadows: ListOfMeetingShadows.create([]),
      });
    }

    if (account.profile === undefined) {
      const profileGroup = Group.create();
      profileGroup.makePublic();

      account.profile = UserProfile.create(
        {
          name: creationProps?.name || "John Doe",
          title: "Mr.",
        },
        profileGroup
      );
    }
  });
export type UserAccount = co.loaded<typeof UserAccount>;

export const Schema = {
  TextNote,
  Note,
  ListOfNotes,
  Topic,
  ListOfTopics,
  DraftTopic,
  ListOfDraftTopics,
  Minute,
  ListOfMinutes,
  Meeting,
  ListOfMeetings,
  MeetingShadow,
  ListOfMeetingShadows,
  DraftMeeting,
  Organization,
  DraftOrganization,
  ListOfOrganizations,
  UserAccountRoot,
  UserProfile,
  UserAccount,
};
