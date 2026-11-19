import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../lib/auth";
import AdminNav from "./AdminNav";

type Row = {
  id: string;
  status: string;
  created_at: string;
  user_id: string;
  profiles: { full_name: string;email: string;email_verified: boolean;whatsapp_verified: boolean } | null;
};
type Next = "kyc_pending" | "under_review" | "approved" | "rejected";

// Transitions allowed by the admin_set_admission_status database function.
const NEXT: Record < string, { to: Next;label: string;danger ? : boolean } [] > = {
  submitted: [{ to: "kyc_pending", label: "Request ID check" }, { to: "rejected", label: "Reject", danger: true }],
  kyc_pending: [{ to: "under_review", label: "Move to review" }, { to: "rejected", label: "Reject", danger: true }],
  under_review: [{ to: "approved", label: "Approve" }, { to: "kyc_pending", label: "Back to ID check" }, { to: "rejected", label: "Reject", danger: true }],
};

export default function AdminAdmissions() {
  const { signOut } = useAuth();
  const [rows, setRows] = useState < Row[] > ([]);
  const [note, setNote] = useState("");
  const [isErr, setIsErr] = useState(false);
  
  const load = () =>
    supabase
    .from("admissions")
    .select("id,status,created_at,user_id,profiles(full_name,email,email_verified,whatsapp_verified)")
    .order("created_at", { ascending: false })
    .then(({ data }) => setRows((data as unknown as Row[]) ?? []));
  
  useEffect(() => { void load(); }, []);
  
  async function act(id: string, to: Next) {
    const { error } = await supabase.rpc("admin_set_admission_status", { p_admission: id, p_status: to, p_note: null });
    setIsErr(!!error);
    setNote(error ? error.message : `Moved to ${to.replace("_", " ")}.`);
    void load();
  }
  
  return (
    <div className="wrap wide">
      <h1>Admissions</h1>
      <AdminNav />
      {note && <div className={isErr ? "err" : "ok"}>{note}</div>}
      {rows.length === 0 && <p className="muted">No applications yet.</p>}
      {rows.map((r) => (
        <div className="card" key={r.id}>
          <b>{r.profiles?.full_name}</b> <span className="muted">{r.profiles?.email}</span>
          <div className="muted">
            Status: {r.status.replace("_", " ")} ·{" "}
            {r.profiles?.email_verified ? "email verified" : "email not verified"} ·{" "}
            {r.profiles?.whatsapp_verified ? "WhatsApp verified" : "WhatsApp not verified"}
          </div>
          <div style={{ marginTop: 8 }}>
            {(NEXT[r.status] ?? []).map((n) => (
              <button key={n.to} className={n.danger ? "small danger" : "small"} onClick={() => act(r.id, n.to)}>{n.label}</button>
            ))}
          </div>
        </div>
      ))}
      <button onClick={signOut}>Log out</button>
    </div>
  );
}