//backend/src/routes/admin.js

import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import { authRequired, requireRole } from "../lib/auth.js";

const router = Router();

// ADMIN: list users
router.get("/users", authRequired, requireRole("admin"), async (req, res) => {
  const users = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      email: true,
      displayName: true,
      role: true,
      createdAt: true,
    },
  });

  res.json({ items: users });
});

// ADMIN: delete user (and cascade related data)
router.delete("/users/:id", authRequired, requireRole("admin"), async (req, res) => {
  const id = req.params.id;

  // guard: don't let admin delete themselves by accident (optional but recommended)
  if (req.user?.sub === id) {
    return res.status(400).json({ error: "You cannot delete your own account." });
  }

  const existing = await prisma.user.findUnique({ where: { id }, select: { id: true } });
  if (!existing) return res.status(404).json({ error: "User not found" });

  await prisma.user.delete({ where: { id } });

  res.json({ ok: true });
});

export default router;
