// backend/src/lib/auth.js
import jwt from "jsonwebtoken";

export function signJwt(payload) {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("JWT_SECRET missing");
  return jwt.sign(payload, secret, { expiresIn: "7d" });
}

function getAuthMeUrl() {
  // In production you can set AUTH_ME_URL explicitly if you want
  if (process.env.AUTH_ME_URL) return process.env.AUTH_ME_URL;

  // Default guesses
  if (process.env.NODE_ENV === "production") {
    return "https://auth.stefandodds.ie/auth/me";
  }

  // local dev
  return "http://127.0.0.1:3001/auth/me";
}

export async function authRequired(req, res, next) {
  try {
    const cookie = req.headers.cookie || "";
    if (!cookie) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const authMeUrl = getAuthMeUrl();

    const response = await fetch(authMeUrl, {
      method: "GET",
      headers: {
        cookie,
        accept: "application/json",
      },
    });

    if (!response.ok) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const data = await response.json();

    if (!data?.user?.id) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const appRoles = Array.isArray(data.appRoles) ? data.appRoles : [];
    const hybRoleEntry = appRoles.find((r) => r.app === "HALFYOURBOOK");

    req.user = {
      sub: data.user.id,
      email: data.user.email || null,
      displayName: data.user.displayName || null,
      role: hybRoleEntry?.role || null,
      appRoles,
      authUser: data.user,
    };

    next();
  } catch (err) {
    console.error("authRequired failed:", err);
    return res.status(401).json({ error: "Not authenticated" });
  }
}

export function requireRole(...roles) {
  return (req, res, next) => {
    const userRole = String(req.user?.role || "").toLowerCase();
    const allowed = roles.map((r) => String(r).toLowerCase());

    if (!userRole || !allowed.includes(userRole)) {
      return res.status(403).json({ error: "Forbidden" });
    }

    next();
  };
}