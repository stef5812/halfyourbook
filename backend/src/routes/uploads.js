import { Router } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { authRequired } from "../lib/auth.js";

const router = Router();

const uploadDir = path.join(process.cwd(), "uploads", "authors");
fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const ext = (path.extname(file.originalname) || "").toLowerCase();
    const safeExt = [".jpg", ".jpeg", ".png", ".webp"].includes(ext) ? ext : ".jpg";
    cb(null, `${req.user.sub}-${Date.now()}${safeExt}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
});

router.post("/author-photo", authRequired, upload.single("file"), async (req, res) => {
  console.log("UPLOAD DEBUG", {
    contentType: req.headers["content-type"],
    hasFile: !!req.file,
    bodyKeys: Object.keys(req.body || {}),
  });

  if (!req.file) return res.status(400).json({ error: "No file uploaded" });

  const url = `/uploads/authors/${req.file.filename}`;
  res.json({ url });
});


router.post("/author-photo", authRequired, upload.single("file"), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: "No file uploaded" });

  // URL that matches express.static("/uploads" ...)
  const url = `/uploads/authors/${req.file.filename}`;
  res.json({ url });
});

export default router;
