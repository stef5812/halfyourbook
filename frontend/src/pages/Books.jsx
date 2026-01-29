// src/pages/Books.jsx
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, getToken } from "../lib/api";
import "./Books.css";

export default function Books() {
  const [items, setItems] = useState([]);
  const [err, setErr] = useState("");
  const [me, setMe] = useState(null);
  const [busyId, setBusyId] = useState("");

  useEffect(() => {
    (async () => {
      setErr("");

      // 1) Always load public books (works for everyone)
      try {
        const data = await api("/api/books");
        setItems(Array.isArray(data?.items) ? data.items : []);
      } catch (e) {
        setErr(e.message || "Failed to load books");
        return; // if books fail, nothing else matters
      }

      // 2) Optionally load current user (only to show Edit/Delete)
      // If not logged in, /users/me will 401 — that's OK and should be silent.
      try {
        const token = getToken?.() || localStorage.getItem("token");
        if (!token) {
          setMe(null);
          return;
        }

        const m = await api("/api/users/me");
        setMe(m || null);
      } catch {
        // IMPORTANT: ignore 401 here; it just means "guest"
        setMe(null);
      }
    })();
  }, []);

  function canEditBook(b) {
    if (!me) return false;
    if (me.role === "admin") return true;
    return Boolean(me.id && b.authorId && me.id === b.authorId);
  }

  async function deleteBook(bookId) {
    const ok = window.confirm(
      "Delete this book and ALL its sections/previews? This cannot be undone."
    );
    if (!ok) return;

    setBusyId(bookId);
    setErr("");

    try {
      await api(`/api/books/${bookId}`, { method: "DELETE" });
      setItems((prev) => prev.filter((b) => b.id !== bookId));
    } catch (e) {
      setErr(e.message || "Failed to delete");
    } finally {
      setBusyId("");
    }
  }

  return (
    <div className="booksHero">
      <div className="booksOverlay">
        <div className="page">
          <div className="pageHeader">
            <div className="pageTitle">Book previews</div>
            <div className="pageSub">
              Read large preview chunks, then buy directly from the author.
            </div>
          </div>

          {err ? <div className="card">{err}</div> : null}

          {items.map((b) => (
            <div className="card" key={b.id}>
              <div className="cardHeader">
                <div
                  style={{
                    display: "flex",
                    gap: 10,
                    alignItems: "baseline",
                    flexWrap: "wrap",
                  }}
                >
                  <div className="cardTitle">{b.title}</div>

                  {/* Status badge */}
                  <span
                    style={{
                      fontSize: 12,
                      padding: "3px 10px",
                      borderRadius: 999,
                      border: "1px solid rgba(0,0,0,0.15)",
                      opacity: 0.85,
                    }}
                  >
                    {b.status || "draft"}
                  </span>
                </div>

                <div className="cardSub">
                  by {b.authorName || "Unknown author"}
                  {b.tags?.length ? ` • ${b.tags.join(", ")}` : ""}
                </div>
              </div>

              <div style={{ padding: "0 16px 16px" }}>
                <div style={{ marginBottom: 12, opacity: 0.9 }}>
                  <strong>Genre:</strong> {b.genreName || b.genreId || "—"}
                </div>

                {/* ✅ NEW: 100-word snippet from first section */}
                {b.preview ? (
                  <div
                    style={{
                      margin: "12px 0 14px",
                      opacity: 0.9,
                      lineHeight: 1.5,
                    }}
                  >
                    {b.preview}
                  </div>
                ) : (
                  <div style={{ margin: "12px 0 14px", opacity: 0.6 }}>
                    No preview available yet.
                  </div>
                )}

                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <Link className="btn btnPrimary" to={`/books/${b.id}`}>
                    Read preview
                  </Link>

                  {canEditBook(b) ? (
                    <>
                      <Link className="btn btnSecondary" to={`/dashboard?bookId=${b.id}`}>
                        Edit
                      </Link>

                      <button
                        className="btn"
                        type="button"
                        disabled={busyId === b.id}
                        onClick={() => deleteBook(b.id)}
                      >
                        {busyId === b.id ? "Deleting…" : "Delete"}
                      </button>
                    </>
                  ) : null}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
