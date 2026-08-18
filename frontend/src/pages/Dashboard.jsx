import { useState, useEffect } from "react";
import api from "@/lib/api";
import AIChatPanel from "@/components/AIChatPanel";
import { useAuth } from "@/context/AuthContext";
import { TrendingUp, Users, Building2, Sparkles } from "lucide-react";

function money(v) {
  return "$" + Number(v || 0).toLocaleString();
}

const STAGES = ["Lead", "Contacted", "Proposal", "Won", "Lost"];

export default function Dashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [timeline, setTimeline] = useState([]);

  useEffect(() => {
    api.get("/stats").then((r) => setStats(r.data)).catch(() => {});
    api.get("/timeline").then((r) => setTimeline(r.data)).catch(() => {});
  }, []);

  const maxStage = stats ? Math.max(1, ...STAGES.map((s) => stats.stage_counts[s] || 0)) : 1;

  return (
    <div className="h-full flex">
      {/* Quiet field — 60% : narrative + AI chat */}
      <div className="w-full lg:w-[58%] bg-quiet-bg flex flex-col border-r border-quiet-border">
        <div className="h-16 shrink-0 px-6 flex items-center border-b border-quiet-border">
          <div>
            <h1 className="font-display font-medium text-xl">Overview</h1>
            <span className="font-body text-sm text-quiet-muted">Good to see you, {user?.name?.split(" ")[0]}.</span>
          </div>
        </div>
        <div className="flex-1 overflow-hidden">
          <AIChatPanel />
        </div>
      </div>

      {/* Operational zone — 40% : the numbers */}
      <div className="op-zone hidden lg:flex w-[42%] bg-operational-bg text-operational-text flex-col">
        <div className="h-16 shrink-0 px-6 flex items-center border-b border-operational-border">
          <h2 className="font-display font-medium text-base text-operational-text">Pipeline snapshot</h2>
        </div>
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* metric grid */}
          <div className="grid grid-cols-2 gap-px bg-operational-border border border-operational-border rounded-sm overflow-hidden" data-testid="stats-grid">
            <Metric icon={TrendingUp} label="Open pipeline" value={stats ? money(stats.pipeline_value) : "—"} accent />
            <Metric icon={TrendingUp} label="Won" value={stats ? money(stats.won_value) : "—"} />
            <Metric icon={Users} label="Contacts" value={stats ? stats.contacts : "—"} />
            <Metric icon={Building2} label="Companies" value={stats ? stats.companies : "—"} />
          </div>

          {/* stage distribution */}
          <div>
            <div className="font-body text-xs uppercase tracking-wider text-operational-muted mb-3">Deals by stage</div>
            <div className="space-y-2">
              {STAGES.map((s) => {
                const c = stats?.stage_counts?.[s] || 0;
                return (
                  <div key={s} className="flex items-center gap-3">
                    <span className="font-body text-sm w-20 text-operational-text">{s}</span>
                    <div className="flex-1 h-5 bg-operational-surface rounded-sm overflow-hidden">
                      <div
                        className={`h-full ${s === "Won" ? "bg-coral" : "bg-operational-border"}`}
                        style={{ width: `${(c / maxStage) * 100}%`, transition: "width 400ms ease" }}
                      />
                    </div>
                    <span className="font-mono text-sm w-6 text-right text-operational-text">{c}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* AI fields callout */}
          <div className="border border-operational-border rounded-sm p-4 flex items-start gap-3">
            <Sparkles size={16} className="text-coral mt-0.5" />
            <div>
              <div className="font-mono text-2xl text-operational-text">{stats?.ai_fields ?? 0}</div>
              <div className="font-body text-sm text-operational-muted">AI-generated fields live in this workspace</div>
            </div>
          </div>

          {/* recent activity */}
          <div>
            <div className="font-body text-xs uppercase tracking-wider text-operational-muted mb-3">Recent activity</div>
            <div className="space-y-3">
              {timeline.slice(0, 8).map((a) => (
                <div key={a.id} className="flex gap-2.5">
                  <span className={`mt-1.5 w-1.5 h-1.5 rounded-sm shrink-0 ${a.type === "ai" ? "bg-coral" : "bg-operational-muted"}`} />
                  <div>
                    <p className="font-body text-sm text-operational-text leading-snug">{a.content}</p>
                    <p className="font-mono text-[10px] text-operational-muted">{new Date(a.created_at).toLocaleString()}</p>
                  </div>
                </div>
              ))}
              {timeline.length === 0 && <p className="font-body text-sm text-operational-muted">No activity yet.</p>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Metric({ icon: Icon, label, value, accent }) {
  return (
    <div className="bg-operational-bg p-4">
      <Icon size={15} className={accent ? "text-coral mb-2" : "text-operational-muted mb-2"} />
      <div className={`font-mono text-xl ${accent ? "text-coral" : "text-operational-text"}`}>{value}</div>
      <div className="font-body text-xs text-operational-muted mt-0.5">{label}</div>
    </div>
  );
}
