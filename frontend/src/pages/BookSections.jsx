// src/pages/BookSections.jsx
import { useEffect, useState } from "react";
import { api, authApi } from "../lib/api";
import { useSearchParams, Link } from "react-router-dom";
import "./Dash.css";

export default function BookSections() {
  const [authed, setAuthed] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);

  const [searchParams] = useSearchParams();
  const bookId = searchParams.get("bookId") || "";

  // New section form
  const [secTitle, setSecTitle] = useState("");
  const [secContent, setSecContent] = useState("");
  const [secOrder, setSecOrder] = useState(0);
  const [secPreview, setSecPreview] = useState(true);

  // Existing sections
  const [sections, setSections] = useState([]);
  const [editingSectionId, setEditingSectionId] = useState(null);

  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function checkAuth() {
      try {
        const me = await authApi("/me");
        if (!cancelled) {
          setAuthed(!!me?.user);
        }
      } catch {
        if (!cancelled) {
          setAuthed(false);
        }
      } finally {
        if (!cancelled) {
          setAuthLoading(false);
        }
      }
    }

    checkAuth();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!authed) return;
    if (!bookId) {
      setErr("Missing bookId in URL.");
      return;
    }
    setErr("");
  }, [authed, bookId]);

  async function loadBookAndSections() {
    try {
      const b = await api(`/books/${bookId}`);

      const loadedSections = Array.isArray(b?.sections) ? b.sections : [];
      setSections(loadedSections);

      const maxOrder = loadedSections.reduce((mx, s) => {
        const n = Number(s.orderIndex);
        return Number.isFinite(n) ? Math.max(mx, n) : mx;
      }, -1);

      setSecOrder(maxOrder + 1);
    } catch (e) {
      console.error(e);
      setErr(e.message || "Failed to load book sections.");
    }
  }

  useEffect(() => {
    if (!authed || !bookId) return;
    loadBookAndSections();
  }, [authed, bookId]);

  async function addSection() {
    setErr("");
    setMsg("Adding section...");

    try {
      const data = await api(`/books/${bookId}/sections`, {
        method: "POST",
        body: JSON.stringify({
          title: secTitle || undefined,
          content: secContent,
          orderIndex: Number(secOrder),
          isPreview: Boolean(secPreview),
        }),
      });

      setMsg(`Added section ✅ (${data.id})`);
      setSecTitle("");
      setSecContent("");
      setSecPreview(true);

      await loadBookAndSections();
    } catch (e) {
      console.error(e);
      setErr(e.message || "Failed to add section");
      setMsg("");
    }
  }

  function startEdit(section) {
    setEditingSectionId(section.id);
    setSecTitle(section.title || "");
    setSecContent(section.content || "");
    setSecOrder(Number(section.orderIndex) || 0);
    setSecPreview(Boolean(section.isPreview));
    setMsg("");
    setErr("");
  }

  function cancelEdit() {
    setEditingSectionId(null);
    setSecTitle("");
    setSecContent("");
    setSecPreview(true);

    const maxOrder = sections.reduce((mx, s) => {
      const n = Number(s.orderIndex);
      return Number.isFinite(n) ? Math.max(mx, n) : mx;
    }, -1);
    setSecOrder(maxOrder + 1);
  }

  async function saveSectionEdit() {
    if (!editingSectionId) return;

    setErr("");
    setMsg("Saving section...");

    try {
      await api(`/books/${bookId}/sections/${editingSectionId}`, {
        method: "PUT",
        body: JSON.stringify({
          title: secTitle || undefined,
          content: secContent,
          orderIndex: Number(secOrder),
          isPreview: Boolean(secPreview),
        }),
      });

      setMsg("Section updated ✅");
      cancelEdit();
      await loadBookAndSections();
    } catch (e) {
      console.error(e);
      setErr(e.message || "Failed to update section");
      setMsg("");
    }
  }

  if (authLoading) {
    return (
      <div className="dashGuest">
        <div className="dashOverlay">
          <div className="page">
            <div className="card">Checking login…</div>
          </div>
        </div>
      </div>
    );
  }

  if (!authed) {
    return (
      <div className="dashGuest">
        <div className="dashOverlay">
          <div className="page">
            <div className="card">Please login to use the dashboard.</div>
          </div>
        </div>
      </div>
    );
  }

  if (!bookId) {
    return (
      <div className="dashHero">
        <div className="dashOverlay">
          <div className="page">
            <div className="card">No book selected.</div>
            <div style={{ marginTop: 12 }}>
              <Link className="btn" to="/dashboard">
                Back to Dashboard
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="dashHero underHeader">
      <div className="dashOverlay">
        <div className="page">
          <div className="pageHeader">
            <div className="pageTitle">
              {editingSectionId ? "Edit section" : "Add sections"}
            </div>
            <div className="pageSub">
              Book ID: <code>{bookId}</code>
            </div>
          </div>

          <div style={{ marginBottom: 12 }}>
            <Link className="btn" to={`/dashboard?bookId=${encodeURIComponent(bookId)}`}>
              ← Back to book details
            </Link>
          </div>

          {err ? <div className="card">{err}</div> : null}
          {msg ? <div className="card">{msg}</div> : null}

          <div className="card" style={{ marginBottom: 16 }}>
            <div className="cardHeader">
              <div className="cardTitle">Existing sections</div>
              <div className="cardSub">Edit the current sections for this book.</div>
            </div>

            <div style={{ padding: 16 }}>
              {sections.length === 0 ? (
                <div>No sections yet.</div>
              ) : (
                sections.map((s) => (
                  <div
                    key={s.id}
                    style={{
                      padding: "12px 0",
                      borderBottom: "1px solid rgba(0,0,0,0.08)",
                    }}
                  >
                    <div style={{ fontWeight: 600 }}>
                      {s.orderIndex}. {s.title || "Untitled section"}
                    </div>
                    <div style={{ opacity: 0.75, marginTop: 4 }}>
                      Preview: {s.isPreview ? "Yes" : "No"}
                    </div>
                    <div style={{ marginTop: 8 }}>
                      <button
                        className="btn btnSecondary"
                        type="button"
                        onClick={() => startEdit(s)}
                      >
                        Edit section
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="card">
            <div className="cardHeader">
              <div className="cardTitle">
                {editingSectionId ? "Edit section" : "New section"}
              </div>
              <div className="cardSub">
                Paste text content. Mark as preview.
              </div>
            </div>

            <div className="formGrid" style={{ padding: 16 }}>
              <div className="field fieldFull">
                <label>Section title (optional)</label>
                <input
                  value={secTitle}
                  onChange={(e) => setSecTitle(e.target.value)}
                />
              </div>

              <div className="field fieldFull">
                <label>Content</label>
                <textarea
                  value={secContent}
                  onChange={(e) => setSecContent(e.target.value)}
                  rows={10}
                />
              </div>

              <div className="field">
                <label>Section number</label>
                <input
                  type="number"
                  value={secOrder}
                  onChange={(e) => setSecOrder(Number(e.target.value))}
                />
              </div>

              <div className="field">
                <label>Preview?</label>
                <select
                  value={secPreview ? "yes" : "no"}
                  onChange={(e) => setSecPreview(e.target.value === "yes")}
                >
                  <option value="yes">yes</option>
                  <option value="no">no</option>
                </select>
              </div>

              <div className="field fieldFull" style={{ display: "flex", gap: 8 }}>
                {editingSectionId ? (
                  <>
                    <button
                      className="btn btnPrimary"
                      onClick={saveSectionEdit}
                      type="button"
                    >
                      Save section
                    </button>

                    <button
                      className="btn btnSecondary"
                      onClick={cancelEdit}
                      type="button"
                    >
                      Cancel
                    </button>
                  </>
                ) : (
                  <button
                    className="btn btnPrimary"
                    onClick={addSection}
                    type="button"
                  >
                    Add section
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}