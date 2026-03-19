// backend/src/lib/parmissions.js

import { prisma } from "./prisma.js";

export async function canAccessBook({ user, bookId }) {
  if (!user) {
    return { ok: false, status: 401, error: "Unauthorized" };
  }

  const authUserId = user.sub ?? user.id ?? null;

  const roles = [
    ...(Array.isArray(user.roles) ? user.roles : []),
    ...(Array.isArray(user.appRoles) ? user.appRoles.map((r) => r?.role) : []),
    ...(user.role ? [user.role] : []),
  ]
    .filter(Boolean)
    .map((r) => String(r).toLowerCase());

  const isAdmin = roles.includes("admin");

  if (isAdmin) {
    return { ok: true };
  }

  const book = await prisma.book.findUnique({
    where: { id: bookId },
    select: {
      id: true,
      author: {
        select: {
          userId: true,
        },
      },
    },
  });

  if (!book) {
    return { ok: false, status: 404, error: "Book not found" };
  }

  if (book.author?.userId !== authUserId) {
    return { ok: false, status: 403, error: "Forbidden" };
  }

  return { ok: true };
}
