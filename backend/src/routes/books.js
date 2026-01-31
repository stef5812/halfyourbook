// backend/src/routes/books.js
import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { authRequired, requireRole } from "../lib/auth.js";
import { canAccessBook } from "../lib/permissions.js";

const router = Router();

/* =========================
   PUBLIC (FOR NOW): LIST ALL BOOKS
   + optional filters: ?status=published&genreId=...
   ========================= */
router.get("/", async (req, res) => {
  try {
    const { status, genreId } = req.query;

    const where = {};

    if (status && ["draft", "published", "paused"].includes(status)) {
      where.status = status;
    }

    if (genreId && typeof genreId === "string") {
      where.genreId = genreId;
    }

    const books = await prisma.book.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        authorId: true,
        title: true,
        blurb: true,
        status: true,
        updatedAt: true,

        // ✅ author name (and email fallback)
        author: { select: { displayName: true, email: true } },

        // ✅ genre
        genreId: true,
        genre: { select: { name: true } },

        // ✅ tags
        tags: { select: { tag: { select: { name: true } } } },

        // ✅ first section only (ordered by orderIndex asc)
        sections: {
          orderBy: { orderIndex: "asc" },
          take: 1,
          select: { content: true },
        },
      },
    });

    const previewFromContent = (content) => {
      if (!content) return "";

      // normalize whitespace and split into words
      const words = String(content)
        .replace(/\s+/g, " ")
        .trim()
        .split(" ")
        .filter(Boolean);

      const snippet = words.slice(0, 100).join(" ");
      return words.length > 100 ? snippet + "…" : snippet;
    };

    res.json({
      items: books.map((b) => {
        const firstSectionContent = b.sections?.[0]?.content ?? "";
        const preview = previewFromContent(firstSectionContent);

        return {
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

          preview,
        };
      }),
    });
  } catch (e) {
    console.error("GET /api/books failed:", e);
    res.status(500).json({ error: "Failed to load books" });
  }
});

/* =========================
   PUBLIC (FOR NOW): GET ANY BOOK + ALL SECTIONS
   ========================= */
router.get("/:id", async (req, res) => {
  try {
    const id = req.params.id;

    const book = await prisma.book.findFirst({
      where: { id },
      select: {
        id: true,
        title: true,
        blurb: true,
        status: true,
        subtitle: true,
        language: true,

        // ✅ include genre name here too (useful for preview page)
        genreId: true,
        genre: { select: { name: true } },

        author: { select: { displayName: true, email: true } },
        purchaseLinks: { select: { id: true, label: true, url: true } },
        sections: {
          orderBy: { orderIndex: "asc" },
          select: { id: true, title: true, content: true, orderIndex: true, isPreview: true },
        },
        tags: { select: { tag: { select: { name: true } } } },
      },
    });

    if (!book) return res.status(404).json({ error: "Book not found" });

    res.json({
      id: book.id,
      title: book.title,
      subtitle: book.subtitle ?? null,
      language: book.language ?? null,
      status: book.status,
      blurb: book.blurb ?? "",

      genreId: book.genreId ?? null,
      genreName: book.genre?.name ?? null,

      authorName: book.author?.displayName || book.author?.email || "Unknown",

      purchaseLinks: book.purchaseLinks || [],

      tags: (book.tags || []).map((t) => t.tag?.name).filter(Boolean),

      sections: (book.sections || []).map((s) => ({
        id: s.id,
        title: s.title,
        content: s.content,
        orderIndex: s.orderIndex,
        isPreview: s.isPreview,
      })),
    });
  } catch (e) {
    console.error("GET /api/books/:id failed:", e);
    res.status(500).json({ error: "Failed to load book" });
  }
});

/* =========================
   AUTHOR/ADMIN: CREATE BOOK
   ========================= */
const createBookSchema = z.object({
  title: z.string().min(1).max(200),

  // Dashboard sends description; DB uses blurb
  description: z.string().max(2000).optional(),
  blurb: z.string().max(2000).optional(),

  subtitle: z.string().max(200).optional().nullable(),
  language: z.string().max(20).optional().nullable(),

  // Dashboard sends genre_id; DB uses genreId (text)
  genre_id: z.union([z.number().int(), z.string()]).optional().nullable(),
  genreId: z.string().optional().nullable(),

  status: z.enum(["draft", "published", "paused"]).optional(),

  tags: z.array(z.string().min(1).max(40)).optional(),
  purchaseLinks: z
    .array(z.object({ label: z.string().min(1).max(60), url: z.string().url().max(2000) }))
    .optional(),
});

router.post("/", authRequired, requireRole("author", "admin"), async (req, res) => {
  const parsed = createBookSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid input" });

  const d = parsed.data;

  const blurb =
    typeof d.description === "string"
      ? d.description
      : typeof d.blurb === "string"
      ? d.blurb
      : undefined;

  const genreId =
    d.genreId ?? (d.genre_id === null || d.genre_id === undefined ? null : String(d.genre_id));

  // NOTE: this preserves your current behaviour: authorId comes from req.user.sub
  const book = await prisma.book.create({
    data: {
      authorId: req.user.sub,
      title: d.title,
      subtitle: d.subtitle ?? undefined,
      language: d.language ?? undefined,
      genreId: genreId ?? undefined,
      blurb,
      status: d.status ?? "draft",
      ...(d.purchaseLinks?.length
        ? { purchaseLinks: { create: d.purchaseLinks.map((p) => ({ label: p.label, url: p.url })) } }
        : {}),
      ...(d.tags?.length
        ? {
            tags: {
              create: d.tags.map((name) => {
                const norm = name.toLowerCase().trim();
                return {
                  tag: {
                    connectOrCreate: {
                      where: { name: norm },
                      create: { name: norm },
                    },
                  },
                };
              }),
            },
          }
        : {}),
    },
    select: { id: true },
  });

  res.json({ id: book.id });
});

/* =========================
   AUTHOR/ADMIN: ADD SECTION
   ========================= */
const addSectionSchema = z.object({
  title: z.string().max(200).optional(),
  content: z.string().min(1),
  orderIndex: z.number().int().min(0),
  isPreview: z.boolean().optional(),
});

router.post("/:id/sections", authRequired, requireRole("author", "admin"), async (req, res) => {
  const bookId = req.params.id;

  const parsed = addSectionSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid input" });

  const access = await canAccessBook({ user: req.user, bookId });
  if (!access.ok) return res.status(access.status).json({ error: access.error });

  try {
    const section = await prisma.bookSection.create({
      data: {
        bookId,
        title: parsed.data.title,
        content: parsed.data.content,
        orderIndex: parsed.data.orderIndex,
        isPreview: parsed.data.isPreview ?? false,
      },
      select: { id: true },
    });

    return res.json({ id: section.id });
  } catch (e) {
    // Prisma unique constraint (likely: @@unique([bookId, orderIndex]))
    if (e?.code === "P2002") {
      return res.status(409).json({
        error: "That order index is already used for this book. Choose a different orderIndex.",
      });
    }

    console.error("Create section failed:", e);
    return res.status(500).json({ error: "Server error" });
  }
});

/* =========================
   AUTHOR/ADMIN: UPDATE/DELETE SECTIONS
   ========================= */
const updateSectionSchema = z.object({
  title: z.string().max(200).optional(),
  content: z.string().min(1).optional(),
  orderIndex: z.number().int().min(0).optional(),
  isPreview: z.boolean().optional(),
});

router.put(
  "/:bookId/sections/:sectionId",
  authRequired,
  requireRole("author", "admin"),
  async (req, res) => {
    const { bookId, sectionId } = req.params;

    const parsed = updateSectionSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: "Invalid input" });

    const access = await canAccessBook({ user: req.user, bookId });
    if (!access.ok) return res.status(access.status).json({ error: access.error });

    const existing = await prisma.bookSection.findUnique({
      where: { id: sectionId },
      select: { bookId: true },
    });
    if (!existing) return res.status(404).json({ error: "Not found" });
    if (existing.bookId !== bookId) return res.status(400).json({ error: "Mismatched book/section" });

    const updated = await prisma.bookSection.update({
      where: { id: sectionId },
      data: parsed.data,
      select: { id: true },
    });

    res.json(updated);
  }
);

router.delete(
  "/:bookId/sections/:sectionId",
  authRequired,
  requireRole("author", "admin"),
  async (req, res) => {
    const { bookId, sectionId } = req.params;

    const access = await canAccessBook({ user: req.user, bookId });
    if (!access.ok) return res.status(access.status).json({ error: access.error });

    const existing = await prisma.bookSection.findUnique({
      where: { id: sectionId },
      select: { bookId: true },
    });
    if (!existing) return res.status(404).json({ error: "Not found" });
    if (existing.bookId !== bookId) return res.status(400).json({ error: "Mismatched book/section" });

    await prisma.bookSection.delete({ where: { id: sectionId } });
    res.json({ ok: true });
  }
);

/* =========================
   AUTHOR/ADMIN: UPDATE BOOK
   ========================= */
const updateBookSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).optional(),
  blurb: z.string().max(2000).optional(),
  subtitle: z.string().max(200).optional().nullable(),
  language: z.string().max(20).optional().nullable(),
  genre_id: z.union([z.number().int(), z.string()]).optional().nullable(),
  genreId: z.string().optional().nullable(),
  status: z.enum(["draft", "published", "paused"]).optional(),
});

router.put("/:id", authRequired, requireRole("author", "admin"), async (req, res) => {
  const bookId = req.params.id;

  const parsed = updateBookSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid input" });

  const access = await canAccessBook({ user: req.user, bookId });
  if (!access.ok) return res.status(access.status).json({ error: access.error });

  const d = parsed.data;
  const data = { ...d };

  if (typeof d.description === "string") data.blurb = d.description;
  delete data.description;

  if (d.genre_id !== undefined) data.genreId = d.genre_id === null ? null : String(d.genre_id);
  delete data.genre_id;

  const updated = await prisma.book.update({
    where: { id: bookId },
    data,
    select: { id: true },
  });

  res.json(updated);
});

/* =========================
   ADMIN: DELETE BOOK (CASCADE DELETES SECTIONS/PREVIEWS)
   ========================= */
router.delete("/:id", authRequired, requireRole("admin"), async (req, res) => {
  const bookId = req.params.id;

  const existing = await prisma.book.findUnique({
    where: { id: bookId },
    select: { id: true },
  });
  if (!existing) return res.status(404).json({ error: "Book not found" });

  await prisma.book.delete({ where: { id: bookId } });
  res.json({ ok: true });
});

export default router;
