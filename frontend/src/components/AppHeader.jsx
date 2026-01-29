import { Link, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { api, setToken, getToken } from "../lib/api";
import mark from "../assets/logo.svg";

export default function AppHeader() {
  const nav = useNavigate();
  const authed = Boolean(getToken());

  const [me, setMe] = useState(null);

  useEffect(() => {
    if (!authed) {
      setMe(null);
      return;
    }

    (async () => {
      try {
        const m = await api("/api/users/me");
        setMe(m || null);
      } catch {
        setMe(null);
      }
    })();
  }, [authed]);

  return (
    <header className="appHeader">
      <div
        className="appHeaderInner"
        style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}
      >
        <div className="brand" onClick={() => nav("/")} style={{ cursor: "pointer" }}>
          <img
            src={mark}
            alt=""
            aria-hidden="true"
            style={{ width: 22, height: 22, display: "block" }}
          />
          HalfYourBook
        </div>

        <div style={{ display: "flex", gap: 8 }}>
          <Link className="btn btnSecondary" to="/books">
            Browse
          </Link>

          {authed ? (
            <>
              <Link className="btn btnSecondary" to="/dashboard">
                Dashboard
              </Link>

              {/* ✅ Only show for admin */}
              {me?.role === "admin" ? (
                <Link className="btn btnSecondary" to="/admin">
                  Admin
                </Link>
              ) : null}

              <button
                className="btn btnPrimary"
                onClick={() => {
                  setToken("");
                  nav("/login");
                }}
              >
                Logout
              </button>
            </>
          ) : (
            <>
              <Link className="btn btnSecondary" to="/login">
                Login
              </Link>
              <Link className="btn btnPrimary" to="/register">
                Register
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}

