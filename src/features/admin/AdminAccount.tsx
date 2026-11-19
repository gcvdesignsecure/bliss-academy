import { useState, FormEvent } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import { fnError } from "../../lib/fn";
import { useAuth } from "../../lib/auth";

export default function AdminAccount() {
  const { profile, refresh } = useAuth();
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");
  const current = profile?.email ?? "";
  const hasReal = current !== "" && !current.endsWith(".invalid");
  const verified = hasReal && profile?.email_verified;

  async function request(e: FormEvent) {
    e.preventDefault(); setMsg(""); setError(""); setBusy(true);
    const { data, error: err } = await supabase.functions.invoke("contact-verify", {
      body: { action: "request", channel: "email", email },
    });
    setBusy(false);
    if (err) { setError(await fnError(err, "Could not send the code.")); return; }
    setSent(true);
    setMsg(`A 6-digit code was sent to ${data?.sent_to ?? "your email"}.`);
  }

  async function verify(e: FormEvent) {
    e.preventDefault(); setMsg(""); setError(""); setBusy(true);
    const { error: err } = await supabase.functions.invoke("contact-verify", {
      body: { action: "verify", channel: "email", code },
    });
    setBusy(false);
    if (err) { setError(await fnError(err, "Could not verify the code.")); return; }
    setSent(false); setCode(""); setEmail("");
    setMsg("Email verified.");
    await refresh();
  }

  return (
    <div className="wrap">
      <h1>My account</h1>
      <p className="muted">
        {verified ? `Verified email: ${current}` : hasReal ? `Email: ${current} (not verified)` : "No email added yet. Add yours so you can recover your account."}
      </p>
      {!sent ? (
        <form onSubmit={request}>
          <label>{hasReal ? "Change email" : "Your email"}</label>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          <button disabled={busy}>Send verification code</button>
        </form>
      ) : (
        <form onSubmit={verify}>
          <label>6-digit code</label>
          <input inputMode="numeric" maxLength={6} value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))} required />
          <button disabled={busy || code.length !== 6}>Verify email</button>
        </form>
      )}
      {error && <div className="err">{error}</div>}
      {msg && <div className="ok">{msg}</div>}
      <p><Link to="/admin/overview">Back to overview</Link></p>
    </div>
  );
}