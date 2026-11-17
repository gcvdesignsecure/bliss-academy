import { useEffect, useState, FormEvent } from "react";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../lib/auth";

export default function Apply() {
  const { profile, session } = useAuth();
  const [f, setF] = useState({ full_name: "", email: "", whatsapp: "", country: "", password: "", dob: "" });
  const [msg, setMsg] = useState(""); const [error, setError] = useState(""); const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const set = (k: string) => (e: any) => setF({ ...f, [k]: e.target.value });

  useEffect(() => {
    if (!session) return;
    supabase.from("admissions").select("status").order("created_at", { ascending: false }).limit(1)
      .then(({ data }) => setStatus(data?.[0]?.status ?? null));
  }, [session, msg]);

  async function signUp(e: FormEvent) {
    e.preventDefault(); setBusy(true); setError("");
    const { error: err } = await supabase.auth.signUp({
      email: f.email, password: f.password,
      options: { data: { full_name: f.full_name, whatsapp: f.whatsapp, country: f.country } },
    });
    setBusy(false);
    if (err) setError(err.message); else setMsg("Account created. Check your email to confirm, then log in here to continue.");
  }

  async function submitAdmission(e: FormEvent) {
    e.preventDefault(); setBusy(true); setError("");
    const { error: err } = await supabase.rpc("submit_admission", { p_dob: f.dob || null });
    setBusy(false);
    if (err) setError(err.message); else setMsg("Application submitted.");
  }

  if (session && profile?.role === "applicant") {
    return (
      <div className="wrap">
        <h1>Admission</h1>
        <p className="muted">Hello {profile.full_name}.</p>
        {status ? (
          <div className="card">
            <b>Status: {status.replace("_", " ")}</b>
            {status === "kyc_pending" && <p className="muted">Identity verification is not available yet. Your application will move to review once it is.</p>}
          </div>
        ) : (
          <form onSubmit={submitAdmission}>
            <label>Date of birth</label>
            <input type="date" value={f.dob} onChange={set("dob")} required />
            {error && <div className="err">{error}</div>}
            <button disabled={busy}>Submit application</button>
          </form>
        )}
        {msg && <div className="ok">{msg}</div>}
      </div>
    );
  }

  return (
    <form className="wrap" onSubmit={signUp}>
      <h1>Apply to BLISS Academy</h1>
      <label>Full legal name</label><input value={f.full_name} onChange={set("full_name")} required />
      <label>Email</label><input type="email" value={f.email} onChange={set("email")} required />
      <label>WhatsApp number</label><input value={f.whatsapp} onChange={set("whatsapp")} required />
      <label>Country</label><input value={f.country} onChange={set("country")} required />
      <label>Password</label><input type="password" minLength={8} value={f.password} onChange={set("password")} required />
      {error && <div className="err">{error}</div>}
      {msg && <div className="ok">{msg}</div>}
      <button disabled={busy}>Create account</button>
    </form>
  );
}