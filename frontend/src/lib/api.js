// frontend/src/lib/api.js

export function getToken() {
  return localStorage.getItem("hyb_token") || "";
}

export function setToken(token) {
  if (token) localStorage.setItem("hyb_token", token);
  else localStorage.removeItem("hyb_token");
}

// ✅ In dev: "" (so Vite proxy can handle /api)
// ✅ In prod: "/halfyourbook" (so requests go to /halfyourbook/api/...)
const BASE = import.meta.env.DEV ? "" : "/halfyourbook";

export async function api(path, opts = {}) {
  const token = getToken();
  const isForm = opts.body instanceof FormData;

  // Ensure "/api/..." prefix
  const apiPath = path.startsWith("/api") ? path : `/api${path}`;
  const url = `${BASE}${apiPath}`;

  const res = await fetch(url, {
    ...opts,
    headers: {
      // Don't set Content-Type for FormData — browser must set boundary.
      ...(isForm ? {} : { "Content-Type": "application/json" }),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(opts.headers || {}),
    },
  });

  const ct = res.headers.get("content-type") || "";
  const data = ct.includes("application/json") ? await res.json() : await res.text();

  if (!res.ok) throw new Error(data?.error || "Request failed");
  return data;
}
