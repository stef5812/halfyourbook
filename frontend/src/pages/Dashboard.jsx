// src/pages/Dashboard.jsx
import { useEffect, useMemo, useState, useCallback, useRef } from "react";
import { api, authApi, withBase } from "../lib/api";
import {
  useSearchParams,
  useNavigate,
  Link,
  useLocation,
} from "react-router-dom";
import "./Dash.css";

export default function Dashboard() {
  const [authed, setAuthed] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);

  const [authMe, setAuthMe] = useState(null);
  const [profile, setProfile] = useState(null);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [authorDisplayName, setAuthorDisplayName] = useState("");

  const [myBooks, setMyBooks] = useState([]);

  const navigate = useNavigate();
  const location = useLocation();
  const cameFromHome = location.state?.from === "home";

  const [searchParams] = useSearchParams();
  const bookIdFromUrl = searchParams.get("bookId") || "";
  const isEditingFromUrl = Boolean(bookIdFromUrl);

  const [bookTitle, setBookTitle] = useState("");
  const [bookSubtitle, setBookSubtitle] = useState("");
  const [bookDesc, setBookDesc] = useState("");
  const [bookId, setBookId] = useState("");

  const [coverUrl, setCoverUrl] = useState("");
  const [coverUploading, setCoverUploading] = useState(false);
  const [coverErr, setCoverErr] = useState("");
  const [coverMsg, setCoverMsg] = useState("");

  const [genreId, setGenreId] = useState("");
  const [language, setLanguage] = useState("en");
  const [status, setStatus] = useState("draft");

  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  const [genres, setGenres] = useState([]);
  const [newGenre, setNewGenre] = useState("");

  const [photoUploading, setPhotoUploading] = useState(false);
  const [photoErr, setPhotoErr] = useState("");
  const [photoMsg, setPhotoMsg] = useState("");

  const authorProfile = profile?.authorProfile || null;
  const [showBookEditor, setShowBookEditor] = useState(false);
  const bookEditorRef = useRef(null);

  const photoUrl = useMemo(() => {
    return authorProfile?.photoUrl || "";
  }, [authorProfile]);

  const appRoles = authMe?.appRoles || [];
  const hasDashboardAccess = appRoles.some(
    (r) =>
      r.app === "HALFYOURBOOK" &&
      (r.role === "AUTHOR" || r.role === "ADMIN")
  );

  const loadMyBooks = useCallback(async () => {
    try {
      const data = await api("/authors/me/books");
      setMyBooks(Array.isArray(data?.items) ? data.items : []);
    } catch (e) {
      console.error("Failed to load my books", e);
      setMyBooks([]);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
  
    async function checkAuth() {
      try {
        const data = await authApi("/me");
        if (!cancelled) {
          setAuthMe(data || null);
          setAuthed(!!data?.user);
        }
      } catch {
        if (!cancelled) {
          setAuthMe(null);
          setAuthed(false);
        }
      } finally {
        if (!cancelled) setAuthLoading(false);
      }
    }
  
    checkAuth();
    return () => {
      cancelled = true;
    };
  }, []);
  
  async function registerAsAuthor() {
    try {
      setErr("");
      setMsg("Registering you as an author...");
  
      await api("/authors/register", {
        method: "POST",
      });
  
      const updatedAuth = await authApi("/me");
      setAuthMe(updatedAuth || null);
      setAuthed(!!updatedAuth?.user);
  
      const updatedProfile = await api("/authors/me");
      setProfile(updatedProfile || null);
  
      const ap = updatedProfile?.authorProfile || null;
      setFirstName(ap?.firstName || "");
      setLastName(ap?.lastName || "");
      setAuthorDisplayName(ap?.displayName || "");
  
      setMsg("Author access enabled. Welcome to your dashboard.");
      setErr("");
    } catch (e) {
      console.error(e);
      setErr(e.message || "Failed to register as author");
      setMsg("");
    }
  }

  useEffect(() => {
    if (!authed) return;

    let cancelled = false;

    async function loadProfile() {
      try {
        const data = await api("/authors/me");
        if (!cancelled) {
          setProfile(data || null);

          const ap = data?.authorProfile || null;
          setFirstName(ap?.firstName || "");
          setLastName(ap?.lastName || "");
          setAuthorDisplayName(ap?.displayName || "");
        }
      } catch (e) {
        console.error("Failed to load HalfYourBook author profile", e);
        if (!cancelled) setProfile(null);
      }
    }

    loadProfile();
    return () => {
      cancelled = true;
    };
  }, [authed]);

  useEffect(() => {
    if (!authed || !hasDashboardAccess) return;

    (async () => {
      try {
        const g = await api("/genres");
        setGenres(Array.isArray(g) ? g : []);
      } catch (e) {
        console.error(e);
      }
    })();
  }, [authed, hasDashboardAccess]);

  useEffect(() => {
    if (!authed || !hasDashboardAccess) return;
    loadMyBooks();
  }, [authed, hasDashboardAccess, loadMyBooks]);

  useEffect(() => {
    if (!authed || !hasDashboardAccess || !bookIdFromUrl) return;

    (async () => {
      try {
        setErr("");
        setMsg("");

        const b = await api(`/books/${bookIdFromUrl}`);
        setBookId(b.id);
        setBookTitle(b.title ?? "");
        setBookSubtitle(b.subtitle ?? "");
        setBookDesc(b.blurb ?? b.description ?? "");
        setLanguage(b.language ?? "en");
        setStatus(b.status ?? "draft");
        setGenreId(b.genreId ?? b.genre_id ?? "");
        setCoverUrl(b.coverUrl ?? "");
        setMsg("Loaded book for editing.");
        setShowBookEditor(true);
      } catch (e) {
        setErr(e.message || "Failed to load book");
      }
    })();
  }, [authed, hasDashboardAccess, bookIdFromUrl]);

  useEffect(() => {
    if (showBookEditor && bookEditorRef.current) {
      bookEditorRef.current.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }
  }, [showBookEditor, bookId]);

  async function saveAuthorProfile() {
    try {
      setErr("");
      setMsg("Saving author details...");

      const body = {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        displayName: authorDisplayName.trim(),
        bio: authorProfile?.bio || "",
        photoUrl: authorProfile?.photoUrl || "",
        website: authorProfile?.website || "",
        instagram: authorProfile?.instagram || "",
        twitter: authorProfile?.twitter || "",
      };

      const data = await api("/authors/me", {
        method: "PUT",
        body: JSON.stringify(body),
      });

      setProfile((prev) => ({
        ...(prev || {}),
        authorProfile: data?.authorProfile || prev?.authorProfile || null,
        displayName: data?.displayName || prev?.displayName || "",
      }));

      setMsg("Author details saved.");
    } catch (e) {
      console.error(e);
      setErr(e.message || "Failed to save author details");
      setMsg("");
    }
  }

  async function saveBook() {
    setErr("");
    setMsg("Saving...");

    const payload = {
      title: bookTitle,
      subtitle: bookSubtitle || null,
      blurb: bookDesc || null,
      genreId: genreId || null,
      language,
      status,
    };

    try {
      if (!bookId) {
        const data = await api("/books", {
          method: "POST",
          body: JSON.stringify(payload),
        });

        setBookId(data.id);
        setMsg(`Book created ✅ (${data.id})`);
        await loadMyBooks();
        navigate(`/dashboard/sections?bookId=${encodeURIComponent(data.id)}`);
      } else {
        await api(`/books/${bookId}`, {
          method: "PUT",
          body: JSON.stringify(payload),
        });

        setMsg("Book updated ✅");
        await loadMyBooks();
        navigate(`/dashboard/sections?bookId=${encodeURIComponent(bookId)}`);
      }
    } catch (e) {
      console.error(e);
      setErr(e.message || "Save failed");
      setMsg("");
    }
  }

  async function uploadBookCover(file) {
    setCoverErr("");
    setCoverMsg("");
    if (!file) return;

    if (!bookId && !bookIdFromUrl) {
      setCoverErr("Save the book first, then upload a cover.");
      return;
    }

    const id = bookId || bookIdFromUrl;

    setCoverUploading(true);
    try {
      const fd = new FormData();
      fd.append("cover", file);

      const up = await api(`/books/${id}/cover`, {
        method: "POST",
        body: fd,
      });

      const url = up?.coverUrl;
      if (!url) throw new Error("Upload did not return coverUrl");

      setCoverUrl(url);
      setCoverMsg("Book cover updated.");
      await loadMyBooks();
    } catch (e) {
      setCoverErr(e.message || "Cover upload failed");
    } finally {
      setCoverUploading(false);
    }
  }

  async function uploadAuthorPhoto(file) {
    setPhotoErr("");
    setPhotoMsg("");
    if (!file) return;

    setPhotoUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);

      const up = await api("/uploads/author-photo", {
        method: "POST",
        body: fd,
      });

      const url = up?.url;
      if (!url) throw new Error("Upload did not return a url");

      const updated = await api("/authors/me", {
        method: "PUT",
        body: JSON.stringify({
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          displayName: authorDisplayName.trim(),
          bio: authorProfile?.bio || "",
          photoUrl: url,
          website: authorProfile?.website || "",
          instagram: authorProfile?.instagram || "",
          twitter: authorProfile?.twitter || "",
        }),
      });

      setProfile((prev) => ({
        ...(prev || {}),
        authorProfile: updated?.authorProfile || prev?.authorProfile || null,
        displayName: updated?.displayName || prev?.displayName || "",
      }));

      setPhotoMsg("Author photo updated.");
    } catch (e) {
      setPhotoErr(e.message || "Photo upload failed");
    } finally {
      setPhotoUploading(false);
    }
  }

  async function addGenre() {
    if (!newGenre.trim()) return;

    try {
      await api("/genres", {
        method: "POST",
        body: JSON.stringify({ name: newGenre.trim() }),
      });

      const updatedGenres = await api("/genres");
      setGenres(Array.isArray(updatedGenres) ? updatedGenres : []);
      setNewGenre("");
      setMsg("Genre added.");
    } catch (e) {
      setErr(e.message || "Failed to add genre.");
    }
  }

  function closeBookEditor() {
    setShowBookEditor(false);
    setBookId("");
    setBookTitle("");
    setBookSubtitle("");
    setBookDesc("");
    setGenreId("");
    setLanguage("en");
    setStatus("draft");
    setCoverUrl("");
    setCoverErr("");
    setCoverMsg("");
    navigate("/dashboard");
  }

  function startNewBook() {
    setBookId("");
    setBookTitle("");
    setBookSubtitle("");
    setBookDesc("");
    setGenreId("");
    setLanguage("en");
    setStatus("draft");
    setCoverUrl("");
    setCoverErr("");
    setCoverMsg("");
    setMsg("");
    setErr("");
    setShowBookEditor(true);
    navigate("/dashboard");
  }

  if (authLoading) {
    return <div className="page"><div className="card">Checking login…</div></div>;
  }

  if (!authed) {
    return <div className="page"><div className="card">Please login to use the dashboard.</div></div>;
  }

  if (!hasDashboardAccess) {
    return (
      <div className="page">
        <div className="card">
          <div className="cardHeader">
            <div className="cardTitle">Author access required</div>
            <div className="cardSub">
              You are logged in through the central auth system, but your account does not yet have
              AUTHOR or ADMIN access for HalfYourBook.
            </div>
          </div>

          {err ? <div className="card" style={{ marginTop: 12 }}>{err}</div> : null}
          {msg ? <div className="card" style={{ marginTop: 12 }}>{msg}</div> : null}

          <div style={{ marginTop: 16, display: "flex", gap: 12, flexWrap: "wrap" }}>
            <button className="btn btnPrimary" type="button" onClick={registerAsAuthor}>
              Register as author
            </button>

            <Link className="btn btnSecondary" to="/books">
              Back to book previews
            </Link>

            {cameFromHome ? (
              <Link className="btn btnSecondary" to="/">
                Back to Home
              </Link>
            ) : null}
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
            <div className="pageTitle">{isEditingFromUrl ? "Edit book" : "Dashboard"}</div>
            <div className="pageSub">
              {isEditingFromUrl
                ? "Update your book metadata, save, then add sections."
                : "Create a book, save it, then add sections."}
            </div>
          </div>

          <div style={{ marginBottom: 12, display: "flex", gap: 8, flexWrap: "wrap" }}>
            <Link className="btn btnSecondary" to="/books">← Back to Book previews</Link>
            {cameFromHome ? <Link className="btn btnSecondary" to="/">← Back to Home</Link> : null}
          </div>

          {err ? <div className="card">{err}</div> : null}
          {msg ? <div className="card">{msg}</div> : null}

          <div className="card">
            <div className="cardHeader">
              <div className="cardTitle">Author profile</div>
              <div className="cardSub">
                Your public identity as an author.
              </div>
            </div>

            <div className="formGrid" style={{ padding: 16 }}>
              <div
                className="field"
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "flex-start",
                  gap: 12,
                }}
              >
                <div
                  style={{
                    width: 110,
                    height: 110,
                    borderRadius: "50%",
                    overflow: "hidden",
                    background: "#eee",
                    border: "2px solid #e5e7eb",
                  }}
                >
                  {photoUrl ? (
                    <img
                      src={withBase(photoUrl)}
                      alt="Author"
                      style={{ width: "100%", height: "100%", objectFit: "cover" }}
                    />
                  ) : null}
                </div>

                <input
                  type="file"
                  accept="image/*"
                  disabled={photoUploading}
                  onChange={(e) => uploadAuthorPhoto(e.target.files?.[0])}
                />

                <div style={{ fontSize: 12, opacity: 0.7, textAlign: "center" }}>
                  {photoUploading
                    ? "Uploading…"
                    : photoUrl
                    ? "Photo set"
                    : "Upload a profile photo"}
                </div>

                {photoErr ? <div className="card">{photoErr}</div> : null}
                {photoMsg ? <div className="card">{photoMsg}</div> : null}
              </div>

              <div className="field">
                <label>First name</label>
                <input
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="First name"
                />
              </div>

              <div className="field">
                <label>Surname</label>
                <input
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="Surname"
                />
              </div>

              <div className="field fieldFull">
                <label>Public display name (optional)</label>
                <input
                  value={authorDisplayName}
                  onChange={(e) => setAuthorDisplayName(e.target.value)}
                  placeholder="Leave blank to use First name + Surname"
                />
              </div>

              <div className="field fieldFull" style={{ display: "flex", gap: 12 }}>
                <button className="btn btnPrimary" type="button" onClick={saveAuthorProfile}>
                  Save profile
                </button>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="cardHeader">
              <div className="cardTitle">My books</div>
              <div className="cardSub">Open an existing book to edit, or start a new one.</div>
            </div>

            <div style={{ padding: 16 }}>
              <div style={{ marginBottom: 12 }}>
                <button className="btn btnPrimary" type="button" onClick={startNewBook}>
                  Create new book
                </button>
              </div>

              {myBooks.length === 0 ? (
                <div style={{ opacity: 0.8 }}>You have not added any books yet.</div>
              ) : (
                <div style={{ display: "grid", gap: 12 }}>
                  {myBooks.map((b) => (
                    <div
                      key={b.id}
                      style={{
                        border: "1px solid #e5e7eb",
                        borderRadius: 12,
                        padding: 12,
                        display: "flex",
                        justifyContent: "space-between",
                        gap: 12,
                        flexWrap: "wrap",
                        alignItems: "center",
                      }}
                    >
                      <div style={{ minWidth: 220 }}>
                        <div style={{ fontWeight: 600 }}>{b.title}</div>
                        <div style={{ opacity: 0.75 }}>
                          {b.status}
                          {b.genreName ? ` • ${b.genreName}` : ""}
                        </div>
                      </div>

                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                        <Link
                          className="btn btnSecondary"
                          to={`/dashboard?bookId=${encodeURIComponent(b.id)}`}
                        >
                          Edit details
                        </Link>
                        <Link
                          className="btn btnSecondary"
                          to={`/books/${encodeURIComponent(b.id)}`}
                        >
                          Edit sections
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {showBookEditor && (
            <div ref={bookEditorRef} className="card bookEditorCard bookEditorReveal">
              <div className="cardHeader">
                <div className="cardTitle">
                  {bookId ? "Editing book" : "Create new book"}
                </div>
                <div className="cardSub">
                  {bookId
                    ? "Update your book details, then continue to sections."
                    : "Enter the details for your new book, then save to continue."}
                </div>
              </div>

              <div style={{ padding: "0 16px 16px 16px" }}>
                <div
                  style={{
                    marginBottom: 12,
                    padding: 12,
                    borderRadius: 12,
                    background: "rgba(255,255,255,0.55)",
                    border: "1px solid rgba(255,255,255,0.35)",
                    fontWeight: 600,
                  }}
                >
                  {bookId ? "✏️ Editing existing book" : "✨ Creating a new book"}
                </div>
              </div>

              <div className="formGrid" style={{ padding: 16 }}>
                <div className="field fieldFull">
                  <label>Title</label>
                  <input value={bookTitle} onChange={(e) => setBookTitle(e.target.value)} />
                </div>

                <div className="field fieldFull">
                  <label>Subtitle (optional)</label>
                  <input value={bookSubtitle} onChange={(e) => setBookSubtitle(e.target.value)} />
                </div>

                <div className="field fieldFull">
                  <label>Book cover (optional)</label>

                  {coverErr ? <div className="card">{coverErr}</div> : null}
                  {coverMsg ? <div className="card">{coverMsg}</div> : null}

                  <div style={{ display: "flex", gap: 16, alignItems: "center", marginTop: 8 }}>
                    <div
                      style={{
                        width: 90,
                        height: 135,
                        borderRadius: 10,
                        overflow: "hidden",
                        background: "#eee",
                        border: "1px solid #e5e7eb",
                      }}
                    >
                      {coverUrl ? (
                        <img
                          src={withBase(coverUrl)}
                          alt="Book cover"
                          style={{ width: "100%", height: "100%", objectFit: "cover" }}
                        />
                      ) : null}
                    </div>

                    <div style={{ flex: 1 }}>
                      <input
                        type="file"
                        accept="image/*"
                        disabled={coverUploading || !(bookId || bookIdFromUrl)}
                        onChange={(e) => uploadBookCover(e.target.files?.[0])}
                      />
                      <div style={{ marginTop: 8, opacity: 0.8 }}>
                        {!(bookId || bookIdFromUrl)
                          ? "Save the book first to enable cover upload."
                          : coverUploading
                          ? "Uploading…"
                          : coverUrl
                          ? "Current cover set."
                          : "No cover yet."}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="field">
                  <label>Genre</label>
                  <select value={genreId} onChange={(e) => setGenreId(e.target.value)}>
                    <option value="">Select…</option>
                    {genres.map((g) => (
                      <option key={g.id} value={g.id}>{g.name}</option>
                    ))}
                  </select>
                </div>

                <div className="field fieldFull">
                  <label>Add a new genre</label>
                  <div style={{ display: "flex", gap: 8 }}>
                    <input
                      value={newGenre}
                      onChange={(e) => setNewGenre(e.target.value)}
                      placeholder="New genre name"
                    />
                    <button type="button" onClick={addGenre} disabled={!newGenre.trim()}>
                      Add
                    </button>
                  </div>
                </div>

                <div className="field">
                  <label>Language</label>
                  <select value={language} onChange={(e) => setLanguage(e.target.value)}>
                    <option value="en">English</option>
                    <option value="ga">Irish</option>
                    <option value="fr">French</option>
                    <option value="de">German</option>
                    <option value="es">Spanish</option>
                  </select>
                </div>

                <div className="field">
                  <label>Status</label>
                  <select value={status} onChange={(e) => setStatus(e.target.value)}>
                    <option value="draft">Draft</option>
                    <option value="an_idea">An Idea</option>
                    <option value="unedited">Unedited</option>
                    <option value="edited">Edited</option>
                    <option value="to_publish">To Publish</option>
                    <option value="published">Published</option>
                    <option value="paused">Paused</option>
                  </select>
                </div>

                <div className="field fieldFull">
                  <label>Description / blurb</label>
                  <textarea value={bookDesc} onChange={(e) => setBookDesc(e.target.value)} rows={4} />
                </div>

                <div className="field fieldFull">
                  <label>Current Book ID</label>
                  <input value={bookId} onChange={(e) => setBookId(e.target.value)} />
                </div>

                <div className="field fieldFull" style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                  <button className="btn btnPrimary" onClick={saveBook} type="button">
                    {bookId ? "Save & add sections" : "Save book & add sections"}
                  </button>

                  <button className="btn btnSecondary" onClick={closeBookEditor} type="button">
                    Close editor
                  </button>

                  {bookId ? (
                    <div style={{ alignSelf: "center", opacity: 0.75 }}>
                      Current book: <code>{bookId}</code>
                    </div>
                  ) : (
                    <div style={{ alignSelf: "center", opacity: 0.75 }}>
                      Not saved yet — click <b>Save</b> to create the book.
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}