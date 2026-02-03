// frontend/src/lib/api.js

export const BASE = import.meta.env.DEV ? "" : "/halfyourbook";

export function withBase(path = "") {
  if (!path) return "";
  if (/^https?:\/\//i.test(path)) return path;

  const p = path.startsWith("/") ? path : `/${path}`;
  return `${BASE}${p}`;
}

export function getToken() {
  return localStorage.getItem("hyb_token") || "";
}

export function setToken(token) {
  if (token) localStorage.setItem("hyb_token", token);
  else localStorage.removeItem("hyb_token");
}

export async function api(path, opts = {}) {
  const token = getToken();
  const isForm = opts.body instanceof FormData;

  const apiPath = path.startsWith("/api") ? path : `/api${path}`;
  const url = `${BASE}${apiPath}`;

  const res = await fetch(url, {
    ...opts,
    headers: {
      ...(isForm ? {} : { "Content-Type": "application/json" }),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(opts.headers || {}),
    },
  });

  const ct = res.headers.get("content-type") || "";
  const data = ct.includes("application/json")
    ? await res.json()
    : await res.text();

  if (!res.ok) throw new Error(data?.error || "Request failed");
  return data;
}
