export type Id = string;

export type Role = "admin" | "writer" | "reader";

export type TextNote = {
  id: Id;
  type: "text";
  text: string;
};

export type BoardMember = {
  id: Id;
  name: string;
  email?: string;
  title?: string;
  accountId?: Id;
};

export type ActionItemNote = {
  id: Id;
  type: "action_item";
  text: string;
  assignee?: BoardMember;
};

export type MotionNote = {
  id: Id;
  type: "motion";
  text: string;
  mover: string;
  seconder?: string;
  moverMember?: BoardMember;
  seconderMember?: BoardMember;
  votesFor?: number;
  votesAgainst?: number;
  votesAbstain?: number;
  status: "proposed" | "under_discussion" | "passed" | "failed" | "tabled";
};

export type Note = TextNote | ActionItemNote | MotionNote;
export type PendingNote =
  | Omit<TextNote, "id">
  | Omit<ActionItemNote, "id">
  | Omit<MotionNote, "id">;

export type Topic = {
  id: Id;
  title: string;
  outcome?: string;
  durationMinutes?: number;
  plannedTopic?: Topic;
  plannedTopicId?: Id;
  cancelled?: boolean;
  deferred?: boolean;
};

export type DraftTopic = Topic & {
  isDraft: true;
  anchor?: Topic;
  anchorIndex?: number;
};

export const topicIsDraft = (topic: Topic | DraftTopic): topic is DraftTopic =>
  "isDraft" in topic;

export type Minute = {
  id: Id;
  topic: Topic;
  durationMinutes: number;
  notes?: Note[];
};

export type MeetingStatus = "draft" | "published" | "live" | "completed";

export type Meeting = {
  id: Id;
  organizationId: Id;
  date: Date;
  status: MeetingStatus;
  plannedAgenda: Topic[];
  liveAgenda: Topic[];
  minutes: Minute[];
  liveStartTime?: Date;
  currentNotes?: Note[];
};

export type Organization = {
  id: Id;
  name: string;
  meetings: Meeting[];
  members: BoardMember[];
  memberships: Membership[];
};

export type Membership = {
  userId: Id;
  name: string;
  role: Role;
};

export type UserProfile = {
  name: string;
  title: string;
};

export type UserAccount = {
  id: Id;
  profile: UserProfile;
  root: {
    organizations: Organization[];
    selectedOrganization?: Organization;
  };
  canWrite: (entity?: { organizationId?: Id; id?: Id } | null) => boolean;
  canAdmin: (entity?: { organizationId?: Id; id?: Id } | null) => boolean;
};

export type DraftMeeting = {
  date?: Date;
};

export type DraftOrganization = {
  name?: string;
};

export const validateDraftMeeting = (draft: DraftMeeting): string[] => {
  const errors: string[] = [];
  if (draft.date === undefined) errors.push("Date is required");
  return errors;
};

export const validateDraftOrganization = (
  draft: DraftOrganization
): string[] => {
  const errors: string[] = [];
  if (draft.name === undefined || draft.name === "") {
    errors.push("Name is required");
  }
  return errors;
};

export const getMeetingDisplayStatus = (meeting: Meeting) => {
  if (meeting.status === "draft") return "Draft";
  if (meeting.status === "published") return "Scheduled";
  if (meeting.status === "live") return "Live";
  if (meeting.status === "completed") return "Completed";
  return "Unknown" as never;
};

export const getUserProfileFirstName = (
  profile: UserProfile | undefined
): string | undefined => profile?.name.split(" ")[0];

export const getUserProfileLastName = (
  profile: UserProfile | undefined
): string | undefined => profile?.name.split(" ")[1];

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
