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

  // Inline edit state
  const [editingId, setEditingId] = useState("");
  const [draft, setDraft] = useState({
    title: "",
    content: "",
    orderIndex: 0,
    isPreview: false,
  });

  const sections = useMemo(() => {
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

  function canEdit() {
    if (!me) return false;
    if (me.role === "admin") return true;

    // If your book detail includes authorId, this enables owner edit
    if (book?.authorId && me.id && book.authorId === me.id) return true;

    // If you don't have authorId in the payload, owner-check isn't possible here
    return false;
  }

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

      // update local book state
      setBook((prev) => {
        if (!prev) return prev;
        const nextSections = (prev.sections || []).map((s) =>
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
        return { ...prev, sections: nextSections };
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

      setBook((prev) => {
        if (!prev) return prev;
        return { ...prev, sections: (prev.sections || []).filter((s) => s.id !== sectionId) };
      });

      setMsg("Section deleted.");
      if (editingId === sectionId) cancelEdit();
    } catch (e) {
      setErr(e.message || "Failed to delete section");
    } finally {
      setBusySectionId("");
    }
  }

  const allowEdit = canEdit();

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
                <div className="pageTitle">{book.title}</div>
                <div className="pageSub">
                  by {book?.author?.displayName ?? "Unknown author"} • {book.status}
                </div>
              </div>

              {msg ? <div className="card">{msg}</div> : null}
              {err ? <div className="card">{err}</div> : null}

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
                      : "Login as the owner/admin to edit sections."}
                  </div>
                </div>

                <div style={{ padding: 16, display: "grid", gap: 12 }}>
                  {sections.length === 0 ? <div>No sections yet.</div> : null}

                  {sections.map((s) => {
                    const isEditing = editingId === s.id;
                    const isBusy = busySectionId === s.id;

                    return (
                      <div
                        key={s.id}
                        style={{
                          border: "1px solid #e2e6ea",
                          borderRadius: 10,
                          padding: 12,
                        }}
                      >
                        {!isEditing ? (
                          <>
                            <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                              <div style={{ minWidth: 0 }}>
                                <div style={{ fontWeight: 700 }}>
                                  {s.orderIndex}. {s.title || "(Untitled section)"}
                                </div>
                                <div style={{ fontSize: 12, opacity: 0.8 }}>
                                  {s.isPreview ? "Preview" : "Not preview"}
                                </div>
                              </div>

                              {allowEdit ? (
                                <div style={{ display: "flex", gap: 8 }}>
                                  <button className="btn" type="button" onClick={() => startEdit(s)}>
                                    Edit
                                  </button>
                                  <button
                                    className="btn"
                                    type="button"
                                    onClick={() => deleteSection(s.id)}
                                    disabled={isBusy}
                                  >
                                    {isBusy ? "Working…" : "Delete"}
                                  </button>
                                </div>
                              ) : null}
                            </div>

                            <div style={{ marginTop: 10, whiteSpace: "pre-wrap" }}>{s.content}</div>
                          </>
                        ) : (
                          <>
                            <div style={{ display: "grid", gap: 10 }}>
                              <div className="field fieldFull">
                                <label>Title</label>
                                <input
                                  value={draft.title}
                                  onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))}
                                />
                              </div>

                              <div className="field fieldFull">
                                <label>Content</label>
                                <textarea
                                  rows={8}
                                  value={draft.content}
                                  onChange={(e) => setDraft((d) => ({ ...d, content: e.target.value }))}
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
                                      setDraft((d) => ({ ...d, isPreview: e.target.value === "yes" }))
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
                                  onClick={() => saveEdit(s.id)}
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
                          </>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              <div style={{ padding: 16 }}>
                <Link className="btn" to="/books">
                  Back to books
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
