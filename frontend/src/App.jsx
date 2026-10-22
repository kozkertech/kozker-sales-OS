import { useEffect } from "react";
import "@/App.css";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "sonner";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import Login from "@/pages/Login";
import Register from "@/pages/Register";
import AppShell from "@/components/AppShell";
import Dashboard from "@/pages/Dashboard";
import Records from "@/pages/Records";
import Deals from "@/pages/Deals";
import Sequences from "@/pages/Sequences";
import Approvals from "@/pages/Approvals";
import Team from "@/pages/Team";
import AcceptInvite from "@/pages/AcceptInvite";
import AuditLog from "@/pages/AuditLog";

function Protected({ children }) {
  const { user, loading } = useAuth();
  if (loading || user === null)
    return (
      <div className="h-screen flex items-center justify-center bg-quiet-bg">
        <span className="font-mono text-sm text-quiet-muted sm-pulse">loading workspace…</span>
      </div>
    );
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/accept-invite" element={<AcceptInvite />} />
      <Route
        path="/"
        element={
          <Protected>
            <AppShell />
          </Protected>
        }
      >
        <Route index element={<Dashboard />} />
        <Route path="contacts" element={<Records key="contact" objectType="contact" title="Contacts" />} />
        <Route path="companies" element={<Records key="company" objectType="company" title="Companies" />} />
        <Route path="deals" element={<Deals />} />
        <Route path="sequences" element={<Sequences />} />
        <Route path="approvals" element={<Approvals />} />
        <Route path="team" element={<Team />} />
        <Route path="audit" element={<AuditLog />} />
      </Route>
    </Routes>
  );
}

export default function App() {
  return (
    <div className="App">
      <AuthProvider>
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
        <Toaster position="bottom-right" toastOptions={{ style: { fontFamily: "DM Sans", borderRadius: "3px" } }} />
      </AuthProvider>
    </div>
  );
}
