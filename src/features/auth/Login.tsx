import { useState, FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import { fnError } from "../../lib/fn";

type Kind = "applicant" | "student" | "admin";

async function readError(err: unknown, fallback: string) {
  try {
    const ctx = (err as { context ? : Response }).context;
    if (!ctx) return { error: fallback, needs_setup: false };
    return (await ctx.json()) as {
      error ? : string;
      needs_setup ? : boolean;
    };
  } catch {
    return { error: fallback, needs_setup: false };
  }
}

export default function Login() {
  const nav = useNavigate();
  const [kind, setKind] = useState < Kind > ("applicant");
  const [id, setId] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [code, setCode] = useState("");
  const [setup, setSetup] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  
  async function signInApplicant() {
    const { data, error: err } =
    await supabase.auth.signInWithPassword({
      email: id.trim(),
      password,
    });
    
    if (err || !data.user) {
      setError("Invalid login details");
      return false;
    }
    
    // Check whether this account already has a MatNumber.
    const { data: student } = await supabase
      .from("students")
      .select("mat_number")
      .eq("user_id", data.user.id)
      .maybeSingle();
    
    if (student?.mat_number) {
      nav("/dashboard", { replace: true });
    } else {
      nav("/apply", { replace: true });
    }
    
    return true;
  }
  
  async function signIn() {
    if (kind === "applicant") return signInApplicant();
    
    const { data, error: err } =
    await supabase.functions.invoke("auth-login", {
      body: { kind, id, name, password },
    });
    
    if (err || !data?.access_token) {
      const e = await readError(err, "Invalid login details");
      
      if (e.needs_setup) {
        setSetup(true);
        setPassword("");
        return false;
      }
      
      setError(e.error ?? "Invalid login details");
      return false;
    }
    
    const { error: sessionError } = await supabase.auth.setSession({
      access_token: data.access_token,
      refresh_token: data.refresh_token,
    });
    
    if (sessionError) {
      setError(sessionError.message);
      return false;
    }
    
    nav(kind === "admin" ? "/admin/overview" : "/dashboard", {
      replace: true,
    });
    
    return true;
  }
  
  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    
    if (setup) {
      if (password !== confirm) {
        setError("Passwords do not match");
        setBusy(false);
        return;
      }
      
      const { error: err } =
      await supabase.functions.invoke("admin-setup", {
        body: { id, name, code, password },
      });
      
      if (err) {
        setError(await fnError(err, "Setup failed"));
        setBusy(false);
        return;
      }
      
      setSetup(false);
    }
    
    await signIn();
    setBusy(false);
  }
  
  return (
    <form className="wrap" onSubmit={submit}>
      <h1>{setup ? "Set up your admin account" : "Log in"}</h1>

      {setup && (
        <p className="muted">
          First time here. Enter the setup code and choose your password.
        </p>
      )}

      {!setup && (
        <div className="tabs">
          <button
            type="button"
            className={kind === "applicant" ? "on" : ""}
            onClick={() => {
              setKind("applicant");
              setError("");
            }}
          >
            Applicant
          </button>

          <button
            type="button"
            className={kind === "student" ? "on" : ""}
            onClick={() => {
              setKind("student");
              setError("");
            }}
          >
            Student
          </button>

          <button
            type="button"
            className={kind === "admin" ? "on" : ""}
            onClick={() => {
              setKind("admin");
              setError("");
            }}
          >
            Admin
          </button>
        </div>
      )}

      <label>
        {kind === "applicant"
          ? "Email"
          : kind === "student"
            ? "MatNumber"
            : "Admin number"}
      </label>

      <input
        type={kind === "applicant" ? "email" : "text"}
        value={id}
        onChange={(e) => setId(e.target.value)}
        required
        readOnly={setup}
      />

      {kind === "admin" && (
        <>
          <label>Registered name</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            readOnly={setup}
          />
        </>
      )}

      {setup && (
        <>
          <label>Setup code</label>
          <input
            type="password"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            required
          />
        </>
      )}

      <label>
        {setup ? "New password (min 10 characters)" : "Password"}
      </label>

      <input
        type="password"
        minLength={setup ? 10 : undefined}
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        required
      />

      {setup && (
        <>
          <label>Confirm password</label>
          <input
            type="password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            required
          />
        </>
      )}

      {error && <div className="err">{error}</div>}

      <button disabled={busy}>
        {busy
          ? "Please wait…"
          : setup
            ? "Save password and log in"
            : "Log in"}
      </button>

      {kind === "applicant" && !setup && (
        <p className="muted">
          New here? <Link to="/apply">Apply for admission</Link>
        </p>
      )}
    </form>
  );
}