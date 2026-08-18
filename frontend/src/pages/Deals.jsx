import { useState, useEffect, useCallback } from "react";
import api, { apiErr } from "@/lib/api";
import { toast } from "sonner";
import RecordDrawer from "@/components/RecordDrawer";
import { Plus, Kanban, List, Zap, Loader2 } from "lucide-react";

const STAGES = ["Lead", "Contacted", "Proposal", "Won", "Lost"];

function money(v) {
  const n = Number(v || 0);
  return "$" + n.toLocaleString();
}

export default function Deals() {
  const [fields, setFields] = useState([]);
  const [deals, setDeals] = useState([]);
  const [view, setView] = useState("kanban");
  const [open, setOpen] = useState(null);
  const [dragId, setDragId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [scoring, setScoring] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [f, r] = await Promise.all([
        api.get("/fields?object_type=deal"),
        api.get("/records?object_type=deal"),
      ]);
      setFields(f.data);
      setDeals(r.data);
    } catch (err) {
      toast.error(apiErr(err.response?.data?.detail));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const addDeal = async () => {
    const data = { title: "New deal", value: 0, stage: "Lead", contact: "" };
    try {
      const { data: rec } = await api.post("/records", { object_type: "deal", data });
      setDeals((d) => [rec, ...d]);
      setOpen(rec);
    } catch (err) {
      toast.error(apiErr(err.response?.data?.detail));
    }
  };

  const moveTo = async (deal, stage) => {
    if (deal.data.stage === stage) return;
    const newData = { ...deal.data, stage };
    setDeals((ds) => ds.map((d) => (d.id === deal.id ? { ...d, data: newData } : d)));
    try {
      await api.put(`/records/${deal.id}`, { data: newData });
      toast.success(`Moved to ${stage}`);
    } catch (err) {
      toast.error(apiErr(err.response?.data?.detail));
      load();
    }
  };

  const totalByStage = (stage) =>
    deals.filter((d) => d.data.stage === stage).reduce((s, d) => s + Number(d.data.value || 0), 0);

  const scoreAll = async () => {
    setScoring(true);
    try {
      const { data } = await api.post("/deals/score-all");
      toast.success(`AI scored ${data.scored} deals`, { description: "Next-best-actions added to each card" });
      load();
    } catch (err) {
      toast.error(apiErr(err.response?.data?.detail));
    } finally {
      setScoring(false);
    }
  };

  const scoreColor = (s) => (s >= 66 ? "text-coral" : s >= 33 ? "text-quiet-text" : "text-quiet-muted");

  return (
    <div className="h-full flex flex-col bg-quiet-bg text-quiet-text">
      <div className="h-16 shrink-0 px-6 flex items-center justify-between border-b border-quiet-border">
        <div>
          <h1 className="font-display font-medium text-xl">Deals</h1>
          <span className="font-mono text-xs text-quiet-muted">
            {deals.length} deals · {money(deals.filter((d) => !["Won", "Lost"].includes(d.data.stage)).reduce((s, d) => s + Number(d.data.value || 0), 0))} open
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            data-testid="score-all-btn"
            onClick={scoreAll}
            disabled={scoring}
            className="flex items-center gap-2 bg-quiet-surface hover:bg-quiet-border border border-quiet-border text-quiet-text font-body text-sm px-3 py-2 rounded-sm transition-colors"
          >
            {scoring ? <Loader2 size={15} className="animate-spin" /> : <Zap size={15} className="text-coral" />}
            Score all
          </button>
          <div className="flex border border-quiet-border rounded-sm overflow-hidden">
            <button
              data-testid="view-kanban"
              onClick={() => setView("kanban")}
              className={`px-3 py-2 transition-colors ${view === "kanban" ? "bg-quiet-surface text-coral" : "text-quiet-muted"}`}
            >
              <Kanban size={15} />
            </button>
            <button
              data-testid="view-list"
              onClick={() => setView("list")}
              className={`px-3 py-2 transition-colors ${view === "list" ? "bg-quiet-surface text-coral" : "text-quiet-muted"}`}
            >
              <List size={15} />
            </button>
          </div>
          <button
            data-testid="add-deal-btn"
            onClick={addDeal}
            className="flex items-center gap-2 bg-coral hover:bg-coral-hover text-white font-body font-medium text-sm px-3 py-2 rounded-sm transition-colors"
          >
            <Plus size={15} /> New deal
          </button>
        </div>
      </div>

      {loading ? (
        <div className="p-6 font-mono text-sm text-quiet-muted sm-pulse">loading…</div>
      ) : view === "kanban" ? (
        <div className="flex-1 overflow-x-auto flex" data-testid="kanban-board">
          {STAGES.map((stage) => (
            <div
              key={stage}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => {
                const d = deals.find((x) => x.id === dragId);
                if (d) moveTo(d, stage);
                setDragId(null);
              }}
              className="w-72 shrink-0 border-r border-quiet-border flex flex-col"
              data-testid={`stage-${stage}`}
            >
              <div className="px-4 py-3 border-b border-quiet-border flex items-center justify-between">
                <span className="font-body text-xs uppercase tracking-wider text-quiet-muted flex items-center gap-2">
                  {stage === "Won" && <span className="w-1.5 h-1.5 bg-coral rounded-sm" />}
                  {stage}
                </span>
                <span className="font-mono text-xs text-quiet-text">{money(totalByStage(stage))}</span>
              </div>
              <div className="flex-1 overflow-y-auto p-2 space-y-2">
                {deals.filter((d) => d.data.stage === stage).map((d) => (
                  <div
                    key={d.id}
                    draggable
                    onDragStart={() => setDragId(d.id)}
                    onClick={() => setOpen(d)}
                    className="bg-white border border-quiet-border hover:border-coral shadow-[0_1px_2px_rgba(0,0,0,0.05)] hover:shadow-[0_4px_12px_rgba(0,0,0,0.08)] p-3 rounded-sm cursor-pointer transition-[box-shadow,border-color] duration-150"
                    data-testid="deal-card"
                  >
                    <div className="font-display text-sm text-quiet-text mb-2 leading-snug">{d.data.title || "Untitled"}</div>
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-sm text-coral">{money(d.data.value)}</span>
                      <span className="font-body text-xs text-quiet-muted truncate max-w-[55%]">{d.data.contact}</span>
                    </div>
                    {d.data._score !== undefined && d.data._score !== "" && (
                      <div className="mt-2.5 pt-2.5 border-t border-quiet-border">
                        <div className="flex items-center gap-1.5 mb-1">
                          <Zap size={11} className="text-coral" />
                          <span className={`font-mono text-xs ${scoreColor(Number(d.data._score))}`}>{d.data._score}/100</span>
                          <span className="font-mono text-[10px] uppercase tracking-wider text-quiet-muted">close score</span>
                        </div>
                        {d.data._next_action && (
                          <p className="font-body text-xs text-quiet-muted leading-snug">{d.data._next_action}</p>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex-1 overflow-auto">
          <table className="w-full border-collapse">
            <thead className="sticky top-0 bg-quiet-surface">
              <tr>
                {["Deal", "Value", "Stage", "Contact"].map((h) => (
                  <th key={h} className="text-left font-body text-[11px] uppercase tracking-wider text-quiet-muted px-4 py-2.5 border-b border-r border-quiet-border">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {deals.map((d) => (
                <tr key={d.id} onClick={() => setOpen(d)} className="hover:bg-quiet-surface cursor-pointer transition-colors" data-testid="deal-row">
                  <td className="font-body text-sm px-4 py-2.5 border-b border-r border-quiet-border">{d.data.title}</td>
                  <td className="font-mono text-sm text-right px-4 py-2.5 border-b border-r border-quiet-border">{money(d.data.value)}</td>
                  <td className="font-body text-sm px-4 py-2.5 border-b border-r border-quiet-border">
                    <span className="inline-block border border-quiet-border px-2 py-0.5 rounded-sm text-xs">{d.data.stage}</span>
                  </td>
                  <td className="font-body text-sm px-4 py-2.5 border-b border-quiet-border">{d.data.contact}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {open && (
        <RecordDrawer
          record={open}
          fields={fields}
          onClose={() => setOpen(null)}
          onSaved={(u) => setDeals((ds) => ds.map((d) => (d.id === u.id ? u : d)))}
        />
      )}
    </div>
  );
}
