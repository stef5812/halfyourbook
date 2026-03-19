// src/pages/AuthorDetail.jsx
import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api, withBase } from "../lib/api";
import "./AuthorDetail.css";

export default function AuthorDetail() {
  const { id } = useParams();

  const [me, setMe] = useState(null);

  const [author, setAuthor] = useState(null);
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  const [editMode, setEditMode] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveErr, setSaveErr] = useState("");
  const [saveOk, setSaveOk] = useState("");

  const [bio, setBio] = useState("");
  const [website, setWebsite] = useState("");
  const [instagram, setInstagram] = useState("");
  const [twitter, setTwitter] = useState("");

  const isOwner = useMemo(() => {
    return !!me?.id && !!author?.id && me.id === author.id;
  }, [me, author]);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        setLoading(true);
        setErr("");

        let meResp = null;
        try {
          meResp = await api("/users/me");
        } catch {
          meResp = null;
        }

        const a = await api(`/authors/${id}`);
        const b = await api(`/authors/${id}/books`);

        if (cancelled) return;

        setMe(meResp || null);
        setAuthor(a);
        setBooks(Array.isArray(b?.items) ? b.items : []);

        setBio(a?.bio ?? "");
        setWebsite(a?.links?.website ?? "");
        setInstagram(a?.links?.instagram ?? "");
        setTwitter(a?.links?.twitter ?? "");

        setEditMode(false);
        setSaveErr("");
        setSaveOk("");
      } catch (e) {
        if (!cancelled) setErr(e?.message || "Failed to load author");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [id]);

  async function saveProfile() {
    try {
      setSaving(true);
      setSaveErr("");
      setSaveOk("");

      const payload = {
        bio: bio?.trim() ?? "",
        website: website?.trim() ?? "",
        instagram: instagram?.trim() ?? "",
        twitter: twitter?.trim() ?? "",
      };

      await api("/authors/me", {
        method: "PUT",
        body: JSON.stringify(payload),
      });

      const a = await api(`/authors/${id}`);
      setAuthor(a);

      setBio(a?.bio ?? "");
      setWebsite(a?.links?.website ?? "");
      setInstagram(a?.links?.instagram ?? "");
      setTwitter(a?.links?.twitter ?? "");

      setSaveOk("Saved!");
      setEditMode(false);
    } catch (e) {
      setSaveErr(e?.message || "Failed to save profile");
    } finally {
      setSaving(false);
    }
  }

  function cancelEdit() {
    setBio(author?.bio ?? "");
    setWebsite(author?.links?.website ?? "");
    setInstagram(author?.links?.instagram ?? "");
    setTwitter(author?.links?.twitter ?? "");
    setSaveErr("");
    setSaveOk("");
    setEditMode(false);
  }

  return (
    <div className="authorHero underHeader">
      <div className="authorOverlay">
        <div className="authorInner">
          {loading && <div className="authorState">Loading author…</div>}

          {!loading && err && (
            <div className="authorCard">
              <div className="authorErrorTitle">Couldn’t load author</div>
              <div className="authorErrorMsg">{err}</div>
              <div style={{ marginTop: 12 }}>
                <Link className="btn btnSecondary" to="/authors">
                  Back to Authors
                </Link>
              </div>
            </div>
          )}

          {!loading && !err && author && (
            <>
              <div className="authorHeader">
                <div className="authorPhotoWrap">
                  {author.photoUrl ? (
                    <img
                      className="authorPhoto"
                      src={withBase(author.photoUrl)}
                      alt={author.name}
                    />
                  ) : (
                    <div
                      className="authorPhoto authorPhotoPlaceholder"
                      aria-hidden="true"
                    />
                  )}
                </div>

                <div className="authorHeaderText">
                  <div className="authorName">{author.name}</div>

                  <div className="authorMeta">
                    {author.bookCount}{" "}
                    {author.bookCount === 1 ? "book" : "books"}
                  </div>

                  {isOwner && (
                    <div className="authorOwnerRow">
                      {!editMode ? (
                        <button
                          type="button"
                          className="authorOwnerBtn"
                          onClick={() => {
                            setSaveErr("");
                            setSaveOk("");
                            setEditMode(true);
                          }}
                        >
                          {author.bio ||
                          author.links?.website ||
                          author.links?.instagram ||
                          author.links?.twitter
                            ? "Edit profile"
                            : "Add your bio"}
                        </button>
                      ) : (
                        <div className="authorOwnerBtns">
                          <button
                            type="button"
                            className="authorOwnerBtn"
                            onClick={saveProfile}
                            disabled={saving}
                          >
                            {saving ? "Saving…" : "Save"}
                          </button>
                          <button
                            type="button"
                            className="authorOwnerBtn secondary"
                            onClick={cancelEdit}
                            disabled={saving}
                          >
                            Cancel
                          </button>
                        </div>
                      )}
                      {saveErr && <div className="authorSaveErr">{saveErr}</div>}
                      {saveOk && <div className="authorSaveOk">{saveOk}</div>}
                    </div>
                  )}

                  {!editMode ? (
                    author.bio ? (
                      <div className="authorBio">{author.bio}</div>
                    ) : (
                      <div className="authorBio muted">
                        No bio yet.
                        {isOwner ? ' Click "Add your bio" to create one.' : ""}
                      </div>
                    )
                  ) : (
                    <div className="authorEditCard">
                      <label className="authorLabel">
                        Bio
                        <textarea
                          className="authorTextarea"
                          value={bio}
                          onChange={(e) => setBio(e.target.value)}
                          placeholder="Write a short bio…"
                          rows={6}
                        />
                      </label>

                      <div className="authorEditGrid">
                        <label className="authorLabel">
                          Website
                          <input
                            className="authorInput"
                            value={website}
                            onChange={(e) => setWebsite(e.target.value)}
                            placeholder="https://example.com"
                          />
                        </label>

                        <label className="authorLabel">
                          Instagram
                          <input
                            className="authorInput"
                            value={instagram}
                            onChange={(e) => setInstagram(e.target.value)}
                            placeholder="https://instagram.com/…"
                          />
                        </label>

                        <label className="authorLabel">
                          Twitter / X
                          <input
                            className="authorInput"
                            value={twitter}
                            onChange={(e) => setTwitter(e.target.value)}
                            placeholder="https://x.com/…"
                          />
                        </label>
                      </div>
                    </div>
                  )}

                  {!editMode && (
                    <div className="authorLinks">
                      {author.links?.website && (
                        <a
                          className="authorLink"
                          href={author.links.website}
                          target="_blank"
                          rel="noreferrer"
                        >
                          Website
                        </a>
                      )}
                      {author.links?.instagram && (
                        <a
                          className="authorLink"
                          href={author.links.instagram}
                          target="_blank"
                          rel="noreferrer"
                        >
                          Instagram
                        </a>
                      )}
                      {author.links?.twitter && (
                        <a
                          className="authorLink"
                          href={author.links.twitter}
                          target="_blank"
                          rel="noreferrer"
                        >
                          Twitter / X
                        </a>
                      )}
                    </div>
                  )}

                  <div style={{ marginTop: 14 }}>
                    <Link className="btn btnSecondary" to="/authors">
                      Back to Authors
                    </Link>
                  </div>
                </div>
              </div>

              <div className="authorBooksTitle">Books</div>

              {books.length === 0 ? (
                <div className="authorCard">
                  <div className="muted">No books found for this author.</div>
                </div>
              ) : (
                <div className="authorBooksGrid">
                  {books.map((b) => (
                    <Link
                      key={b.id}
                      to={`/books/${b.id}`}
                      className="authorBookCard"
                    >
                      <div className="authorBookTitle">{b.title}</div>
                      <div className="authorBookMeta">
                        {b.genreName ? b.genreName : "—"} • {b.status}
                      </div>
                      {b.preview ? (
                        <div className="authorBookPreview">{b.preview}</div>
                      ) : null}
                      <div className="authorBookCta">Read preview →</div>
                    </Link>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}