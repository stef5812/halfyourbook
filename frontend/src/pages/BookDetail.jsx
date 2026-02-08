// src/pages/BookDetail.jsx
import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api } from "../lib/api";
import "./Books.css"; // ✅ reuse same background styles

export default function BookDetail() {
  const { id } = useParams();

  const [book, setBook] = useState(null);
  const [me, setMe] = useState(null);

  const [err, setErr] = useState("");
  const [msg, setMsg] = useState("");
  const [busySectionId, setBusySectionId] = useState("");

  // Section navigation state
  const [idx, setIdx] = useState(0);

  // Inline edit state
  const [editingId, setEditingId] = useState("");
  const [draft, setDraft] = useState({
    title: "",
    content: "",
    orderIndex: 0,
    isPreview: false,
  });

  const sectionsAll = useMemo(() => {
    const s = book?.sections;
    return Array.isArray(s)
      ? s.slice().sort((a, b) => (a.orderIndex ?? 0) - (b.orderIndex ?? 0))
      : [];
  }, [book]);

  useEffect(() => {
    (async () => {
      setErr("");
      setMsg("");

      try {
        const b = await api(`/api/books/${id}`);
        setBook(b);
     

        // me is auth-only; ok if fails
        try {
          const m = await api("/api/users/me");
          setMe(m || null);
        } catch {
          setMe(null);
        }
      } catch (e) {
        setErr(e.message || "Failed to load book");
      }
    })();
  }, [id]);

// Scroll to top when section changes
useEffect(() => {
  window.scrollTo({
    top: 0,
    left: 0,
    behavior: "smooth",
  });
}, [idx]);


  function canEdit() {
    if (!me) return false;
    if (me.role === "admin") return true;

    // If your book detail includes authorId, this enables owner edit
    if (book?.authorId && me.id && book.authorId === me.id) return true;

    return false;
  }

  const allowEdit = canEdit();

  // Reader view: preview sections only (if any exist). Editors see all.
  const sections = useMemo(() => {
    if (allowEdit) return sectionsAll;
    const previews = sectionsAll.filter((s) => s.isPreview);
    return previews.length ? previews : sectionsAll;
  }, [allowEdit, sectionsAll]);

  // Reset navigation when book changes
  useEffect(() => {
    setIdx(0);
    setEditingId("");
    setDraft({ title: "", content: "", orderIndex: 0, isPreview: false });
  }, [id, book?.id]);

  const total = sections.length;
  const current = total ? sections[idx] : null;

  const canPrev = idx > 0;
  const canNext = idx < total - 1;

  const prev = () => setIdx((x) => Math.max(0, x - 1));
  const next = () => setIdx((x) => Math.min(total - 1, x + 1));

  // Keyboard nav (← →), but not while typing
  useEffect(() => {
    const onKey = (e) => {
      const tag = document.activeElement?.tagName?.toLowerCase();
      const typing = tag === "input" || tag === "textarea" || tag === "select";
      if (typing) return;

      if (e.key === "ArrowLeft") prev();
      if (e.key === "ArrowRight") next();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idx, total]);

  function startEdit(s) {
    setMsg("");
    setErr("");
    setEditingId(s.id);
    setDraft({
      title: s.title ?? "",
      content: s.content ?? "",
      orderIndex: Number(s.orderIndex ?? 0),
      isPreview: Boolean(s.isPreview),
    });
  }

  function cancelEdit() {
    setEditingId("");
    setDraft({ title: "", content: "", orderIndex: 0, isPreview: false });
  }

  async function saveEdit(sectionId) {
    setBusySectionId(sectionId);
    setErr("");
    setMsg("");

    try {
      await api(`/api/books/${id}/sections/${sectionId}`, {
        method: "PUT",
        body: JSON.stringify({
          title: draft.title || undefined,
          content: draft.content,
          orderIndex: Number(draft.orderIndex),
          isPreview: Boolean(draft.isPreview),
        }),
      });

      setBook((prevBook) => {
        if (!prevBook) return prevBook;
        const nextSections = (prevBook.sections || []).map((s) =>
          s.id === sectionId
            ? {
                ...s,
                title: draft.title || null,
                content: draft.content,
                orderIndex: Number(draft.orderIndex),
                isPreview: Boolean(draft.isPreview),
              }
            : s
        );
        return { ...prevBook, sections: nextSections };
      });

      setMsg("Section updated.");
      cancelEdit();
    } catch (e) {
      setErr(e.message || "Failed to update section");
    } finally {
      setBusySectionId("");
    }
  }

  async function deleteSection(sectionId) {
    const ok = window.confirm("Delete this section? This cannot be undone.");
    if (!ok) return;

    setBusySectionId(sectionId);
    setErr("");
    setMsg("");

    try {
      await api(`/api/books/${id}/sections/${sectionId}`, { method: "DELETE" });

      setBook((prevBook) => {
        if (!prevBook) return prevBook;
        return {
          ...prevBook,
          sections: (prevBook.sections || []).filter((s) => s.id !== sectionId),
        };
      });

      setMsg("Section deleted.");

      // keep idx in range after deletion
      setIdx((cur) => {
        const newTotal = Math.max(0, total - 1);
        if (newTotal === 0) return 0;
        return Math.min(cur, newTotal - 1);
      });

      if (editingId === sectionId) cancelEdit();
    } catch (e) {
      setErr(e.message || "Failed to delete section");
    } finally {
      setBusySectionId("");
    }
  }

  // ✅ Reusable navigator rendered top + bottom
  const Navigator = () => (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 12,
        flexWrap: "wrap",
      }}
    >
      <div style={{ fontSize: 13, opacity: 0.85, userSelect: "none" }}>
        Section <strong>{idx + 1}</strong> of <strong>{total}</strong>
        <span style={{ opacity: 0.7 }}> (use ← →)</span>
      </div>

      <div style={{ display: "flex", gap: 8 }}>
        <button className="btn" type="button" onClick={prev} disabled={!canPrev}>
          ← Previous
        </button>
        <button className="btn" type="button" onClick={next} disabled={!canNext}>
          Next →
        </button>
      </div>
    </div>
  );

  return (
    <div className="booksHero">
      <div className="booksOverlay">
        <div className="page">
          {err ? (
            <>
              <div className="card">{err}</div>
              <div style={{ padding: 16 }}>
                <Link className="btn" to="/books">
                  Back to books
                </Link>
              </div>
            </>
          ) : !book ? (
            <div className="card">Loading…</div>
          ) : (
            <>
              <div className="pageHeader">

                <div style={{ marginBottom: 12 }}>
                  <Link className="btn btnSecondary" to="/books">
                    ← Back to Book previews
                  </Link>
                </div>


                <div className="pageTitle">{book.title}</div>
                <div className="pageSub">
                  by {book?.author?.displayName ?? "Unknown author"} • {book.status}
                </div>
              </div>

              {msg ? <div className="card">{msg}</div> : null}

              <div className="card">
                <div className="cardHeader">
                  <div className="cardTitle">Description</div>
                </div>
                <div style={{ padding: 16 }}>{book.description || "—"}</div>
              </div>

              <div className="card">
                <div className="cardHeader">
                  <div className="cardTitle">Sections</div>
                  <div className="cardSub">
                    {allowEdit
                      ? "You can edit sections because you are admin/owner."
                      : "Showing preview sections (if any)."}
                  </div>
                </div>

                <div style={{ padding: 16, display: "grid", gap: 12 }}>
                  {total === 0 ? (
                    <div>No sections yet.</div>
                  ) : (
                    <>
                      {/* ✅ TOP NAV */}
                      <Navigator />

                      {/* Current section only */}
                      {current ? (() => {
                        const isEditing = editingId === current.id;
                        const isBusy = busySectionId === current.id;

                        return (
                          <div
                            style={{
                              border: "1px solid #e2e6ea",
                              borderRadius: 10,
                              padding: 12,
                            }}
                          >
                            {!isEditing ? (
                              <>
                                <div
                                  style={{
                                    display: "flex",
                                    justifyContent: "space-between",
                                    gap: 12,
                                    alignItems: "flex-start",
                                  }}
                                >
                                  <div style={{ minWidth: 0 }}>
                                    <div style={{ fontWeight: 700 }}>
                                      {current.orderIndex}. {current.title || "(Untitled section)"}
                                    </div>
                                    <div style={{ fontSize: 12, opacity: 0.8 }}>
                                      {current.isPreview ? "Preview" : "Not preview"}
                                    </div>
                                  </div>

                                  {allowEdit ? (
                                    <div style={{ display: "flex", gap: 8 }}>
                                      <button
                                        className="btn"
                                        type="button"
                                        onClick={() => startEdit(current)}
                                        disabled={isBusy}
                                      >
                                        Edit
                                      </button>
                                      <button
                                        className="btn"
                                        type="button"
                                        onClick={() => deleteSection(current.id)}
                                        disabled={isBusy}
                                      >
                                        {isBusy ? "Working…" : "Delete"}
                                      </button>
                                    </div>
                                  ) : null}
                                </div>

                                <div style={{ marginTop: 10, whiteSpace: "pre-wrap" }}>
                                  {current.content}
                                </div>
                              </>
                            ) : (
                              <div style={{ display: "grid", gap: 10 }}>
                                <div className="field fieldFull">
                                  <label>Title</label>
                                  <input
                                    value={draft.title}
                                    onChange={(e) =>
                                      setDraft((d) => ({ ...d, title: e.target.value }))
                                    }
                                  />
                                </div>

                                <div className="field fieldFull">
                                  <label>Content</label>
                                  <textarea
                                    rows={10}
                                    value={draft.content}
                                    onChange={(e) =>
                                      setDraft((d) => ({ ...d, content: e.target.value }))
                                    }
                                  />
                                </div>

                                <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                                  <div className="field">
                                    <label>Order index</label>
                                    <input
                                      type="number"
                                      value={draft.orderIndex}
                                      onChange={(e) =>
                                        setDraft((d) => ({ ...d, orderIndex: e.target.value }))
                                      }
                                    />
                                  </div>

                                  <div className="field">
                                    <label>Preview?</label>
                                    <select
                                      value={draft.isPreview ? "yes" : "no"}
                                      onChange={(e) =>
                                        setDraft((d) => ({
                                          ...d,
                                          isPreview: e.target.value === "yes",
                                        }))
                                      }
                                    >
                                      <option value="yes">yes</option>
                                      <option value="no">no</option>
                                    </select>
                                  </div>
                                </div>

                                <div style={{ display: "flex", gap: 8 }}>
                                  <button
                                    className="btn btnPrimary"
                                    type="button"
                                    onClick={() => saveEdit(current.id)}
                                    disabled={isBusy || !draft.content.trim()}
                                  >
                                    {isBusy ? "Saving…" : "Save"}
                                  </button>
                                  <button
                                    className="btn"
                                    type="button"
                                    onClick={cancelEdit}
                                    disabled={isBusy}
                                  >
                                    Cancel
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })() : null}

                      {/* ✅ BOTTOM NAV */}
                      <Navigator />
                    </>
                  )}
                </div>
              </div>

              <div style={{ padding: 16 }}>
                <Link className="btn" to="/books">
                ← Back to Book previews
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
