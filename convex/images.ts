import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireToken } from "./auth";

/** Public: list all images sorted by sortOrder. */
export const listImages = query({
  args: {},
  handler: async (ctx) => {
    const images = await ctx.db
      .query("images")
      .withIndex("by_sort_order")
      .order("asc")
      .collect();

    return Promise.all(
      images.map(async (img) => ({
        _id: img._id,
        fileName: img.fileName,
        starred: img.starred,
        sortOrder: img.sortOrder,
        uploadedAt: img.uploadedAt,
        url: await ctx.storage.getUrl(img.storageId),
      }))
    );
  },
});

/** Protected: get a short-lived URL to upload a file directly to Convex storage. */
export const generateUploadUrl = mutation({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    await requireToken(ctx, token);
    return await ctx.storage.generateUploadUrl();
  },
});

/** Protected: save image metadata after a successful upload. */
export const saveImage = mutation({
  args: {
    storageId: v.id("_storage"),
    fileName: v.string(),
    token: v.string(),
  },
  handler: async (ctx, { storageId, fileName, token }) => {
    await requireToken(ctx, token);

    // New images go to the front (sortOrder 0), push existing ones down.
    const all = await ctx.db.query("images").collect();
    for (const img of all) {
      await ctx.db.patch(img._id, { sortOrder: img.sortOrder + 1 });
    }

    await ctx.db.insert("images", {
      storageId,
      fileName,
      starred: false,
      sortOrder: 0,
      uploadedAt: Date.now(),
    });
  },
});

/** Protected: delete an image from storage and the database. */
export const deleteImage = mutation({
  args: { id: v.id("images"), token: v.string() },
  handler: async (ctx, { id, token }) => {
    await requireToken(ctx, token);

    const image = await ctx.db.get(id);
    if (!image) throw new Error("Image not found");

    await ctx.storage.delete(image.storageId);
    await ctx.db.delete(id);

    // Re-normalise sortOrder after deletion.
    const remaining = await ctx.db
      .query("images")
      .withIndex("by_sort_order")
      .order("asc")
      .collect();
    for (let i = 0; i < remaining.length; i++) {
      await ctx.db.patch(remaining[i]._id, { sortOrder: i });
    }
  },
});

/** Protected: toggle the starred flag on an image. */
export const toggleStar = mutation({
  args: { id: v.id("images"), token: v.string() },
  handler: async (ctx, { id, token }) => {
    await requireToken(ctx, token);

    const image = await ctx.db.get(id);
    if (!image) throw new Error("Image not found");

    await ctx.db.patch(id, { starred: !image.starred });
  },
});

/** Protected: persist a new drag-and-drop order for all images. */
export const reorderImages = mutation({
  args: { orderedIds: v.array(v.id("images")), token: v.string() },
  handler: async (ctx, { orderedIds, token }) => {
    await requireToken(ctx, token);

    for (let i = 0; i < orderedIds.length; i++) {
      await ctx.db.patch(orderedIds[i], { sortOrder: i });
    }
  },
});
