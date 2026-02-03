// src/pages/About.jsx
import { useEffect, useMemo, useState } from "react";
import "./About.css";

const Slide = ({ icon, children }) => (
  <div
    style={{
      padding: "18px 16px",
      borderRadius: 12,
      background: "rgba(255,255,255,0.04)",
      border: "1px solid rgba(255,255,255,0.08)",
      minHeight: 150,
      display: "flex",
      gap: 14,
      alignItems: "flex-start",
    }}
  >
    <div
      style={{
        fontSize: 22,
        lineHeight: "1",
        opacity: 0.85,
        marginTop: 2,
        width: 28,
        textAlign: "center",
        flex: "0 0 auto",
      }}
      aria-hidden
    >
      {icon}
    </div>

    <p style={{ margin: 0, lineHeight: 1.75, opacity: 0.96, fontSize: "1.02rem" }}>
      {children}
    </p>
  </div>
);

export default function About() {
  const slides = useMemo(
    () => [
      {
        icon: "📖",
        text: (
          <>
            <strong>HalfYourBook</strong> is a home for writers who want to be read — without
            pressure, gatekeepers, or expectations.
          </>
        ),
      },
      {
        icon: "✍️",
        text: (
          <>
            <strong>Designed</strong> for unpublished authors, hobby writers, and storytellers,
            it offers a simple way to share work and see how real readers respond.
          </>
        ),
      },
      {
        icon: "🧩",
        text: (
          <>
            <strong>Some</strong> writers arrive with a finished manuscript. Others arrive with
            half a story, a rough draft, or an idea they’ve never quite completed.
            <em> Both are welcome here.</em>
          </>
        ),
      },
      {
        icon: "📂",
        text: (
          <>
            <strong>HalfYourBook</strong> gives writers the freedom to share generous preview
            sections, publish unfinished or work-in-progress stories, or offer a full piece simply
            so others can read it.
          </>
        ),
      },
      {
        icon: "💬",
        text: (
          <>
            <strong>For</strong> many, it’s a way to see whether a story truly connects. For
            others, it’s the encouragement needed to keep going, revise, or finally finish
            something they’ve started.
          </>
        ),
      },
      {
        icon: "🧭",
        text: (
          <>
            <strong>There’s</strong> no requirement to sell, promote, or perform. Writers stay in
            control of how much they share, while readers discover new voices without algorithms
            or rankings deciding what they see.
          </>
        ),
      },
      {
        icon: "❤️",
        text: (
          <>
            <strong>At</strong> its heart, HalfYourBook is about the simple connection between
            writing and reading — because sometimes <em>half a book</em> is exactly what a story
            needs.
          </>
        ),
      },
    ],
    []
  );

  const [i, setI] = useState(0);
  const [paused, setPaused] = useState(false);

  const autoplayMs = 6000; // change speed here (ms)

  useEffect(() => {
    if (paused) return;
    const t = setInterval(() => {
      setI((x) => (x + 1) % slides.length);
    }, autoplayMs);
    return () => clearInterval(t);
  }, [paused, autoplayMs, slides.length]);

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

            <div style={{ padding: "0 16px 16px" }}>
              <div
                onMouseEnter={() => setPaused(true)}
                onMouseLeave={() => setPaused(false)}
                style={{ paddingTop: 6 }}
              >
                <Slide key={i} icon={slides[i].icon}>
                  {slides[i].text}
                </Slide>

                <div
                  style={{
                    marginTop: 10,
                    fontSize: 12,
                    opacity: 0.55,
                    textAlign: "right",
                    userSelect: "none",
                  }}
                >
                  {i + 1}/{slides.length}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
