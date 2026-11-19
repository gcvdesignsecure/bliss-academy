
import { Link, Navigate, Route, Routes } from "react-router-dom";
import { ReactNode } from "react";
import { useAuth, Profile } from "../lib/auth";
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

function Home() {
  return (
    <div className="wrap">
      <h1>BLISS Academy</h1>
      <p className="muted">Learn practical technology skills.</p>
      <Link to="/apply"><button>Apply for admission</button></Link>
      <Link to="/login">
        <button style={{ background: "var(--blue-50)", color: "var(--blue-600)" }}>
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
  const { profile, signOut } = useAuth();

  return (
    <div className="wrap">
      <h1>Welcome, {profile?.full_name}</h1>
      <p className="muted">Dashboard coming in a later phase.</p>
      <button onClick={signOut}>Log out</button>
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
          <Require roles={["student", "teacher", "superadmin"]}>
            <Dashboard />
          </Require>
        }
      />

      <Route path="/admin" element={<Navigate to="/admin/overview" replace />} />
      <Route path="/admin/overview" element={admin(<AdminOverview />)} />
      <Route path="/admin/admissions" element={admin(<AdminAdmissions />)} />
      <Route path="/admin/verifications" element={admin(<AdminVerifications />)} />
      <Route path="/admin/courses" element={admin(<AdminCourses />)} />
      <Route path="/admin/integrations" element={admin(<AdminIntegrations />)} />

      <Route
        path="/admin/platform-settings"
        element={admin(<AdminPlatformSettings />)}
      />

      <Route path="/admin/admins" element={admin(<AdminAdmins />)} />
      <Route path="/admin/account" element={admin(<AdminAccount />)} />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
