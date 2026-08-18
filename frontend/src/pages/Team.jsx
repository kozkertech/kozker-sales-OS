import { useState, useEffect } from "react";
import api, { apiErr } from "@/lib/api";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
import { UserPlus, Trash2, Mail, Check, Clock } from "lucide-react";

export default function Team() {
  const { user } = useAuth();
  const [members, setMembers] = useState([]);
  const [invites, setInvites] = useState([]);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("rep");
  const [busy, setBusy] = useState(false);

  const load = () => {
    api.get("/team").then((r) => setMembers(r.data)).catch(() => {});
    api.get("/invites").then((r) => setInvites(r.data)).catch(() => {});
  };
  useEffect(load, []);

  const invite = async (e) => {
    e.preventDefault();
    if (!email.trim()) return;
    setBusy(true);
    try {
      const { data } = await api.post("/invites", { email, role });
      toast.success(`Invited ${email}`, {
        description: data.email_sent ? "Invitation email sent" : "Email failed — share the link manually",
      });
      setEmail("");
      load();
    } catch (err) {
      toast.error(apiErr(err.response?.data?.detail));
    } finally {
      setBusy(false);
    }
  };

  const revoke = async (id) => {
    await api.delete(`/invites/${id}`);
    load();
    toast.success("Invitation revoked");
  };

  return (
    <div className="op-zone h-full flex flex-col bg-operational-bg text-operational-text overflow-y-auto">
      <div className="h-16 shrink-0 px-6 flex items-center border-b border-operational-border">
        <div>
          <h1 className="font-display font-medium text-xl">Team</h1>
          <span className="font-mono text-xs text-operational-muted">{members.length} members · reps see only their own records</span>
        </div>
      </div>

      <div className="p-6 max-w-3xl w-full space-y-8">
        {/* Invite form */}
        <div className="border border-operational-border rounded-sm p-5">
          <h2 className="font-display font-medium text-base mb-4 flex items-center gap-2">
            <UserPlus size={16} className="text-coral" /> Invite a teammate
          </h2>
          <form onSubmit={invite} className="flex flex-col sm:flex-row gap-2" data-testid="invite-form">
            <input
              data-testid="invite-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="teammate@company.com"
              className="flex-1 bg-operational-surface border border-operational-border text-operational-text font-body text-sm px-3 py-2.5 rounded-sm focus:outline-none focus:ring-1 focus:ring-coral"
            />
            <select
              data-testid="invite-role"
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="bg-operational-surface border border-operational-border text-operational-text font-mono text-sm px-3 py-2.5 rounded-sm focus:outline-none focus:ring-1 focus:ring-coral"
            >
              <option value="rep">rep</option>
              <option value="manager">manager</option>
            </select>
            <button
              data-testid="invite-submit"
              disabled={busy}
              className="bg-coral hover:bg-coral-hover disabled:opacity-60 text-white font-body font-medium text-sm px-4 py-2.5 rounded-sm transition-colors flex items-center justify-center gap-2"
            >
              <Mail size={15} /> Send invite
            </button>
          </form>
          <p className="font-body text-xs text-operational-muted mt-3">
            Reps only see the contacts, companies and deals they own. Managers see the whole workspace.
          </p>
        </div>

        {/* Members */}
        <div>
          <h2 className="font-body text-xs uppercase tracking-wider text-operational-muted mb-3">Members</h2>
          <div className="border border-operational-border rounded-sm divide-y divide-operational-border">
            {members.map((m) => (
              <div key={m.id} className="flex items-center gap-3 px-4 py-3" data-testid="team-member">
                <div className="w-8 h-8 rounded-sm bg-operational-surface flex items-center justify-center font-mono text-xs">
                  {m.name.split(" ").map((s) => s[0]).slice(0, 2).join("").toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-body text-sm text-operational-text">{m.name}</div>
                  <div className="font-mono text-xs text-operational-muted truncate">{m.email}</div>
                </div>
                <span className="font-mono text-[10px] uppercase tracking-wider border border-operational-border px-2 py-0.5 rounded-sm">
                  {m.role}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Pending invites */}
        {invites.length > 0 && (
          <div>
            <h2 className="font-body text-xs uppercase tracking-wider text-operational-muted mb-3">Invitations</h2>
            <div className="border border-operational-border rounded-sm divide-y divide-operational-border">
              {invites.map((i) => (
                <div key={i.id} className="flex items-center gap-3 px-4 py-3" data-testid="invite-row">
                  <span className={i.status === "accepted" ? "text-coral" : "text-operational-muted"}>
                    {i.status === "accepted" ? <Check size={15} /> : <Clock size={15} />}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="font-mono text-sm text-operational-text truncate">{i.email}</div>
                    <div className="font-mono text-[10px] text-operational-muted uppercase">{i.role} · {i.status}</div>
                  </div>
                  {i.status === "pending" && (
                    <button onClick={() => revoke(i.id)} className="text-operational-muted hover:text-coral" data-testid="revoke-invite">
                      <Trash2 size={15} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
