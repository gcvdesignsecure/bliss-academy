import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../lib/auth";
import AdminNav from "./AdminNav";

type Row = {
  id: string;
  status: string;
  created_at: string;
  profiles: { full_name: string; email: string } | null;
};

export default function AdminAdmissions() {
  const { signOut } = useAuth();
  const [rows, setRows] = useState<Row[]>([]);
  const [note, setNote] = useState("");

  const load = () =>
    supabase
      .from("admissions")
      .select("id,status,created_at,profiles(full_name,email)")
      .order("created_at", { ascending: false })
      .then(({ data }) => setRows((data as unknown as Row[]) ?? []));

  useEffect(() => { load(); }, []);

  async function act(id: string, kind: "approve" | "reject") {
    const { data, error } = await supabase.rpc(
      kind === "approve" ? "approve_admission" : "reject_admission",
      { p_admission: id }
    );
    setNote(error ? error.message : kind === "approve" ? `Approved. MatNumber: ${data}` : "Rejected.");
    load();
  }

  return (
    <div className="wrap wide">
      <h1>Admissions</h1>
      <AdminNav />
      {note && <div className="ok">{note}</div>}
      {rows.length === 0 && <p className="muted">No applications yet.</p>}
      {rows.map((r) => (
        <div className="card" key={r.id}>
          <b>{r.profiles?.full_name}</b> <span className="muted">{r.profiles?.email}</span>
          <div className="muted">Status: {r.status.replace("_", " ")}</div>
          <div style={{ marginTop: 8 }}>
            {r.status === "under_review" && (
              <button className="small" onClick={() => act(r.id, "approve")}>Approve</button>
            )}
            {(r.status === "under_review" || r.status === "kyc_pending") && (
              <button className="small danger" onClick={() => act(r.id, "reject")}>Reject</button>
            )}
          </div>
        </div>
      ))}
      <button onClick={signOut}>Log out</button>
    </div>
  );
}