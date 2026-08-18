import { useState, useEffect } from "react";
import api from "@/lib/api";
import { Sparkles, ShieldCheck } from "lucide-react";

const AI_ACTIONS = new Set(["record.enrich", "chat.query", "field.create"]);

export default function AuditLog() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("/audit").then((r) => setLogs(r.data)).finally(() => setLoading(false));
  }, []);

  return (
    <div className="op-zone h-full flex flex-col bg-operational-bg text-operational-text">
      <div className="h-16 shrink-0 px-6 flex items-center gap-2 border-b border-operational-border">
        <ShieldCheck size={18} className="text-coral" />
        <div>
          <h1 className="font-display font-medium text-xl">Audit log</h1>
          <span className="font-mono text-xs text-operational-muted">{logs.length} events · AI actions & record changes</span>
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        {loading ? (
          <div className="p-6 font-mono text-sm text-operational-muted sm-pulse">loading…</div>
        ) : (
          <table className="w-full border-collapse" data-testid="audit-table">
            <thead className="sticky top-0 bg-operational-surface">
              <tr>
                {["Time", "Actor", "Action", "Detail", "Model"].map((h) => (
                  <th key={h} className="text-left font-body text-[11px] uppercase tracking-wider text-operational-muted px-4 py-2.5 border-b border-r border-operational-border">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {logs.map((l) => (
                <tr key={l.id} className="hover:bg-operational-surface transition-colors" data-testid="audit-row">
                  <td className="font-mono text-xs text-operational-muted px-4 py-2.5 border-b border-r border-operational-border whitespace-nowrap">
                    {new Date(l.created_at).toLocaleString()}
                  </td>
                  <td className="font-body text-sm px-4 py-2.5 border-b border-r border-operational-border whitespace-nowrap">{l.actor_name}</td>
                  <td className="px-4 py-2.5 border-b border-r border-operational-border whitespace-nowrap">
                    <span className="inline-flex items-center gap-1.5 font-mono text-xs text-operational-text">
                      {AI_ACTIONS.has(l.action) && <Sparkles size={11} className="text-coral" />}
                      {l.action}
                    </span>
                  </td>
                  <td className="font-body text-sm text-operational-muted px-4 py-2.5 border-b border-r border-operational-border">{l.detail}</td>
                  <td className="font-mono text-[10px] text-operational-muted px-4 py-2.5 border-b border-operational-border whitespace-nowrap">{l.ai_model || "—"}</td>
                </tr>
              ))}
              {logs.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-16 text-center font-body text-sm text-operational-muted">No events yet.</td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
