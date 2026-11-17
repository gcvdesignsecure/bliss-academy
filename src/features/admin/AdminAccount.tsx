import { useState, FormEvent } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../lib/auth";

export default function AdminAccount() {
  const { session } = useAuth();
  const [email, setEmail] = useState("");
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");
  const current = session?.user.email ?? "";
  const hasReal = current !== "" && !current.endsWith(".invalid");

  async function save(e: FormEvent) {
    e.preventDefault(); setMsg(""); setError("");
    const { error: err } = await supabase.auth.updateUser({ email });
    if (err) setError(err.message);
    else setMsg("Check your inbox and click the confirmation link to finish.");
  }

  return (
    <form className="wrap" onSubmit={save}>
      <h1>My account</h1>
      <p className="muted">{hasReal ? `Email: ${current}` : "No email added yet. Add yours so you can recover your account."}</p>
      <label>{hasReal ? "Change email" : "Your email"}</label>
      <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
      {error && <div className="err">{error}</div>}
      {msg && <div className="ok">{msg}</div>}
      <button>Save email</button>
      <p><Link to="/admin/admissions">Back to admissions</Link></p>
    </form>
  );
}