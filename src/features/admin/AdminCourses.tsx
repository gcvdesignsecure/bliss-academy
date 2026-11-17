import { useEffect, useState, FormEvent } from "react";
import { supabase } from "../../lib/supabase";
import AdminNav from "./AdminNav";

type Course = {
  id: string; slug: string; title: string; description: string | null;
  duration_months: number; pass_mark: number; price_kobo: number;
  currency: string; is_active: boolean;
};

const empty = { id: "", title: "", description: "", duration_months: "6", price: "0", is_active: true };
const slugify = (s: string) => s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

export default function AdminCourses() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [f, setF] = useState(empty);
  const [error, setError] = useState("");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  const load = () =>
    supabase.from("courses").select("*").order("title")
      .then(({ data }) => setCourses((data as Course[]) ?? []));
  useEffect(() => { load(); }, []);

  function edit(c: Course) {
    setF({
      id: c.id, title: c.title, description: c.description ?? "",
      duration_months: String(c.duration_months), price: String(c.price_kobo / 100), is_active: c.is_active,
    });
    setMsg(""); setError("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function save(e: FormEvent) {
    e.preventDefault(); setBusy(true); setError(""); setMsg("");
    const months = parseInt(f.duration_months, 10);
    const price = Math.round(parseFloat(f.price || "0") * 100);
    if (!(months >= 1 && months <= 60) || !(price >= 0)) {
      setError("Check the duration (1–60 months) and the price."); setBusy(false); return;
    }
    const row = {
      title: f.title.trim(), description: f.description.trim() || null,
      duration_months: months, price_kobo: price, is_active: f.is_active,
    };
    let res;
    if (f.id) {
      res = await supabase.from("courses").update(row).eq("id", f.id);
    } else {
      const slug = slugify(f.title);
      if (!slug) { setError("Enter a valid course title."); setBusy(false); return; }
      res = await supabase.from("courses").insert({ ...row, slug });
    }
    setBusy(false);
    if (res.error) {
      setError(res.error.code === "23505" ? "A course with this name already exists." : res.error.message);
    } else {
      setMsg(f.id ? "Course updated." : "Course added.");
      setF(empty); load();
    }
  }

  return (
    <div className="wrap wide">
      <h1>Courses</h1>
      <AdminNav />

      <form className="card" onSubmit={save}>
        <b>{f.id ? "Edit course" : "Add a course"}</b>
        <label>Course title</label>
        <input value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} required maxLength={120} />
        <label>Description</label>
        <textarea rows={3} value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} maxLength={1000} />
        <label>Duration (months)</label>
        <input type="number" min={1} max={60} value={f.duration_months}
          onChange={(e) => setF({ ...f, duration_months: e.target.value })} required />
        <label>Price (₦)</label>
        <input type="number" min={0} step="0.01" value={f.price}
          onChange={(e) => setF({ ...f, price: e.target.value })} required />
        <label>
          <input type="checkbox" checked={f.is_active}
            onChange={(e) => setF({ ...f, is_active: e.target.checked })} />
          Open for enrolment
        </label>
        {error && <div className="err">{error}</div>}
        {msg && <div className="ok">{msg}</div>}
        <button disabled={busy}>{busy ? "Saving…" : f.id ? "Save changes" : "Add course"}</button>
        {f.id && <button type="button" className="ghost" onClick={() => setF(empty)}>Cancel</button>}
      </form>

      {courses.length === 0 && <p className="muted">No courses yet. Add your first one above.</p>}
      {courses.map((c) => (
        <div className="card" key={c.id}>
          <b>{c.title}</b>{" "}
          <span className={c.is_active ? "badge good" : "badge bad"}>{c.is_active ? "Open" : "Closed"}</span>
          <div className="muted">
            {c.duration_months} months · ₦{(c.price_kobo / 100).toLocaleString()} · pass mark {c.pass_mark}/100
          </div>
          {c.description && <p className="muted">{c.description}</p>}
          <button className="small" onClick={() => edit(c)}>Edit</button>
        </div>
      ))}
    </div>
  );
}