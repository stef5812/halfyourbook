import { useMemo, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { api } from "../lib/api";

export default function Reset() {
  const nav = useNavigate();
  const [sp] = useSearchParams();
  const token = useMemo(() => sp.get("token") || "", [sp]);

  const [newPassword, setNewPassword] = useState("");
  const [ok, setOk] = useState(false);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSubmit(e) {
    e.preventDefault();
    setErr("");
    setOk(false);
    setBusy(true);
    try {
      await api("/api/auth/reset", {
        method: "POST",
        body: JSON.stringify({ token, newPassword }),
      });
      setOk(true);
      setTimeout(() => nav("/login"), 500);
    } catch (e) {
      setErr(e.message || "Reset failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="page">
      <div className="pageHeader">
        <div className="pageTitle">Reset password</div>
        <div className="pageSub">Set a new password for your account.</div>
      </div>

      <div className="card">
        <div className="cardHeader">
          <div className="cardTitle">Choose a new password</div>
          <div className="cardSub">Token is read from the URL.</div>
        </div>

        <form className="formGrid" onSubmit={onSubmit}>
          <div className="field fieldFull">
            <label>New password</label>
            <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
          </div>

          {ok ? <div className="field fieldFull">Password updated. Redirecting…</div> : null}
          {err ? <div className="field fieldFull">{err}</div> : null}

          <div className="field fieldFull">
            <button className="btn btnPrimary" disabled={busy || !token}>
              {busy ? "Updating..." : "Reset password"}
            </button>
          </div>

          {!token ? <div className="field fieldFull">Missing token in URL.</div> : null}
        </form>
      </div>
    </div>
  );
}
