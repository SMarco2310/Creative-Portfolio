import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // Admin credentials (one row, manually seeded)
  admins: defineTable({
    email: v.string(),
    passwordHash: v.string(),
  }).index("by_email", ["email"]),

  // Active sessions — token issued on login, deleted on logout
  sessions: defineTable({
    token: v.string(),
    adminId: v.id("admins"),
    createdAt: v.number(),
  }).index("by_token", ["token"]),

  // Portfolio images
  images: defineTable({
    storageId: v.id("_storage"),
    fileName: v.string(),
    starred: v.boolean(),
    sortOrder: v.number(),
    uploadedAt: v.number(),
  }).index("by_sort_order", ["sortOrder"]),
});
