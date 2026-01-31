import "dotenv/config";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import path from "path";

import authRoutes from "./src/routes/auth.js";
import booksRoutes from "./src/routes/books.js";
import genresRoutes from "./src/routes/genres.js";
import usersRoutes from "./src/routes/users.js";
import uploadsRoutes from "./src/routes/uploads.js";
import adminRoutes from "./src/routes/admin.js";
import authorsRouter from "./src/routes/authors.js";



const app = express(); // ✅ MUST come before app.use

app.use(helmet());
app.use(express.json({ limit: "2mb" }));
app.use("/api/admin", adminRoutes);
app.use("/api/authors", authorsRouter);



app.use(
  cors({
    origin: process.env.APP_BASE_URL || "http://localhost:5173",
    credentials: false, // Bearer token
  })
);

// ✅ Serve uploaded files publicly
app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 50,
  standardHeaders: true,
  legacyHeaders: false,
});

app.get("/api/health", (req, res) => res.json({ ok: true }));

app.use("/api/auth", authLimiter, authRoutes);
app.use("/api/books", booksRoutes);
app.use("/api/genres", genresRoutes); // ✅ only once
app.use("/api/users", usersRoutes);
app.use("/api/uploads", uploadsRoutes);

const port = Number(process.env.PORT || 3001);
app.listen(port, () => {
  console.log(`HalfYourBook API on http://localhost:${port}`);
});
