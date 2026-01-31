// src/pages/About.jsx
import "./About.css";

export default function About() {
  return (
    <div className="aboutHero underHeader">
      <div className="aboutOverlay">
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
                <strong>HalfYourBook</strong> is a home for writers who want to be read — without
                pressure, gatekeepers, or expectations.
              </p>

              <p>
                <strong>Designed</strong> for unpublished authors, hobby writers, and
                storytellers, it offers a simple way to share work and see how real readers
                respond.
              </p>

              <p>
                <strong>Some</strong> writers arrive with a finished manuscript. Others arrive
                with half a story, a rough draft, or an idea they’ve never quite completed.
                <em> Both are welcome here.</em>
              </p>

              <p>
                <strong>HalfYourBook</strong> gives writers the freedom to share generous
                preview sections, publish unfinished or work-in-progress stories, or offer a
                full piece simply so others can read it.
              </p>

              <p>
                <strong>For</strong> many, it’s a way to see whether a story truly connects.
                For others, it’s the encouragement needed to keep going, revise, or finally
                finish something they’ve started.
              </p>

              <p>
                <strong>There’s</strong> no requirement to sell, promote, or perform. Writers
                stay in control of how much they share, while readers discover new voices
                without algorithms or rankings deciding what they see.
              </p>

              <p style={{ marginBottom: 0 }}>
                <strong>At</strong> its heart, HalfYourBook is about the simple connection
                between writing and reading — because sometimes <em>half a book</em> is
                exactly what a story needs.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
