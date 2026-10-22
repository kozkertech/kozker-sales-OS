import { useState, useEffect, useRef } from "react";
import { Outlet, NavLink, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import CoPilot from "@/components/CoPilot";
import {
  LayoutDashboard,
  Users,
  Building2,
  Kanban,
  Send,
  CheckSquare,
  UserPlus,
  ScrollText,
  LogOut,
  Menu,
  X,
  ChevronRight,
} from "lucide-react";

const NAV_SECTIONS = [
  {
    heading: "Workspace",
    items: [
      { to: "/", label: "Overview", icon: LayoutDashboard, end: true, testid: "nav-overview" },
    ],
  },
  {
    heading: "CRM",
    items: [
      { to: "/contacts", label: "Contacts", icon: Users, testid: "nav-contacts" },
      { to: "/companies", label: "Companies", icon: Building2, testid: "nav-companies" },
      { to: "/deals", label: "Deals", icon: Kanban, testid: "nav-deals" },
    ],
  },
  {
    heading: "Automation",
    items: [
      { to: "/sequences", label: "Sequences", icon: Send, testid: "nav-sequences" },
      { to: "/approvals", label: "Approvals", icon: CheckSquare, testid: "nav-approvals" },
    ],
  },
  {
    heading: "Admin",
    items: [
      { to: "/team", label: "Team", icon: UserPlus, testid: "nav-team", managerOnly: true },
      { to: "/audit", label: "Audit Log", icon: ScrollText, testid: "nav-audit" },
    ],
  },
];

function visibleSections(user) {
  return NAV_SECTIONS.map((section) => ({
    ...section,
    items: section.items.filter(
      (n) => !n.managerOnly || user?.role === "manager" || user?.role === "admin"
    ),
  })).filter((section) => section.items.length > 0);
}

function currentPageLabel(pathname) {
  for (const section of NAV_SECTIONS) {
    for (const item of section.items) {
      if (item.to === pathname || (item.to !== "/" && pathname.startsWith(item.to))) {
        return item.label;
      }
    }
  }
  return "Overview";
}

export default function AppShell() {
  const { user, logout } = useAuth();
  const nav = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const closeTimerRef = useRef(null);

  // Close mobile drawer on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  // Clean up any pending hover-close timer
  useEffect(() => {
    return () => {
      if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
    };
  }, []);

  const sections = visibleSections(user);

  const initials = (user?.name || "?")
    .split(" ")
    .map((s) => s[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const sidebarWidth = collapsed ? "w-16" : "w-60";
  const pageTitle = currentPageLabel(location.pathname);

  const handleLogout = async () => {
    await logout();
    nav("/login");
  };

  // Shared nav link renderer
  const renderNavLink = (n) => (
    <NavLink
      key={n.to}
      to={n.to}
      end={n.end}
      data-testid={n.testid}
      title={collapsed ? n.label : undefined}
      className={({ isActive }) =>
        `flex items-center gap-3 px-5 py-2.5 font-body text-sm transition-colors group ${
          collapsed ? "justify-center px-0" : ""
        } ${
          isActive
            ? "text-operational-text bg-operational-surface border-l-2 border-coral"
            : "text-operational-muted hover:text-operational-text hover:bg-operational-surface border-l-2 border-transparent"
        }`
      }
    >
      <n.icon size={17} strokeWidth={1.75} className="shrink-0" />
      {!collapsed && <span className="truncate">{n.label}</span>}
    </NavLink>
  );

  const sidebarContent = (
    <>
      {/* Logo / brand */}
      <div className={`px-5 h-16 flex items-center gap-2 border-b border-operational-border ${collapsed ? "justify-center px-0" : ""}`}>
        <span className="w-2.5 h-2.5 bg-coral rounded-sm shrink-0" />
        {!collapsed && (
          <span className="font-display font-semibold text-lg tracking-tight text-operational-text">
            SalesMind
          </span>
        )}
      </div>

      {/* Workspace selector */}
      {!collapsed && (
        <div className="px-4 py-3 border-b border-operational-border">
          <div className="font-body text-xs uppercase tracking-wider text-operational-muted">Workspace</div>
          <div className="font-display font-medium text-sm mt-0.5 truncate text-operational-text" data-testid="workspace-name">
            {user?.workspace_name}
          </div>
        </div>
      )}

      {/* Navigation sections */}
      <nav className="flex-1 py-3 overflow-y-auto" aria-label="Main navigation">
        {sections.map((section) => (
          <div key={section.heading} className="mb-1">
            {!collapsed && (
              <div className="px-5 py-1.5 font-body text-[11px] uppercase tracking-wider text-operational-muted/70 font-medium">
                {section.heading}
              </div>
            )}
            {section.items.map(renderNavLink)}
          </div>
        ))}
      </nav>

      {/* Collapse toggle (desktop only) */}
      <button
        onClick={() => setCollapsed((c) => !c)}
        className="hidden lg:flex items-center gap-2 px-5 py-2 font-body text-xs text-operational-muted hover:text-operational-text transition-colors border-t border-operational-border"
        aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
      >
        <ChevronRight
          size={14}
          className={`transition-transform duration-200 ${collapsed ? "" : "rotate-180"}`}
        />
        {!collapsed && <span>Collapse</span>}
      </button>

      {/* User profile */}
      <div className="border-t border-operational-border p-4">
        <div className={`flex items-center gap-3 ${collapsed ? "justify-center" : ""}`}>
          <div className="w-8 h-8 rounded-sm bg-coral text-white flex items-center justify-center font-mono text-xs shrink-0" title={user?.name}>
            {initials}
          </div>
          {!collapsed && (
            <div className="min-w-0 flex-1">
              <div className="font-body text-sm text-operational-text truncate">{user?.name}</div>
              <div className="font-mono text-[11px] text-operational-muted uppercase">{user?.role}</div>
            </div>
          )}
          <button
            data-testid="logout-btn"
            onClick={handleLogout}
            className="text-operational-muted hover:text-coral transition-colors shrink-0"
            title="Sign out"
            aria-label="Sign out"
          >
            <LogOut size={16} />
          </button>
        </div>
      </div>
    </>
  );

  return (
    <div className="h-screen flex bg-quiet-bg overflow-hidden">
      {/* Desktop sidebar */}
      <aside
        className={`hidden lg:flex ${sidebarWidth} shrink-0 bg-operational-bg border-r border-operational-border flex-col transition-all duration-200`}
      >
        {sidebarContent}
      </aside>

      {/* Mobile overlay backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-40 lg:hidden"
          onClick={() => setMobileOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Mobile drawer */}
      <aside
        className={`fixed top-0 left-0 h-screen w-64 z-50 bg-operational-bg border-r border-operational-border flex-col transition-transform duration-300 lg:hidden ${
          mobileOpen ? "translate-x-0 flex" : "-translate-x-full"
        }`}
        aria-label="Mobile navigation"
        aria-hidden={!mobileOpen}
      >
        {/* Close button inside drawer */}
        <button
          onClick={() => setMobileOpen(false)}
          className="absolute top-4 right-4 text-operational-muted hover:text-operational-text"
          aria-label="Close navigation"
        >
          <X size={20} />
        </button>
        {sidebarContent}
      </aside>

      {/* Main content area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Mobile top bar */}
        <header className="lg:hidden h-14 shrink-0 flex items-center gap-3 px-4 border-b border-quiet-border bg-white">
          <button
            onClick={() => setMobileOpen(true)}
            className="text-quiet-text hover:text-coral transition-colors"
            aria-label="Open navigation"
          >
            <Menu size={22} />
          </button>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 bg-coral rounded-sm" />
            <span className="font-display font-semibold text-sm tracking-tight text-quiet-text">SalesMind</span>
          </div>
          <span className="font-body text-sm text-quiet-muted ml-auto">{pageTitle}</span>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-hidden bg-quiet-bg">
          <Outlet />
        </main>
      </div>

      {/* Global AI co-pilot */}
      <CoPilot />
    </div>
  );
}
