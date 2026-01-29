// frontend/src/lib/api.js

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

  const url = path.startsWith("/api") ? path : `/api${path}`;

  const res = await fetch(url, {
    ...opts,
    headers: {
      // ✅ IMPORTANT:
      // Don't set Content-Type for FormData — the browser must set the boundary header.
      ...(isForm ? {} : { "Content-Type": "application/json" }),

      ...(token ? { Authorization: `Bearer ${token}` } : {}),

      ...(opts.headers || {}),
    },
  });

  const ct = res.headers.get("content-type") || "";
  const isJson = ct.includes("application/json");
  const data = isJson ? await res.json() : await res.text();

  if (!res.ok) throw new Error(data?.error || "Request failed");
  return data;
}
