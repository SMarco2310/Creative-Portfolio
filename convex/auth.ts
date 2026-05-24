import { action, internalAction, internalMutation, internalQuery, mutation, query } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";
import bcrypt from "bcryptjs";

// ---------------------------------------------------------------------------
// Shared helper used by images.ts — validates a session token
// ---------------------------------------------------------------------------
export async function requireToken(
  ctx: { db: { query: Function } },
  token: string,
): Promise<string> {
  const session = await (ctx.db as any)
    .query("sessions")
    .withIndex("by_token", (q: any) => q.eq("token", token))
    .first();
  if (!session) throw new Error("Unauthorized");
  return session.adminId;
}

/** Generates a cryptographically random hex token */
function generateToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

// ---------------------------------------------------------------------------
// Internal mutation: insert a new session row (called by login action)
// ---------------------------------------------------------------------------
export const createSession = internalMutation({
  args: { adminId: v.id("admins"), token: v.string() },
  handler: async (ctx, { adminId, token }) => {
    await ctx.db.insert("sessions", { token, adminId, createdAt: Date.now() });
  },
});

// ---------------------------------------------------------------------------
// Public action: email + password → session token
// (bcrypt.compare requires the action runtime)
// ---------------------------------------------------------------------------
export const login = action({
  args: { email: v.string(), password: v.string() },
  handler: async (ctx, { email, password }): Promise<{ token: string }> => {
    // Look up admin
    const admin = await ctx.runQuery(internal.auth.findAdminByEmail, { email });
    if (!admin) throw new Error("Invalid credentials");

    // Verify password
    const valid = await bcrypt.compare(password, admin.passwordHash);
    if (!valid) throw new Error("Invalid credentials");

    // Issue token
    const token = generateToken();
    await ctx.runMutation(internal.auth.createSession, {
      adminId: admin._id,
      token,
    });

    return { token };
  },
});

// ---------------------------------------------------------------------------
// Internal query: look up admin by email (used by login action)
// ---------------------------------------------------------------------------
export const findAdminByEmail = internalQuery({
  args: { email: v.string() },
  handler: async (ctx, { email }) => {
    return await ctx.db
      .query("admins")
      .withIndex("by_email", (q) => q.eq("email", email))
      .first();
  },
});

// ---------------------------------------------------------------------------
// Public mutation: delete the session row (logout)
// ---------------------------------------------------------------------------
export const logout = mutation({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_token", (q) => q.eq("token", token))
      .first();
    if (session) await ctx.db.delete(session._id);
  },
});

// ---------------------------------------------------------------------------
// Public query: returns true if the token maps to a live session
// ---------------------------------------------------------------------------
export const validateSession = query({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_token", (q) => q.eq("token", token))
      .first();
    return session !== null;
  },
});

// ---------------------------------------------------------------------------
// Internal mutation: write the admin row (DB write, no async crypto here)
// ---------------------------------------------------------------------------
export const insertAdmin = internalMutation({
  args: { email: v.string(), passwordHash: v.string() },
  handler: async (ctx, { email, passwordHash }) => {
    const existing = await ctx.db
      .query("admins")
      .withIndex("by_email", (q) => q.eq("email", email))
      .first();
    if (existing) {
      console.log("Admin already exists:", existing._id);
      return existing._id;
    }
    const adminId = await ctx.db.insert("admins", { email, passwordHash });
    console.log("Admin created:", adminId);
    return adminId;
  },
});

// ---------------------------------------------------------------------------
// Internal action: hash password then insert admin row
// Run once via:  npx convex run auth:createAdmin --prod
// ---------------------------------------------------------------------------
export const createAdmin = internalAction({
  args: {},
  handler: async (ctx): Promise<string> => {
    const email = "sossoumarcetienne@icloud.com";
    const password = "Marco2310#";
    const passwordHash = await bcrypt.hash(password, 10);
    const adminId = await ctx.runMutation(
      internal.auth.insertAdmin as any,
      { email, passwordHash },
    );
    return adminId as string;
  },
});
