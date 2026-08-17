import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

const role = v.union(v.literal("admin"), v.literal("writer"), v.literal("reader"));

const note = v.object({
  id: v.string(),
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

const topic = v.object({
  id: v.string(),
  title: v.string(),
  outcome: v.optional(v.string()),
  durationMinutes: v.optional(v.number()),
  plannedTopicId: v.optional(v.string()),
  cancelled: v.optional(v.boolean()),
  deferred: v.optional(v.boolean()),
  details: v.optional(v.string()),
});

const minute = v.object({
  id: v.string(),
  topic: topic,
  durationMinutes: v.number(),
  notes: v.optional(v.array(note)),
});

const attendanceEntry = v.object({
  boardMemberId: v.string(),
  present: v.boolean(),
});

export default defineSchema({
  users: defineTable({
    clerkId: v.string(),
    name: v.string(),
    title: v.string(),
    selectedOrganizationId: v.optional(v.id("organizations")),
  }).index("by_clerk_id", ["clerkId"]),

  organizations: defineTable({
    name: v.string(),
    committeeDocUrl: v.optional(v.string()),
  }),

  memberships: defineTable({
    organizationId: v.id("organizations"),
    userId: v.id("users"),
    role,
  })
    .index("by_org", ["organizationId"])
    .index("by_user", ["userId"])
    .index("by_org_user", ["organizationId", "userId"]),

  boardMembers: defineTable({
    organizationId: v.id("organizations"),
    name: v.string(),
    email: v.optional(v.string()),
    title: v.optional(v.string()),
    accountId: v.optional(v.id("users")),
    type: v.optional(
      v.union(v.literal("board"), v.literal("administration"), v.literal("other"))
    ),
  }).index("by_org", ["organizationId"]),

  meetings: defineTable({
    organizationId: v.id("organizations"),
    date: v.number(),
    status: v.union(
      v.literal("draft"),
      v.literal("published"),
      v.literal("live"),
      v.literal("completed")
    ),
    plannedAgenda: v.array(topic),
    liveAgenda: v.array(topic),
    minutes: v.array(minute),
    liveStartTime: v.optional(v.number()),
    currentNotes: v.optional(v.array(note)),
    highlightedTopicId: v.optional(v.string()),
    focusedTopicId: v.optional(v.string()),
    expectedDurationMinutes: v.optional(v.number()),
    agendaUpdatedAt: v.optional(v.number()),
    title: v.optional(v.string()),
    subtitle: v.optional(v.string()),
    location: v.optional(v.string()),
    callerId: v.optional(v.string()),
    callerName: v.optional(v.string()),
    attendance: v.optional(v.array(attendanceEntry)),
  }).index("by_org", ["organizationId"]),

  notifications: defineTable({
    organizationId: v.id("organizations"),
    userId: v.id("users"),
    type: v.union(
      v.literal("agenda_published"),
      v.literal("minutes_shared"),
      v.literal("action_item_assigned")
    ),
    meetingId: v.optional(v.id("meetings")),
    message: v.string(),
    read: v.boolean(),
  }).index("by_user", ["userId"]),

  meetingViews: defineTable({
    userId: v.id("users"),
    meetingId: v.id("meetings"),
    viewedAt: v.number(),
  }).index("by_user_meeting", ["userId", "meetingId"]),

  privateNotes: defineTable({
    userId: v.id("users"),
    meetingId: v.id("meetings"),
    topicId: v.string(),
    text: v.string(),
    updatedAt: v.number(),
  }).index("by_user_meeting_topic", ["userId", "meetingId", "topicId"]),

  calendarItems: defineTable({
    organizationId: v.id("organizations"),
    month: v.number(), // 1 = January ... 12 = December
    text: v.string(),
    completed: v.boolean(),
  }).index("by_org", ["organizationId"]),

  committees: defineTable({
    organizationId: v.id("organizations"),
    name: v.string(),
    // Free text rather than minutes-taker's fixed "Board" | "Headmaster"
    // union (see docx/model.ts) - prepare-to-board isn't school-specific,
    // so committee type shouldn't be either.
    type: v.string(),
  }).index("by_org", ["organizationId"]),
});
