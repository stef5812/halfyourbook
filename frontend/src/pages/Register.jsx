import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { api, setToken } from "../lib/api";
import "./Login.css";

export default function Register() {
  const nav = useNavigate();
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("author");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSubmit(e) {
    e.preventDefault();
    setErr("");
    setBusy(true);
    try {
      const data = await api("/api/auth/register", {
        method: "POST",
        body: JSON.stringify({ displayName, email, password, role }),
      });
      setToken(data.token);
      nav("/", { replace: true });

    } catch (e) {
      setErr(e.message || "Registration failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="loginHero">
      <div className="loginOverlay">    
    <div className="page">
      <div className="pageHeader">
        <div className="pageTitle">Register</div>
        <div className="pageSub">Create your author account.</div>
      </div>

      <div className="card">
        <div className="cardHeader">
          <div className="cardTitle">Get started</div>
          <div className="cardSub">No payments handled here — you link to your own sales page.</div>
        </div>

        <form className="formGrid" onSubmit={onSubmit}>
          <div className="field fieldFull">
            <label>Display name</label>
            <input value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
          </div>

          <div className="field fieldFull">
            <label>Email</label>
            <input value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>

          <div className="field fieldFull">
            <label>Password</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>

          <div className="field fieldFull">
            <label>Role</label>
            <select value={role} onChange={(e) => setRole(e.target.value)}>
              <option value="author">author</option>
              <option value="reader">reader</option>
            </select>
          </div>

          {err ? <div className="field fieldFull">{err}</div> : null}

          <div className="field fieldFull">
            <button className="btn btnPrimary" disabled={busy}>
              {busy ? "Creating..." : "Register"}
            </button>
          </div>

          <div className="field fieldFull">
            Already have an account? <Link to="/login">Login</Link>
          </div>
        </form>
      </div>
    </div>
    </div>
    </div>    
  );
}
