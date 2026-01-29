import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../lib/api";

export default function AdminBooks() {
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

      const data = await api("/api/books");
      setItems(Array.isArray(data?.items) ? data.items : []);
    } catch (e) {
      setErr(e.message || "Failed to load");
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function deleteBook(bookId) {
    const ok = window.confirm("Delete this book and ALL its sections/previews?");
    if (!ok) return;

    setBusyId(bookId);
    setErr("");
    setMsg("");

    try {
      await api(`/api/books/${bookId}`, { method: "DELETE" });
      setItems((prev) => prev.filter((b) => b.id !== bookId));
      setMsg("Book deleted.");
    } catch (e) {
      setErr(e.message || "Failed to delete book");
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
        <div className="pageTitle">Admin • Books</div>
        <div className="pageSub">View and remove books.</div>
      </div>

      {err ? <div className="card">{err}</div> : null}
      {msg ? <div className="card">{msg}</div> : null}

      <div className="card">
        <div className="cardHeader">
          <div className="cardTitle">Books</div>
          <div className="cardSub">{items.length} total</div>
        </div>

        <div style={{ padding: 16, display: "grid", gap: 10 }}>
          {items.map((b) => (
            <div
              key={b.id}
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
                <div style={{ fontWeight: 700 }}>{b.title}</div>
                <div style={{ fontSize: 13, opacity: 0.85 }}>
                  by {b.authorName} • {b.status}
                </div>
              </div>

              <div style={{ display: "flex", gap: 8 }}>
                <Link className="btn btnSecondary" to={`/books/${b.id}`}>
                  View
                </Link>
                <button
                  className="btn"
                  type="button"
                  onClick={() => deleteBook(b.id)}
                  disabled={busyId === b.id}
                >
                  {busyId === b.id ? "Deleting…" : "Delete"}
                </button>
              </div>
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
