import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

const role = v.union(v.literal("admin"), v.literal("writer"), v.literal("reader"));

const note = v.object({
  id: v.string(),
  type: v.union(v.literal("text"), v.literal("action_item"), v.literal("motion")),
  text: v.string(),
  assigneeId: v.optional(v.string()),
  assigneeName: v.optional(v.string()),
  mover: v.optional(v.string()),
  seconder: v.optional(v.string()),
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
});

const minute = v.object({
  id: v.string(),
  topic: topic,
  durationMinutes: v.number(),
  notes: v.optional(v.array(note)),
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
  }).index("by_org", ["organizationId"]),
});
