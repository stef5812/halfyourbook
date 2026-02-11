// backend/src/routes/books.js
import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { authRequired, requireRole } from "../lib/auth.js";
import { canAccessBook } from "../lib/permissions.js";

import fs from "fs";
import fsp from "fs/promises";
import os from "os";
import path from "path";
import crypto from "crypto";
import sharp from "sharp";

import Epub from "epub-gen";

import multer from "multer";

const upload = multer({
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
});

console.log("✅ LOADED books router:", new Date().toISOString(), "FILE:", import.meta.url);


const router = Router();

const BOOK_STATUSES = ["draft", "an_idea", "unedited", "edited", "to_publish", "published", "paused"];

// ✅ MUST be before router.get("/:id")
router.get("/__debug/statuses", (req, res) => {
  res.json({ BOOK_STATUSES });
});

/* =========================
   PUBLIC (FOR NOW): LIST ALL BOOKS
   + optional filters: ?status=published&genreId=...
   ========================= */
router.get("/", async (req, res) => {
  try {
    const { status, genreId } = req.query;

    const where = {};

    if (status && BOOK_STATUSES.includes(status)) {
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
        coverUrl: true,
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

          coverUrl: b.coverUrl ?? null,

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
        authorId: true, // ✅ ADD THIS
        coverUrl: true,
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
      authorId: book.authorId, // ✅ ADD THIS LINE
      coverUrl: book.coverUrl ?? null, // ✅ ADD THIS
      title: book.title,
      subtitle: book.subtitle ?? null,
      language: book.language ?? null,
      status: book.status,
      description: book.blurb ?? "",
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
   PUBLIC: DOWNLOAD EPUB FOR ANY BOOK (draft/published/paused)
   GET /api/books/:id/epub?previewOnly=1
   ========================= */

   function safeFilename(s = "book") {
    return String(s)
      .replace(/[^\w\d\-_. ]+/g, "")
      .trim()
      .replace(/\s+/g, " ")
      .slice(0, 120) || "book";
  }
  
  function absUploadsPath(relativeUrl) {
    // relativeUrl like "/uploads/covers/book-123.png"
    // Your backend serves uploads from: backend/uploads
    return path.join(process.cwd(), "uploads", relativeUrl.replace(/^\/uploads\//, ""));
  }
  
  async function fileExists(p) {
    try { await fsp.access(p); return true; } catch { return false; }
  }
  
  // If coverUrl is remote (https) OR local (/uploads/...), return a local temp JPG path for epub-gen
  async function resolveCoverToTempJpg(book) {
    // Adjust field name if yours differs (coverUrl / coverImage / coverPath etc.)
    const coverUrl = book.coverUrl;

    if (!coverUrl) return null;
  
    // 1) Determine input buffer
    let inputBuffer = null;
  
    if (typeof coverUrl === "string" && coverUrl.startsWith("/uploads/")) {
      const p = absUploadsPath(coverUrl);
      if (!(await fileExists(p))) return null;
      inputBuffer = await fsp.readFile(p);
    } else if (typeof coverUrl === "string" && /^https?:\/\//i.test(coverUrl)) {
      // Node 18+ has global fetch
      const r = await fetch(coverUrl);
      if (!r.ok) return null;
      const arr = await r.arrayBuffer();
      inputBuffer = Buffer.from(arr);
    } else {
      return null;
    }
  
    // 2) Write a normalized JPEG cover to temp file
    const tmpCover = path.join(
      os.tmpdir(),
      `hyb-cover-${book.id}-${crypto.randomUUID()}.jpg`
    );
  
    await sharp(inputBuffer)
      .resize({ width: 1600, height: 2560, fit: "cover" })
      .jpeg({ quality: 85 })
      .toFile(tmpCover);
  
    return tmpCover;
  }
  

   function escapeHtml(s = "") {
    return String(s)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }
  
  function textToHtml(text = "") {
    const safe = escapeHtml(text);
    const paras = safe
      .split(/\n{2,}/)
      .map((p) => p.trim())
      .filter(Boolean)
      .map((p) => `<p>${p.replaceAll("\n", "<br/>")}</p>`)
      .join("\n");
  
    return `<!doctype html><html><head><meta charset="utf-8"/></head><body>${paras}</body></html>`;
  }
  
  function safeSlug(s = "book") {
    return String(s)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "")
      .slice(0, 80) || "book";
  }
  
  router.get("/:id/epub", async (req, res) => {
    let tmpDir = null;
    let coverTmpPath = null;
  
    try {
      const id = req.params.id;
      const previewOnly =
        req.query.previewOnly === "1" ||
        req.query.previewOnly === "true" ||
        req.query.previewOnly === "yes";
  
      const book = await prisma.book.findFirst({
        where: { id },
        select: {
          id: true,
          title: true,
          subtitle: true,
          blurb: true,
          status: true,
          language: true,
          authorId: true,
          coverUrl: true, // ✅ needed
          author: { select: { displayName: true, email: true } },
          sections: {
            orderBy: { orderIndex: "asc" },
            select: { title: true, content: true, orderIndex: true, isPreview: true },
          },
        },
      });
  
      if (!book) return res.status(404).json({ error: "Book not found" });
  
      const sections = previewOnly
        ? (book.sections || []).filter((s) => s.isPreview)
        : (book.sections || []);
  
      if (!sections.length) {
        return res
          .status(400)
          .json({ error: previewOnly ? "No preview sections to export" : "No sections to export" });
      }
  
      const chapters = sections.map((s, idx) => ({
        title: s.title || `Chapter ${idx + 1}`,
        data: textToHtml(s.content || ""),
      }));
  
      // ✅ COVER
      coverTmpPath = await resolveCoverToTempJpg(book);
  
      // Temp output
      tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "hyb-epub-"));
      const baseName = safeSlug(book.title || "book");
      const filename = `${safeFilename(baseName)}${previewOnly ? "-preview" : ""}.epub`;
      const outPath = path.join(tmpDir, filename);
  
      await new Epub({
        title: book.title || "Untitled",
        author: book.author?.displayName || book.author?.email || "Unknown",
        description: book.blurb || "",
        lang: book.language || "en",
        output: outPath,
        content: chapters,
  
        // ✅ makes it a real EPUB cover
        ...(coverTmpPath ? { cover: coverTmpPath } : {}),
      }).promise;
  
      res.setHeader("Content-Type", "application/epub+zip");
      res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
  
      const stream = fs.createReadStream(outPath);
      stream.pipe(res);
  
      const cleanup = async () => {
        try { if (tmpDir) await fsp.rm(tmpDir, { recursive: true, force: true }); } catch {}
        try { if (coverTmpPath) await fsp.unlink(coverTmpPath); } catch {}
      };
  
      stream.on("close", cleanup);
      stream.on("error", cleanup);
      res.on("close", cleanup);
    } catch (e) {
      console.error("GET /api/books/:id/epub failed:", e);
      res.status(500).json({ error: "Failed to generate EPUB" });
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

  status: z.enum(BOOK_STATUSES).optional(),

  tags: z.array(z.string().min(1).max(40)).optional(),
  purchaseLinks: z
    .array(z.object({ label: z.string().min(1).max(60), url: z.string().url().max(2000) }))
    .optional(),
});

router.post("/", authRequired, requireRole("author", "admin"), async (req, res) => {
  console.log("CREATE BOOK status:", req.body?.status, "allowed:", BOOK_STATUSES);
  const parsed = createBookSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid input", issues: parsed.error.issues });
  }


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

  res.json({ id: book.id, authorId: book.authorId });
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

router.post(
  "/:id/cover",
  authRequired,
  requireRole("author", "admin"),
  upload.single("cover"),
  async (req, res) => {
    const bookId = req.params.id;

    const access = await canAccessBook({ user: req.user, bookId });
    if (!access.ok) return res.status(access.status).json({ error: access.error });

    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    // Ensure uploads/covers folder exists
    const coversDir = path.join(process.cwd(), "uploads", "covers");
    await fsp.mkdir(coversDir, { recursive: true });

    const ext = path.extname(req.file.originalname) || ".jpg";
    const filename = `book-${bookId}-${crypto.randomUUID()}${ext}`;
    const filepath = path.join(coversDir, filename);

    await sharp(req.file.buffer)
      .resize({ width: 1600, height: 2560, fit: "cover" })
      .jpeg({ quality: 85 })
      .toFile(filepath);

    const publicPath = `/uploads/covers/${filename}`;

    await prisma.book.update({
      where: { id: bookId },
      data: { coverUrl: publicPath },
    });

    res.json({ coverUrl: publicPath });
  }
);


router.post("/:id/sections", authRequired, requireRole("author", "admin"), async (req, res) => {
  const bookId = req.params.id;

  const parsed = addSectionSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid input", issues: parsed.error.issues });
  }
  

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
    if (!parsed.success) {
      return res.status(400).json({ error: "Invalid input", issues: parsed.error.issues });
    }
    

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
  status: z.enum(BOOK_STATUSES).optional(),
});

router.put("/:id", authRequired, requireRole("author", "admin"), async (req, res) => {
  const bookId = req.params.id;

  const parsed = updateBookSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid input", issues: parsed.error.issues });
  }
  

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
router.delete("/:id", authRequired, requireRole("admin", "author"), async (req, res) => {
  const bookId = req.params.id;

  const existing = await prisma.book.findUnique({
    where: { id: bookId },
    select: { id: true },
  });
  if (!existing) return res.status(404).json({ error: "Book not found" });

  await prisma.book.delete({ where: { id: bookId } });
  res.json({ ok: true });
});

console.log(
  "✅ books router routes:",
  router.stack
    .filter((l) => l.route)
    .map((l) => {
      const method = Object.keys(l.route.methods)[0]?.toUpperCase();
      return `${method} ${l.route.path}`;
    })
);


export default router;
