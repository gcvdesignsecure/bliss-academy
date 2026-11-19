import { useState, FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import { fnError } from "../../lib/fn";

type Kind = "applicant" | "student" | "admin";

async function readError(err: unknown, fallback: string) {
  try {
    const ctx = (err as { context?: Response }).context;
    if (!ctx) return { error: fallback } as { error?: string; needs_setup?: boolean };
    return (await ctx.json()) as { error?: string; needs_setup?: boolean };
  } catch {
    return { error: fallback } as { error?: string; needs_setup?: boolean };
  }
}

export default function Login() {
  const nav = useNavigate();
  const [kind, setKind] = useState<Kind>("applicant");
  const [id, setId] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [code, setCode] = useState("");
  const [setup, setSetup] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function signInApplicant() {
    const { error: err } = await supabase.auth.signInWithPassword({ email: id.trim(), password });
    if (err) { setError("Invalid login details"); return false; }
    nav("/apply");
    return true;
  }

  async function signIn() {
    if (kind === "applicant") return signInApplicant();
    const { data, error: err } = await supabase.functions.invoke("auth-login", {
      body: { kind, id, name, password },
    });
    if (err || !data?.access_token) {
      const e = await readError(err, "Invalid login details");
      if (e.needs_setup) { setSetup(true); setPassword(""); return false; }
      setError(e.error ?? "Invalid login details");
      return false;
    }
    await supabase.auth.setSession({ access_token: data.access_token, refresh_token: data.refresh_token });
    nav(kind === "admin" ? "/admin/overview" : "/dashboard");
    return true;
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true); setError("");
    if (setup) {
      if (password !== confirm) { setError("Passwords do not match"); setBusy(false); return; }
      const { error: err } = await supabase.functions.invoke("admin-setup", {
        body: { id, name, code, password },
      });
      if (err) { setError(await fnError(err, "Setup failed")); setBusy(false); return; }
      setSetup(false);
    }
    await signIn();
    setBusy(false);
  }

  return (
    <form className="wrap" onSubmit={submit}>
      <h1>{setup ? "Set up your admin account" : "Log in"}</h1>
      {setup && <p className="muted">First time here. Enter the setup code and choose your password.</p>}
      {!setup && (
        <div className="tabs">
          <button type="button" className={kind === "applicant" ? "on" : ""} onClick={() => setKind("applicant")}>Applicant</button>
          <button type="button" className={kind === "student" ? "on" : ""} onClick={() => setKind("student")}>Student</button>
          <button type="button" className={kind === "admin" ? "on" : ""} onClick={() => setKind("admin")}>Admin</button>
        </div>
      )}
      <label>{kind === "applicant" ? "Email" : kind === "student" ? "MatNumber" : "Admin number"}</label>
      <input type={kind === "applicant" ? "email" : "text"} value={id} onChange={(e) => setId(e.target.value)} required readOnly={setup} />
      {kind === "admin" && (<><label>Registered name</label>
        <input value={name} onChange={(e) => setName(e.target.value)} required readOnly={setup} /></>)}
      {setup && (<><label>Setup code</label>
        <input type="password" value={code} onChange={(e) => setCode(e.target.value)} required /></>)}
      <label>{setup ? "New password (min 10 characters)" : "Password"}</label>
      <input type="password" minLength={setup ? 10 : undefined} value={password} onChange={(e) => setPassword(e.target.value)} required />
      {setup && (<><label>Confirm password</label>
        <input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required /></>)}
      {error && <div className="err">{error}</div>}
      <button disabled={busy}>{busy ? "Please wait…" : setup ? "Save password and log in" : "Log in"}</button>
      {kind === "applicant" && !setup && <p className="muted">New here? <Link to="/apply">Apply for admission</Link></p>}
    </form>
  );
}