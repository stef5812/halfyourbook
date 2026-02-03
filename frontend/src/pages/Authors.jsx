// src/pages/Authors.jsx
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../lib/api";
import "./Authors.css";

import { withBase } from "../lib/api";


export default function Authors() {
  const navigate = useNavigate();
  const [authors, setAuthors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [q, setQ] = useState("");

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        setLoading(true);
        setErr("");
        const data = await api("/api/authors"); // matches AppHeader style
        if (!cancelled) setAuthors(Array.isArray(data) ? data : []);
      } catch (e) {
        if (!cancelled) setErr(e?.message || "Failed to load authors");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return authors;

    return authors.filter((a) => {
      const hay = `${a?.name ?? ""} ${a?.bio ?? ""}`.toLowerCase();
      return hay.includes(needle);
    });
  }, [authors, q]);

  return (
    <div className="authorsHero underHeader">
      <div className="authorsOverlay">
        <div className="authorsInner">
          <div className="authorsHeader">

            
            <div className="authorsTitle">Authors</div>
            <div className="authorsSub">
              Browse creators and explore their book previews.
            </div>
          </div>

          {/* Search / count */}
          {!loading && !err && authors.length > 0 && (
            <div className="authorsTools">
              <input
                className="authorsSearch"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search authors…"
                aria-label="Search authors"
              />
              <div className="authorsCount">
                {filtered.length} {filtered.length === 1 ? "author" : "authors"}
              </div>
            </div>
          )}

          {loading && <div className="authorsState">Loading authors…</div>}

          {!loading && err && (
            <div className="authorsCard">
              <div className="authorsErrorTitle">Couldn’t load authors</div>
              <div className="authorsErrorMsg">{err}</div>
            </div>
          )}

          {!loading && !err && authors.length === 0 && (
            <div className="authorsCard">
              <div className="authorsState">No authors found yet.</div>
            </div>
          )}

          {!loading && !err && authors.length > 0 && filtered.length === 0 && (
            <div className="authorsCard">
              <div className="authorsState">No matches for “{q}”.</div>
            </div>
          )}

          {!loading && !err && filtered.length > 0 && (
            <div className="authorsGrid">
              {filtered.map((a) => (
                <button
                  key={a.id}
                  className="authorsCard authorsClickable"
                  type="button"
                  onClick={() => navigate(`/authors/${a.id}`)}
                >
                  <div className="authorsCardTitle">{a.name}</div>

                  <div className="authorsCardMeta">
                    {a.bookCount} {a.bookCount === 1 ? "book" : "books"}
                  </div>

                  {a.bio ? (
                    <div className="authorsCardBody">{a.bio}</div>
                  ) : (
                    <div className="authorsCardBody muted">
                      Author bio coming soon.
                    </div>
                  )}

                  {/* NEW: clickable book titles */}
                  {Array.isArray(a.books) && a.books.length > 0 && (
                    <div className="authorsBookList">
                      {a.books.map((b) => (
                        <button
                          key={b.id}
                          type="button"
                          className="authorsBookLink"
                          onClick={(e) => {
                            e.stopPropagation(); // don’t trigger author card click
                            navigate(`/books/${b.id}`);
                          }}
                        >
                          {b.title}
                        </button>
                      ))}
                    </div>
                  )}

                  <div className="authorsCta">View author →</div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
