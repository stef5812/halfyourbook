// backend/src/routes/authors.js
import { Router } from "express";
import { prisma } from "../lib/prisma.js";

import { authRequired } from "../lib/auth.js";

const router = Router();

/* =========================
   ME (must be ABOVE /:id)
   ========================= */

// Get my author profile (for dashboard)
router.get("/me", authRequired, async (req, res) => {
  const userId = req.user?.sub;

  if (!userId) {
    return res.status(401).json({ error: "Not authenticated" });
  }

  const me = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      displayName: true,
      email: true,
      role: true,
      authorProfile: {
        select: { bio: true, photoUrl: true, website: true, instagram: true, twitter: true },
      },
    },
  });

  if (!me) return res.status(404).json({ error: "User not found" });

  res.json({
    id: me.id,
    displayName: me.displayName ?? me.email,
    role: me.role,
    authorProfile: me.authorProfile ?? { bio: "", photoUrl: "", website: "", instagram: "", twitter: "" },
  });
});


// Update my author profile (bio etc.)
router.put("/me", authRequired, async (req, res) => {
  const userId = req.user.sub;


  if (!userId) {
    return res.status(401).json({ error: "Not authenticated" });
  }

  const { bio = "", photoUrl = "", website = "", instagram = "", twitter = "" } = req.body || {};

  const profile = await prisma.authorProfile.upsert({
    where: { userId },
    create: { userId, bio, photoUrl, website, instagram, twitter },
    update: { bio, photoUrl, website, instagram, twitter },
    select: { bio: true, photoUrl: true, website: true, instagram: true, twitter: true },
  });

  res.json({ ok: true, authorProfile: profile });
});



/**
 * GET /api/authors
 * Authors index (users who have books)
 */
router.get("/", async (req, res) => {
  try {
    // find authors that actually have books
    const counts = await prisma.book.groupBy({
      by: ["authorId"],
      _count: { _all: true },
    });

    const authorIds = counts.map((c) => c.authorId).filter(Boolean);
    if (authorIds.length === 0) return res.json([]);

    // Load author users
    const users = await prisma.user.findMany({
      where: { id: { in: authorIds } },
      select: {
        id: true,
        displayName: true,
        email: true,
        authorProfile: { select: { bio: true, photoUrl: true } },
      },
      orderBy: [{ displayName: "asc" }, { email: "asc" }],
    });

    // Map authorId -> bookCount
    const countMap = new Map(counts.map((c) => [c.authorId, c._count._all]));

    // Load a few book titles per author for the index cards
    // NOTE: We limit per author in JS (simple & safe). If you later want true per-author LIMIT in SQL,
    // we can do a slightly more advanced query.
    const books = await prisma.book.findMany({
      where: {
        authorId: { in: authorIds },
      },
      select: {
        id: true,
        title: true,
        authorId: true,
        updatedAt: true,
        status: true, // optional, but handy later if you want to show a badge
      },
      orderBy: [{ updatedAt: "desc" }],
    });
    

    // Group books by authorId
    const booksByAuthor = new Map();
    for (const b of books) {
      if (!b.authorId) continue;
      if (!booksByAuthor.has(b.authorId)) booksByAuthor.set(b.authorId, []);
      booksByAuthor.get(b.authorId).push({ id: b.id, title: b.title, status: b.status });

    }

    // Limit titles per author (change 3 to whatever you want)
    const limitPerAuthor = 3;

    res.json(
      users.map((u) => ({
        id: u.id,
        name: u.displayName || u.email || "Unknown",
        bookCount: countMap.get(u.id) ?? 0,
        bio: u.authorProfile?.bio ?? null,
        photoUrl: u.authorProfile?.photoUrl ?? null,

        // NEW: book titles for index cards
        books: (booksByAuthor.get(u.id) || []).slice(0, limitPerAuthor),
      }))
    );
  } catch (err) {
    console.error("GET /api/authors failed:", err);
    res.status(500).json({ error: "Failed to load authors" });
  }
});

/**
 * GET /api/authors/:id
 * Author profile
 */
router.get("/:id", async (req, res) => {
  try {
    const id = req.params.id;

    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        displayName: true,
        email: true,
        authorProfile: {
          select: {
            bio: true,
            photoUrl: true,
            website: true,
            instagram: true,
            twitter: true,
          },
        },
        _count: { select: { books: true } },
      },
    });

    if (!user) return res.status(404).json({ error: "Author not found" });

    res.json({
      id: user.id,
      name: user.displayName || user.email || "Unknown",
      bookCount: user._count.books,
      bio: user.authorProfile?.bio ?? null,
      photoUrl: user.authorProfile?.photoUrl ?? null,
      links: {
        website: user.authorProfile?.website ?? null,
        instagram: user.authorProfile?.instagram ?? null,
        twitter: user.authorProfile?.twitter ?? null,
      },
    });
  } catch (e) {
    console.error("GET /api/authors/:id failed:", e);
    res.status(500).json({ error: "Failed to load author" });
  }
});

/**
 * GET /api/authors/:id/books
 * Books by author
 */
router.get("/:id/books", async (req, res) => {
  try {
    const authorId = req.params.id;

    const books = await prisma.book.findMany({
      where: { authorId },
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        authorId: true,
        title: true,
        blurb: true,
        status: true,
        updatedAt: true,
        author: { select: { displayName: true, email: true } },
        genreId: true,
        genre: { select: { name: true } },
        tags: { select: { tag: { select: { name: true } } } },
        sections: { orderBy: { orderIndex: "asc" }, take: 1, select: { content: true } },
      },
    });

    const previewFromContent = (content) => {
      if (!content) return "";
      const words = String(content).replace(/\s+/g, " ").trim().split(" ").filter(Boolean);
      const snippet = words.slice(0, 100).join(" ");
      return words.length > 100 ? snippet + "…" : snippet;
    };

    res.json({
      items: books.map((b) => ({
        id: b.id,
        authorId: b.authorId,
        title: b.title,
        status: b.status,
        description: b.blurb ?? "",
        updatedAt: b.updatedAt,
        authorName: b.author?.displayName || b.author?.email || "Unknown",
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
