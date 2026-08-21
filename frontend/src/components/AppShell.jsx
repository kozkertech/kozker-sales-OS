import { Outlet, NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import CoPilot from "@/components/CoPilot";
import { LayoutDashboard, Users, Building2, Kanban, ScrollText, LogOut, Send, CheckSquare, UserPlus } from "lucide-react";

const NAV = [
  { to: "/", label: "Overview", icon: LayoutDashboard, end: true, testid: "nav-overview" },
  { to: "/contacts", label: "Contacts", icon: Users, testid: "nav-contacts" },
  { to: "/companies", label: "Companies", icon: Building2, testid: "nav-companies" },
  { to: "/deals", label: "Deals", icon: Kanban, testid: "nav-deals" },
  { to: "/sequences", label: "Sequences", icon: Send, testid: "nav-sequences" },
  { to: "/approvals", label: "Approvals", icon: CheckSquare, testid: "nav-approvals" },
  { to: "/team", label: "Team", icon: UserPlus, testid: "nav-team", managerOnly: true },
  { to: "/audit", label: "Audit log", icon: ScrollText, testid: "nav-audit" },
];

export default function AppShell() {
  const { user, logout } = useAuth();
  const nav = useNavigate();

  const userName = typeof user?.name === "string" && user.name.trim() ? user.name : (user?.email || "?");
  const initials = userName
    .split(" ")
    .map((s) => (s && s[0] ? s[0] : ""))
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase() || "?";

  return (
    <div className="h-screen flex bg-quiet-bg overflow-hidden">
      {/* Nav rail — always dark */}
      <aside className="w-60 shrink-0 bg-operational-bg border-r border-operational-border flex flex-col">
        <div className="px-5 h-16 flex items-center gap-2 border-b border-operational-border">
          <span className="w-2.5 h-2.5 bg-coral rounded-sm" />
          <span className="font-display font-semibold text-lg tracking-tight text-operational-text">SalesMind</span>
        </div>

        <div className="px-4 py-3 border-b border-operational-border">
          <div className="font-body text-xs uppercase tracking-wider text-operational-muted">Workspace</div>
          <div className="font-display font-medium text-sm mt-0.5 truncate text-operational-text" data-testid="workspace-name">
            {user?.workspace_name}
          </div>
        </div>

        <nav className="flex-1 py-3 overflow-y-auto">
          {NAV.filter((n) => !n.managerOnly || user?.role === "manager" || user?.role === "admin").map((n) => (
            <NavLink
              key={n.to}
              to={n.to}
              end={n.end}
              data-testid={n.testid}
              className={({ isActive }) =>
                `flex items-center gap-3 px-5 py-2.5 font-body text-sm transition-colors ${
                  isActive
                    ? "text-operational-text bg-operational-surface border-l-2 border-coral"
                    : "text-operational-muted hover:text-operational-text hover:bg-operational-surface border-l-2 border-transparent"
                }`
              }
            >
              <n.icon size={17} strokeWidth={1.75} />
              {n.label}
            </NavLink>
          ))}
        </nav>

        <div className="border-t border-operational-border p-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-sm bg-coral text-white flex items-center justify-center font-mono text-xs">
              {initials}
            </div>
            <div className="min-w-0 flex-1">
              <div className="font-body text-sm text-operational-text truncate">{user?.name}</div>
              <div className="font-mono text-[11px] text-operational-muted uppercase">{user?.role}</div>
            </div>
            <button
              data-testid="logout-btn"
              onClick={async () => {
                await logout();
                nav("/login");
              }}
              className="text-operational-muted hover:text-coral transition-colors"
              title="Sign out"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </aside>

      <main className="flex-1 overflow-hidden bg-quiet-bg">
        <Outlet />
      </main>

      {/* Global AI co-pilot — available on every page */}
      <CoPilot />
    </div>
  );
}
