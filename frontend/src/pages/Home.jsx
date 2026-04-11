// src/pages/Home.jsx
import { Link, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { getCurrentUser, logout as apiLogout } from "../lib/api";
import "./Home.css";

export default function Home() {
  const [me, setMe] = useState(null);
  const [loading, setLoading] = useState(true);
  const nav = useNavigate();

  const devNext = "http://localhost:5175/";
  const prodNext = "https://stefandodds.ie/halfyourbook/";

  const loginHref = import.meta.env.DEV
    ? `http://localhost:5173/login?from=halfyourbook&next=${encodeURIComponent(devNext)}`
    : `https://auth.stefandodds.ie/login?from=halfyourbook&next=${encodeURIComponent(prodNext)}`;

  useEffect(() => {
    let cancelled = false;

    async function checkAuth() {
      try {
        const m = await getCurrentUser();
        if (!cancelled) setMe(m || null);
      } catch {
        if (!cancelled) setMe(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    checkAuth();
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleLogout() {
    try {
      await apiLogout();
    } catch {
      //
    }
    setMe(null);
    nav("/");
  }

  const currentUser = me?.user || null;
  const appRoles = me?.appRoles || [];

  const hasDashboardAccess = appRoles.some(
    (r) =>
      r.app === "HALFYOURBOOK" &&
      (r.role === "AUTHOR" || r.role === "ADMIN")
  );

  const displayName =
    currentUser?.displayName ||
    currentUser?.firstName ||
    currentUser?.email ||
    "User";

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

            {currentUser && (
              <div style={{ marginBottom: 10, opacity: 0.8 }}>
                Logged in as <b>{displayName}</b>
              </div>
            )}

            <div className="homeCardSub">
              Discover previews, then buy directly from the author.
            </div>

            <div className="homeActions">
              <Link className="btn btnPrimary" to="/books">
                Browse book previews
              </Link>

              {!loading && !currentUser && (
                <a className="btn" href={loginHref}>
                  Login
                </a>
              )}

              {!loading && currentUser && (
                <>
                  {hasDashboardAccess && (
                    <Link className="btn btnSecondary" to="/dashboard">
                      Author dashboard
                    </Link>
                  )}

                  <button className="btn" onClick={handleLogout}>
                    Logout
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}