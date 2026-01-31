// src/pages/Dashboard.jsx
import { useEffect, useMemo, useState } from "react";
import { api, getToken } from "../lib/api";
import { useSearchParams, useNavigate } from "react-router-dom";
import "./Dash.css";

export default function Dashboard() {
  const authed = Boolean(getToken());
  const navigate = useNavigate();

  // Book
  const [bookTitle, setBookTitle] = useState("");
  const [bookSubtitle, setBookSubtitle] = useState("");
  const [bookDesc, setBookDesc] = useState("");
  const [bookId, setBookId] = useState("");

  const [genreId, setGenreId] = useState("");
  const [language, setLanguage] = useState("en");
  const [status, setStatus] = useState("draft");

  const [searchParams] = useSearchParams();
  const bookIdFromUrl = searchParams.get("bookId") || "";
  const isEditingFromUrl = Boolean(bookIdFromUrl);

  // Page messages
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  // Dropdown / profile data
  const [genres, setGenres] = useState([]);
  const [newGenre, setNewGenre] = useState("");
  const [me, setMe] = useState(null);

  // Photo upload
  const [photoUploading, setPhotoUploading] = useState(false);
  const [photoErr, setPhotoErr] = useState("");
  const [photoMsg, setPhotoMsg] = useState("");

  // ✅ Single source of truth for the photo URL (matches Prisma AuthorProfile.photoUrl)
  const photoUrl = useMemo(() => me?.authorProfile?.photoUrl || "", [me]);

  useEffect(() => {
    if (!authed) return;

    (async () => {
      try {
        const [g, m] = await Promise.all([api("/api/genres"), api("/api/users/me")]);
        setGenres(Array.isArray(g) ? g : []);
        setMe(m || null);
      } catch (e) {
        console.error(e);
      }
    })();
  }, [authed]);

  useEffect(() => {
    if (!authed) return;
    if (!bookIdFromUrl) return;

    (async () => {
      try {
        setErr("");
        setMsg("");

        const b = await api(`/api/books/${bookIdFromUrl}`);

        // populate form for editing
        setBookId(b.id);
        setBookTitle(b.title ?? "");
        setBookSubtitle(b.subtitle ?? "");
        setBookDesc(b.description ?? "");
        setLanguage(b.language ?? "en");
        setStatus(b.status ?? "draft");
        setGenreId(b.genreId ?? b.genre_id ?? "");

        setMsg("Loaded book for editing.");
      } catch (e) {
        setErr(e.message || "Failed to load book");
      }
    })();
  }, [authed, bookIdFromUrl]);

  async function saveBook() {
    setErr("");
    setMsg("Saving...");

    const payload = {
      title: bookTitle,
      subtitle: bookSubtitle || null,
      description: bookDesc,
      genre_id: genreId || null,
      language,
      status,
    };

    try {
      if (!bookId) {
        // CREATE
        const data = await api("/api/books", {
          method: "POST",
          body: JSON.stringify(payload),
        });

        setBookId(data.id);
        setMsg(`Book created ✅ (${data.id})`);

        // Go to sections page
        navigate(`/dashboard/sections?bookId=${encodeURIComponent(data.id)}`);
      } else {
        // UPDATE
        await api(`/api/books/${bookId}`, {
          method: "PUT",
          body: JSON.stringify(payload),
        });

        setMsg("Book updated ✅");

        // Go to sections page
        navigate(`/dashboard/sections?bookId=${encodeURIComponent(bookId)}`);
      }
    } catch (e) {
      console.error(e);
      setErr(e.message || "Save failed");
      setMsg("");
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

      // ✅ Upload file
      const up = await api("/api/uploads/author-photo", {
        method: "POST",
        body: fd,
      });

      const url = up?.url;
      if (!url) throw new Error("Upload did not return a url");

      // ✅ Persist on the AuthorProfile.photoUrl (server must upsert AuthorProfile)
      const updatedMe = await api("/api/users/me", {
        method: "PATCH",
        body: JSON.stringify({ photoUrl: url }),
      });

      setMe(updatedMe);
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
      await api("/api/genres", {
        method: "POST",
        body: JSON.stringify({ name: newGenre.trim() }),
      });

      const updatedGenres = await api("/api/genres");
      setGenres(Array.isArray(updatedGenres) ? updatedGenres : []);

      setNewGenre("");
      setMsg("Genre added.");
    } catch (e) {
      setErr(e.message || "Failed to add genre.");
    }
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

          {err ? <div className="card">{err}</div> : null}
          {msg ? <div className="card">{msg}</div> : null}

          {/* Author photo */}
          <div className="card">
            <div className="cardHeader">
              <div className="cardTitle">Author photo</div>
              <div className="cardSub">Upload a square headshot (jpg/png/webp).</div>
            </div>

            <div className="formGrid" style={{ padding: 16 }}>
              {photoErr ? (
                <div className="field fieldFull">
                  <div className="card">{photoErr}</div>
                </div>
              ) : null}

              {photoMsg ? (
                <div className="field fieldFull">
                  <div className="card">{photoMsg}</div>
                </div>
              ) : null}

              <div
                className="field fieldFull"
                style={{ display: "flex", gap: 16, alignItems: "center" }}
              >
                <div
                  style={{
                    width: 72,
                    height: 72,
                    borderRadius: 999,
                    overflow: "hidden",
                    background: "#eee",
                  }}
                >
                  {photoUrl ? (
                    <img
                      src={photoUrl}
                      alt="Author"
                      style={{ width: "100%", height: "100%", objectFit: "cover" }}
                    />
                  ) : null}
                </div>

                <div style={{ flex: 1 }}>
                  <input
                    type="file"
                    accept="image/*"
                    disabled={photoUploading}
                    onChange={(e) => uploadAuthorPhoto(e.target.files?.[0])}
                  />
                  <div style={{ marginTop: 8, opacity: 0.8 }}>
                    {photoUploading ? "Uploading…" : photoUrl ? "Current photo set." : "No photo yet."}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Book details */}
          <div className="card">
            <div className="cardHeader">
              <div className="cardTitle">Book details</div>
              <div className="cardSub">Fill these in, then click Save to continue to sections.</div>
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

              <div className="field">
                <label>Genre</label>
                <select value={genreId} onChange={(e) => setGenreId(e.target.value)}>
                  <option value="">Select…</option>
                  {genres.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.name}
                    </option>
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
                  <option value="draft">draft</option>
                  <option value="published">published</option>
                  <option value="paused">paused</option>
                </select>
              </div>

              <div className="field fieldFull">
                <label>Description</label>
                <textarea value={bookDesc} onChange={(e) => setBookDesc(e.target.value)} rows={4} />
              </div>

              <div className="field fieldFull">
                <label>Current Book ID</label>
                <input value={bookId} onChange={(e) => setBookId(e.target.value)} />
              </div>

              {/* Single save button */}
              <div className="field fieldFull" style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                <button className="btn btnPrimary" onClick={saveBook} type="button">
                  {bookId ? "Save & add sections" : "Save book & add sections"}
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
        </div>
      </div>
    </div>
  );
}
