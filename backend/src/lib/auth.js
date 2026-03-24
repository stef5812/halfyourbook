// backend/src/lib/auth.js
import jwt from "jsonwebtoken";

export function signJwt(payload) {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("JWT_SECRET missing");
  return jwt.sign(payload, secret, { expiresIn: "7d" });
}

function getAuthMeUrl() {
  const url = process.env.AUTH_ME_URL;

  if (!url) {
    throw new Error(
      "AUTH_ME_URL is not set. Please define it in your .env file."
    );
  }

  return url;
}

export async function authRequired(req, res, next) {
  try {
    const cookie = req.headers.cookie || "";
    console.log("HYB incoming cookie:", cookie ? "present" : "missing");

    if (!cookie) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const authMeUrl = getAuthMeUrl();
    console.log("Calling auth/me at:", authMeUrl);

    const response = await fetch(authMeUrl, {
      method: "GET",
      headers: {
        cookie,
        accept: "application/json",
      },
    });

    console.log("auth/me status:", response.status);

    if (!response.ok) {
      const text = await response.text();
      console.log("auth/me body:", text);
      return res.status(401).json({ error: "Not authenticated" });
    }

    const data = await response.json();
    console.log("auth/me user:", data?.user?.id);

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