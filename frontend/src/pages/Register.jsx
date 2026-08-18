import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { apiErr } from "@/lib/api";
import { ArrowRight } from "lucide-react";

export default function Register() {
  const { register } = useAuth();
  const nav = useNavigate();
  const [form, setForm] = useState({ name: "", email: "", password: "", workspace_name: "" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      await register(form);
      nav("/");
    } catch (err) {
      setError(apiErr(err.response?.data?.detail) || err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row">
      <div className="lg:w-[55%] bg-quiet-bg flex items-center px-8 sm:px-16 py-16">
        <div className="max-w-md w-full">
          <div className="flex items-center gap-2 mb-16">
            <span className="w-2.5 h-2.5 bg-coral rounded-sm" />
            <span className="font-display font-semibold text-lg tracking-tight">SalesMind</span>
          </div>
          <h1 className="font-display font-medium text-3xl sm:text-4xl tracking-tight leading-tight mb-4">
            Start a workspace.
            <br />
            Bring your pipeline to life.
          </h1>
          <p className="font-body text-quiet-muted text-base leading-relaxed">
            You'll get a workspace pre-loaded with sample contacts, companies and deals so you can try the AI field
            builder and pipeline chat immediately.
          </p>
        </div>
      </div>

      <div className="op-zone lg:w-[45%] bg-operational-bg flex items-center justify-center px-8 sm:px-16 py-16">
        <form onSubmit={submit} className="w-full max-w-sm sm-fade-up" data-testid="register-form">
          <h2 className="font-display font-medium text-2xl text-operational-text mb-1">Create workspace</h2>
          <p className="font-body text-sm text-operational-muted mb-8">You'll be the manager.</p>

          {error && (
            <div data-testid="register-error" className="mb-5 text-sm font-body text-coral border border-coral/40 bg-coral-subtle px-3 py-2 rounded-sm">
              {error}
            </div>
          )}

          {[
            { k: "name", label: "Your name", type: "text" },
            { k: "workspace_name", label: "Workspace name", type: "text", optional: true },
            { k: "email", label: "Email", type: "email" },
            { k: "password", label: "Password", type: "password" },
          ].map((f) => (
            <div key={f.k}>
              <label className="block font-body text-xs uppercase tracking-wider text-operational-muted mb-2">
                {f.label}
              </label>
              <input
                data-testid={`register-${f.k}`}
                type={f.type}
                value={form[f.k]}
                onChange={set(f.k)}
                required={!f.optional}
                className="w-full bg-operational-surface border border-operational-border text-operational-text font-body text-sm px-3 py-2.5 mb-5 rounded-sm focus:outline-none focus:ring-1 focus:ring-coral transition-colors"
              />
            </div>
          ))}

          <button
            data-testid="register-submit"
            type="submit"
            disabled={busy}
            className="w-full bg-coral hover:bg-coral-hover disabled:opacity-60 text-white font-body font-medium text-sm px-4 py-3 rounded-sm transition-colors flex items-center justify-center gap-2"
          >
            {busy ? "Creating…" : "Create workspace"} <ArrowRight size={16} />
          </button>

          <p className="mt-6 text-sm font-body text-operational-muted text-center">
            Already have one?{" "}
            <Link to="/login" data-testid="go-login" className="text-coral hover:underline">Sign in</Link>
          </p>
        </form>
      </div>
    </div>
  );
}
