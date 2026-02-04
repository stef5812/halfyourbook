// src/pages/Home.jsx
import { Link } from "react-router-dom";
import { getToken } from "../lib/api";
import "./Home.css";

export default function Home() {
  const authed = Boolean(getToken());

  return (
    <div className="homeHero underHeader">
      <div className="homeOverlay">
        <div className="homeInner">

          <div className="homeHeader">
            <div className="homeTitle">HalfYourBook</div>
            <div className="homeSub">
              Read previews. Support authors. Buy direct.
            </div>
          </div>

          <div className="homeCard">
            <div className="homeCardTitle">Welcome</div>
            <div className="homeCardSub">
              Discover previews, then buy directly from the author.
            </div>

            <div className="homeActions">
              <Link className="btn btnPrimary" to="/books">
                Browse book previews
              </Link>

              <Link className="btn btnSecondary" to="/dashboard">
                Author dashboard
              </Link>

              {!authed && (
                <Link
                  className="btn"
                  to="/authors/dashboard"
                  state={{ from: "home" }}
                >
                  Author dashboard
                </Link>

              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
