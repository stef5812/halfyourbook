// src/pages/BookSections.jsx
import { useEffect, useState } from "react";
import { api, getToken } from "../lib/api";
import { useSearchParams, Link } from "react-router-dom";
import "./Dash.css";

export default function BookSections() {
  const authed = Boolean(getToken());

  const [searchParams] = useSearchParams();
  const bookId = searchParams.get("bookId") || "";

  // Sections
  const [secTitle, setSecTitle] = useState("");
  const [secContent, setSecContent] = useState("");
  const [secOrder, setSecOrder] = useState(0);
  const [secPreview, setSecPreview] = useState(true);

  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  useEffect(() => {
    if (!authed) return;
    if (!bookId) {
      setErr("Missing bookId in URL.");
      return;
    }
    setErr("");
  }, [authed, bookId]);

  async function addSection() {
    setErr("");
    setMsg("Adding section...");

    try {
      const data = await api(`/api/books/${bookId}/sections`, {
        method: "POST",
        body: JSON.stringify({
          title: secTitle || undefined,
          content: secContent,
          orderIndex: Number(secOrder),
          isPreview: Boolean(secPreview),
        }),
      });

      setMsg(`Added section ✅ (${data.id})`);
      setSecOrder((n) => Number(n) + 1);
      setSecTitle("");
      setSecContent("");
    } catch (e) {
      console.error(e);
      setErr(e.message || "Failed to add section");
      setMsg("");
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
    <div className="dashHero">
      <div className="dashOverlay">
        <div className="page">
          <div className="pageHeader">
            <div className="pageTitle">Add sections</div>
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

          <div className="card">
            <div className="cardHeader">
              <div className="cardTitle">New section</div>
              <div className="cardSub">Paste text content. Mark as preview.</div>
            </div>

            <div className="formGrid" style={{ padding: 16 }}>
              <div className="field fieldFull">
                <label>Section title (optional)</label>
                <input value={secTitle} onChange={(e) => setSecTitle(e.target.value)} />
              </div>

              <div className="field fieldFull">
                <label>Content</label>
                <textarea value={secContent} onChange={(e) => setSecContent(e.target.value)} rows={10} />
              </div>

              <div className="field">
                <label>Order index</label>
                <input type="number" value={secOrder} onChange={(e) => setSecOrder(e.target.value)} />
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

              <div className="field fieldFull">
                <button className="btn btnPrimary" onClick={addSection} type="button">
                  Add section
                </button>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
