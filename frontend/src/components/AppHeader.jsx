import { Link, useNavigate } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
import { api, setToken, getToken } from "../lib/api";
import mark from "../assets/logo.svg";

export default function AppHeader() {
  const nav = useNavigate();
  const authed = Boolean(getToken());

  const [me, setMe] = useState(null);
  const [open, setOpen] = useState(false);
  const panelRef = useRef(null);

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

  // Close on Escape
  useEffect(() => {
    function onKeyDown(e) {
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  // Close when clicking outside
  useEffect(() => {
    function onMouseDown(e) {
      if (!open) return;
      if (panelRef.current && !panelRef.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", onMouseDown);
    return () => document.removeEventListener("mousedown", onMouseDown);
  }, [open]);

  // Close menu when auth changes (prevents stale options)
  useEffect(() => {
    setOpen(false);
  }, [authed]);

  return (
    <header className="appHeader">
      <div className="appHeaderInner">
        <div
          className="brand"
          role="button"
          tabIndex={0}
          onClick={() => {
            setOpen(false);
            nav("/");
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              setOpen(false);
              nav("/");
            }
          }}
        >
          <img src={mark} alt="" aria-hidden="true" className="brandMark" />
          <span className="brandText">HalfYourBook</span>
        </div>

        <div className="headerRight" ref={panelRef}>
          {/* Optional: show name when authed */}
          {authed && me?.displayName ? (
            <div className="userChip" title={me.displayName}>
              {me.displayName}
            </div>
          ) : null}

          <button
            type="button"
            className="menuBtn"
            aria-label="Open menu"
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true">
              <path
                d="M4 6h16M4 12h16M4 18h16"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          </button>

          {open && (
            <div className="menuPanel" role="menu">
              <Link className="menuItem" to="/" onClick={() => setOpen(false)} role="menuitem">
                Home
              </Link>

              <Link className="menuItem" to="/about" onClick={() => setOpen(false)} role="menuitem">
                About
              </Link>

              <div className="menuDivider" />

              <Link className="menuItem" to="/books" onClick={() => setOpen(false)} role="menuitem">
                Browse
              </Link>

              {authed ? (
                <>
                  <Link
                    className="menuItem"
                    to="/dashboard"
                    onClick={() => setOpen(false)}
                    role="menuitem"
                  >
                    Dashboard
                  </Link>

                  {me?.role === "admin" ? (
                    <Link
                      className="menuItem"
                      to="/admin"
                      onClick={() => setOpen(false)}
                      role="menuitem"
                    >
                      Admin
                    </Link>
                  ) : null}

                  <div className="menuDivider" />

                  <button
                    type="button"
                    className="menuItem menuPrimary"
                    onClick={() => {
                      setOpen(false);
                      setToken("");
                      nav("/login");
                    }}
                    role="menuitem"
                  >
                    Logout
                  </button>
                </>
              ) : (
                <>
                  <div className="menuDivider" />

                  <Link className="menuItem" to="/login" onClick={() => setOpen(false)} role="menuitem">
                    Login
                  </Link>

                  <Link
                    className="menuItem menuPrimary"
                    to="/register"
                    onClick={() => setOpen(false)}
                    role="menuitem"
                  >
                    Register
                  </Link>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
