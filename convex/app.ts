import { ConvexError, v } from "convex/values";
import { mutation, query, type MutationCtx, type QueryCtx } from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel";

const role = v.union(v.literal("admin"), v.literal("writer"), v.literal("reader"));
const id = () => Math.random().toString(36).slice(2) + Date.now().toString(36);

type Ctx = QueryCtx | MutationCtx;

const requireIdentity = async (ctx: Ctx) => {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new ConvexError("Not authenticated");
  return identity;
};

const getCurrentUser = async (ctx: Ctx) => {
  const identity = await requireIdentity(ctx);
  return await ctx.db
    .query("users")
    .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
    .unique();
};

const getOrCreateCurrentUser = async (ctx: MutationCtx, fallbackName?: string) => {
  const identity = await requireIdentity(ctx);
  const existing = await ctx.db
    .query("users")
    .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
    .unique();
  if (existing) return existing;

  const userId = await ctx.db.insert("users", {
    clerkId: identity.subject,
    name: fallbackName ?? identity.name ?? identity.email ?? "New User",
    title: "Mr.",
  });
  const user = await ctx.db.get(userId);
  if (!user) throw new ConvexError("Unable to initialize user");
  return user;
};

const requireUser = async (ctx: Ctx) => {
  const user = await getCurrentUser(ctx);
  if (!user) throw new ConvexError("User has not been initialized");
  return user;
};

const membershipFor = async (
  ctx: Ctx,
  organizationId: Id<"organizations">,
  userId: Id<"users">
) =>
  await ctx.db
    .query("memberships")
    .withIndex("by_org_user", (q) =>
      q.eq("organizationId", organizationId).eq("userId", userId)
    )
    .unique();

const normalizeEmail = (email?: string) => {
  const trimmed = email?.trim().toLowerCase();
  return trimmed || undefined;
};

const ensureBoardMemberForUser = async (
  ctx: MutationCtx,
  organizationId: Id<"organizations">,
  user: Doc<"users">,
  email?: string
) => {
  const members = await ctx.db
    .query("boardMembers")
    .withIndex("by_org", (q) => q.eq("organizationId", organizationId))
    .collect();
  if (members.some((member) => member.accountId === user._id)) return;

  const normalizedEmail = normalizeEmail(email);
  const matchingUnclaimedMember = normalizedEmail
    ? members.find(
        (member) =>
          !member.accountId && normalizeEmail(member.email) === normalizedEmail
      )
    : undefined;

  if (matchingUnclaimedMember) {
    await ctx.db.patch(matchingUnclaimedMember._id, { accountId: user._id });
    return;
  }

  await ctx.db.insert("boardMembers", {
    organizationId,
    name: user.name,
    email: normalizedEmail,
    accountId: user._id,
  });
};

const ensureBoardMembersForUser = async (
  ctx: MutationCtx,
  user: Doc<"users">,
  email?: string
) => {
  const memberships = await ctx.db
    .query("memberships")
    .withIndex("by_user", (q) => q.eq("userId", user._id))
    .collect();
  await Promise.all(
    memberships.map((membership) =>
      ensureBoardMemberForUser(ctx, membership.organizationId, user, email)
    )
  );
};

const requireRole = async (
  ctx: Ctx,
  organizationId: Id<"organizations">,
  roles: Array<"admin" | "writer" | "reader">
) => {
  const user = await requireUser(ctx);
  const membership = await membershipFor(ctx, organizationId, user._id);
  if (!membership || !roles.includes(membership.role)) {
    throw new ConvexError("Not authorized");
  }
  return { user, membership };
};

const noteArg = v.object({
  type: v.union(v.literal("text"), v.literal("action_item"), v.literal("motion")),
  text: v.string(),
  assigneeId: v.optional(v.string()),
  assigneeName: v.optional(v.string()),
  dueDate: v.optional(v.number()),
  completedOn: v.optional(v.number()),
  moverId: v.optional(v.string()),
  moverName: v.optional(v.string()),
  seconderId: v.optional(v.string()),
  seconderName: v.optional(v.string()),
  mover: v.optional(v.string()),
  seconder: v.optional(v.string()),
  votesFor: v.optional(v.number()),
  votesAgainst: v.optional(v.number()),
  votesAbstain: v.optional(v.number()),
  status: v.optional(
    v.union(
      v.literal("proposed"),
      v.literal("under_discussion"),
      v.literal("passed"),
      v.literal("failed"),
      v.literal("tabled")
    )
  ),
});

const serializeTopic = (
  topic: Doc<"meetings">["plannedAgenda"][number],
  planned: Doc<"meetings">["plannedAgenda"]
) => ({
  ...topic,
  plannedTopic: topic.plannedTopicId
    ? planned.find((candidate) => candidate.id === topic.plannedTopicId)
    : undefined,
});

const serializeNote = (note: NonNullable<Doc<"meetings">["currentNotes"]>[number], members: Doc<"boardMembers">[]) => ({
  id: note.id,
  type: note.type,
  text: note.text,
  assignee:
    note.assigneeId || note.assigneeName
      ? {
          id: note.assigneeId ?? note.assigneeName ?? id(),
          name:
            members.find((member) => member._id === note.assigneeId)?.name ??
            note.assigneeName ??
            "",
        }
      : undefined,
  dueDate: note.dueDate,
  completedOn: note.completedOn,
  mover: note.mover,
  seconder: note.seconder,
  votesFor: note.votesFor,
  votesAgainst: note.votesAgainst,
  votesAbstain: note.votesAbstain,
  moverMember:
    note.moverId || note.moverName
      ? {
          id: note.moverId ?? note.moverName ?? id(),
          name:
            members.find((member) => member._id === note.moverId)?.name ??
            note.moverName ??
            note.mover ??
            "",
        }
      : undefined,
  seconderMember:
    note.seconderId || note.seconderName
      ? {
          id: note.seconderId ?? note.seconderName ?? id(),
          name:
            members.find((member) => member._id === note.seconderId)?.name ??
            note.seconderName ??
            note.seconder ??
            "",
        }
      : undefined,
  status: note.status,
});

const serializeMeeting = async (
  ctx: Ctx,
  meeting: Doc<"meetings">,
  viewedAt?: number
) => {
  const members = await ctx.db
    .query("boardMembers")
    .withIndex("by_org", (q) => q.eq("organizationId", meeting.organizationId))
    .collect();
  const planned = meeting.plannedAgenda;
  return {
    id: meeting._id,
    organizationId: meeting.organizationId,
    date: meeting.date,
    status: meeting.status,
    plannedAgenda: planned.map((topic) => serializeTopic(topic, planned)),
    liveAgenda: meeting.liveAgenda.map((topic) => serializeTopic(topic, planned)),
    minutes: meeting.minutes.map((minute) => ({
      ...minute,
      topic: serializeTopic(minute.topic, planned),
      notes: minute.notes?.map((note) => serializeNote(note, members)),
    })),
    liveStartTime: meeting.liveStartTime,
    currentNotes: meeting.currentNotes?.map((note) => serializeNote(note, members)),
    highlightedTopicId: meeting.highlightedTopicId ?? meeting.focusedTopicId,
    expectedDurationMinutes: meeting.expectedDurationMinutes,
    agendaUpdatedAt: meeting.agendaUpdatedAt,
    viewedAt,
    title: meeting.title,
    subtitle: meeting.subtitle,
    location: meeting.location,
    callerId: meeting.callerId,
    callerName: meeting.callerName,
    attendance: meeting.attendance,
  };
};

const currentLiveTopicIndex = (meeting: Doc<"meetings">) =>
  meeting.liveAgenda.findIndex(
    (topic, index) =>
      index >= meeting.minutes.length && !topic.cancelled && !topic.deferred
  );

const createNotification = async (
  ctx: MutationCtx,
  args: {
    organizationId: Id<"organizations">;
    userId: Id<"users">;
    type: "agenda_published" | "minutes_shared" | "action_item_assigned";
    meetingId?: Id<"meetings">;
    message: string;
  }
) => {
  await ctx.db.insert("notifications", { ...args, read: false });
};

const notifyOrgMembers = async (
  ctx: MutationCtx,
  organizationId: Id<"organizations">,
  excludeUserId: Id<"users">,
  type: "agenda_published" | "minutes_shared",
  message: string,
  meetingId: Id<"meetings">
) => {
  const memberships = await ctx.db
    .query("memberships")
    .withIndex("by_org", (q) => q.eq("organizationId", organizationId))
    .collect();
  await Promise.all(
    memberships
      .filter((membership) => membership.userId !== excludeUserId)
      .map((membership) =>
        createNotification(ctx, {
          organizationId,
          userId: membership.userId,
          type,
          meetingId,
          message,
        })
      )
  );
};

const findAssigneeAccountId = async (
  ctx: MutationCtx,
  organizationId: Id<"organizations">,
  assigneeId?: string
) => {
  if (!assigneeId) return undefined;
  const members = await ctx.db
    .query("boardMembers")
    .withIndex("by_org", (q) => q.eq("organizationId", organizationId))
    .collect();
  return members.find((member) => member._id === assigneeId)?.accountId;
};

// Notifies a newly-assigned action item's assignee. Only fires when the note
// is (or becomes) an action_item with an assignee who has a linked account
// other than the person making the change, so self-assignment and edits that
// don't touch the assignee stay silent.
const notifyActionItemAssignee = async (
  ctx: MutationCtx,
  meeting: Doc<"meetings">,
  actorUserId: Id<"users">,
  topicTitle: string,
  note: { type: string; text: string; assigneeId?: string }
) => {
  if (note.type !== "action_item" || !note.assigneeId) return;
  const accountId = await findAssigneeAccountId(
    ctx,
    meeting.organizationId,
    note.assigneeId
  );
  if (!accountId || accountId === actorUserId) return;
  await createNotification(ctx, {
    organizationId: meeting.organizationId,
    userId: accountId,
    type: "action_item_assigned",
    meetingId: meeting._id,
    message: `You were assigned an action item during "${topicTitle}": ${note.text}`,
  });
};

export const ensureCurrentUser = mutation({
  args: { name: v.optional(v.string()), email: v.optional(v.string()) },
  handler: async (ctx, args) => {
    // args.name only seeds the name for a brand-new user (see
    // getOrCreateCurrentUser). It intentionally does not overwrite an
    // existing user's name on every load, since that would clobber a name
    // the user has since edited in Settings.
    const user = await getOrCreateCurrentUser(ctx, args.name);
    await ensureBoardMembersForUser(ctx, user, args.email);
    return user._id;
  },
});

export const updateProfile = mutation({
  args: { name: v.string() },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    await ctx.db.patch(user._id, { name: args.name });
  },
});

export const leaveOrganization = mutation({
  args: { organizationId: v.id("organizations") },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    const membership = await membershipFor(ctx, args.organizationId, user._id);
    if (membership) {
      await ctx.db.delete(membership._id);
    }
    if (user.selectedOrganizationId === args.organizationId) {
      const remaining = await ctx.db
        .query("memberships")
        .withIndex("by_user", (q) => q.eq("userId", user._id))
        .collect();
      await ctx.db.patch(user._id, {
        selectedOrganizationId: remaining[0]?.organizationId,
      });
    }
  },
});

export const me = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;
    const user = await getCurrentUser(ctx);
    if (!user) return null;
    const memberships = await ctx.db
      .query("memberships")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();
    const meetingViews = await ctx.db
      .query("meetingViews")
      .withIndex("by_user_meeting", (q) => q.eq("userId", user._id))
      .collect();
    const viewedAtByMeeting = new Map(
      meetingViews.map((view) => [view.meetingId, view.viewedAt])
    );
    const organizations = await Promise.all(
      memberships.map(async (membership) => {
        const org = await ctx.db.get(membership.organizationId);
        if (!org) return null;
        const orgMemberships = await ctx.db
          .query("memberships")
          .withIndex("by_org", (q) => q.eq("organizationId", org._id))
          .collect();
        const memberUsers = await Promise.all(
          orgMemberships.map((m) => ctx.db.get(m.userId))
        );
        const boardMembers = await ctx.db
          .query("boardMembers")
          .withIndex("by_org", (q) => q.eq("organizationId", org._id))
          .collect();
        const meetings = await ctx.db
          .query("meetings")
          .withIndex("by_org", (q) => q.eq("organizationId", org._id))
          .collect();
        const calendarItems = await ctx.db
          .query("calendarItems")
          .withIndex("by_org", (q) => q.eq("organizationId", org._id))
          .collect();
        const committees = await ctx.db
          .query("committees")
          .withIndex("by_org", (q) => q.eq("organizationId", org._id))
          .collect();
        return {
          id: org._id,
          name: org.name,
          committeeDocUrl: org.committeeDocUrl,
          memberships: orgMemberships.map((m, index) => ({
            userId: m.userId,
            role: m.role,
            name: memberUsers[index]?.name ?? "Unknown User",
          })),
          members: boardMembers.map((m) => ({
            id: m._id,
            name: m.name,
            email: m.email,
            title: m.title,
            accountId: m.accountId,
            type: m.type,
          })),
          meetings: await Promise.all(
            meetings.map((meeting) =>
              serializeMeeting(ctx, meeting, viewedAtByMeeting.get(meeting._id))
            )
          ),
          calendarItems: calendarItems.map((c) => ({
            id: c._id,
            month: c.month,
            text: c.text,
            completed: c.completed,
          })),
          committees: committees.map((c) => ({
            id: c._id,
            name: c.name,
            type: c.type,
          })),
        };
      })
    );
    const visibleOrganizations = organizations.filter((org) => org !== null);
    const selected =
      visibleOrganizations.find((org) => org.id === user.selectedOrganizationId) ??
      visibleOrganizations[0];
    return {
      id: user._id,
      profile: { name: user.name, title: user.title },
      root: {
        organizations: visibleOrganizations,
        selectedOrganization: selected,
      },
    };
  },
});

export const meeting = query({
  args: { meetingId: v.id("meetings") },
  handler: async (ctx, args) => {
    const meeting = await ctx.db.get(args.meetingId);
    if (!meeting) return null;
    const { user } = await requireRole(ctx, meeting.organizationId, [
      "admin",
      "writer",
      "reader",
    ]);
    const view = await ctx.db
      .query("meetingViews")
      .withIndex("by_user_meeting", (q) =>
        q.eq("userId", user._id).eq("meetingId", meeting._id)
      )
      .unique();
    return await serializeMeeting(ctx, meeting, view?.viewedAt);
  },
});

export const createOrganization = mutation({
  args: { name: v.string() },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    const organizationId = await ctx.db.insert("organizations", { name: args.name });
    await ctx.db.insert("memberships", {
      organizationId,
      userId: user._id,
      role: "admin",
    });
    await ensureBoardMemberForUser(ctx, organizationId, user);
    await ctx.db.patch(user._id, { selectedOrganizationId: organizationId });
    return organizationId;
  },
});

export const selectOrganization = mutation({
  args: { organizationId: v.id("organizations") },
  handler: async (ctx, args) => {
    const { user } = await requireRole(ctx, args.organizationId, ["admin", "writer", "reader"]);
    await ctx.db.patch(user._id, { selectedOrganizationId: args.organizationId });
  },
});

export const updateOrganization = mutation({
  args: { organizationId: v.id("organizations"), name: v.string() },
  handler: async (ctx, args) => {
    await requireRole(ctx, args.organizationId, ["admin"]);
    await ctx.db.patch(args.organizationId, { name: args.name });
  },
});

export const joinOrganization = mutation({
  args: { organizationId: v.id("organizations"), email: v.optional(v.string()) },
  handler: async (ctx, args) => {
    // The Clerk JWT's identity.email is only populated if the "convex" JWT
    // template has an email claim configured (Clerk dashboard, outside this
    // codebase) - it's reliably empty otherwise. Accept the email as a
    // client-supplied argument instead, the same way ensureCurrentUser
    // already does, so auto-linking to an unclaimed roster entry doesn't
    // silently depend on external configuration. identity.email is kept as
    // a fallback in case the claim is present.
    const identity = await requireIdentity(ctx);
    const user = await getOrCreateCurrentUser(ctx);
    const existing = await membershipFor(ctx, args.organizationId, user._id);
    if (!existing) {
      await ctx.db.insert("memberships", {
        organizationId: args.organizationId,
        userId: user._id,
        role: "reader",
      });
    }
    await ensureBoardMemberForUser(
      ctx,
      args.organizationId,
      user,
      args.email ?? identity.email
    );
    await ctx.db.patch(user._id, { selectedOrganizationId: args.organizationId });
  },
});

export const createMeeting = mutation({
  args: { organizationId: v.id("organizations"), date: v.number() },
  handler: async (ctx, args) => {
    await requireRole(ctx, args.organizationId, ["admin", "writer"]);
    return await ctx.db.insert("meetings", {
      organizationId: args.organizationId,
      date: args.date,
      status: "draft",
      plannedAgenda: [],
      liveAgenda: [],
      minutes: [],
    });
  },
});

export const createRandomMeeting = mutation({
  args: { organizationId: v.id("organizations") },
  handler: async (ctx, args) => {
    await requireRole(ctx, args.organizationId, ["admin", "writer"]);
    const topics = [
      ["Call to Order", 2],
      ["Approval of Previous Minutes", 5],
      ["Treasurer's Report", 10],
      ["Committee Reports", 15],
      ["Old Business", 20],
      ["New Business", 15],
      ["Director Updates", 10],
      ["Strategic Planning Discussion", 25],
      ["Budget Review", 15],
      ["Member Forum", 10],
      ["Adjourn", 2],
    ] as const;
    const plannedAgenda = [...topics]
      .sort(() => Math.random() - 0.5)
      .slice(0, 5 + Math.floor(Math.random() * 2))
      .map(([title, durationMinutes]) => ({ id: id(), title, durationMinutes }));
    const now = new Date();
    now.setSeconds(0, 0);
    return await ctx.db.insert("meetings", {
      organizationId: args.organizationId,
      date: now.getTime(),
      status: "published",
      plannedAgenda,
      liveAgenda: [],
      minutes: [],
    });
  },
});

export const setMeetingStatus = mutation({
  args: {
    meetingId: v.id("meetings"),
    status: v.union(
      v.literal("draft"),
      v.literal("published"),
      v.literal("live"),
      v.literal("completed")
    ),
  },
  handler: async (ctx, args) => {
    const meeting = await ctx.db.get(args.meetingId);
    if (!meeting) return;
    const { user } = await requireRole(ctx, meeting.organizationId, ["admin", "writer"]);
    await ctx.db.patch(args.meetingId, { status: args.status });
    if (args.status === "published" && meeting.status !== "published") {
      await notifyOrgMembers(
        ctx,
        meeting.organizationId,
        user._id,
        "agenda_published",
        "The agenda for an upcoming meeting has been published.",
        args.meetingId
      );
    }
  },
});

export const startMeeting = mutation({
  args: { meetingId: v.id("meetings") },
  handler: async (ctx, args) => {
    const meeting = await ctx.db.get(args.meetingId);
    if (!meeting) return;
    await requireRole(ctx, meeting.organizationId, ["admin", "writer"]);
    const liveAgenda = meeting.plannedAgenda.map((topic) => ({
      ...topic,
      id: id(),
      plannedTopicId: topic.id,
    }));
    await ctx.db.patch(args.meetingId, {
      status: "live",
      liveStartTime: Date.now(),
      liveAgenda,
      minutes: [],
      currentNotes: [],
      highlightedTopicId: undefined,
      focusedTopicId: undefined,
    });
  },
});

const setHighlightedTopicMutation = mutation({
  args: { meetingId: v.id("meetings"), topicId: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const meeting = await ctx.db.get(args.meetingId);
    if (!meeting) return;
    await requireRole(ctx, meeting.organizationId, ["admin", "writer"]);
    if (
      args.topicId &&
      !meeting.liveAgenda.some((topic) => topic.id === args.topicId) &&
      !meeting.minutes.some((minute) => minute.topic.id === args.topicId)
    ) {
      throw new ConvexError("Topic not found");
    }
    await ctx.db.patch(args.meetingId, {
      highlightedTopicId: args.topicId,
      focusedTopicId: undefined,
    });
  },
});

export const setHighlightedTopic = setHighlightedTopicMutation;
export const setFocusedTopic = setHighlightedTopicMutation;

export const updateMeetingDate = mutation({
  args: { meetingId: v.id("meetings"), date: v.number() },
  handler: async (ctx, args) => {
    const meeting = await ctx.db.get(args.meetingId);
    if (!meeting) return;
    await requireRole(ctx, meeting.organizationId, ["admin", "writer"]);
    await ctx.db.patch(args.meetingId, { date: args.date });
  },
});

export const updateLiveStartTime = mutation({
  args: { meetingId: v.id("meetings"), liveStartTime: v.number() },
  handler: async (ctx, args) => {
    const meeting = await ctx.db.get(args.meetingId);
    if (!meeting) return;
    await requireRole(ctx, meeting.organizationId, ["admin", "writer"]);
    await ctx.db.patch(args.meetingId, { liveStartTime: args.liveStartTime });
  },
});

export const updateExpectedDuration = mutation({
  args: { meetingId: v.id("meetings"), expectedDurationMinutes: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const meeting = await ctx.db.get(args.meetingId);
    if (!meeting) return;
    await requireRole(ctx, meeting.organizationId, ["admin", "writer"]);
    await ctx.db.patch(args.meetingId, {
      expectedDurationMinutes: args.expectedDurationMinutes,
    });
  },
});

export const updateMeetingMetadata = mutation({
  args: {
    meetingId: v.id("meetings"),
    title: v.optional(v.string()),
    subtitle: v.optional(v.string()),
    location: v.optional(v.string()),
    callerId: v.optional(v.string()),
    callerName: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const meeting = await ctx.db.get(args.meetingId);
    if (!meeting) return;
    await requireRole(ctx, meeting.organizationId, ["admin", "writer"]);
    await ctx.db.patch(args.meetingId, {
      title: args.title,
      subtitle: args.subtitle,
      location: args.location,
      callerId: args.callerId,
      callerName: args.callerName,
    });
  },
});

export const updateAttendance = mutation({
  args: {
    meetingId: v.id("meetings"),
    attendance: v.array(
      v.object({ boardMemberId: v.string(), present: v.boolean() })
    ),
  },
  handler: async (ctx, args) => {
    const meeting = await ctx.db.get(args.meetingId);
    if (!meeting) return;
    await requireRole(ctx, meeting.organizationId, ["admin", "writer"]);
    await ctx.db.patch(args.meetingId, { attendance: args.attendance });
  },
});

export const deleteMeeting = mutation({
  args: { meetingId: v.id("meetings") },
  handler: async (ctx, args) => {
    const meeting = await ctx.db.get(args.meetingId);
    if (!meeting) return;
    await requireRole(ctx, meeting.organizationId, ["admin", "writer"]);
    await ctx.db.delete(args.meetingId);
  },
});

export const addTopic = mutation({
  args: {
    meetingId: v.id("meetings"),
    list: v.union(v.literal("plannedAgenda"), v.literal("liveAgenda")),
    title: v.string(),
    durationMinutes: v.optional(v.number()),
    insertAfterTopicId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const meeting = await ctx.db.get(args.meetingId);
    if (!meeting) return;
    await requireRole(ctx, meeting.organizationId, ["admin", "writer"]);
    const topic = {
      id: id(),
      title: args.title,
      durationMinutes: args.durationMinutes,
    };
    const topics = [...meeting[args.list]];
    const afterIndex = args.insertAfterTopicId
      ? topics.findIndex((candidate) => candidate.id === args.insertAfterTopicId)
      : -1;
    const liveMinimumIndex =
      args.list === "liveAgenda" && meeting.status === "live"
        ? currentLiveTopicIndex(meeting) + 1
        : 0;
    const insertIndex =
      afterIndex === -1
        ? topics.length
        : Math.max(afterIndex + 1, liveMinimumIndex);
    topics.splice(insertIndex, 0, topic);
    await ctx.db.patch(args.meetingId, {
      [args.list]: topics,
      ...(args.list === "plannedAgenda" && meeting.status === "published"
        ? { agendaUpdatedAt: Date.now() }
        : {}),
    });
    return topic.id;
  },
});

export const updateTopic = mutation({
  args: {
    meetingId: v.id("meetings"),
    list: v.union(v.literal("plannedAgenda"), v.literal("liveAgenda")),
    topicId: v.string(),
    title: v.optional(v.string()),
    durationMinutes: v.optional(v.number()),
    outcome: v.optional(v.string()),
    details: v.optional(v.string()),
    deferred: v.optional(v.boolean()),
    cancelled: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const meeting = await ctx.db.get(args.meetingId);
    if (!meeting) return;
    await requireRole(ctx, meeting.organizationId, ["admin", "writer"]);
    await ctx.db.patch(args.meetingId, {
      [args.list]: meeting[args.list].map((topic) =>
        topic.id === args.topicId
          ? {
              ...topic,
              title: args.title ?? topic.title,
              durationMinutes: args.durationMinutes ?? topic.durationMinutes,
              outcome: args.outcome ?? topic.outcome,
              details: args.details ?? topic.details,
              deferred: args.deferred ?? topic.deferred,
              cancelled: args.cancelled ?? topic.cancelled,
            }
          : topic
      ),
      ...(args.list === "plannedAgenda" && meeting.status === "published"
        ? { agendaUpdatedAt: Date.now() }
        : {}),
    });
  },
});

export const deleteTopic = mutation({
  args: {
    meetingId: v.id("meetings"),
    list: v.union(v.literal("plannedAgenda"), v.literal("liveAgenda")),
    topicId: v.string(),
  },
  handler: async (ctx, args) => {
    const meeting = await ctx.db.get(args.meetingId);
    if (!meeting) return;
    await requireRole(ctx, meeting.organizationId, ["admin", "writer"]);
    await ctx.db.patch(args.meetingId, {
      [args.list]: meeting[args.list].filter((topic) => topic.id !== args.topicId),
      ...(args.list === "plannedAgenda" && meeting.status === "published"
        ? { agendaUpdatedAt: Date.now() }
        : {}),
    });
  },
});

export const reorderTopics = mutation({
  args: {
    meetingId: v.id("meetings"),
    list: v.union(v.literal("plannedAgenda"), v.literal("liveAgenda")),
    topicIds: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    const meeting = await ctx.db.get(args.meetingId);
    if (!meeting) return;
    await requireRole(ctx, meeting.organizationId, ["admin", "writer"]);
    const byId = new Map(meeting[args.list].map((topic) => [topic.id, topic]));
    await ctx.db.patch(args.meetingId, {
      [args.list]: args.topicIds.map((topicId) => byId.get(topicId)).filter(Boolean),
      ...(args.list === "plannedAgenda" && meeting.status === "published"
        ? { agendaUpdatedAt: Date.now() }
        : {}),
    });
  },
});

export const skipTopic = mutation({
  args: { meetingId: v.id("meetings") },
  handler: async (ctx, args) => {
    const meeting = await ctx.db.get(args.meetingId);
    if (!meeting) return;
    await requireRole(ctx, meeting.organizationId, ["admin", "writer"]);
    const currentIndex = currentLiveTopicIndex(meeting);
    const topic = meeting.liveAgenda[currentIndex];
    if (!topic) return;
    const liveAgenda = [...meeting.liveAgenda];
    liveAgenda.splice(currentIndex, 1);
    liveAgenda.push({ ...topic, deferred: true });
    await ctx.db.patch(args.meetingId, {
      liveAgenda,
      currentNotes: [],
      highlightedTopicId:
        meeting.highlightedTopicId === topic.id ? undefined : meeting.highlightedTopicId,
      focusedTopicId: undefined,
    });
  },
});

export const makeActive = mutation({
  args: { meetingId: v.id("meetings"), topicId: v.string() },
  handler: async (ctx, args) => {
    const meeting = await ctx.db.get(args.meetingId);
    if (!meeting) return;
    await requireRole(ctx, meeting.organizationId, ["admin", "writer"]);
    // The active slot is always right after the completed topics. The
    // target topic (which must not be completed yet, so its index is
    // always >= currentIndex) moves into that slot; whatever topic was
    // sitting there before - if any - simply shifts down to become the
    // next topic instead of being auto-deferred to the end of the agenda.
    const currentIndex = meeting.minutes.length;
    const targetIndex = meeting.liveAgenda.findIndex((topic) => topic.id === args.topicId);
    if (targetIndex === -1 || targetIndex < currentIndex) return;
    const liveAgenda = [...meeting.liveAgenda];
    const [targetTopic] = liveAgenda.splice(targetIndex, 1);
    liveAgenda.splice(currentIndex, 0, { ...targetTopic, deferred: false });
    await ctx.db.patch(args.meetingId, {
      liveAgenda,
      highlightedTopicId:
        meeting.highlightedTopicId === targetTopic.id
          ? undefined
          : meeting.highlightedTopicId,
      focusedTopicId: undefined,
    });
  },
});

export const advanceTopic = mutation({
  args: {
    meetingId: v.id("meetings"),
    actualDurationMinutes: v.number(),
    outcome: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const meeting = await ctx.db.get(args.meetingId);
    if (!meeting) return;
    await requireRole(ctx, meeting.organizationId, ["admin", "writer"]);
    const currentIndex = currentLiveTopicIndex(meeting);
    const topic = meeting.liveAgenda[currentIndex];
    if (!topic) return;
    const currentNotes = meeting.currentNotes ?? [];
    await ctx.db.patch(args.meetingId, {
      liveAgenda: meeting.liveAgenda.map((candidate) =>
        candidate.id === topic.id && args.outcome
          ? { ...candidate, outcome: args.outcome }
          : candidate
      ),
      minutes: [
        ...meeting.minutes,
        {
          id: id(),
          topic: args.outcome ? { ...topic, outcome: args.outcome } : topic,
          durationMinutes: args.actualDurationMinutes,
          notes: currentNotes,
        },
      ],
      currentNotes: [],
      highlightedTopicId:
        meeting.highlightedTopicId === topic.id ? undefined : meeting.highlightedTopicId,
      focusedTopicId: undefined,
    });
  },
});

export const addCurrentNote = mutation({
  args: { meetingId: v.id("meetings"), note: noteArg },
  handler: async (ctx, args) => {
    const meeting = await ctx.db.get(args.meetingId);
    if (!meeting) return;
    const { user } = await requireRole(ctx, meeting.organizationId, ["admin", "writer"]);
    await ctx.db.patch(args.meetingId, {
      currentNotes: [...(meeting.currentNotes ?? []), { id: id(), ...args.note }],
    });
    const activeTopic = meeting.liveAgenda[currentLiveTopicIndex(meeting)];
    await notifyActionItemAssignee(
      ctx,
      meeting,
      user._id,
      activeTopic?.title ?? "the meeting",
      args.note
    );
  },
});

export const removeCurrentNote = mutation({
  args: { meetingId: v.id("meetings"), index: v.number() },
  handler: async (ctx, args) => {
    const meeting = await ctx.db.get(args.meetingId);
    if (!meeting) return;
    await requireRole(ctx, meeting.organizationId, ["admin", "writer"]);
    await ctx.db.patch(args.meetingId, {
      currentNotes: (meeting.currentNotes ?? []).filter((_, index) => index !== args.index),
    });
  },
});

export const updateCurrentNote = mutation({
  args: { meetingId: v.id("meetings"), noteId: v.string(), note: noteArg },
  handler: async (ctx, args) => {
    const meeting = await ctx.db.get(args.meetingId);
    if (!meeting) return;
    const { user } = await requireRole(ctx, meeting.organizationId, ["admin", "writer"]);
    const previous = (meeting.currentNotes ?? []).find((note) => note.id === args.noteId);
    await ctx.db.patch(args.meetingId, {
      currentNotes: (meeting.currentNotes ?? []).map((note) =>
        note.id === args.noteId ? { id: note.id, ...args.note } : note
      ),
    });
    if (args.note.assigneeId && args.note.assigneeId !== previous?.assigneeId) {
      const activeTopic = meeting.liveAgenda[currentLiveTopicIndex(meeting)];
      await notifyActionItemAssignee(
        ctx,
        meeting,
        user._id,
        activeTopic?.title ?? "the meeting",
        args.note
      );
    }
  },
});

export const addMinuteNote = mutation({
  args: { meetingId: v.id("meetings"), minuteId: v.string(), note: noteArg },
  handler: async (ctx, args) => {
    const meeting = await ctx.db.get(args.meetingId);
    if (!meeting) return;
    const { user } = await requireRole(ctx, meeting.organizationId, ["admin", "writer"]);
    await ctx.db.patch(args.meetingId, {
      minutes: meeting.minutes.map((minute) =>
        minute.id === args.minuteId
          ? { ...minute, notes: [...(minute.notes ?? []), { id: id(), ...args.note }] }
          : minute
      ),
    });
    const minute = meeting.minutes.find((candidate) => candidate.id === args.minuteId);
    await notifyActionItemAssignee(
      ctx,
      meeting,
      user._id,
      minute?.topic.title ?? "the meeting",
      args.note
    );
  },
});

export const updateMinuteNote = mutation({
  args: {
    meetingId: v.id("meetings"),
    minuteId: v.string(),
    noteId: v.string(),
    note: noteArg,
  },
  handler: async (ctx, args) => {
    const meeting = await ctx.db.get(args.meetingId);
    if (!meeting) return;
    const { user } = await requireRole(ctx, meeting.organizationId, ["admin", "writer"]);
    const minuteBefore = meeting.minutes.find((candidate) => candidate.id === args.minuteId);
    const previous = minuteBefore?.notes?.find((note) => note.id === args.noteId);
    await ctx.db.patch(args.meetingId, {
      minutes: meeting.minutes.map((minute) =>
        minute.id === args.minuteId
          ? {
              ...minute,
              notes: (minute.notes ?? []).map((note) =>
                note.id === args.noteId ? { id: note.id, ...args.note } : note
              ),
            }
          : minute
      ),
    });
    if (args.note.assigneeId && args.note.assigneeId !== previous?.assigneeId) {
      await notifyActionItemAssignee(
        ctx,
        meeting,
        user._id,
        minuteBefore?.topic.title ?? "the meeting",
        args.note
      );
    }
  },
});

export const updateMinuteDuration = mutation({
  args: {
    meetingId: v.id("meetings"),
    minuteId: v.string(),
    durationMinutes: v.number(),
  },
  handler: async (ctx, args) => {
    const meeting = await ctx.db.get(args.meetingId);
    if (!meeting) return;
    await requireRole(ctx, meeting.organizationId, ["admin", "writer"]);
    if (args.durationMinutes < 1) {
      throw new ConvexError("Duration must be at least 1 minute");
    }
    await ctx.db.patch(args.meetingId, {
      minutes: meeting.minutes.map((minute) =>
        minute.id === args.minuteId
          ? { ...minute, durationMinutes: args.durationMinutes }
          : minute
      ),
    });
  },
});

export const removeMinuteNote = mutation({
  args: { meetingId: v.id("meetings"), minuteId: v.string(), index: v.number() },
  handler: async (ctx, args) => {
    const meeting = await ctx.db.get(args.meetingId);
    if (!meeting) return;
    await requireRole(ctx, meeting.organizationId, ["admin", "writer"]);
    await ctx.db.patch(args.meetingId, {
      minutes: meeting.minutes.map((minute) =>
        minute.id === args.minuteId
          ? { ...minute, notes: (minute.notes ?? []).filter((_, index) => index !== args.index) }
          : minute
      ),
    });
  },
});

const patchActionItemNote = (
  meeting: Doc<"meetings">,
  minuteId: string | undefined,
  noteId: string,
  patch: { dueDate?: number; completedOn?: number }
) => {
  const applyPatch = (note: NonNullable<Doc<"meetings">["currentNotes"]>[number]) =>
    note.id === noteId && note.type === "action_item"
      ? { ...note, ...patch }
      : note;

  if (minuteId === undefined) {
    return {
      currentNotes: (meeting.currentNotes ?? []).map(applyPatch),
    };
  }
  return {
    minutes: meeting.minutes.map((minute) =>
      minute.id === minuteId
        ? { ...minute, notes: (minute.notes ?? []).map(applyPatch) }
        : minute
    ),
  };
};

const findActionItemNote = (
  meeting: Doc<"meetings">,
  minuteId: string | undefined,
  noteId: string
) => {
  const notes =
    minuteId === undefined
      ? (meeting.currentNotes ?? [])
      : (meeting.minutes.find((minute) => minute.id === minuteId)?.notes ?? []);
  return notes.find((note) => note.id === noteId && note.type === "action_item");
};

export const setActionItemCompletedOn = mutation({
  args: {
    meetingId: v.id("meetings"),
    minuteId: v.optional(v.string()),
    noteId: v.string(),
    completedOn: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const meeting = await ctx.db.get(args.meetingId);
    if (!meeting) return;
    const { user, membership } = await requireRole(ctx, meeting.organizationId, [
      "admin",
      "writer",
      "reader",
    ]);
    const note = findActionItemNote(meeting, args.minuteId, args.noteId);
    if (!note) throw new ConvexError("Action item not found");
    if (membership.role === "reader") {
      const members = await ctx.db
        .query("boardMembers")
        .withIndex("by_org", (q) => q.eq("organizationId", meeting.organizationId))
        .collect();
      const isAssignee = members.some(
        (member) => member._id === note.assigneeId && member.accountId === user._id
      );
      if (!isAssignee) {
        throw new ConvexError("Only the assignee or an officer can update this action item");
      }
    }
    await ctx.db.patch(
      args.meetingId,
      patchActionItemNote(meeting, args.minuteId, args.noteId, {
        completedOn: args.completedOn,
      })
    );
  },
});

export const updateActionItemDueDate = mutation({
  args: {
    meetingId: v.id("meetings"),
    minuteId: v.optional(v.string()),
    noteId: v.string(),
    dueDate: v.number(),
  },
  handler: async (ctx, args) => {
    const meeting = await ctx.db.get(args.meetingId);
    if (!meeting) return;
    await requireRole(ctx, meeting.organizationId, ["admin", "writer"]);
    const note = findActionItemNote(meeting, args.minuteId, args.noteId);
    if (!note) throw new ConvexError("Action item not found");
    await ctx.db.patch(
      args.meetingId,
      patchActionItemNote(meeting, args.minuteId, args.noteId, {
        dueDate: args.dueDate,
      })
    );
  },
});

const boardMemberType = v.union(
  v.literal("board"),
  v.literal("administration"),
  v.literal("other")
);

export const addBoardMember = mutation({
  args: {
    organizationId: v.id("organizations"),
    name: v.string(),
    email: v.optional(v.string()),
    title: v.optional(v.string()),
    type: v.optional(boardMemberType),
  },
  handler: async (ctx, args) => {
    // Officers can do basic roster upkeep; inviting a user and promoting
    // someone to officer/admin stay admin-only (see joinOrganization,
    // InviteUserDialog, and updateMembershipRole).
    await requireRole(ctx, args.organizationId, ["admin", "writer"]);
    await ctx.db.insert("boardMembers", args);
  },
});

export const updateBoardMember = mutation({
  args: {
    memberId: v.id("boardMembers"),
    name: v.optional(v.string()),
    title: v.optional(v.string()),
    type: v.optional(boardMemberType),
  },
  handler: async (ctx, args) => {
    const member = await ctx.db.get(args.memberId);
    if (!member) return;
    await requireRole(ctx, member.organizationId, ["admin", "writer"]);
    await ctx.db.patch(args.memberId, {
      name: args.name,
      title: args.title,
      type: args.type,
    });
  },
});

export const addCalendarItem = mutation({
  args: {
    organizationId: v.id("organizations"),
    month: v.number(),
    text: v.string(),
  },
  handler: async (ctx, args) => {
    await requireRole(ctx, args.organizationId, ["admin"]);
    await ctx.db.insert("calendarItems", {
      organizationId: args.organizationId,
      month: args.month,
      text: args.text,
      completed: false,
    });
  },
});

export const updateCalendarItem = mutation({
  args: {
    calendarItemId: v.id("calendarItems"),
    month: v.optional(v.number()),
    text: v.optional(v.string()),
    completed: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const item = await ctx.db.get(args.calendarItemId);
    if (!item) return;
    await requireRole(ctx, item.organizationId, ["admin"]);
    await ctx.db.patch(args.calendarItemId, {
      month: args.month,
      text: args.text,
      completed: args.completed,
    });
  },
});

export const deleteCalendarItem = mutation({
  args: { calendarItemId: v.id("calendarItems") },
  handler: async (ctx, args) => {
    const item = await ctx.db.get(args.calendarItemId);
    if (!item) return;
    await requireRole(ctx, item.organizationId, ["admin"]);
    await ctx.db.delete(args.calendarItemId);
  },
});

export const addCommittee = mutation({
  args: {
    organizationId: v.id("organizations"),
    name: v.string(),
    type: v.string(),
  },
  handler: async (ctx, args) => {
    await requireRole(ctx, args.organizationId, ["admin"]);
    await ctx.db.insert("committees", args);
  },
});

export const updateCommittee = mutation({
  args: {
    committeeId: v.id("committees"),
    name: v.optional(v.string()),
    type: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const committee = await ctx.db.get(args.committeeId);
    if (!committee) return;
    await requireRole(ctx, committee.organizationId, ["admin"]);
    await ctx.db.patch(args.committeeId, {
      name: args.name,
      type: args.type,
    });
  },
});

export const deleteCommittee = mutation({
  args: { committeeId: v.id("committees") },
  handler: async (ctx, args) => {
    const committee = await ctx.db.get(args.committeeId);
    if (!committee) return;
    await requireRole(ctx, committee.organizationId, ["admin"]);
    await ctx.db.delete(args.committeeId);
  },
});

export const updateCommitteeDocUrl = mutation({
  args: {
    organizationId: v.id("organizations"),
    committeeDocUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireRole(ctx, args.organizationId, ["admin"]);
    await ctx.db.patch(args.organizationId, { committeeDocUrl: args.committeeDocUrl });
  },
});

export const updateMembershipRole = mutation({
  args: { organizationId: v.id("organizations"), userId: v.id("users"), role },
  handler: async (ctx, args) => {
    await requireRole(ctx, args.organizationId, ["admin"]);
    const membership = await membershipFor(ctx, args.organizationId, args.userId);
    if (!membership) return;
    await ctx.db.patch(membership._id, { role: args.role });
  },
});

// Manual fallback for when auto-link (ensureBoardMemberForUser, driven by
// email match) still can't apply — e.g. a typo'd email, or someone who
// signed up with a different address than what's on file. An admin merges
// an already-joined account's disconnected boardMembers row into an
// existing unclaimed roster entry: the unclaimed entry's identity (name,
// title, type, email) is kept, its accountId is set to the joined
// account's, and the now-redundant duplicate row is deleted.
export const linkBoardMemberToAccount = mutation({
  args: {
    unclaimedMemberId: v.id("boardMembers"),
    accountBoardMemberId: v.id("boardMembers"),
  },
  handler: async (ctx, args) => {
    const unclaimed = await ctx.db.get(args.unclaimedMemberId);
    if (!unclaimed) throw new ConvexError("Roster entry not found");
    await requireRole(ctx, unclaimed.organizationId, ["admin"]);
    if (unclaimed.accountId) {
      throw new ConvexError("This roster entry is already linked to an account");
    }
    const accountEntry = await ctx.db.get(args.accountBoardMemberId);
    if (
      !accountEntry ||
      accountEntry.organizationId !== unclaimed.organizationId ||
      !accountEntry.accountId
    ) {
      throw new ConvexError("Selected account entry not found");
    }
    await ctx.db.patch(args.unclaimedMemberId, { accountId: accountEntry.accountId });
    await ctx.db.delete(args.accountBoardMemberId);
  },
});

export const notifications = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user) return [];
    const items = await ctx.db
      .query("notifications")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .order("desc")
      .take(50);
    return items.map((item) => ({
      id: item._id,
      type: item.type,
      meetingId: item.meetingId,
      message: item.message,
      read: item.read,
      createdAt: item._creationTime,
    }));
  },
});

export const markNotificationRead = mutation({
  args: { notificationId: v.id("notifications") },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    const notification = await ctx.db.get(args.notificationId);
    if (!notification || notification.userId !== user._id) return;
    await ctx.db.patch(args.notificationId, { read: true });
  },
});

export const markAllNotificationsRead = mutation({
  args: {},
  handler: async (ctx) => {
    const user = await requireUser(ctx);
    const unread = await ctx.db
      .query("notifications")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .filter((q) => q.eq(q.field("read"), false))
      .collect();
    await Promise.all(unread.map((item) => ctx.db.patch(item._id, { read: true })));
  },
});

export const notifyBoardMinutesShared = mutation({
  args: { meetingId: v.id("meetings") },
  handler: async (ctx, args) => {
    const meeting = await ctx.db.get(args.meetingId);
    if (!meeting) return;
    const { user } = await requireRole(ctx, meeting.organizationId, ["admin", "writer"]);
    await notifyOrgMembers(
      ctx,
      meeting.organizationId,
      user._id,
      "minutes_shared",
      "Minutes from a recent meeting are ready to review.",
      args.meetingId
    );
  },
});

export const recordMeetingViewed = mutation({
  args: { meetingId: v.id("meetings") },
  handler: async (ctx, args) => {
    const meeting = await ctx.db.get(args.meetingId);
    if (!meeting) return;
    const { user } = await requireRole(ctx, meeting.organizationId, [
      "admin",
      "writer",
      "reader",
    ]);
    const existing = await ctx.db
      .query("meetingViews")
      .withIndex("by_user_meeting", (q) =>
        q.eq("userId", user._id).eq("meetingId", args.meetingId)
      )
      .unique();
    if (existing) {
      await ctx.db.patch(existing._id, { viewedAt: Date.now() });
    } else {
      await ctx.db.insert("meetingViews", {
        userId: user._id,
        meetingId: args.meetingId,
        viewedAt: Date.now(),
      });
    }
  },
});

// Private notes are intentionally scoped to `requireUser`'s own id with no
// parameter to read anyone else's — there is no cross-user read path here
// even in principle, unlike every other note type in the app.
export const privateNotesForMeeting = query({
  args: { meetingId: v.id("meetings") },
  handler: async (ctx, args) => {
    const meeting = await ctx.db.get(args.meetingId);
    if (!meeting) return [];
    const { user } = await requireRole(ctx, meeting.organizationId, [
      "admin",
      "writer",
      "reader",
    ]);
    const notes = await ctx.db
      .query("privateNotes")
      .withIndex("by_user_meeting_topic", (q) =>
        q.eq("userId", user._id).eq("meetingId", args.meetingId)
      )
      .collect();
    return notes.map((note) => ({
      topicId: note.topicId,
      text: note.text,
      updatedAt: note.updatedAt,
    }));
  },
});

export const savePrivateNote = mutation({
  args: { meetingId: v.id("meetings"), topicId: v.string(), text: v.string() },
  handler: async (ctx, args) => {
    const meeting = await ctx.db.get(args.meetingId);
    if (!meeting) return;
    const { user } = await requireRole(ctx, meeting.organizationId, [
      "admin",
      "writer",
      "reader",
    ]);
    const existing = await ctx.db
      .query("privateNotes")
      .withIndex("by_user_meeting_topic", (q) =>
        q
          .eq("userId", user._id)
          .eq("meetingId", args.meetingId)
          .eq("topicId", args.topicId)
      )
      .unique();
    if (existing) {
      await ctx.db.patch(existing._id, { text: args.text, updatedAt: Date.now() });
    } else {
      await ctx.db.insert("privateNotes", {
        userId: user._id,
        meetingId: args.meetingId,
        topicId: args.topicId,
        text: args.text,
        updatedAt: Date.now(),
      });
    }
  },
});
