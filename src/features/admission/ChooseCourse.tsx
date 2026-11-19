import { useState, FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabase";

type Course = {
  id: string;
  title: string;
  code: string | null;
  description: string | null;
  duration_months: number;
};

// Turns the database messages from select_course into plain language.
function friendly(message: string) {
  const m = message.toLowerCase();
  if (m.includes("payment required")) return "Payment is required before you can choose a course.";
  if (m.includes("applications are closed")) return "Course applications are closed right now.";
  if (m.includes("course not available")) return "That course is not available. Choose another one.";
  if (m.includes("no open batch")) return "No admission batch is open right now. Contact BLISS Academy.";
  if (m.includes("not approved")) return "Your admission has not been approved yet.";
  if (m.includes("not eligible")) return "This account can no longer choose a course.";
  return message;
}

/**
 * Shown to an approved applicant: "Apply for admission" -> pick a course -> Apply.
 * On success the parent receives the new MatNumber.
 */
export default function ChooseCourse({ onEnrolled }: { onEnrolled: (mat: string) => void }) {
  const [open, setOpen] = useState(false);
  const [courses, setCourses] = useState<Course[]>([]);
  const [courseId, setCourseId] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function openChooser() {
    setBusy(true);
    setError("");
    const { data, error: err } = await supabase
      .from("courses")
      .select("id,title,code,description,duration_months")
      .eq("is_active", true)
      .not("code", "is", null)
      .order("title");
    setBusy(false);
    if (err) {
      setError(err.message);
      return;
    }
    setCourses((data ?? []) as Course[]);
    setOpen(true);
  }

  async function apply(e: FormEvent) {
    e.preventDefault();
    if (!courseId) {
      setError("Select a course first.");
      return;
    }
    setBusy(true);
    setError("");
    const { data, error: err } = await supabase.rpc("select_course", { p_course: courseId });
    setBusy(false);
    if (err) {
      setError(friendly(err.message));
      return;
    }
    onEnrolled(String(data));
  }

  if (!open) {
    return (
      <div style={{ marginTop: 12 }}>
        {error && <div className="err">{error}</div>}
        <button type="button" disabled={busy} onClick={openChooser}>
          {busy ? "Loading…" : "Apply for admission"}
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={apply} style={{ marginTop: 12 }}>
      <b>Select your course</b>

      {courses.length === 0 && (
        <p className="muted">No courses are open for registration yet. Please check back soon.</p>
      )}

      {courses.map((c) => (
        <label key={c.id} className="card" style={{ display: "block", cursor: "pointer" }}>
          <input
            type="radio"
            name="course"
            value={c.id}
            checked={courseId === c.id}
            onChange={() => setCourseId(c.id)}
            style={{ marginRight: 8 }}
          />
          <b>{c.title}</b>
          <span className="muted"> · {c.code} · {c.duration_months} months</span>
          {c.description && <p className="muted">{c.description}</p>}
        </label>
      ))}

      {error && <div className="err">{error}</div>}

      <button disabled={busy || courses.length === 0}>
        {busy ? "Applying…" : "Apply"}
      </button>
    </form>
  );
}

/**
 * Shown right after the MatNumber is issued: displays it, lets the student
 * choose a new password, then sends them to log in with MatNumber + password.
 */
export function StudentReady({ mat }: { mat: string }) {
  const nav = useNavigate();
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  async function savePassword(e: FormEvent) {
    e.preventDefault();
    setError("");
    if (pw.length < 10) {
      setError("Password must be at least 10 characters.");
      return;
    }
    if (pw !== pw2) {
      setError("Passwords do not match.");
      return;
    }
    setBusy(true);
    const { error: err } = await supabase.auth.updateUser({ password: pw });
    setBusy(false);
    if (err) {
      setError(err.message);
      return;
    }
    setSaved(true);
  }

  async function goToLogin() {
    await supabase.auth.signOut();
    nav("/login", { replace: true });
  }

  return (
    <div className="wrap">
      <h1>You are now a student</h1>

      <div className="card">
        <p className="muted">Your MatNumber</p>
        <h2 style={{ letterSpacing: 1 }}>{mat}</h2>
        <p className="muted">
          Keep it safe. From now on you log in with your MatNumber and password on the Student tab.
        </p>
      </div>

      {!saved ? (
        <form onSubmit={savePassword}>
          <b>Create your student password</b>

          <label>New password (min 10 characters)</label>
          <input type="password" minLength={10} value={pw} onChange={(e) => setPw(e.target.value)} required />

          <label>Confirm password</label>
          <input type="password" minLength={10} value={pw2} onChange={(e) => setPw2(e.target.value)} required />

          {error && <div className="err">{error}</div>}

          <button disabled={busy}>{busy ? "Saving…" : "Save password"}</button>
        </form>
      ) : (
        <div className="ok">Password saved.</div>
      )}

      <button type="button" className={saved ? "" : "ghost"} onClick={goToLogin}>
        {saved ? "Log in with my MatNumber" : "Skip for now and log in"}
      </button>
    </div>
  );
}
