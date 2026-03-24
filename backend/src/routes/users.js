// backend/src/routes/users.js
import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { authRequired } from "../lib/auth.js";

const router = Router();

// GET /api/users/me
router.get("/me", authRequired, async (req, res) => {
  console.log("HIT /api/users/me route", req.user);
  const userId = req.user.sub;

  const profile = await prisma.authorProfile.findUnique({
    where: { userId },
    select: {
      id: true,
      userId: true,
      photoUrl: true,
      bio: true,
      website: true,
      instagram: true,
      twitter: true,
    },
  });

  res.json({
    id: userId,
    email: req.user.email,
    displayName: req.user.displayName,
    role: req.user.role,
    authorProfile: profile || null,
    photoUrl: profile?.photoUrl ?? null,
    photo_url: profile?.photoUrl ?? null,
  });
});

// PATCH /api/users/me
const patchMeSchema = z
  .object({
    // support BOTH client styles:
    photoUrl: z.string().max(2000).nullable().optional(),
    photo_url: z.string().max(2000).nullable().optional(),

    // optional extras (safe for future)
    bio: z.string().max(4000).nullable().optional(),
    website: z.string().max(2000).nullable().optional(),
  })
  .refine(
    (d) =>
      d.photoUrl !== undefined ||
      d.photo_url !== undefined ||
      d.bio !== undefined ||
      d.website !== undefined,
    { message: "No fields to update" }
  );

router.patch("/me", authRequired, async (req, res) => {
  const userId = req.user.sub;

  const parsed = patchMeSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid input" });

  // Prefer camelCase if provided, else snake_case
  const incoming = parsed.data;
  const nextPhotoUrl =
    incoming.photoUrl !== undefined ? incoming.photoUrl : incoming.photo_url;

  const updatedProfile = await prisma.authorProfile.upsert({
    where: { userId },
    create: {
      userId,
      photoUrl: nextPhotoUrl ?? null,
      bio: incoming.bio ?? null,
      website: incoming.website ?? null,
    },
    update: {
      ...(nextPhotoUrl !== undefined ? { photoUrl: nextPhotoUrl ?? null } : {}),
      ...(incoming.bio !== undefined ? { bio: incoming.bio ?? null } : {}),
      ...(incoming.website !== undefined ? { website: incoming.website ?? null } : {}),
    },
    select: { photoUrl: true, bio: true, website: true },
  });

  // Return a unified “me-ish” response shape
  res.json({
    authorProfile: updatedProfile,
    photoUrl: updatedProfile.photoUrl ?? null,
    photo_url: updatedProfile.photoUrl ?? null,
  });
});

export default router;