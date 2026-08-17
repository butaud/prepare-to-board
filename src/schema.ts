export type Id = string;

export type Role = "admin" | "writer" | "reader";

export type TextNote = {
  id: Id;
  type: "text";
  text: string;
};

export type BoardMemberType = "board" | "administration" | "other";

export type BoardMember = {
  id: Id;
  name: string;
  email?: string;
  title?: string;
  accountId?: Id;
  type?: BoardMemberType;
};

export type ActionItemNote = {
  id: Id;
  type: "action_item";
  text: string;
  assignee: BoardMember;
  dueDate: number;
  completedOn?: number;
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
  details?: string;
};

export type DraftTopic = Topic & {
  isDraft: true;
  anchor?: Topic;
  anchorIndex?: number;
};

export const topicIsDraft = (topic: Topic | DraftTopic): topic is DraftTopic =>
  "isDraft" in topic;

// A topic's own `id` changes across its lifecycle: a live-agenda topic gets
// a freshly generated id (with `plannedTopicId` pointing back to the
// original), which then carries through unchanged onto its completed
// minute. This is the one id that's stable across planned -> live ->
// completed for the same topic, so private notes (and anything else that
// needs to follow a topic across the whole meeting) should key off this
// instead of the raw id.
export const getCanonicalTopicId = (topic: Topic): Id =>
  topic.plannedTopicId ?? topic.id;

export type Minute = {
  id: Id;
  topic: Topic;
  durationMinutes: number;
  notes?: Note[];
};

export type MeetingStatus = "draft" | "published" | "live" | "completed";

export type AttendanceEntry = {
  boardMemberId: Id;
  present: boolean;
};

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
  highlightedTopicId?: Id;
  expectedDurationMinutes?: number;
  agendaUpdatedAt?: number;
  viewedAt?: number;
  title?: string;
  subtitle?: string;
  location?: string;
  callerId?: Id;
  callerName?: string;
  attendance?: AttendanceEntry[];
};

export type NotificationType =
  | "agenda_published"
  | "minutes_shared"
  | "action_item_assigned";

export type AppNotification = {
  id: Id;
  type: NotificationType;
  meetingId?: Id;
  message: string;
  read: boolean;
  createdAt: Date;
};

export type CalendarItem = {
  id: Id;
  month: number; // 1 = January ... 12 = December
  text: string;
  completed: boolean;
};

export type Committee = {
  id: Id;
  name: string;
  type: string;
};

export type Organization = {
  id: Id;
  name: string;
  committeeDocUrl?: string;
  meetings: Meeting[];
  members: BoardMember[];
  memberships: Membership[];
  calendarItems: CalendarItem[];
  committees: Committee[];
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

export const isAgendaUpdatedSinceViewed = (meeting: Meeting): boolean =>
  meeting.status === "published" &&
  meeting.agendaUpdatedAt !== undefined &&
  (meeting.viewedAt === undefined || meeting.agendaUpdatedAt > meeting.viewedAt);

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
