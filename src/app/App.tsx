import { Link, Navigate, Route, Routes } from "react-router-dom";
import { ReactNode, useEffect, useState } from "react";
import { useAuth, Profile } from "../lib/auth";
import { supabase } from "../lib/supabase";

import Login from "../features/auth/Login";
import Apply from "../features/admission/Apply";

import AdminOverview from "../features/admin/AdminOverview";
import AdminAdmissions from "../features/admin/AdminAdmissions";
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

  if (loading) return <div className="wrap">Loading…</div>;

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

  useEffect(() => {
    // Capture the user id here so it is a plain string inside the async function below.
    const uid = session?.user?.id;
    if (!uid) return;

    let active = true;

    async function loadStudentPortal() {
      setLoadingCourses(true);
      setError("");

      // Retrieve the student's real student record and MatNumber.
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

      // An applicant can enter the Dashboard route,
      // but student information is shown only if a real
      // student record exists.
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

      // Retrieve course enrolments belonging to this student.
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
          .select("id,title,code,description,duration_months")
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

  return (
    <div className="wrap wide">
      <h1>Student Dashboard</h1>

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
                <button
                  type="button"
                  onClick={() =>
                    alert(
                      "Classroom access for this course will be connected in the next LMS phase."
                    )
                  }
                >
                  Open classroom
                </button>
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

      <button className="ghost" onClick={signOut}>
        Log out
      </button>
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

      {/* Corrected Dashboard route guard */}
      <Route
        path="/dashboard"
        element={
          <Require roles={["student", "applicant"]}>
            <Dashboard />
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
