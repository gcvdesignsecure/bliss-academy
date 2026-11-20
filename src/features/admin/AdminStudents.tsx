
import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabase";
import AdminNav from "./AdminNav";

type StudentRow = {
  user_id: string;
  mat_number: string;
  batch_id: string | null;
  first_course_id: string | null;
  created_at: string;
};

type Profile = {
  id: string;
  full_name: string;
  email: string;
  whatsapp: string | null;
  country: string | null;
  role: string;
  status: string;
};

type Biodata = {
  user_id: string;
  date_of_birth: string;
  gender: string;
  phone_number: string | null;
  whatsapp_number: string | null;
  home_address: string | null;
  state_of_residence: string | null;
  country: string | null;
  bio: string | null;
  guardian_name: string | null;
  guardian_phone: string | null;
  emergency_contact_name: string | null;
  emergency_contact_phone: string | null;
  profile_photo_url: string | null;
};

type Course = {
  id: string;
  title: string;
  code: string;
  duration_months: number;
};

type Enrolment = {
  student_id: string;
  course_id: string;
  unlocked: boolean;
};

type Attendance = {
  student_id: string;
  course_id: string;
  status: string;
};

type Progress = {
  student_id: string;
  completed: boolean;
  unlocked: boolean;
  best_score: number | null;
};

type StudentRecord = {
  student: StudentRow;
  profile: Profile | null;
  biodata: Biodata | null;
  courses: Course[];
  enrolments: Enrolment[];
  attendance: Attendance[];
  progress: Progress[];
  photo: string | null;
};

function calculateAge(dob: string) {
  const birth = new Date(dob);
  const today = new Date();

  let age = today.getFullYear() - birth.getFullYear();

  const birthdayPassed =
    today.getMonth() > birth.getMonth() ||
    (today.getMonth() === birth.getMonth() &&
      today.getDate() >= birth.getDate());

  if (!birthdayPassed) age--;

  return age;
}

function dateLabel(value?: string | null) {
  if (!value) return "Not provided";

  return new Date(value).toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export default function AdminStudents() {
  const [records, setRecords] = useState<StudentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<StudentRecord | null>(null);

  async function loadStudents() {
    setLoading(true);
    setError("");

    try {
      const { data: students, error: studentError } =
        await supabase
          .from("students")
          .select("user_id,mat_number,batch_id,first_course_id,created_at")
          .order("created_at", { ascending: false });

      if (studentError) throw studentError;

      const studentRows = (students ?? []) as StudentRow[];

      if (!studentRows.length) {
        setRecords([]);
        setLoading(false);
        return;
      }

      const ids = studentRows.map((s) => s.user_id);

      const [
        profileResult,
        biodataResult,
        enrolmentResult,
        attendanceResult,
        progressResult,
        courseResult,
      ] = await Promise.all([
        supabase
          .from("profiles")
          .select("id,full_name,email,whatsapp,country,role,status")
          .in("id", ids),

        supabase
          .from("student_biodata")
          .select("*")
          .in("user_id", ids),

        supabase
          .from("enrolments")
          .select("student_id,course_id,unlocked")
          .in("student_id", ids),

        supabase
          .from("course_attendance")
          .select("student_id,course_id,status")
          .in("student_id", ids),

        supabase
          .from("lesson_progress")
          .select("student_id,completed,unlocked,best_score")
          .in("student_id", ids),

        supabase
          .from("courses")
          .select("id,title,code,duration_months"),
      ]);

      if (profileResult.error) throw profileResult.error;
      if (biodataResult.error) throw biodataResult.error;
      if (enrolmentResult.error) throw enrolmentResult.error;
      if (attendanceResult.error) throw attendanceResult.error;
      if (progressResult.error) throw progressResult.error;
      if (courseResult.error) throw courseResult.error;

      const profiles = (profileResult.data ?? []) as Profile[];
      const biodata = (biodataResult.data ?? []) as Biodata[];
      const enrolments = (enrolmentResult.data ?? []) as Enrolment[];
      const attendance = (attendanceResult.data ?? []) as Attendance[];
      const progress = (progressResult.data ?? []) as Progress[];
      const courses = (courseResult.data ?? []) as Course[];

      const profileMap = new Map(
        profiles.map((p) => [p.id, p])
      );

      const bioMap = new Map(
        biodata.map((b) => [b.user_id, b])
      );

      const courseMap = new Map(
        courses.map((c) => [c.id, c])
      );

      const nextRecords: StudentRecord[] = await Promise.all(
        studentRows.map(async (student) => {
          const bio = bioMap.get(student.user_id) ?? null;

          let photo: string | null = null;

          if (bio?.profile_photo_url) {
            const { data } = await supabase.storage
              .from("student-profile-photos")
              .createSignedUrl(bio.profile_photo_url, 3600);

            photo = data?.signedUrl ?? null;
          }

          const studentEnrolments = enrolments.filter(
            (e) => e.student_id === student.user_id
          );

          const studentCourses = studentEnrolments
            .map((e) => courseMap.get(e.course_id))
            .filter(Boolean) as Course[];

          return {
            student,
            profile: profileMap.get(student.user_id) ?? null,
            biodata: bio,
            courses: studentCourses,
            enrolments: studentEnrolments,
            attendance: attendance.filter(
              (a) => a.student_id === student.user_id
            ),
            progress: progress.filter(
              (p) => p.student_id === student.user_id
            ),
            photo,
          };
        })
      );

      setRecords(nextRecords);
    } catch (err: any) {
      setError(err?.message ?? "Unable to load student records.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadStudents();
  }, []);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();

    if (!term) return records;

    return records.filter((r) => {
      const profile = r.profile;
      const bio = r.biodata;

      return [
        profile?.full_name,
        profile?.email,
        profile?.whatsapp,
        bio?.phone_number,
        bio?.whatsapp_number,
        r.student.mat_number,
        bio?.state_of_residence,
        bio?.country,
      ]
        .filter(Boolean)
        .some((value) =>
          String(value).toLowerCase().includes(term)
        );
    });
  }, [records, search]);

  function openStudent(record: StudentRecord) {
    setSelected(record);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function closeStudent() {
    setSelected(null);
  }

  function attendanceStats(record: StudentRecord) {
    const total = record.attendance.length;

    const present = record.attendance.filter(
      (a) => a.status.toLowerCase() === "present"
    ).length;

    const percentage =
      total > 0 ? Math.round((present / total) * 100) : 0;

    return { total, present, percentage };
  }

  function progressStats(record: StudentRecord) {
    const total = record.progress.length;

    const completed = record.progress.filter(
      (p) => p.completed
    ).length;

    const percentage =
      total > 0 ? Math.round((completed / total) * 100) : 0;

    return { total, completed, percentage };
  }

  return (
    <div className="wrap wide">
      <h1>Student Management</h1>
      <p className="muted">
        Student directory, biodata, academic records and attendance.
      </p>

      <AdminNav />

      <div className="card">
        <h2>Student Directory</h2>

        <div className="muted">
          Total registered students: {records.length}
        </div>

        <input
          type="search"
          placeholder="Search name, MatNumber, email or phone..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{
            width: "100%",
            marginTop: 12,
            padding: 12,
          }}
        />

        <button
          type="button"
          className="ghost"
          onClick={() => void loadStudents()}
        >
          Refresh records
        </button>
      </div>

      {loading && (
        <p className="muted">Loading student records…</p>
      )}

      {error && (
        <div className="err">
          {error}
          <button onClick={() => void loadStudents()}>
            Retry
          </button>
        </div>
      )}

      {!loading && !error && filtered.length === 0 && (
        <div className="card">
          <p>No students found.</p>
        </div>
      )}

      {!selected && filtered.map((record) => {
        const profile = record.profile;
        const bio = record.biodata;

        return (
          <div
            className="card"
            key={record.student.user_id}
            style={{
              display: "flex",
              gap: 12,
              alignItems: "center",
              flexWrap: "wrap",
            }}
          >
            {record.photo ? (
              <img
                src={record.photo}
                alt={profile?.full_name || "Student"}
                style={{
                  width: 70,
                  height: 70,
                  borderRadius: "50%",
                  objectFit: "cover",
                }}
              />
            ) : (
              <div
                style={{
                  width: 70,
                  height: 70,
                  borderRadius: "50%",
                  display: "grid",
                  placeItems: "center",
                  background: "var(--blue-50)",
                  fontSize: 24,
                }}
              >
                👤
              </div>
            )}

            <div style={{ flex: 1, minWidth: 180 }}>
              <b>{profile?.full_name || "Unnamed Student"}</b>

              <div className="muted">
                {record.student.mat_number}
              </div>

              <div className="muted">
                {profile?.email || "No email"}
              </div>

              <div className="muted">
                {bio?.phone_number || profile?.whatsapp || "No phone"}
              </div>

              <div className="muted">
                {record.courses.length} course(s)
              </div>
            </div>

            <button
              type="button"
              className="small"
              onClick={() => openStudent(record)}
            >
              View profile
            </button>
          </div>
        );
      })}

      {selected && (
        <div className="card">
          <button
            type="button"
            className="ghost"
            onClick={closeStudent}
          >
            ← Back to directory
          </button>

          <h2>Student Profile</h2>

          {selected.photo && (
            <img
              src={selected.photo}
              alt="Student profile"
              style={{
                width: 140,
                height: 140,
                objectFit: "cover",
                borderRadius: 12,
              }}
            />
          }

          <h2>{selected.profile?.full_name || "Student"}</h2>

          <div className="badge good">
            {selected.student.mat_number}
          </div>

          <h3>Account Information</h3>

          <div className="card">
            <p>
              <b>Email:</b>{" "}
              {selected.profile?.email || "Not provided"}
            </p>

            <p>
              <b>Account role:</b>{" "}
              {selected.profile?.role || "Unknown"}
            </p>

            <p>
              <b>Account status:</b>{" "}
              {selected.profile?.status || "Unknown"}
            </p>

            <p>
              <b>Registered:</b>{" "}
              {dateLabel(selected.student.created_at)}
            </p>
          </div>

          <h3>Personal Biodata</h3>

          <div className="card">
            <p>
              <b>Date of birth:</b>{" "}
              {dateLabel(selected.biodata?.date_of_birth)}
            </p>

            <p>
              <b>Age:</b>{" "}
              {selected.biodata?.date_of_birth
                ? `${calculateAge(selected.biodata.date_of_birth)} years`
                : "Not provided"}
            </p>

            <p>
              <b>Gender:</b>{" "}
              {selected.biodata?.gender || "Not provided"}
            </p>

            <p>
              <b>Phone:</b>{" "}
              {selected.biodata?.phone_number || "Not provided"}
            </p>

            <p>
              <b>WhatsApp:</b>{" "}
              {selected.biodata?.whatsapp_number ||
                selected.profile?.whatsapp ||
                "Not provided"}
            </p>

            <p>
              <b>Home address:</b>{" "}
              {selected.biodata?.home_address || "Not provided"}
            </p>

            <p>
              <b>State:</b>{" "}
              {selected.biodata?.state_of_residence || "Not provided"}
            </p>

            <p>
              <b>Country:</b>{" "}
              {selected.biodata?.country ||
                selected.profile?.country ||
                "Not provided"}
            </p>

            <p>
              <b>Bio:</b>{" "}
              {selected.biodata?.bio || "Not provided"}
            </p>
          </div>

          {selected.biodata?.date_of_birth &&
            calculateAge(selected.biodata.date_of_birth) < 18 && (
              <>
                <h3>Parent / Guardian</h3>

                <div className="card">
                  <p>
                    <b>Name:</b>{" "}
                    {selected.biodata.guardian_name || "Not provided"}
                  </p>

                  <p>
                    <b>Phone:</b>{" "}
                    {selected.biodata.guardian_phone || "Not provided"}
                  </p>
                </div>
              </>
            )}

          <h3>Emergency Contact</h3>

          <div className="card">
            <p>
              <b>Name:</b>{" "}
              {selected.biodata?.emergency_contact_name ||
                "Not provided"}
            </p>

            <p>
              <b>Phone:</b>{" "}
              {selected.biodata?.emergency_contact_phone ||
                "Not provided"}
            </p>
          </div>

          <h3>Courses</h3>

          {selected.courses.length === 0 && (
            <div className="card muted">
              No courses found.
            </div>
          )}

          {selected.courses.map((course) => {
            const enrolment = selected.enrolments.find(
              (e) => e.course_id === course.id
            );

            const courseAttendance = selected.attendance.filter(
              (a) => a.course_id === course.id
            );

            const courseProgress = selected.progress;

            const stats = attendanceStats({
              ...selected,
              attendance: courseAttendance,
            });

            const progress = progressStats({
              ...selected,
              progress: courseProgress,
            });

            return (
              <div className="card" key={course.id}>
                <h4>{course.title}</h4>

                <p className="muted">
                  Course code: {course.code}
                </p>

                <p>
                  <b>Duration:</b>{" "}
                  {course.duration_months} months
                </p>

                <p>
                  <b>Enrollment:</b>{" "}
                  {enrolment?.unlocked ? "Active" : "Locked"}
                </p>

                <p>
                  <b>Attendance:</b>{" "}
                  {stats.present}/{stats.total} present
                  {stats.total > 0
                    ? ` (${stats.percentage}%)`
                    : ""}
                </p>

                <p>
                  <b>Completed lessons:</b>{" "}
                  {progress.completed}
                </p>

                <p>
                  <b>Lesson progress:</b>{" "}
                  {progress.total > 0
                    ? `${progress.completed}/${progress.total} (${progress.percentage}%)`
                    : "No lesson progress yet"}
                </p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
