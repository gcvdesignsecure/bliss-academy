import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import { fnError } from "../../lib/fn";
import AdminNav from "./AdminNav";

type Req = {
  id: string;destination: string;status: string;created_at: string;
  profiles: { full_name: string } | null;
};

export default function AdminVerifications() {
  const [rows, setRows] = useState < Req[] > ([]);
  const [issued, setIssued] = useState < { id: string;code: string;whatsapp: string } | null > (null);
  const [error, setError] = useState("");
  
  const load = () =>
    supabase.from("contact_verification_requests")
    .select("id,destination,status,created_at,profiles(full_name)")
    .eq("channel", "whatsapp").in("status", ["pending", "issued"])
    .order("created_at", { ascending: true })
    .then(({ data }) => setRows((data as unknown as Req[]) ?? []));
  useEffect(() => { void load(); }, []);
  
  async function call(action: "issue" | "reject", id: string) {
    setError("");
    const { data, error: err } = await supabase.functions.invoke("admin-contact", { body: { action, request_id: id } });
    if (err) { setError(await fnError(err, "Something went wrong")); return; }
    if (action === "issue") setIssued({ id, code: data.code, whatsapp: data.whatsapp });
    else setIssued(null);
    void load();
  }
  
  return (
    <div className="wrap wide">
      <h1>WhatsApp verifications</h1>
      <AdminNav />
      <p className="muted">Issue a code, then send it to the applicant yourself on WhatsApp. Codes are shown once and expire in 30 minutes.</p>
      {error && <div className="err">{error}</div>}
      {issued && (
        <div className="card">
          Send code <b style={{ letterSpacing: 4, fontSize: "1.3rem" }}>{issued.code}</b> to <b>{issued.whatsapp}</b>
          <div style={{ marginTop: 8 }}>
            <a href={`https://wa.me/${issued.whatsapp.replace(/\D/g, "")}?text=${encodeURIComponent(`Your BLISS Academy verification code is ${issued.code}. It expires in 30 minutes.`)}`}
              target="_blank" rel="noreferrer">Open WhatsApp</a>
          </div>
        </div>
      )}
      {rows.length === 0 && <p className="muted">No pending requests.</p>}
      {rows.map((r) => (
        <div className="card" key={r.id}>
          <b>{r.profiles?.full_name}</b> <span className="muted">{r.destination}</span>
          <div className="muted">Status: {r.status}</div>
          <div style={{ marginTop: 8 }}>
            <button className="small" onClick={() => call("issue", r.id)}>{r.status === "issued" ? "Issue new code" : "Issue code"}</button>
            <button className="small danger" onClick={() => call("reject", r.id)}>Reject</button>
          </div>
        </div>
      ))}
    </div>
  );
}