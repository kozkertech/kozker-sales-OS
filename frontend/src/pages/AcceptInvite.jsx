import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import api, { apiErr } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { useEffect } from "react";
import { ArrowRight } from "lucide-react";

export default function AcceptInvite() {
  const [params] = useSearchParams();
  const token = params.get("token");
  const nav = useNavigate();
  const { refresh } = useAuth();
  const [invite, setInvite] = useState(null);
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!token) {
      setError("Missing invitation token.");
      return;
    }
    api
      .get(`/invites/verify?token=${token}`)
      .then((r) => setInvite(r.data))
      .catch((e) => setError(apiErr(e.response?.data?.detail)));
  }, [token]);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await api.post("/invites/accept", { token, name, password });
      await refresh();
      nav("/");
    } catch (err) {
      setError(apiErr(err.response?.data?.detail));
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
            {invite ? `Join ${invite.workspace_name}` : "You've been invited"}
          </h1>
          <p className="font-body text-quiet-muted text-base leading-relaxed">
            {invite
              ? `You're joining as a ${invite.role}. Set your password to get started.`
              : error || "Verifying your invitation…"}
          </p>
        </div>
      </div>

      <div className="op-zone lg:w-[45%] bg-operational-bg flex items-center justify-center px-8 sm:px-16 py-16">
        <form onSubmit={submit} className="w-full max-w-sm sm-fade-up" data-testid="accept-invite-form">
          <h2 className="font-display font-medium text-2xl text-operational-text mb-1">Accept invitation</h2>
          <p className="font-body text-sm text-operational-muted mb-8">{invite?.email || ""}</p>

          {error && (
            <div data-testid="accept-error" className="mb-5 text-sm font-body text-coral border border-coral/40 bg-coral-subtle px-3 py-2 rounded-sm">
              {error}
            </div>
          )}

          {invite && (
            <>
              <label className="block font-body text-xs uppercase tracking-wider text-operational-muted mb-2">Your name</label>
              <input
                data-testid="accept-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="w-full bg-operational-surface border border-operational-border text-operational-text font-body text-sm px-3 py-2.5 mb-5 rounded-sm focus:outline-none focus:ring-1 focus:ring-coral"
              />
              <label className="block font-body text-xs uppercase tracking-wider text-operational-muted mb-2">Password</label>
              <input
                data-testid="accept-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full bg-operational-surface border border-operational-border text-operational-text font-body text-sm px-3 py-2.5 mb-8 rounded-sm focus:outline-none focus:ring-1 focus:ring-coral"
              />
              <button
                data-testid="accept-submit"
                disabled={busy}
                className="w-full bg-coral hover:bg-coral-hover disabled:opacity-60 text-white font-body font-medium text-sm px-4 py-3 rounded-sm transition-colors flex items-center justify-center gap-2"
              >
                {busy ? "Joining…" : "Join workspace"} <ArrowRight size={16} />
              </button>
            </>
          )}
        </form>
      </div>
    </div>
  );
}
