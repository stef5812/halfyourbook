// src/pages/About.jsx
export default function About() {
    return (
      <div className="page">
        <div className="pageHeader">
          <div>
            <h1 className="pageTitle">About</h1>
            <p className="pageSub">What HalfYourBook is and how it works.</p>
          </div>
        </div>
  
        <div className="card">
          <div className="cardHeader">
            <div className="cardTitle">HalfYourBook</div>
            <div className="cardSub">Read previews. Support authors. Buy direct.</div>
          </div>
  
          <div style={{ padding: "0 16px 16px", lineHeight: 1.6, opacity: 0.95 }}>
            <p>
              HalfYourBook lets readers browse generous previews of books, then buy
              directly from authors.
            </p>
  
            <p>
              Authors can upload their book details, add preview sections, and link
              readers to purchase options.
            </p>
  
            <p style={{ marginBottom: 0 }}>
              The goal: make discovery easy while keeping support direct.
            </p>
          </div>
        </div>
      </div>
    );
  }
  