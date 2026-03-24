import { Link } from "react-router-dom";

export default function AdminHome() {
  return (
    <div className="page">
      <div className="pageHeader">
        <div className="pageTitle">Admin</div>
        <div className="pageSub">Choose what you want to manage.</div>
      </div>

      <div className="card">
        <div className="cardHeader">
          <div className="cardTitle">Control panel</div>
          <div className="cardSub">This is where admin tools will grow over time.</div>
        </div>

        <div style={{ padding: 16, display: "flex", gap: 10, flexWrap: "wrap" }}>
          <Link className="btn btnPrimary" to="/admin/users">
            Manage Authors
          </Link>

          <Link className="btn btnSecondary" to="/admin/books">
            Manage books
          </Link>

          <Link className="btn btnSecondary" to="/admin/books">
            Manage books
          </Link>
        </div>
      </div>
    </div>
  );
}
