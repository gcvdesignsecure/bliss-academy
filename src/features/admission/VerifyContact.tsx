import { useState } from "react";
import { supabase } from "../../lib/supabase";
import { fnError } from "../../lib/fn";
import { useAuth } from "../../lib/auth";

type Channel = "email" | "whatsapp";

export default function VerifyContact({ channel }: { channel: Channel }) {
  const { profile, refresh } = useAuth();
  const [code, setCode] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");

  const verified = channel === "email" ? profile?.email_verified : profile?.whatsapp_verified;
  const label = channel === "email" ? "Email" : "WhatsApp";

  async function request() {
    setBusy(true); setError(""); setMsg("");
    const { data, error: err } = await supabase.functions.invoke("contact-verify", {
      body: { action: "request", channel },
    });
    setBusy(false);
    if (err) { setError(await fnError(err, "Could not send the code.")); return; }
    setSent(true);
    setMsg(
      channel === "email"
        ? `A 6-digit code was sent to ${data?.sent_to ?? "your email"}. It expires in 10 minutes.`
        : "Request received. An admin will send your code on WhatsApp."
    );
  }

  async function verify() {
    setBusy(true); setError(""); setMsg("");
    const { error: err } = await supabase.functions.invoke("contact-verify", {
      body: { action: "verify", channel, code },
    });
    setBusy(false);
    if (err) { setError(await fnError(err, "Could not verify the code.")); return; }
    setCode(""); setSent(false);
    await refresh();
  }

  if (verified) return <div className="card"><span className="badge good">{label} verified ✓</span></div>;

  return (
    <div className="card">
      <b>Verify your {label.toLowerCase()}</b>
      <p className="muted">
        {channel === "email" ? "We will email you a 6-digit code." : "An admin will send you a code on WhatsApp."}
      </p>
      <button type="button" className="small" disabled={busy} onClick={request}>
        {sent ? "Send a new code" : "Send code"}
      </button>
      {sent && (
        <>
          <label>Enter the 6-digit code</label>
          <input inputMode="numeric" maxLength={6} value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))} />
          <button type="button" disabled={busy || code.length !== 6} onClick={verify}>Verify</button>
        </>
      )}
      {error && <div className="err">{error}</div>}
      {msg && <div className="ok">{msg}</div>}
    </div>
  );
}