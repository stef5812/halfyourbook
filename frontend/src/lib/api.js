// frontend/src/lib/api.js

export const BASE = import.meta.env.DEV ? "" : "/halfyourbook";
export const AUTH_BASE = import.meta.env.DEV ? "" : "https://auth.stefandodds.ie";

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

async function readResponse(res) {
  const ct = res.headers.get("content-type") || "";
  const data = ct.includes("application/json")
    ? await res.json()
    : await res.text();

  if (!res.ok) {
    const msg =
      (typeof data === "string" && data) ||
      data?.error ||
      data?.message ||
      (Array.isArray(data?.issues) ? JSON.stringify(data.issues) : "") ||
      JSON.stringify(data);

    throw new Error(msg || `Request failed (${res.status})`);
  }

  return data;
}

export async function api(path, opts = {}) {
  const isForm = opts.body instanceof FormData;
  const apiPath = path.startsWith("/api") ? path : `/api${path}`;
  const url = `${BASE}${apiPath}`;

  const res = await fetch(url, {
    ...opts,
    credentials: "include",
    headers: {
      ...(isForm ? {} : { "Content-Type": "application/json" }),
      ...(opts.headers || {}),
    },
  });

  return readResponse(res);
}

export async function authApi(path, opts = {}) {
  const authPath = path.startsWith("/auth") ? path : `/auth${path}`;
  const url = `${AUTH_BASE}${authPath}`;

  const res = await fetch(url, {
    ...opts,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(opts.headers || {}),
    },
  });

  return readResponse(res);
}

export async function getCurrentUser() {
  return authApi("/me");
}

export async function getMyAuthorProfile() {
  return api("/users/me");
}

export async function getCurrentUserWithProfile() {
  const me = await getCurrentUser();

  let profile = null;
  if (me?.user) {
    try {
      profile = await getMyAuthorProfile();
    } catch {
      profile = null;
    }
  }

  return {
    ...me,
    profile,
    authorProfile: profile?.authorProfile || null,
  };
}

export async function logout() {
  return authApi("/logout", { method: "POST" });
}