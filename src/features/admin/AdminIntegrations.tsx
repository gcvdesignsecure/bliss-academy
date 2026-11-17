import { useEffect, useState, FormEvent } from "react";
import { supabase } from "../../lib/supabase";
import AdminNav from "./AdminNav";

type Kind = "payment" | "kyc";
type Row = {
  id: string; kind: Kind; provider: string; label: string; enabled: boolean;
  public_config: { public_key?: string }; secret_set: boolean;
};

const PROVIDERS: Record<Kind, [string, string][]> = {
  payment: [["paystack", "Paystack"], ["flutterwave", "Flutterwave"], ["stripe", "Stripe"]],
  kyc: [["prembly", "Prembly (NIN / BVN)"], ["dojah", "Dojah (NIN / BVN)"], ["smile_identity", "Smile Identity (international)"]],
};

const empty = { id: "", kind: "payment" as Kind, provider: "paystack", label: "", publicKey: "", secret: "", enabled: false };

export default function AdminIntegrations() {
  const [rows, setRows] = useState<Row[]>([]);
  const [f, setF] = useState(empty);
  const [error, setError] = useState("");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  const load = () =>
    supabase.from("integrations").select("*").order("created_at")
      .then(({ data }) => setRows((data as Row[]) ?? []));
  useEffect(() => { load(); }, []);

  async function errorText(err: any) {
    try { return (await err.context.json()).error ?? "Something went wrong"; }
    catch { return "Something went wrong"; }
  }

  function edit(r: Row) {
    setF({
      id: r.id, kind: r.kind, provider: r.provider, label: r.label,
      publicKey: r.public_config?.public_key ?? "", secret: "", enabled: r.enabled,
    });
    setMsg(""); setError("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function save(e: FormEvent) {
    e.preventDefault(); setBusy(true); setError(""); setMsg("");
    const { error: err } = await supabase.functions.invoke("manage-integration", {
      body: {
        action: "save", id: f.id || undefined, kind: f.kind, provider: f.provider,
        label: f.label, enabled: f.enabled, secret: f.secret || undefined,
        public_config: f.publicKey ? { public_key: f.publicKey.trim() } : {},
      },
    });
    setBusy(false);
    if (err) { setError(await errorText(err)); return; }
    setMsg("Saved."); setF(empty); load();
  }

  async function remove(r: Row) {
    if (!confirm(`Remove ${r.label}? Its saved secret key will be deleted.`)) return;
    const { error: err } = await supabase.functions.invoke("manage-integration", {
      body: { action: "delete", id: r.id },
    });
    if (err) setError(await errorText(err)); else load();
  }

  const section = (kind: Kind, title: string) => (
    <>
      <h2>{title}</h2>
      {rows.filter((r) => r.kind === kind).length === 0 && <p className="muted">None added yet.</p>}
      {rows.filter((r) => r.kind === kind).map((r) => (
        <div className="card" key={r.id}>
          <b>{r.label}</b>{" "}
          <span className="badge">{r.provider}</span>
          <span className={r.enabled ? "badge good" : "badge bad"}>{r.enabled ? "Enabled" : "Disabled"}</span>
          <span className={r.secret_set ? "badge good" : "badge bad"}>
            {r.secret_set ? "Secret key saved ✓" : "No secret key"}
          </span>
          <div style={{ marginTop: 8 }}>
            <button className="small" onClick={() => edit(r)}>Edit</button>
            <button className="small danger" onClick={() => remove(r)}>Remove</button>
          </div>
        </div>
      ))}
    </>
  );

  return (
    <div className="wrap wide">
      <h1>Integrations</h1>
      <AdminNav />

      <form className="card" onSubmit={save}>
        <b>{f.id ? "Edit integration" : "Add an integration"}</b>
        <label>Type</label>
        <select value={f.kind} disabled={!!f.id}
          onChange={(e) => {
            const kind = e.target.value as Kind;
            setF({ ...f, kind, provider: PROVIDERS[kind][0][0] });
          }}>
          <option value="payment">Payment method</option>
          <option value="kyc">Identity verification (KYC)</option>
        </select>
        <label>Provider</label>
        <select value={f.provider} disabled={!!f.id} onChange={(e) => setF({ ...f, provider: e.target.value })}>
          {PROVIDERS[f.kind].map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
        <label>Label (what you will call it)</label>
        <input value={f.label} onChange={(e) => setF({ ...f, label: e.target.value })} required maxLength={80} />
        <label>Public key / client ID (optional, safe to show)</label>
        <input value={f.publicKey} onChange={(e) => setF({ ...f, publicKey: e.target.value })} />
        <label>Secret key {f.id && <span className="muted">(leave blank to keep the saved one)</span>}</label>
        <input type="password" autoComplete="off" value={f.secret}
          onChange={(e) => setF({ ...f, secret: e.target.value })} />
        <label>
          <input type="checkbox" checked={f.enabled} onChange={(e) => setF({ ...f, enabled: e.target.checked })} />
          Enabled
        </label>
        {error && <div className="err">{error}</div>}
        {msg && <div className="ok">{msg}</div>}
        <button disabled={busy}>{busy ? "Saving…" : "Save"}</button>
        {f.id && <button type="button" className="ghost" onClick={() => setF(empty)}>Cancel</button>}
      </form>

      {section("payment", "Payment methods")}
      {section("kyc", "Identity verification")}
    </div>
  );
}