// backend/src/routes/authors.js
import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import { authRequired } from "../lib/auth.js";

const router = Router();

function profileDisplayName(profile, fallbackUser = null) {
  const fullName = [profile?.firstName, profile?.lastName]
    .filter(Boolean)
    .join(" ")
    .trim();

  return (
    profile?.displayName ||
    fullName ||
    fallbackUser?.displayName ||
    fallbackUser?.email ||
    "Unknown"
  );
}

/* =========================
   ME (must be ABOVE /:id)
   ========================= */

// Get my author profile
router.get("/me", authRequired, async (req, res) => {
  try {
    const userId = req.user?.sub;

    if (!userId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const profile = await prisma.authorProfile.findUnique({
      where: { userId },
      select: {
        id: true,
        userId: true,
        firstName: true,
        lastName: true,
        displayName: true,
        bio: true,
        photoUrl: true,
        website: true,
        instagram: true,
        twitter: true,
      },
    });

    const safeProfile =
      profile ?? {
        firstName: "",
        lastName: "",
        displayName: "",
        bio: "",
        photoUrl: "",
        website: "",
        instagram: "",
        twitter: "",
      };

    res.json({
      id: userId,
      userId,
      displayName: profileDisplayName(safeProfile, req.user),
      role: req.user.role || null,
      authorProfile: safeProfile,
    });
  } catch (err) {
    console.error("GET /api/authors/me failed:", err);
    res.status(500).json({ error: "Failed to load author profile" });
  }
});

// Update my author profile
router.put("/me", authRequired, async (req, res) => {
  try {
    const userId = req.user?.sub;

    if (!userId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const {
      firstName = "",
      lastName = "",
      displayName = "",
      bio = "",
      photoUrl = "",
      website = "",
      instagram = "",
      twitter = "",
    } = req.body || {};

    const profile = await prisma.authorProfile.upsert({
      where: { userId },
      create: {
        userId,
        firstName,
        lastName,
        displayName,
        bio,
        photoUrl,
        website,
        instagram,
        twitter,
      },
      update: {
        firstName,
        lastName,
        displayName,
        bio,
        photoUrl,
        website,
        instagram,
        twitter,
      },
      select: {
        id: true,
        userId: true,
        firstName: true,
        lastName: true,
        displayName: true,
        bio: true,
        photoUrl: true,
        website: true,
        instagram: true,
        twitter: true,
      },
    });

    res.json({
      ok: true,
      displayName: profileDisplayName(profile, req.user),
      authorProfile: profile,
    });
  } catch (err) {
    console.error("PUT /api/authors/me failed:", err);
    res.status(500).json({ error: "Failed to update author profile" });
  }
});

/**
 * GET /api/authors/me/books
 * Books for currently logged-in author
 */
router.get("/me/books", authRequired, async (req, res) => {
  try {
    const userId = req.user?.sub;

    if (!userId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const profile = await prisma.authorProfile.findUnique({
      where: { userId },
      select: {
        id: true,
        userId: true,
        firstName: true,
        lastName: true,
        displayName: true,
      },
    });

    if (!profile) {
      return res.json({ items: [] });
    }

    const books = await prisma.book.findMany({
      where: { authorId: profile.id },
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        authorId: true,
        title: true,
        subtitle: true,
        blurb: true,
        status: true,
        updatedAt: true,
        coverUrl: true,
        genreId: true,
        genre: { select: { name: true } },
      },
    });

    const authorName = profileDisplayName(profile, req.user);

    res.json({
      items: books.map((b) => ({
        id: b.id,
        authorId: b.authorId,
        authorUserId: profile.userId,
        title: b.title,
        subtitle: b.subtitle ?? "",
        description: b.blurb ?? "",
        status: b.status,
        updatedAt: b.updatedAt,
        coverUrl: b.coverUrl ?? null,
        genreId: b.genreId ?? null,
        genreName: b.genre?.name ?? null,
        authorName,
      })),
    });
  } catch (e) {
    console.error("GET /api/authors/me/books failed:", e);
    res.status(500).json({ error: "Failed to load your books" });
  }
});

/**
 * GET /api/authors
 * Authors index
 */
router.get("/", async (req, res) => {
  try {
    const profiles = await prisma.authorProfile.findMany({
      select: {
        id: true,
        userId: true,
        firstName: true,
        lastName: true,
        displayName: true,
        bio: true,
        photoUrl: true,
        website: true,
        instagram: true,
        twitter: true,
        books: {
          select: {
            id: true,
            title: true,
            status: true,
            updatedAt: true,
          },
          orderBy: { updatedAt: "desc" },
        },
      },
      orderBy: { createdAt: "asc" },
    });

    const authors = profiles
      .filter((p) => (p.books?.length || 0) > 0)
      .map((p) => ({
        id: p.userId,
        userId: p.userId,
        authorProfileId: p.id,
        name: profileDisplayName(p),
        bookCount: p.books.length,
        bio: p.bio ?? null,
        photoUrl: p.photoUrl ?? null,
        books: p.books.slice(0, 3).map((b) => ({
          id: b.id,
          title: b.title,
          status: b.status,
        })),
      }));

    authors.sort((a, b) => a.name.localeCompare(b.name));

    res.json(authors);
  } catch (err) {
    console.error("GET /api/authors failed:", err);
    res.status(500).json({ error: "Failed to load authors" });
  }
});

/**
 * GET /api/authors/:id
 */
router.get("/:id", async (req, res) => {
  try {
    const userId = req.params.id;

    const profile = await prisma.authorProfile.findUnique({
      where: { userId },
      select: {
        id: true,
        userId: true,
        firstName: true,
        lastName: true,
        displayName: true,
        bio: true,
        photoUrl: true,
        website: true,
        instagram: true,
        twitter: true,
        _count: { select: { books: true } },
      },
    });

    if (!profile) {
      return res.status(404).json({ error: "Author not found" });
    }

    res.json({
      id: userId,
      userId,
      authorProfileId: profile.id,
      name: profileDisplayName(profile),
      bookCount: profile._count.books,
      bio: profile.bio ?? null,
      photoUrl: profile.photoUrl ?? null,
      links: {
        website: profile.website ?? null,
        instagram: profile.instagram ?? null,
        twitter: profile.twitter ?? null,
      },
    });
  } catch (e) {
    console.error("GET /api/authors/:id failed:", e);
    res.status(500).json({ error: "Failed to load author" });
  }
});

/**
 * GET /api/authors/:id/books
 */
router.get("/:id/books", async (req, res) => {
  try {
    const userId = req.params.id;

    const profile = await prisma.authorProfile.findUnique({
      where: { userId },
      select: {
        id: true,
        userId: true,
        firstName: true,
        lastName: true,
        displayName: true,
      },
    });

    if (!profile) {
      return res.status(404).json({ error: "Author not found" });
    }

    const books = await prisma.book.findMany({
      where: { authorId: profile.id },
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        authorId: true,
        title: true,
        blurb: true,
        status: true,
        updatedAt: true,
        genreId: true,
        genre: { select: { name: true } },
        tags: { select: { tag: { select: { name: true } } } },
        sections: {
          orderBy: { orderIndex: "asc" },
          take: 1,
          select: { content: true },
        },
      },
    });

    const previewFromContent = (content) => {
      if (!content) return "";
      const words = String(content)
        .replace(/\s+/g, " ")
        .trim()
        .split(" ")
        .filter(Boolean);
      const snippet = words.slice(0, 100).join(" ");
      return words.length > 100 ? `${snippet}…` : snippet;
    };

    res.json({
      items: books.map((b) => ({
        id: b.id,
        authorId: b.authorId,
        authorUserId: profile.userId,
        title: b.title,
        status: b.status,
        description: b.blurb ?? "",
        updatedAt: b.updatedAt,
        authorName: profileDisplayName(profile),
        genreId: b.genreId ?? null,
        genreName: b.genre?.name ?? null,
        tags: (b.tags || []).map((t) => t.tag?.name).filter(Boolean),
        preview: previewFromContent(b.sections?.[0]?.content ?? ""),
      })),
    });
  } catch (e) {
    console.error("GET /api/authors/:id/books failed:", e);
    res.status(500).json({ error: "Failed to load books" });
  }
});

export default router;