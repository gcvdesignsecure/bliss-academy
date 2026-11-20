import { Link, Navigate, Route, Routes } from "react-router-dom";
import { ReactNode, useEffect, useState } from "react";
import { useAuth, Profile } from "../lib/auth";
import { supabase } from "../lib/supabase";

import Login from "../features/auth/Login";
import Apply from "../features/admission/Apply";
import Classroom from "../features/lms/Classroom";
import StudentProfile, {
  BIODATA_COLUMNS,
  BiodataRow,
  isBiodataComplete,
} from "../features/student/StudentProfile";
import ContactLecturer from "../features/student/ContactLecturer";

import AdminOverview from "../features/admin/AdminOverview";
import AdminAdmissions from "../features/admin/AdminAdmissions";
import AdminStudents from "../features/admin/AdminStudents";
import AdminVerifications from "../features/admin/AdminVerifications";
import AdminAdmins from "../features/admin/AdminAdmins";
import AdminAccount from "../features/admin/AdminAccount";
import AdminCourses from "../features/admin/AdminCourses";
import AdminIntegrations from "../features/admin/AdminIntegrations";
import AdminPlatformSettings from "../features/admin/AdminPlatformSettings";

type StudentCourse = {
  id: string;
  title: string;
  code: string;
  description: string | null;
  duration_months: number;
};

type Enrolment = {
  course_id: string;
  unlocked: boolean;
};

// Solid colours so dropdown menus are never see-through.
const MENU_BG = "#ffffff";
const MENU_TEXT = "#111827";
const MENU_BORDER = "#d1d5db";

function Home() {
  return (
    <div className="wrap">
      <h1>BLISS Academy</h1>

      <p className="muted">
        Learn practical technology and digital skills.
      </p>

      <Link to="/apply">
        <button>Apply for admission</button>
      </Link>

      <Link to="/login">
        <button
          style={{
            background: "var(--blue-50)",
            color: "var(--blue-600)",
          }}
        >
          Log in
        </button>
      </Link>
    </div>
  );
}

function Require({
  roles,
  children,
}: {
  roles: Profile["role"][];
  children: ReactNode;
}) {
  const { profile, session, loading } = useAuth();

  if (loading) {
    return <div className="wrap">Loading…</div>;
  }

  if (!session || !profile || !roles.includes(profile.role)) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

function Dashboard() {
  const { profile, session, signOut } = useAuth();

  const [matNumber, setMatNumber] = useState("");
  const [courses, setCourses] = useState<StudentCourse[]>([]);
  const [loadingCourses, setLoadingCourses] = useState(true);
  const [error, setError] = useState("");

  const [view, setView] = useState<"courses" | "profile">("courses");
  const [menuOpen, setMenuOpen] = useState(false);
  const [profileComplete, setProfileComplete] = useState(true);

  useEffect(() => {
    const uid = session?.user?.id;

    if (!uid) {
      setLoadingCourses(false);
      return;
    }

    let active = true;

    async function loadStudentPortal() {
      setLoadingCourses(true);
      setError("");

      const { data: student, error: studentError } =
        await supabase
          .from("students")
          .select("mat_number")
          .eq("user_id", uid)
          .maybeSingle();

      if (!active) return;

      if (studentError) {
        setError(studentError.message);
        setLoadingCourses(false);
        return;
      }

      if (!student) {
        setMatNumber("");
        setCourses([]);

        setError(
          "Your student record has not been created yet. Please contact BLISS Academy."
        );

        setLoadingCourses(false);
        return;
      }

      setMatNumber(student.mat_number);

      const { data: bio } = await supabase
        .from("student_biodata")
        .select(BIODATA_COLUMNS)
        .eq("user_id", uid)
        .maybeSingle();

      if (!active) return;

      setProfileComplete(
        isBiodataComplete(bio as unknown as BiodataRow | null)
      );

      const { data: enrolments, error: enrolmentError } =
        await supabase
          .from("enrolments")
          .select("course_id,unlocked")
          .eq("student_id", uid);

      if (!active) return;

      if (enrolmentError) {
        setError(enrolmentError.message);
        setLoadingCourses(false);
        return;
      }

      const enrolled = (enrolments ?? []) as Enrolment[];

      if (enrolled.length === 0) {
        setCourses([]);
        setLoadingCourses(false);
        return;
      }

      const courseIds = enrolled.map(
        (item) => item.course_id
      );

      const { data: courseData, error: courseError } =
        await supabase
          .from("courses")
          .select(
            "id,title,code,description,duration_months"
          )
          .in("id", courseIds);

      if (!active) return;

      if (courseError) {
        setError(courseError.message);
        setLoadingCourses(false);
        return;
      }

      const courseMap = new Map(
        (courseData ?? []).map((course) => [
          course.id,
          course,
        ])
      );

      setCourses(
        enrolled
          .filter((item) => item.unlocked)
          .map((item) => courseMap.get(item.course_id))
          .filter(Boolean) as StudentCourse[]
      );

      setLoadingCourses(false);
    }

    void loadStudentPortal();

    return () => {
      active = false;
    };
  }, [session]);

  const isStudent = matNumber !== "";

  function go(next: "courses" | "profile") {
    setView(next);
    setMenuOpen(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  const menuItemStyle = (active: boolean) => ({
    display: "block",
    width: "100%",
    boxSizing: "border-box" as const,
    margin: "6px 0 0",
    padding: 12,
    borderRadius: 10,
    textAlign: "left" as const,
    border: active ? "2px solid #2563eb" : `1px solid ${MENU_BORDER}`,
    background: active ? "#eff6ff" : "#ffffff",
    color: MENU_TEXT,
    cursor: "pointer",
  });

  return (
    <div className="wrap wide">
      {/* Top bar: profile menu on the left, contact lecturer on the right */}
      {isStudent && (
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 12,
            marginBottom: 12,
            position: "relative",
            zIndex: 1000,
          }}
        >
          <div style={{ position: "relative" }}>
            <button
              type="button"
              onClick={() => setMenuOpen((open) => !open)}
              aria-expanded={menuOpen}
              aria-haspopup="true"
              style={{ width: "auto", margin: 0 }}
            >
              ☰ Menu {menuOpen ? "▴" : "▾"}
            </button>

            {menuOpen && (
              <>
                <div
                  onClick={() => setMenuOpen(false)}
                  style={{
                    position: "fixed",
                    top: 0,
                    right: 0,
                    bottom: 0,
                    left: 0,
                    zIndex: 998,
                    background: "rgba(0,0,0,0.35)",
                  }}
                />

                <div
                  role="menu"
                  style={{
                    position: "absolute",
                    top: "calc(100% + 8px)",
                    left: 0,
                    zIndex: 999,
                    width: "min(300px, 88vw)",
                    padding: 10,
                    borderRadius: 12,
                    border: `1px solid ${MENU_BORDER}`,
                    background: MENU_BG,
                    color: MENU_TEXT,
                    boxShadow: "0 12px 30px rgba(0,0,0,0.25)",
                  }}
                >
                  <div style={{ padding: "4px 6px 8px", fontWeight: 600 }}>
                    {profile?.full_name}
                    <div
                      style={{
                        fontWeight: 400,
                        fontSize: 13,
                        color: "#6b7280",
                      }}
                    >
                      {matNumber}
                    </div>
                  </div>

                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => go("courses")}
                    style={menuItemStyle(view === "courses")}
                  >
                    🏠 My courses
                  </button>

                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => go("profile")}
                    style={menuItemStyle(view === "profile")}
                  >
                    👤 My profile
                    {!profileComplete && (
                      <span style={{ color: "#b45309" }}>
                        {" "}
                        • incomplete
                      </span>
                    )}
                  </button>

                  <button
                    type="button"
                    role="menuitem"
                    onClick={signOut}
                    style={menuItemStyle(false)}
                  >
                    🚪 Log out
                  </button>
                </div>
              </>
            )}
          </div>

          <ContactLecturer
            studentName={profile?.full_name ?? "Student"}
            matNumber={matNumber}
          />
        </div>
      )}

      <h1>
        {view === "profile" && isStudent
          ? "My Profile"
          : "Student Dashboard"}
      </h1>

      {view === "profile" && isStudent ? (
        <StudentProfile
          matNumber={matNumber}
          onSaved={(complete) => setProfileComplete(complete)}
        />
      ) : (
        <>
          <div className="card">
            <h2>Welcome, {profile?.full_name}</h2>

            <p className="muted">
              Welcome to your BLISS Academy student portal.
            </p>

            <div>
              <b>MatNumber</b>
              <p>{matNumber || "Loading MatNumber…"}</p>
            </div>

            <div>
              <b>Account</b>
              <p className="ok">Student account</p>
            </div>
          </div>

          {isStudent && !profileComplete && (
            <div className="card">
              <b>Complete your profile</b>

              <p className="muted">
                Some of your bio data is missing. Please fill it in so the
                academy has your details.
              </p>

              <button type="button" onClick={() => go("profile")}>
                Complete my profile
              </button>
            </div>
          )}

          <h2>My Courses</h2>

          {loadingCourses && (
            <p className="muted">Loading your courses…</p>
          )}

          {error && <div className="err">{error}</div>}

          {!loadingCourses && !error && courses.length === 0 && (
            <div className="card">
              <p>You currently have no unlocked courses.</p>

              <p className="muted">
                Courses will appear here when your enrollment is confirmed.
              </p>
            </div>
          )}

          {!loadingCourses && courses.length > 0 && (
            <div>
              {courses.map((course) => (
                <div className="card" key={course.id}>
                  <h3>{course.title}</h3>

                  <p className="muted">
                    Course code: {course.code}
                  </p>

                  {course.description && (
                    <p>{course.description}</p>
                  )}

                  <p className="muted">
                    Duration: {course.duration_months} months
                  </p>

                  <span className="badge good">
                    Enrollment active
                  </span>

                  <p>
                    <Link to={`/classroom/${course.id}`}>
                      <button type="button">
                        Open classroom
                      </button>
                    </Link>
                  </p>
                </div>
              ))}
            </div>
          )}

          <div className="card">
            <h3>Student account</h3>

            <p className="muted">
              Keep your MatNumber safe. It is your official student
              identification number at BLISS Academy.
            </p>
          </div>
        </>
      )}

      {!isStudent && (
        <button className="ghost" onClick={signOut}>
          Log out
        </button>
      )}
    </div>
  );
}

const admin = (el: ReactNode) => (
  <Require roles={["superadmin"]}>{el}</Require>
);

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />

      <Route path="/login" element={<Login />} />

      <Route path="/apply" element={<Apply />} />

      <Route
        path="/dashboard"
        element={
          <Require roles={["student", "applicant"]}>
            <Dashboard />
          </Require>
        }
      />

      <Route
        path="/classroom/:courseId"
        element={
          <Require roles={["student"]}>
            <Classroom />
          </Require>
        }
      />

      <Route
        path="/admin"
        element={<Navigate to="/admin/overview" replace />}
      />

      <Route
        path="/admin/overview"
        element={admin(<AdminOverview />)}
      />

      <Route
        path="/admin/admissions"
        element={admin(<AdminAdmissions />)}
      />

      <Route
        path="/admin/students"
        element={admin(<AdminStudents />)}
      />

      <Route
        path="/admin/verifications"
        element={admin(<AdminVerifications />)}
      />

      <Route
        path="/admin/courses"
        element={admin(<AdminCourses />)}
      />

      <Route
        path="/admin/integrations"
        element={admin(<AdminIntegrations />)}
      />

      <Route
        path="/admin/platform-settings"
        element={admin(<AdminPlatformSettings />)}
      />

      <Route
        path="/admin/admins"
        element={admin(<AdminAdmins />)}
      />

      <Route
        path="/admin/account"
        element={admin(<AdminAccount />)}
      />

      <Route
        path="*"
        element={<Navigate to="/" replace />}
      />
    </Routes>
  );
}