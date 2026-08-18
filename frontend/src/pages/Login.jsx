import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { apiErr } from "@/lib/api";
import { ArrowRight } from "lucide-react";

export default function Login() {
  const { login } = useAuth();
  const nav = useNavigate();
  const [email, setEmail] = useState("govind.developer@kozker.com");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      await login(email, password);
      nav("/");
    } catch (err) {
      setError(apiErr(err.response?.data?.detail) || err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row">
      {/* Quiet field */}
      <div className="lg:w-[55%] bg-quiet-bg flex items-center px-8 sm:px-16 py-16">
        <div className="max-w-md w-full">
          <div className="flex items-center gap-2 mb-16">
            <span className="w-2.5 h-2.5 bg-coral rounded-sm" />
            <span className="font-display font-semibold text-lg tracking-tight">SalesMind</span>
          </div>
          <h1 className="font-display font-medium text-3xl sm:text-4xl tracking-tight leading-tight mb-4">
            The CRM that thinks
            <br />
            in fields and follow-ups.
          </h1>
          <p className="font-body text-quiet-muted text-base leading-relaxed mb-10">
            AI creates your columns, researches every row, and drafts the next message. You approve. It sends.
          </p>
          <div className="font-mono text-xs text-quiet-muted space-y-2 border-t border-quiet-border pt-6">
            <div className="flex justify-between"><span>DYNAMIC FIELDS</span><span className="text-quiet-text">AI-native</span></div>
            <div className="flex justify-between"><span>PIPELINE CHAT</span><span className="text-quiet-text">Claude Sonnet 5</span></div>
            <div className="flex justify-between"><span>ENRICHMENT</span><span className="text-quiet-text">Gemini 3 Flash</span></div>
          </div>
        </div>
      </div>

      {/* Operational zone */}
      <div className="op-zone lg:w-[45%] bg-operational-bg flex items-center justify-center px-8 sm:px-16 py-16">
        <form onSubmit={submit} className="w-full max-w-sm sm-fade-up" data-testid="login-form">
          <h2 className="font-display font-medium text-2xl text-operational-text mb-1">Sign in</h2>
          <p className="font-body text-sm text-operational-muted mb-8">Access your workspace.</p>

          {error && (
            <div data-testid="login-error" className="mb-5 text-sm font-body text-coral border border-coral/40 bg-coral-subtle px-3 py-2 rounded-sm">
              {error}
            </div>
          )}

          <label className="block font-body text-xs uppercase tracking-wider text-operational-muted mb-2">Email</label>
          <input
            data-testid="login-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full bg-operational-surface border border-operational-border text-operational-text font-body text-sm px-3 py-2.5 mb-5 rounded-sm focus:outline-none focus:ring-1 focus:ring-coral transition-colors"
          />

          <label className="block font-body text-xs uppercase tracking-wider text-operational-muted mb-2">Password</label>
          <input
            data-testid="login-password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="w-full bg-operational-surface border border-operational-border text-operational-text font-body text-sm px-3 py-2.5 mb-8 rounded-sm focus:outline-none focus:ring-1 focus:ring-coral transition-colors"
          />

          <button
            data-testid="login-submit"
            type="submit"
            disabled={busy}
            className="w-full bg-coral hover:bg-coral-hover disabled:opacity-60 text-white font-body font-medium text-sm px-4 py-3 rounded-sm transition-colors flex items-center justify-center gap-2"
          >
            {busy ? "Signing in…" : "Sign in"} <ArrowRight size={16} />
          </button>

          <p className="mt-6 text-sm font-body text-operational-muted text-center">
            No workspace yet?{" "}
            <Link to="/register" data-testid="go-register" className="text-coral hover:underline">Create one</Link>
          </p>
        </form>
      </div>
    </div>
  );
}
