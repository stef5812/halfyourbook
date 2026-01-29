import { useState } from "react";
import { api } from "../lib/api";

export default function Forgot() {
  const [email, setEmail] = useState("");
  const [ok, setOk] = useState(false);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSubmit(e) {
    e.preventDefault();
    setErr("");
    setOk(false);
    setBusy(true);
    try {
      await api("/api/auth/forgot", {
        method: "POST",
        body: JSON.stringify({ email }),
      });
      setOk(true);
    } catch (e) {
      // still show generic
      setOk(true);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="page">
      <div className="pageHeader">
        <div className="pageTitle">Forgot password</div>
        <div className="pageSub">We’ll email a reset link if the account exists.</div>
      </div>

      <div className="card">
        <div className="cardHeader">
          <div className="cardTitle">Reset link</div>
          <div className="cardSub">Check your inbox (or console in dev).</div>
        </div>

        <form className="formGrid" onSubmit={onSubmit}>
          <div className="field fieldFull">
            <label>Email</label>
            <input value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>

          {ok ? <div className="field fieldFull">If that email exists, a link has been sent.</div> : null}
          {err ? <div className="field fieldFull">{err}</div> : null}

          <div className="field fieldFull">
            <button className="btn btnPrimary" disabled={busy}>
              {busy ? "Sending..." : "Send reset link"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
