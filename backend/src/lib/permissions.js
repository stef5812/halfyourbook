import { prisma } from "./prisma.js";

export async function canAccessBook({ user, bookId }) {
  const book = await prisma.book.findUnique({
    where: { id: bookId },
    select: { authorId: true },
  });

  if (!book) return { ok: false, status: 404, error: "Not found" };

  const isAdmin = user.role === "admin";
  const isOwner = book.authorId === user.sub;

  if (!isAdmin && !isOwner) return { ok: false, status: 403, error: "Forbidden" };

  return { ok: true, book };
}
