import { NavLink } from "react-router-dom";

const links: [string, string][] = [
  ["/admin/admissions", "Admissions"],
  ["/admin/courses", "Courses"],
  ["/admin/integrations", "Integrations"],
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