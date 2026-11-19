import { useEffect, useState, FormEvent } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../lib/auth";
import VerifyContact from "./VerifyContact";

const COUNTRY_MIN = 2;

export default function Apply() {
  const { profile, session, signOut } = useAuth();
  const [f, setF] = useState({ full_name: "", email: "", whatsapp: "", country: "", password: "", dob: "" });
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) => setF({ ...f, [k]: e.target.value });

  useEffect(() => {
    if (!session) return;
    supabase.from("admissions").select("status").order("created_at", { ascending: false }).limit(1)
      .then(({ data }) => { setStatus(data?.[0]?.status ?? null); setLoaded(true); });
  }, [session, msg]);

  async function signUp(e: FormEvent) {
    e.preventDefault(); setBusy(true); setError(""); setMsg("");
    const wa = f.whatsapp.replace(/[\s\-().]/g, "");
    if (!/^\+?[0-9]{7,15}$/.test(wa)) { setError("Enter a valid WhatsApp number, e.g. +2348012345678."); setBusy(false); return; }
    if (f.country.trim().length < COUNTRY_MIN) { setError("Country is required."); setBusy(false); return; }
    const { data, error: err } = await supabase.auth.signUp({
      email: f.email.trim(), password: f.password,
      options: { data: { full_name: f.full_name.trim(), whatsapp: wa, country: f.country.trim() } },
    });
    setBusy(false);
    if (err) { setError(err.message); return; }
    // With email confirmation disabled a session is returned and the dashboard opens immediately.
    if (!data.session) setMsg("Account created. You can now log in.");
  }

  async function submitAdmission(e: FormEvent) {
    e.preventDefault(); setBusy(true); setError("");
    const { error: err } = await supabase.rpc("submit_admission", { p_dob: f.dob || null });
    setBusy(false);
    if (err) setError(err.message); else setMsg("Application submitted.");
  }

  if (session && profile?.role === "applicant") {
    const anyVerified = profile.email_verified || profile.whatsapp_verified;
    return (
      <div className="wrap">
        <h1>Admission</h1>
        <p className="muted">Hello {profile.full_name}.</p>

        <VerifyContact channel="email" />
        <VerifyContact channel="whatsapp" />
        {!anyVerified && <p className="muted">Verify your email or WhatsApp before your application can be approved.</p>}

        {!loaded ? <p className="muted">Loading…</p> : status ? (
          <div className="card">
            <b>Application status: {status.replace("_", " ")}</b>
            {status === "submitted" && <p className="muted">Your application is waiting for review.</p>}
            {status === "kyc_pending" && <p className="muted">Identity verification is not available yet. Your application will move to review once it is.</p>}
            {status === "approved" && <p className="ok">Approved. Payment and course selection open next.</p>}
            {status === "rejected" && <p className="err">Your application was not approved.</p>}
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
        <button className="ghost" onClick={signOut}>Log out</button>
      </div>
    );
  }

  if (session && profile && profile.role !== "applicant") {
    return (
      <div className="wrap">
        <h1>Apply to BLISS Academy</h1>
        <p className="muted">You are already signed in.</p>
        <Link to={profile.role === "superadmin" ? "/admin/overview" : "/dashboard"}><button>Go to my dashboard</button></Link>
      </div>
    );
  }

  return (
    <form className="wrap" onSubmit={signUp}>
      <h1>Apply to BLISS Academy</h1>
      <label>Full legal name</label><input value={f.full_name} onChange={set("full_name")} required minLength={2} />
      <label>Email</label><input type="email" value={f.email} onChange={set("email")} required />
      <label>WhatsApp number</label><input value={f.whatsapp} onChange={set("whatsapp")} required placeholder="+2348012345678" />
      <label>Country</label><input value={f.country} onChange={set("country")} required />
      <label>Password</label><input type="password" minLength={8} value={f.password} onChange={set("password")} required />
      {error && <div className="err">{error}</div>}
      {msg && <div className="ok">{msg}</div>}
      <button disabled={busy}>Create account</button>
      <p className="muted">Already applied? <Link to="/login">Log in</Link></p>
    </form>
  );
}