import { Link, useNavigate } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
import { api, setToken, getToken } from "../lib/api";
import mark from "../assets/logo.svg";

export default function AppHeader() {
  const nav = useNavigate();
  const authed = Boolean(getToken());

  const [me, setMe] = useState(null);
  const [open, setOpen] = useState(false);

  // Wrap button + panel so "click outside" works cleanly
  const menuWrapRef = useRef(null);

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

  // Close when clicking outside (button + panel)
  useEffect(() => {
    function onMouseDown(e) {
      if (!open) return;
      if (menuWrapRef.current && !menuWrapRef.current.contains(e.target)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onMouseDown);
    return () => document.removeEventListener("mousedown", onMouseDown);
  }, [open]);

  // Close menu when auth changes
  useEffect(() => {
    setOpen(false);
  }, [authed]);

  return (
    <header className="appHeader">
      <div className="appHeaderInner headerGrid">
        {/* LEFT — User */}
        <div className="headerLeft">
          {me?.displayName ? (
          <div className="userChip" title={me.displayName}>
          <span className="userChipLabel">User : </span>
          <span className="userChipName">{me.displayName}</span>
        </div>
          ) : null}
        </div>

        {/* CENTER — Brand */}
        <div
          className="headerCenter"
          onClick={() => nav("/")}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") nav("/");
          }}
        >
          <img src={mark} alt="" aria-hidden="true" className="brandMark" />
          <span className="brandText"></span>
        </div>

        {/* RIGHT — Menu */}
        <div className="headerRight" ref={menuWrapRef}>
          <button
            className="menuBtn"
            aria-label="Menu"
            aria-haspopup="menu"
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
            type="button"
          >
            ☰
          </button>

          {open && (
  <div className="menuPanel">

    {/* ✅ Home */}
    <Link
      className="menuItem"
      to="/"
      onClick={() => setOpen(false)}
    >
      Home
    </Link>

    <Link
      className="menuItem"
      to="/authors"
      onClick={() => setOpen(false)}
    >
      Authors
    </Link>

    {/* Browse */}
    <Link
      className="menuItem"
      to="/books"
      onClick={() => setOpen(false)}
    >
      Browse previews
    </Link>

    {/* About */}
    <Link
      className="menuItem"
      to="/about"
      onClick={() => setOpen(false)}
    >
      About
    </Link>

    <div className="menuDivider" />

    {authed ? (
      <>
        <Link
          className="menuItem"
          to="/dashboard"
          onClick={() => setOpen(false)}
        >
          Dashboard
        </Link>

        {me?.role === "admin" && (
          <Link
            className="menuItem"
            to="/admin"
            onClick={() => setOpen(false)}
          >
            Admin
          </Link>
        )}

        <div className="menuDivider" />

        <button
          className="menuItem menuPrimary"
          onClick={() => {
            setToken("");
            setOpen(false);
            nav("/");
          }}
        >
          Logout
        </button>
      </>
    ) : (
      <>
        <Link
          className="menuItem"
          to="/login"
          onClick={() => setOpen(false)}
        >
          Login
        </Link>

        <Link
          className="menuItem menuPrimary"
          to="/register"
          onClick={() => setOpen(false)}
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
