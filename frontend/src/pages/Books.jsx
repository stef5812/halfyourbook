// src/pages/Books.jsx
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { api, getToken } from "../lib/api";
import "./Books.css";

const BASE = import.meta.env.DEV ? "" : "/halfyourbook";

export default function Books() {
  const [items, setItems] = useState([]);
  const [genres, setGenres] = useState([]);

  const [status, setStatus] = useState("");   // "" = all
  const [genreId, setGenreId] = useState(""); // "" = all
  const [q, setQ] = useState("");             // client-side search

  const [err, setErr] = useState("");
  const [me, setMe] = useState(null);
  const [busyId, setBusyId] = useState("");
  const [loading, setLoading] = useState(true);

  // Load genres once (optional; page still works without it)
  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const g = await api("/api/genres");
        if (!cancelled) setGenres(Array.isArray(g) ? g : Array.isArray(g?.items) ? g.items : []);
        
      } catch {
        if (!cancelled) setGenres([]);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  // Load me once (only used for Edit/Delete)
  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const token = getToken?.() || localStorage.getItem("token");
        if (!token) {
          if (!cancelled) setMe(null);
          return;
        }

        const m = await api("/api/users/me");
        if (!cancelled) setMe(m || null);
      } catch {
        if (!cancelled) setMe(null);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  // Load books whenever filters change
  useEffect(() => {
    let cancelled = false;

    (async () => {
      setErr("");
      setLoading(true);

      try {
        const qs = new URLSearchParams();
        if (status) qs.set("status", status);
        if (genreId) qs.set("genreId", genreId);

        const url = `/api/books${qs.toString() ? `?${qs.toString()}` : ""}`;
        const data = await api(url);

        if (!cancelled) setItems(Array.isArray(data?.items) ? data.items : []);
      } catch (e) {
        if (!cancelled) setErr(e.message || "Failed to load books");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [status, genreId]);

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

  // Client-side search (doesn't hit backend)
  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return items;

    return items.filter((b) => {
      const hay = `${b?.title ?? ""} ${b?.authorName ?? ""} ${b?.genreName ?? ""} ${b?.description ?? ""}`.toLowerCase();
      return hay.includes(needle);
    });
  }, [items, q]);

  const hasActiveFilters = Boolean(status || genreId || q);

  return (


    
    <div className="booksHero underHeader">
      <div className="booksOverlay">
        <div className="page">
          <div className="pageHeader">

          <div style={{ marginBottom: 12 }}>
            <Link className="btn btnSecondary" to="/">
              ← Home
            </Link>
          </div>


            <div className="pageTitle">Book previews</div>
            <div className="pageSub">
              Read large preview chunks, then buy directly from the author.
            </div>
          </div>

          {/* ✅ Filters bar (uses existing layout + minimal new classes) */}
          <div className="booksFiltersBar">
            <div className="booksFilterItem">
              <div className="booksFilterLabel">Genre</div>
              <select
                className="booksFilterSelect"
                value={genreId}
                onChange={(e) => setGenreId(e.target.value)}
              >
                <option value="">All genres</option>
                {genres.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="booksFilterItem">
              <div className="booksFilterLabel">Status</div>
              <select
                className="booksFilterSelect"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
              >
                <option value="">All statuses</option>
                <option value="an_idea">An Idea</option>
                <option value="unedited">Unedited</option>
                <option value="edited">Edited </option>
                <option value="to_publish">to Publish</option>
                <option value="published">Published</option>
              </select>
            </div>

            <div className="booksFilterItem booksFilterSearch">
              <div className="booksFilterLabel">Search</div>
              <input
                className="booksFilterInput"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search title, author, genre…"
                aria-label="Search books"
              />
            </div>

            <button
              type="button"
              className="btn btnSecondary"
              disabled={!hasActiveFilters}
              onClick={() => {
                setStatus("");
                setGenreId("");
                setQ("");
              }}
            >
              Clear
            </button>
          </div>

          {err ? <div className="card">{err}</div> : null}
          {loading ? <div className="booksLoading">Loading…</div> : null}

          {!loading && !err && filtered.length === 0 ? (
            <div className="card">No books match those filters.</div>
          ) : null}

          {filtered.map((b) => (
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

                {/* 100-word snippet from first section */}
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

                  <button
                    className="btn"
                    type="button"
                    onClick={() => {
                      window.location.href = `${BASE}/api/books/${b.id}/epub?previewOnly=1`;
                    }}
                  >
                    Download EPUB
                  </button>      

                  {/* {canEditBook(b) ? (
                    <button
                      className="btn btnSecondary"
                      type="button"
                      onClick={() => {
                        window.location.href = `${BASE}/api/books/${b.id}/epub`;
                      }}
                    >
                      Download Full EPUB
                    </button>
                  ) : null}                               */}

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
