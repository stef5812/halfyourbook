import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../lib/api";

export default function AdminUsers() {
  const [me, setMe] = useState(null);
  const [items, setItems] = useState([]);
  const [err, setErr] = useState("");
  const [msg, setMsg] = useState("");
  const [busyId, setBusyId] = useState("");

  async function load() {
    setErr("");
    setMsg("");

    try {
      const m = await api("/api/users/me");
      setMe(m || null);

      const data = await api("/api/admin/users");
      setItems(Array.isArray(data?.items) ? data.items : []);
    } catch (e) {
      setErr(e.message || "Failed to load");
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function deleteUser(userId) {
    const ok = window.confirm("Delete this user? This cannot be undone.");
    if (!ok) return;

    setBusyId(userId);
    setErr("");
    setMsg("");

    try {
      await api(`/api/admin/users/${userId}`, { method: "DELETE" });
      setItems((prev) => prev.filter((u) => u.id !== userId));
      setMsg("User deleted.");
    } catch (e) {
      setErr(e.message || "Failed to delete user");
    } finally {
      setBusyId("");
    }
  }

  if (me && me.role !== "admin") {
    return (
      <div className="page">
        <div className="card">Admin only.</div>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="pageHeader">
        <div className="pageTitle">Admin • Users</div>
        <div className="pageSub">View and remove users.</div>
      </div>

      {err ? <div className="card">{err}</div> : null}
      {msg ? <div className="card">{msg}</div> : null}

      <div className="card">
        <div className="cardHeader">
          <div className="cardTitle">Users</div>
          <div className="cardSub">{items.length} total</div>
        </div>

        <div style={{ padding: 16, display: "grid", gap: 10 }}>
          {items.map((u) => (
            <div
              key={u.id}
              style={{
                border: "1px solid #e2e6ea",
                borderRadius: 10,
                padding: 12,
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: 12,
              }}
            >
              <div style={{ minWidth: 0 }}>
                <div style={{ fontWeight: 700 }}>{u.displayName}</div>
                <div style={{ fontSize: 13, opacity: 0.85 }}>
                  {u.email} • {u.role}
                </div>
              </div>

              <button
                className="btn"
                type="button"
                onClick={() => deleteUser(u.id)}
                disabled={busyId === u.id}
              >
                {busyId === u.id ? "Deleting…" : "Delete"}
              </button>
            </div>
          ))}
        </div>

        <div style={{ padding: 16, display: "flex", gap: 10 }}>
          <button className="btn" type="button" onClick={load}>
            Refresh
          </button>
          <Link className="btn btnSecondary" to="/admin">
            Back
          </Link>
        </div>
      </div>
    </div>
  );
}
