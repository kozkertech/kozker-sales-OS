import { useState, useEffect } from "react";
import api from "@/lib/api";
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
    <div className="h-full flex flex-col bg-quiet-bg" data-testid="dashboard">
      <div className="h-16 shrink-0 px-8 flex items-center border-b border-quiet-border">
        <div>
          <h1 className="font-display font-semibold text-xl tracking-tight text-quiet-text">Overview</h1>
          <span className="font-body text-sm text-quiet-muted">Good to see you, {user?.name?.split(" ")[0]}.</span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-8 space-y-8">
        {/* metric cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4" data-testid="stats-grid">
          <Metric icon={TrendingUp} label="Open pipeline" value={stats ? money(stats.pipeline_value) : "—"} accent />
          <Metric icon={TrendingUp} label="Won" value={stats ? money(stats.won_value) : "—"} />
          <Metric icon={Users} label="Contacts" value={stats ? stats.contacts : "—"} />
          <Metric icon={Building2} label="Companies" value={stats ? stats.companies : "—"} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* stage distribution */}
          <div className="bg-white border border-quiet-border rounded-sm shadow-[0_1px_2px_rgba(0,0,0,0.04)] p-6">
            <div className="font-body text-xs uppercase tracking-wider text-quiet-muted mb-4">Deals by stage</div>
            <div className="space-y-3">
              {STAGES.map((s) => {
                const c = stats?.stage_counts?.[s] || 0;
                return (
                  <div key={s} className="flex items-center gap-3">
                    <span className="font-body text-sm w-20 text-quiet-text">{s}</span>
                    <div className="flex-1 h-5 bg-quiet-surface rounded-sm overflow-hidden">
                      <div
                        className={`h-full ${s === "Won" ? "bg-coral" : "bg-quiet-muted"}`}
                        style={{ width: `${(c / maxStage) * 100}%`, transition: "width 400ms ease" }}
                      />
                    </div>
                    <span className="font-mono text-sm w-6 text-right text-quiet-text">{c}</span>
                  </div>
                );
              })}
            </div>

            {/* AI fields callout */}
            <div className="mt-6 border border-quiet-border rounded-sm p-4 flex items-start gap-3 bg-quiet-bg">
              <Sparkles size={16} className="text-coral mt-0.5" />
              <div>
                <div className="font-mono text-2xl text-quiet-text">{stats?.ai_fields ?? 0}</div>
                <div className="font-body text-sm text-quiet-muted">AI-generated fields live in this workspace</div>
              </div>
            </div>
          </div>

          {/* recent activity */}
          <div className="bg-white border border-quiet-border rounded-sm shadow-[0_1px_2px_rgba(0,0,0,0.04)] p-6">
            <div className="font-body text-xs uppercase tracking-wider text-quiet-muted mb-4">Recent activity</div>
            <div className="space-y-3" data-testid="recent-activity">
              {timeline.slice(0, 10).map((a) => (
                <div key={a.id} className="flex gap-2.5">
                  <span className={`mt-1.5 w-1.5 h-1.5 rounded-sm shrink-0 ${a.type === "ai" ? "bg-coral" : "bg-quiet-muted"}`} />
                  <div>
                    <p className="font-body text-sm text-quiet-text leading-snug">{a.content}</p>
                    <p className="font-mono text-[10px] text-quiet-muted">{new Date(a.created_at).toLocaleString()}</p>
                  </div>
                </div>
              ))}
              {timeline.length === 0 && <p className="font-body text-sm text-quiet-muted">No activity yet.</p>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Metric({ icon: Icon, label, value, accent }) {
  return (
    <div className="bg-white border border-quiet-border rounded-sm shadow-[0_1px_2px_rgba(0,0,0,0.04)] p-4">
      <Icon size={15} className={accent ? "text-coral mb-2" : "text-quiet-muted mb-2"} />
      <div className={`font-mono text-xl ${accent ? "text-coral" : "text-quiet-text"}`}>{value}</div>
      <div className="font-body text-xs text-quiet-muted mt-0.5">{label}</div>
    </div>
  );
}
