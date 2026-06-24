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

const serializeTopic = (topic: Doc<"meetings">["plannedAgenda"][number], planned: Doc<"meetings">["plannedAgenda"]) => ({
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

const serializeMeeting = async (ctx: Ctx, meeting: Doc<"meetings">) => {
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
    focusedTopicId: meeting.focusedTopicId,
  };
};

const currentLiveTopicIndex = (meeting: Doc<"meetings">) =>
  meeting.liveAgenda.findIndex(
    (topic, index) =>
      index >= meeting.minutes.length && !topic.cancelled && !topic.deferred
  );

export const ensureCurrentUser = mutation({
  args: { name: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const user = await getOrCreateCurrentUser(ctx, args.name);
    if (args.name && args.name !== user.name) {
      await ctx.db.patch(user._id, { name: args.name });
    }
    return user._id;
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
        return {
          id: org._id,
          name: org.name,
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
          })),
          meetings: await Promise.all(meetings.map((meeting) => serializeMeeting(ctx, meeting))),
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
    await requireRole(ctx, meeting.organizationId, ["admin", "writer", "reader"]);
    return await serializeMeeting(ctx, meeting);
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
  args: { organizationId: v.id("organizations") },
  handler: async (ctx, args) => {
    const user = await getOrCreateCurrentUser(ctx);
    const existing = await membershipFor(ctx, args.organizationId, user._id);
    if (!existing) {
      await ctx.db.insert("memberships", {
        organizationId: args.organizationId,
        userId: user._id,
        role: "reader",
      });
    }
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
    await requireRole(ctx, meeting.organizationId, ["admin", "writer"]);
    await ctx.db.patch(args.meetingId, { status: args.status });
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
      focusedTopicId: liveAgenda.find((topic) => !topic.cancelled && !topic.deferred)?.id,
    });
  },
});

export const setFocusedTopic = mutation({
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
    await ctx.db.patch(args.meetingId, { focusedTopicId: args.topicId });
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
    clientTopicId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const meeting = await ctx.db.get(args.meetingId);
    if (!meeting) return;
    await requireRole(ctx, meeting.organizationId, ["admin", "writer"]);
    const topic = {
      id: args.clientTopicId ?? id(),
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
    });
  },
});

export const updateTopic = mutation({
  args: {
    meetingId: v.id("meetings"),
    list: v.union(v.literal("plannedAgenda"), v.literal("liveAgenda")),
    topicId: v.string(),
    title: v.optional(v.string()),
    durationMinutes: v.optional(v.number()),
    deferred: v.optional(v.boolean()),
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
              deferred: args.deferred ?? topic.deferred,
            }
          : topic
      ),
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
      focusedTopicId: liveAgenda.find((candidate) => !candidate.cancelled && !candidate.deferred)?.id,
    });
  },
});

export const makeActive = mutation({
  args: { meetingId: v.id("meetings"), topicId: v.string() },
  handler: async (ctx, args) => {
    const meeting = await ctx.db.get(args.meetingId);
    if (!meeting) return;
    await requireRole(ctx, meeting.organizationId, ["admin", "writer"]);
    const currentIndex = meeting.minutes.length;
    const current = meeting.liveAgenda[currentIndex];
    const targetIndex = meeting.liveAgenda.findIndex((topic) => topic.id === args.topicId);
    if (!current || targetIndex === -1) return;
    const liveAgenda = [...meeting.liveAgenda];
    const [currentTopic] = liveAgenda.splice(currentIndex, 1);
    const adjustedTargetIndex = targetIndex > currentIndex ? targetIndex - 1 : targetIndex;
    const [targetTopic] = liveAgenda.splice(adjustedTargetIndex, 1);
    liveAgenda.splice(currentIndex, 0, { ...targetTopic, deferred: false });
    liveAgenda.push({ ...currentTopic, deferred: true });
    await ctx.db.patch(args.meetingId, {
      liveAgenda,
      focusedTopicId: targetTopic.id,
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
      focusedTopicId:
        meeting.liveAgenda.find(
          (candidate, index) =>
            index > currentIndex && !candidate.cancelled && !candidate.deferred
        )?.id ?? topic.id,
    });
  },
});

export const addCurrentNote = mutation({
  args: { meetingId: v.id("meetings"), note: noteArg },
  handler: async (ctx, args) => {
    const meeting = await ctx.db.get(args.meetingId);
    if (!meeting) return;
    await requireRole(ctx, meeting.organizationId, ["admin", "writer"]);
    await ctx.db.patch(args.meetingId, {
      currentNotes: [...(meeting.currentNotes ?? []), { id: id(), ...args.note }],
    });
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
    await requireRole(ctx, meeting.organizationId, ["admin", "writer"]);
    await ctx.db.patch(args.meetingId, {
      currentNotes: (meeting.currentNotes ?? []).map((note) =>
        note.id === args.noteId ? { id: note.id, ...args.note } : note
      ),
    });
  },
});

export const addMinuteNote = mutation({
  args: { meetingId: v.id("meetings"), minuteId: v.string(), note: noteArg },
  handler: async (ctx, args) => {
    const meeting = await ctx.db.get(args.meetingId);
    if (!meeting) return;
    await requireRole(ctx, meeting.organizationId, ["admin", "writer"]);
    await ctx.db.patch(args.meetingId, {
      minutes: meeting.minutes.map((minute) =>
        minute.id === args.minuteId
          ? { ...minute, notes: [...(minute.notes ?? []), { id: id(), ...args.note }] }
          : minute
      ),
    });
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
    await requireRole(ctx, meeting.organizationId, ["admin", "writer"]);
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

export const addBoardMember = mutation({
  args: {
    organizationId: v.id("organizations"),
    name: v.string(),
    email: v.optional(v.string()),
    title: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireRole(ctx, args.organizationId, ["admin"]);
    await ctx.db.insert("boardMembers", args);
  },
});

export const updateBoardMember = mutation({
  args: {
    memberId: v.id("boardMembers"),
    name: v.optional(v.string()),
    title: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const member = await ctx.db.get(args.memberId);
    if (!member) return;
    await requireRole(ctx, member.organizationId, ["admin"]);
    await ctx.db.patch(args.memberId, { name: args.name, title: args.title });
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
