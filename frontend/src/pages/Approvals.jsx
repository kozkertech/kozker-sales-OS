import { useState, useEffect, useCallback } from "react";
import api, { apiErr } from "@/lib/api";
import { toast } from "sonner";
import { Sparkles, Check, X, Mail, MessageCircle, Loader2, Bot, ArrowUp, ListChecks } from "lucide-react";

export default function Approvals() {
  const [actions, setActions] = useState([]);
  const [messages, setMessages] = useState([]);
  const [instruction, setInstruction] = useState("");
  const [planning, setPlanning] = useState(false);

  const load = useCallback(() => {
    api.get("/agent/actions").then((r) => setActions(r.data)).catch(() => {});
    api.get("/messages/pending").then((r) => setMessages(r.data)).catch(() => {});
  }, []);
  useEffect(load, [load]);

  const plan = async () => {
    if (!instruction.trim()) return;
    setPlanning(true);
    try {
      const { data } = await api.post("/agent/plan", { message: instruction });
      setInstruction("");
      if (!data.actions.length) toast.info("No actionable steps found. Try being more specific.");
      else toast.success(`AI proposed ${data.actions.length} action(s)`, { description: `via ${data.model}` });
      load();
    } catch (err) {
      toast.error(apiErr(err.response?.data?.detail));
    } finally {
      setPlanning(false);
    }
  };

  const decideAction = async (id, approve) => {
    try {
      const { data } = await api.post(`/agent/actions/${id}/${approve ? "approve" : "reject"}`);
      setActions((a) => a.filter((x) => x.id !== id));
      toast.success(approve ? data.result || "Action executed" : "Action rejected");
    } catch (err) {
      toast.error(apiErr(err.response?.data?.detail));
    }
  };

  return (
    <div className="op-zone h-full flex flex-col bg-operational-bg text-operational-text overflow-y-auto">
      <div className="h-16 shrink-0 px-6 flex items-center border-b border-operational-border">
        <div>
          <h1 className="font-display font-medium text-xl">Approvals</h1>
          <span className="font-mono text-xs text-operational-muted">Human-in-the-loop · nothing acts or sends without you</span>
        </div>
      </div>

      <div className="p-6 max-w-4xl w-full space-y-8">
        {/* AI agent */}
        <div>
          <h2 className="font-body text-xs uppercase tracking-wider text-operational-muted mb-3 flex items-center gap-2">
            <Bot size={14} className="text-coral" /> Ask AI to act
          </h2>
          <div className="flex items-end gap-2 bg-operational-surface border border-operational-border rounded-sm focus-within:ring-1 focus-within:ring-coral mb-4">
            <textarea
              data-testid="agent-instruction"
              rows={2}
              value={instruction}
              onChange={(e) => setInstruction(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); plan(); } }}
              placeholder="e.g. Create a follow-up task for the VertexPay deal and move Aperture to Proposal"
              className="flex-1 bg-transparent resize-none font-body text-sm px-3 py-2.5 focus:outline-none"
            />
            <button data-testid="agent-plan-btn" onClick={plan} disabled={planning || !instruction.trim()}
              className="m-1.5 shrink-0 w-9 h-9 flex items-center justify-center bg-coral hover:bg-coral-hover disabled:opacity-40 text-white rounded-sm transition-colors">
              {planning ? <Loader2 size={16} className="animate-spin" /> : <ArrowUp size={16} />}
            </button>
          </div>

          {actions.length === 0 ? (
            <p className="font-body text-sm text-operational-muted">No proposed actions. Ask the AI above to draft some.</p>
          ) : (
            <div className="space-y-2" data-testid="agent-actions">
              {actions.map((a) => (
                <div key={a.id} className="flex items-center gap-3 border border-operational-border rounded-sm px-4 py-3" data-testid="agent-action">
                  <span className="font-mono text-[10px] uppercase tracking-wider border border-operational-border px-2 py-0.5 rounded-sm text-operational-muted shrink-0">
                    {a.type.replace("_", " ")}
                  </span>
                  <span className="flex-1 font-body text-sm text-operational-text">{a.description}</span>
                  <button onClick={() => decideAction(a.id, true)} data-testid="approve-action" className="text-coral hover:text-coral-hover" title="Approve"><Check size={17} /></button>
                  <button onClick={() => decideAction(a.id, false)} data-testid="reject-action" className="text-operational-muted hover:text-operational-text" title="Reject"><X size={17} /></button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Message approvals */}
        <div>
          <h2 className="font-body text-xs uppercase tracking-wider text-operational-muted mb-3 flex items-center gap-2">
            <ListChecks size={14} className="text-coral" /> AI-drafted messages ({messages.length})
          </h2>
          {messages.length === 0 ? (
            <p className="font-body text-sm text-operational-muted">No messages waiting. Enroll a contact in a sequence to draft one.</p>
          ) : (
            <div className="space-y-3">
              {messages.map((m) => (
                <MessageCard key={m.id} message={m} onResolved={(id) => setMessages((ms) => ms.filter((x) => x.id !== id))} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function MessageCard({ message, onResolved }) {
  const [body, setBody] = useState(message.body);
  const [subject, setSubject] = useState(message.subject);
  const [busy, setBusy] = useState(false);

  const approve = async () => {
    setBusy(true);
    try {
      const { data } = await api.post(`/messages/${message.id}/approve`, { body, subject });
      toast.success("Sent", { description: data.delivery });
      onResolved(message.id);
    } catch (err) {
      toast.error(apiErr(err.response?.data?.detail));
    } finally {
      setBusy(false);
    }
  };
  const reject = async () => {
    await api.post(`/messages/${message.id}/reject`);
    toast.success("Message rejected");
    onResolved(message.id);
  };

  return (
    <div className="border border-operational-border rounded-sm p-4" data-testid="message-card">
      <div className="flex items-center gap-2 mb-3">
        {message.channel === "email" ? <Mail size={14} className="text-coral" /> : <MessageCircle size={14} className="text-coral" />}
        <span className="font-body text-sm text-operational-text">{message.contact_name}</span>
        <span className="font-mono text-xs text-operational-muted">· {message.to}</span>
        <span className="ml-auto font-mono text-[10px] uppercase tracking-wider text-operational-muted flex items-center gap-1">
          <Sparkles size={10} className="text-coral" /> {message.sequence_name}
          {message.channel === "whatsapp" && <span className="text-operational-muted">· mock</span>}
        </span>
      </div>
      {message.channel === "email" && (
        <input value={subject} onChange={(e) => setSubject(e.target.value)} data-testid="message-subject"
          className="w-full bg-operational-surface border border-operational-border text-operational-text font-body text-sm px-3 py-2 mb-2 rounded-sm focus:outline-none focus:ring-1 focus:ring-coral" />
      )}
      <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={4} data-testid="message-body"
        className="w-full bg-operational-surface border border-operational-border text-operational-text font-body text-sm px-3 py-2 rounded-sm focus:outline-none focus:ring-1 focus:ring-coral resize-none leading-relaxed" />
      <div className="flex items-center gap-2 mt-3">
        <button onClick={approve} disabled={busy} data-testid="approve-message"
          className="flex items-center gap-2 bg-coral hover:bg-coral-hover disabled:opacity-60 text-white font-body font-medium text-sm px-4 py-2 rounded-sm transition-colors">
          {busy ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />} Approve & send
        </button>
        <button onClick={reject} data-testid="reject-message"
          className="flex items-center gap-2 bg-operational-surface hover:bg-operational-border border border-operational-border text-operational-text font-body text-sm px-4 py-2 rounded-sm transition-colors">
          <X size={14} /> Reject
        </button>
        <span className="font-body text-xs text-operational-muted ml-auto">Edit before sending — you have full control</span>
      </div>
    </div>
  );
}
