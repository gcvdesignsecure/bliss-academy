import { NavLink } from "react-router-dom";

const links: [string, string][] = [
  ["/admin/overview", "Overview"],
  ["/admin/admissions", "Admissions"],
  ["/admin/verifications", "Verifications"],
  ["/admin/courses", "Courses"],
  ["/admin/integrations", "Integrations"],
  ["/admin/admins", "Admins"],
  ["/admin/account", "Account"],
];

export default function AdminNav() {
  return (
    <nav className="adminnav">
      {links.map(([to, label]) => (
        <NavLink key={to} to={to} className={({ isActive }) => (isActive ? "on" : "")}>
          {label}
        </NavLink>
      ))}
    </nav>
  );
}