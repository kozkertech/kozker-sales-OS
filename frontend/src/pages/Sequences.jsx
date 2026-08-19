import { useState, useEffect, useCallback } from "react";
import api, { apiErr } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import { Plus, Send, Mail, MessageCircle, Zap, Trash2, Play, Pause, X, UserPlus, AlertTriangle, Clock, Loader2, ChevronDown, ChevronUp } from "lucide-react";

const STAGES = ["Lead", "Contacted", "Proposal", "Won", "Lost"];

const TRIGGERS = [
  { value: "manual", label: "Manual enroll" },
  { value: "no_reply", label: "No reply in N days" },
  { value: "stage_changed", label: "Deal stage changed" },
  { value: "link_clicked", label: "Email link clicked" },
];

export default function Sequences() {
  const { user } = useAuth();
  const [sequences, setSequences] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [showBuilder, setShowBuilder] = useState(false);
  const [enrollFor, setEnrollFor] = useState(null);
  const [running, setRunning] = useState(false);
  const isManager = user?.role === "manager" || user?.role === "admin";

  const load = useCallback(() => {
    api.get("/sequences").then((r) => setSequences(r.data)).catch(() => {});
    api.get("/records?object_type=contact").then((r) => setContacts(r.data)).catch(() => {});
  }, []);
  useEffect(load, [load]);

  const toggle = async (s) => {
    await api.put(`/sequences/${s.id}/toggle`);
    load();
  };
  const remove = async (s) => {
    await api.delete(`/sequences/${s.id}`);
    load();
    toast.success("Sequence deleted");
  };
  const runNow = async () => {
    setRunning(true);
    try {
      const { data } = await api.post("/scheduler/run");
      toast.success(`Scheduler ran · ${data.processed} step${data.processed === 1 ? "" : "s"} fired`, {
        description: data.processed ? "Check Approvals for new drafts" : "No steps were due right now",
      });
      load();
    } catch (err) {
      toast.error(apiErr(err.response?.data?.detail));
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="h-full flex flex-col bg-quiet-bg text-quiet-text overflow-y-auto">
      <div className="h-16 shrink-0 px-6 flex items-center justify-between border-b border-quiet-border">
        <div>
          <h1 className="font-display font-medium text-xl">Sequences</h1>
          <span className="font-mono text-xs text-quiet-muted">Multi-step follow-ups that fire automatically on schedule · engine runs every minute</span>
        </div>
        <div className="flex items-center gap-2">
          {isManager && (
            <button
              data-testid="run-scheduler-btn"
              onClick={runNow}
              disabled={running}
              className="flex items-center gap-2 bg-quiet-surface hover:bg-quiet-border border border-quiet-border text-quiet-text font-body text-sm px-3 py-2 rounded-sm transition-colors"
              title="Fire any due steps now instead of waiting for the 60s tick"
            >
              {running ? <Loader2 size={15} className="animate-spin" /> : <Clock size={15} className="text-coral" />}
              Run now
            </button>
          )}
          <button
            data-testid="new-sequence-btn"
            onClick={() => setShowBuilder(true)}
            className="flex items-center gap-2 bg-coral hover:bg-coral-hover text-white font-body font-medium text-sm px-3 py-2 rounded-sm transition-colors"
          >
            <Plus size={15} /> New sequence
          </button>
        </div>
      </div>

      <div className="p-6 space-y-4 max-w-4xl w-full">
        {sequences.length === 0 && (
          <div className="border border-quiet-border rounded-sm p-10 text-center">
            <Send size={22} className="text-coral mx-auto mb-3" />
            <p className="font-body text-sm text-quiet-muted">No sequences yet. Build one to start automating follow-ups.</p>
          </div>
        )}
        {sequences.map((s) => (
          <SequenceCard
            key={s.id}
            s={s}
            isManager={isManager}
            onToggle={toggle}
            onRemove={remove}
            onEnroll={setEnrollFor}
          />
        ))}
      </div>

      {showBuilder && <SequenceBuilder onClose={() => setShowBuilder(false)} onCreated={load} />}
      {enrollFor && (
        <EnrollDialog sequence={enrollFor} contacts={contacts} onClose={() => setEnrollFor(null)} onDone={load} />
      )}
    </div>
  );
}

function fmtNext(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  const diff = d - new Date();
  if (diff <= 0) return "due now";
  const days = Math.round(diff / 86400000);
  if (days >= 1) return `in ${days}d`;
  const hrs = Math.round(diff / 3600000);
  if (hrs >= 1) return `in ${hrs}h`;
  return "soon";
}

function SequenceCard({ s, isManager, onToggle, onRemove, onEnroll }) {
  const [open, setOpen] = useState(false);
  const [enrollments, setEnrollments] = useState(null);
  const cfgStage = s.trigger_config?.stage;

  const toggleEnrollments = async () => {
    const next = !open;
    setOpen(next);
    if (next && enrollments === null) {
      try {
        const { data } = await api.get(`/sequences/${s.id}/enrollments`);
        setEnrollments(data);
      } catch {
        setEnrollments([]);
      }
    }
  };

  return (
    <div className="bg-white border border-quiet-border rounded-sm shadow-[0_1px_2px_rgba(0,0,0,0.04)] p-5" data-testid="sequence-card">
      <div className="flex items-start justify-between mb-3">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-display font-medium text-base">{s.name}</h3>
            <span className={`font-mono text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-sm border ${
              s.status === "active" ? "border-coral text-coral" : "border-quiet-border text-quiet-muted"
            }`}>{s.status}</span>
            {s.autonomy === "auto" ? (
              <span className="font-mono text-[10px] uppercase tracking-wider text-quiet-muted flex items-center gap-1">
                <Zap size={10} /> auto-send
              </span>
            ) : (
              <span className="font-mono text-[10px] uppercase tracking-wider text-quiet-muted">approval-gated</span>
            )}
          </div>
          <div className="font-mono text-xs text-quiet-muted mt-1">
            trigger: {TRIGGERS.find((t) => t.value === s.trigger_type)?.label || s.trigger_type}
            {cfgStage ? ` → ${cfgStage}` : ""} · {s.active_enrollments || 0} active · {s.enrolled || 0} enrolled
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => onToggle(s)} data-testid="toggle-sequence" className="text-quiet-muted hover:text-quiet-text" title={s.status === "active" ? "Pause" : "Activate"}>
            {s.status === "active" ? <Pause size={16} /> : <Play size={16} />}
          </button>
          <button onClick={() => onRemove(s)} className="text-quiet-muted hover:text-coral"><Trash2 size={16} /></button>
        </div>
      </div>

      <div className="flex items-center gap-2 flex-wrap mb-4">
        {s.steps.map((st, i) => (
          <div key={i} className="flex items-center gap-2">
            {i > 0 && <span className="font-mono text-xs text-quiet-muted">→</span>}
            <div className="flex items-center gap-2 border border-quiet-border rounded-sm px-3 py-1.5">
              {st.channel === "email" ? <Mail size={13} className="text-coral" /> : <MessageCircle size={13} className="text-coral" />}
              <span className="font-body text-xs">{st.channel}</span>
              <span className="font-mono text-[10px] text-quiet-muted">+{st.delay_days}d</span>
            </div>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-2">
        <button
          data-testid="enroll-btn"
          onClick={() => onEnroll(s)}
          className="flex items-center gap-2 bg-quiet-surface hover:bg-quiet-border border border-quiet-border text-quiet-text font-body text-sm px-3 py-2 rounded-sm transition-colors"
        >
          <UserPlus size={14} /> Enroll a contact
        </button>
        <button
          data-testid="view-enrollments"
          onClick={toggleEnrollments}
          className="flex items-center gap-1.5 font-body text-sm text-quiet-muted hover:text-quiet-text px-2 py-2 transition-colors"
        >
          {open ? <ChevronUp size={14} /> : <ChevronDown size={14} />} Enrollments
        </button>
      </div>

      {open && (
        <div className="mt-4 border-t border-quiet-border pt-3" data-testid="enrollments-list">
          {enrollments === null ? (
            <p className="font-mono text-xs text-quiet-muted sm-pulse">loading…</p>
          ) : enrollments.length === 0 ? (
            <p className="font-body text-sm text-quiet-muted">No one enrolled yet.</p>
          ) : (
            <div className="space-y-2">
              {enrollments.map((e) => (
                <div key={e.id} className="flex items-center justify-between text-sm" data-testid="enrollment-row">
                  <span className="font-body text-quiet-text">{e.contact_name || "Contact"}</span>
                  <div className="flex items-center gap-3 font-mono text-xs text-quiet-muted">
                    <span>step {Math.min(e.current_step + 1, e.steps_total)}/{e.steps_total}</span>
                    <span className={
                      e.status === "active" ? "text-coral"
                      : e.status === "completed" ? "text-quiet-text" : "text-quiet-muted"
                    }>{e.status}</span>
                    {e.status === "active" && <span>next {fmtNext(e.next_run_at)}</span>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function SequenceBuilder({ onClose, onCreated }) {
  const [name, setName] = useState("");
  const [trigger, setTrigger] = useState("no_reply");
  const [autonomy, setAutonomy] = useState("approval");
  const [steps, setSteps] = useState([{ channel: "email", delay_days: 0, subject: "", ai_prompt: "" }]);
  const [saving, setSaving] = useState(false);

  const setStep = (i, k, v) => setSteps((s) => s.map((st, idx) => (idx === i ? { ...st, [k]: v } : st)));
  const addStep = () => setSteps((s) => [...s, { channel: "whatsapp", delay_days: 2, subject: "", ai_prompt: "" }]);
  const removeStep = (i) => setSteps((s) => s.filter((_, idx) => idx !== i));

  const save = async () => {
    if (!name.trim()) return;
    setSaving(true);
    try {
      await api.post("/sequences", {
        name, trigger_type: trigger, trigger_config: {}, autonomy,
        steps: steps.map((s) => ({ ...s, delay_days: Number(s.delay_days) || 0 })),
      });
      toast.success("Sequence created");
      onCreated();
      onClose();
    } catch (err) {
      toast.error(apiErr(err.response?.data?.detail));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={onClose}>
      <div className="w-full max-w-xl bg-quiet-bg border border-quiet-border rounded-sm sm-fade-up max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()} data-testid="sequence-builder">
        <div className="flex items-center justify-between px-5 py-4 border-b border-quiet-border sticky top-0 bg-quiet-bg">
          <h3 className="font-display font-medium text-lg">New sequence</h3>
          <button onClick={onClose} className="text-quiet-muted hover:text-quiet-text"><X size={18} /></button>
        </div>
        <div className="p-5 space-y-5">
          <div>
            <label className="block font-body text-xs uppercase tracking-wider text-quiet-muted mb-2">Name</label>
            <input data-testid="sequence-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="New Lead Nurture"
              className="w-full bg-quiet-surface border border-quiet-border text-quiet-text font-body text-sm px-3 py-2.5 rounded-sm focus:outline-none focus:ring-1 focus:ring-coral" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-body text-xs uppercase tracking-wider text-quiet-muted mb-2">Trigger</label>
              <select data-testid="sequence-trigger" value={trigger} onChange={(e) => setTrigger(e.target.value)}
                className="w-full bg-quiet-surface border border-quiet-border text-quiet-text font-body text-sm px-3 py-2.5 rounded-sm focus:outline-none focus:ring-1 focus:ring-coral">
                {TRIGGERS.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block font-body text-xs uppercase tracking-wider text-quiet-muted mb-2">Autonomy</label>
              <select data-testid="sequence-autonomy" value={autonomy} onChange={(e) => setAutonomy(e.target.value)}
                className="w-full bg-quiet-surface border border-quiet-border text-quiet-text font-body text-sm px-3 py-2.5 rounded-sm focus:outline-none focus:ring-1 focus:ring-coral">
                <option value="approval">Approval-gated (recommended)</option>
                <option value="auto">Auto-send</option>
              </select>
            </div>
          </div>

          {autonomy === "auto" && (
            <div className="flex items-start gap-2 border border-coral/40 bg-coral-subtle rounded-sm px-3 py-2">
              <AlertTriangle size={14} className="text-coral mt-0.5" />
              <p className="font-body text-xs text-quiet-text">
                Auto-send fires drafts without review. Off by default — approval-gated keeps a human in the loop.
              </p>
            </div>
          )}

          <div>
            <label className="block font-body text-xs uppercase tracking-wider text-quiet-muted mb-2">Steps</label>
            <div className="space-y-3">
              {steps.map((st, i) => (
                <div key={i} className="border border-quiet-border rounded-sm p-3 relative" data-testid="sequence-step">
                  {steps.length > 1 && (
                    <button onClick={() => removeStep(i)} className="absolute top-2 right-2 text-quiet-muted hover:text-coral"><X size={13} /></button>
                  )}
                  <div className="grid grid-cols-2 gap-2 mb-2">
                    <select value={st.channel} onChange={(e) => setStep(i, "channel", e.target.value)}
                      className="bg-quiet-surface border border-quiet-border text-quiet-text font-body text-sm px-2 py-1.5 rounded-sm focus:outline-none focus:ring-1 focus:ring-coral">
                      <option value="email">email</option>
                      <option value="whatsapp">whatsapp (mock)</option>
                    </select>
                    <input type="number" min="0" value={st.delay_days} onChange={(e) => setStep(i, "delay_days", e.target.value)} placeholder="delay days"
                      className="bg-quiet-surface border border-quiet-border text-quiet-text font-mono text-sm px-2 py-1.5 rounded-sm focus:outline-none focus:ring-1 focus:ring-coral" />
                  </div>
                  {st.channel === "email" && (
                    <input value={st.subject} onChange={(e) => setStep(i, "subject", e.target.value)} placeholder="Email subject"
                      className="w-full bg-quiet-surface border border-quiet-border text-quiet-text font-body text-sm px-2 py-1.5 mb-2 rounded-sm focus:outline-none focus:ring-1 focus:ring-coral" />
                  )}
                  <input value={st.ai_prompt} onChange={(e) => setStep(i, "ai_prompt", e.target.value)} placeholder="AI message goal, e.g. friendly first touch referencing their company"
                    className="w-full bg-quiet-surface border border-quiet-border text-quiet-text font-body text-sm px-2 py-1.5 rounded-sm focus:outline-none focus:ring-1 focus:ring-coral" />
                </div>
              ))}
            </div>
            <button onClick={addStep} className="mt-2 flex items-center gap-1.5 font-body text-sm text-coral hover:text-coral-hover">
              <Plus size={14} /> Add step
            </button>
          </div>

          <button data-testid="save-sequence" onClick={save} disabled={saving || !name.trim()}
            className="w-full bg-coral hover:bg-coral-hover disabled:opacity-60 text-white font-body font-medium text-sm px-4 py-2.5 rounded-sm transition-colors">
            {saving ? "Creating…" : "Create sequence"}
          </button>
        </div>
      </div>
    </div>
  );
}

function EnrollDialog({ sequence, contacts, onClose, onDone }) {
  const [cid, setCid] = useState("");
  const [busy, setBusy] = useState(false);

  const enroll = async () => {
    if (!cid) return;
    setBusy(true);
    try {
      await api.post(`/sequences/${sequence.id}/enroll`, { contact_record_id: cid });
      toast.success("Contact enrolled", { description: "AI drafted the message — review it in Approvals" });
      onDone();
      onClose();
    } catch (err) {
      toast.error(apiErr(err.response?.data?.detail));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={onClose}>
      <div className="w-full max-w-sm bg-quiet-bg border border-quiet-border rounded-sm sm-fade-up" onClick={(e) => e.stopPropagation()} data-testid="enroll-dialog">
        <div className="flex items-center justify-between px-5 py-4 border-b border-quiet-border">
          <h3 className="font-display font-medium text-base">Enroll in "{sequence.name}"</h3>
          <button onClick={onClose} className="text-quiet-muted hover:text-quiet-text"><X size={18} /></button>
        </div>
        <div className="p-5">
          <label className="block font-body text-xs uppercase tracking-wider text-quiet-muted mb-2">Contact</label>
          <select data-testid="enroll-contact" value={cid} onChange={(e) => setCid(e.target.value)}
            className="w-full bg-quiet-surface border border-quiet-border text-quiet-text font-body text-sm px-3 py-2.5 mb-4 rounded-sm focus:outline-none focus:ring-1 focus:ring-coral">
            <option value="">Select a contact…</option>
            {contacts.map((c) => <option key={c.id} value={c.id}>{c.data.name} — {c.data.email}</option>)}
          </select>
          <p className="font-body text-xs text-quiet-muted mb-4">
            AI will draft the first {sequence.steps[0]?.channel} message. It waits in Approvals for your review before sending.
          </p>
          <button data-testid="confirm-enroll" onClick={enroll} disabled={busy || !cid}
            className="w-full bg-coral hover:bg-coral-hover disabled:opacity-60 text-white font-body font-medium text-sm px-4 py-2.5 rounded-sm transition-colors">
            {busy ? "Drafting…" : "Enroll & draft message"}
          </button>
        </div>
      </div>
    </div>
  );
}
