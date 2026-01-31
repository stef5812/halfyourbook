import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { api, setToken } from "../lib/api";
import "./login.css";

export default function Login() {
  const nav = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSubmit(e) {
    e.preventDefault();
    setErr("");
    setBusy(true);
    try {
      const data = await api("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });

      setToken(data.token);
      nav("/", { replace: true });
    } catch (e) {
      setErr(e.message || "Login failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="loginHero underHeader">
      <div className="loginOverlay">
        <div className="page">
          <div className="pageHeader">
            <div className="pageTitle">Login</div>
            <div className="pageSub">Access your author dashboard.</div>
          </div>

          <div className="card">
            <div className="cardHeader">
              <div className="cardTitle">Welcome back</div>
              <div className="cardSub">Use your email + password.</div>
            </div>

            <form className="formGrid" onSubmit={onSubmit}>
              <div className="field fieldFull">
                <label>Email</label>
                <input value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>

              <div className="field fieldFull">
                <label>Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>

              {err ? <div className="field fieldFull">{err}</div> : null}

              <div className="field">
                <button className="btn btnPrimary" disabled={busy} type="submit">
                  {busy ? "Signing in..." : "Login"}
                </button>
              </div>

              <div className="field">
                <Link className="btn btnSecondary" to="/forgot">
                  Forgot password
                </Link>
              </div>

              <div className="field fieldFull">
                No account? <Link to="/register">Register</Link>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
