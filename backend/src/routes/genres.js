// backend/src/routes/genres.js
import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";

const router = Router();

// Public: list genres for dropdown
router.get("/", async (req, res) => {
  const genres = await prisma.genre.findMany({
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });
  res.json(genres);
});

// Create genre (you can later lock this to author/admin if you want)
const createGenreSchema = z.object({
  name: z.string().min(1).max(60),
});

router.post("/", async (req, res) => {
  const parsed = createGenreSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid input" });

  const name = parsed.data.name.trim();

  const genre = await prisma.genre.upsert({
    where: { name },      // requires Genre.name to be UNIQUE in Prisma schema
    update: {},
    create: { name },
    select: { id: true, name: true },
  });

  res.json(genre);
});

export default router;
