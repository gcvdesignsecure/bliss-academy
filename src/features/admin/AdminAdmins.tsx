import { useEffect, useState, FormEvent } from "react";
import { supabase } from "../../lib/supabase";
import { fnError } from "../../lib/fn";
import AdminNav from "./AdminNav";

type Admin = {
  admin_number: number; registered_name: string; is_superadmin: boolean;
  is_active: boolean; password_set: boolean;
};

export default function AdminAdmins() {
  const [rows, setRows] = useState<Admin[]>([]);
  const [num, setNum] = useState("");
  const [name, setName] = useState("");
  const [owner, setOwner] = useState(false);
  const [error, setError] = useState("");
  const [code, setCode] = useState<{ n: number; code: string } | null>(null);

  const load = () =>
    supabase.from("admins")
      .select("admin_number,registered_name,is_superadmin,is_active,password_set")
      .order("admin_number")
      .then(({ data }) => setRows((data as Admin[]) ?? []));
  useEffect(() => { void load(); }, []);

  async function call(body: Record<string, unknown>) {
    setError(""); setCode(null);
    const { data, error: err } = await supabase.functions.invoke("admin-manage", { body });
    if (err) { setError(await fnError(err, "Something went wrong")); return null; }
    void load();
    return data as { setup_code?: string } | null;
  }

  async function create(e: FormEvent) {
    e.preventDefault();
    const n = parseInt(num, 10);
    const r = await call({ action: "create_admin", admin_number: n, name, owner });
    if (r?.setup_code) { setCode({ n, code: r.setup_code }); setNum(""); setName(""); setOwner(false); }
  }

  async function reset(n: number) {
    const r = await call({ action: "reset_admin", admin_number: n });
    if (r?.setup_code) setCode({ n, code: r.setup_code });
  }

  return (
    <div className="wrap wide">
      <h1>Admin management</h1>
      <AdminNav />
      <form className="card" onSubmit={create}>
        <b>Add an admin</b>
        <label>Admin number (103 or higher)</label>
        <input type="number" min={103} max={9999} value={num} onChange={(e) => setNum(e.target.value)} required />
        <label>Registered name</label>
        <input value={name} onChange={(e) => setName(e.target.value)} required minLength={2} maxLength={80} />
        <label><input type="checkbox" checked={owner} onChange={(e) => setOwner(e.target.checked)} />Owner admin</label>
        <button>Create admin</button>
      </form>
      {error && <div className="err">{error}</div>}
      {code && (
        <div className="card">
          Setup code for admin {code.n}: <b style={{ letterSpacing: 2 }}>{code.code}</b>
          <p className="muted">Shown once. Valid 72 hours. Share it privately.</p>
        </div>
      )}
      {rows.map((a) => (
        <div className="card" key={a.admin_number}>
          <b>{a.admin_number} — {a.registered_name}</b>{" "}
          {a.is_superadmin && <span className="badge">Owner</span>}
          <span className={a.is_active ? "badge good" : "badge bad"}>{a.is_active ? "Active" : "Disabled"}</span>
          <span className={a.password_set ? "badge good" : "badge bad"}>{a.password_set ? "Account set up" : "Not set up yet"}</span>
          <div style={{ marginTop: 8 }}>
            <button className="small" onClick={() => reset(a.admin_number)}>Reset / new setup code</button>
            <button className="small danger" onClick={() => call({ action: "set_admin_active", admin_number: a.admin_number, active: !a.is_active })}>
              {a.is_active ? "Disable" : "Enable"}
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}