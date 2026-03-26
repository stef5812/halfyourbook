// backend/src/routes/auth.js
import { Router } from "express";
import bcrypt from "bcrypt";
import crypto from "crypto";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { signJwt } from "../lib/auth.js";
import { sendMail } from "../lib/mailer.js";

const router = Router();

const registerSchema = z.object({
  email: z.string().email().max(255),
  password: z.string().min(8).max(200),
  displayName: z.string().min(1).max(80),
  role: z.enum(["reader", "author"]).optional(),
});

router.post("/register", async (req, res) => {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid input" });

  const { email, password, displayName, role } = parsed.data;

  const exists = await prisma.user.findUnique({ where: { email } });
  if (exists) return res.status(409).json({ error: "Email already registered" }); // generic-ish

  const passwordHash = await bcrypt.hash(password, 12);

  const user = await prisma.user.create({
    data: {
      email,
      displayName,
      passwordHash,
      role: role ?? "reader",
      ...(role === "author" ? { authorProfile: { create: {} } } : {}),
    },
    select: { id: true, email: true, role: true, displayName: true },
  });

  const token = signJwt({ sub: user.id, email: user.email, role: user.role });
  res.json({ token, user });
});

const loginSchema = z.object({
  email: z.string().email().max(255),
  password: z.string().min(1).max(200),
});

r.post("/register-author", requireAuth(prisma), async (req, res) => {
  try {
    const userId = req.user?.id || req.user?.userId || req.user?.sub;

    if (!userId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const existing = await prisma.userAppRole.findUnique({
      where: {
        userId_app: {
          userId,
          app: "HALFYOURBOOK",
        },
      },
    });

    if (!existing) {
      await prisma.userAppRole.create({
        data: {
          userId,
          app: "HALFYOURBOOK",
          role: "AUTHOR",
        },
      });
    } else if (existing.role !== "AUTHOR" && existing.role !== "ADMIN") {
      await prisma.userAppRole.update({
        where: {
          userId_app: {
            userId,
            app: "HALFYOURBOOK",
          },
        },
        data: {
          role: "AUTHOR",
        },
      });
    }

    return res.json({
      ok: true,
      message: "AUTHOR access granted for HalfYourBook",
    });
  } catch (error) {
    console.error("POST /auth/register-author failed", error);
    return res.status(500).json({
      error: "Failed to register as author",
    });
  }
});

router.post("/login", async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid credentials" });

  const { email, password } = parsed.data;

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return res.status(401).json({ error: "Invalid credentials" });

  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) return res.status(401).json({ error: "Invalid credentials" });

  const token = signJwt({ sub: user.id, email: user.email, role: user.role });
  res.json({
    token,
    user: { id: user.id, email: user.email, role: user.role, displayName: user.displayName },
  });
});

const forgotSchema = z.object({ email: z.string().email().max(255) });

router.post("/forgot", async (req, res) => {
  const parsed = forgotSchema.safeParse(req.body);
  // Always return ok:true regardless (anti-enumeration)
  if (!parsed.success) return res.json({ ok: true });

  const { email } = parsed.data;

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return res.json({ ok: true });

  // token (plain) -> store hash only
  const token = crypto.randomBytes(32).toString("hex");
  const tokenHash = crypto.createHash("sha256").update(token).digest("hex");

  const minutes = 20;
  const expiresAt = new Date(Date.now() + minutes * 60 * 1000);

  await prisma.passwordReset.create({
    data: { userId: user.id, tokenHash, expiresAt },
  });

  const base = process.env.APP_BASE_URL || "http://localhost:5173";
  const resetUrl = `${base}/reset?token=${token}`;

  await sendMail({
    to: email,
    subject: "Reset your HalfYourBook password",
    text: `Use this link to reset your password (valid ${minutes} minutes):\n\n${resetUrl}\n\nIf you didn't request this, ignore this email.`,
  });

  res.json({ ok: true });
});

const resetSchema = z.object({
  token: z.string().min(10),
  newPassword: z.string().min(8).max(200),
});

router.post("/reset", async (req, res) => {
  const parsed = resetSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid input" });

  const { token, newPassword } = parsed.data;
  const tokenHash = crypto.createHash("sha256").update(token).digest("hex");

  const pr = await prisma.passwordReset.findFirst({
    where: { tokenHash },
    orderBy: { createdAt: "desc" },
  });

  // Generic errors
  if (!pr) return res.status(400).json({ error: "Invalid or expired token" });
  if (pr.usedAt) return res.status(400).json({ error: "Invalid or expired token" });
  if (pr.expiresAt.getTime() < Date.now()) return res.status(400).json({ error: "Invalid or expired token" });

  const passwordHash = await bcrypt.hash(newPassword, 12);

  await prisma.$transaction([
    prisma.user.update({ where: { id: pr.userId }, data: { passwordHash } }),
    prisma.passwordReset.update({ where: { id: pr.id }, data: { usedAt: new Date() } }),
  ]);

  res.json({ ok: true });
});

export default router;
