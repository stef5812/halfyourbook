// src/components/layout/AppHeader.jsx
import { Link, useNavigate } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
import { getCurrentUserWithProfile, logout } from "../lib/api";
import mark from "../assets/new-logo.png";
import "./AppHeader.css";

export default function AppHeader() {
  const nav = useNavigate();

  const [me, setMe] = useState(null);
  const [authed, setAuthed] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);
  const [open, setOpen] = useState(false);

  const menuWrapRef = useRef(null);

  const loginHref = import.meta.env.DEV
    ? "http://localhost:5173/login?from=halfyourbook&next=http://localhost:5174/"
    : "https://auth.stefandodds.ie/login?from=halfyourbook&next=https://halfyourbook.stefandodds.ie/";

  const registerHref = import.meta.env.DEV
    ? "http://localhost:5173/register?from=halfyourbook&next=http://localhost:5174/"
    : "https://auth.stefandodds.ie/register?from=halfyourbook&next=https://halfyourbook.stefandodds.ie/";

  useEffect(() => {
    let cancelled = false;

    async function checkAuth() {
      try {
        const m = await getCurrentUserWithProfile();
        console.log("ME RESPONSE:", m);

        if (!cancelled) {
          setMe(m);
          setAuthed(!!m?.user);
        }
      } catch (err) {
        console.error("Auth check error:", err);
        if (!cancelled) {
          setMe(null);
          setAuthed(false);
        }
      } finally {
        if (!cancelled) setAuthLoading(false);
      }
    }

    checkAuth();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    function onKeyDown(e) {
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

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

  useEffect(() => {
    setOpen(false);
  }, [authed]);

  async function handleLogout() {
    try {
      await logout();
    } catch {
      //
    }
    setMe(null);
    setAuthed(false);
    setOpen(false);
    nav("/");
  }

  const currentUser = me?.user || null;
  const appRoles = me?.appRoles || [];
  const authorProfile = me?.authorProfile || null;

  const userLabel =
    currentUser?.displayName ||
    currentUser?.firstName ||
    currentUser?.email ||
    "Anon";

  const isHalfYourBookAdmin = appRoles.some(
    (r) => r.app === "HALFYOURBOOK" && r.role === "ADMIN"
  );

  const bio = authorProfile?.bio || "";
  const photoUrl = authorProfile?.photoUrl || "";

  return (
    <header className="appHeader">
      <div className="appHeaderInner headerGrid">
        <div className="headerLeft">
          {!authLoading && (
            <div className="userChip" title={userLabel}>
              <span className="userChipLabel">User : </span>
              <span className="userChipName">{userLabel}</span>
            </div>
          )}
        </div>

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
              {authed && (
                <>
                  <div className="menuProfileName">{userLabel}</div>
                  {bio ? <div className="menuProfileBio">{bio}</div> : null}
                  {photoUrl ? (
                    <div className="menuProfilePhotoWrap">
                      <img src={photoUrl} alt={userLabel} className="menuProfilePhoto" />
                    </div>
                  ) : null}
                  <div className="menuDivider" />
                </>
              )}

              <Link className="menuItem" to="/" onClick={() => setOpen(false)}>
                Home
              </Link>
              <Link className="menuItem" to="/authors" onClick={() => setOpen(false)}>
                Authors
              </Link>
              <Link className="menuItem" to="/books" onClick={() => setOpen(false)}>
                Browse previews
              </Link>
              <Link className="menuItem" to="/about" onClick={() => setOpen(false)}>
                About
              </Link>

              <div className="menuDivider" />

              {!authLoading && !authed && (
                <>
                  <a className="menuItem" href={loginHref} onClick={() => setOpen(false)}>
                    Login
                  </a>
                  <a className="menuItem menuPrimary" href={registerHref} onClick={() => setOpen(false)}>
                    Register
                  </a>
                </>
              )}

              {!authLoading && authed && (
                <>
                  <Link className="menuItem" to="/dashboard" onClick={() => setOpen(false)}>
                    Dashboard
                  </Link>

                  {isHalfYourBookAdmin && (
                    <Link className="menuItem" to="/admin" onClick={() => setOpen(false)}>
                      Admin
                    </Link>
                  )}

                  <div className="menuDivider" />

                  <button className="menuItem menuPrimary" onClick={handleLogout} type="button">
                    Logout
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  );
}