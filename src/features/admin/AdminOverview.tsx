import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../lib/auth";
import AdminNav from "./AdminNav";

type Overview = {
  applicants: number; students: number; teachers: number; courses: number; enrolments: number;
  admissions: Record<string, number>; revenue_kobo: number; unread_messages: number;
  pending_whatsapp_verifications: number;
};

export default function AdminOverview() {
  const { signOut } = useAuth();
  const [o, setO] = useState<Overview | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    supabase.rpc("admin_overview").then(({ data, error: err }) => {
      if (err) setError(err.message); else setO(data as Overview);
    });
  }, []);

  const stat = (label: string, value: number | string) => (
    <div className="card" key={label}><div className="muted">{label}</div><b style={{ fontSize: "1.4rem" }}>{value}</b></div>
  );

  return (
    <div className="wrap wide">
      <h1>Overview</h1>
      <AdminNav />
      {error && <div className="err">{error}</div>}
      {o && (
        <>
          {stat("Applicants", o.applicants)}
          {stat("Students", o.students)}
          {stat("Teachers", o.teachers)}
          {stat("Courses", o.courses)}
          {stat("Enrolments", o.enrolments)}
          {stat("Revenue", `₦${(o.revenue_kobo / 100).toLocaleString()}`)}
          {stat("Pending WhatsApp verifications", o.pending_whatsapp_verifications)}
          {stat("Unread messages", o.unread_messages)}
          <h2>Admissions by status</h2>
          {Object.keys(o.admissions).length === 0 && <p className="muted">No applications yet.</p>}
          {Object.entries(o.admissions).map(([k, v]) => stat(k.replace("_", " "), v))}
        </>
      )}
      <button onClick={signOut}>Log out</button>
    </div>
  );
}