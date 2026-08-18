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

  const scoreColor = (s) => (s >= 66 ? "text-coral" : s >= 33 ? "text-operational-text" : "text-operational-muted");

  return (
    <div className="op-zone h-full flex flex-col bg-operational-bg text-operational-text">
      <div className="h-16 shrink-0 px-6 flex items-center justify-between border-b border-operational-border">
        <div>
          <h1 className="font-display font-medium text-xl">Deals</h1>
          <span className="font-mono text-xs text-operational-muted">
            {deals.length} deals · {money(deals.filter((d) => !["Won", "Lost"].includes(d.data.stage)).reduce((s, d) => s + Number(d.data.value || 0), 0))} open
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            data-testid="score-all-btn"
            onClick={scoreAll}
            disabled={scoring}
            className="flex items-center gap-2 bg-operational-surface hover:bg-operational-border border border-operational-border text-operational-text font-body text-sm px-3 py-2 rounded-sm transition-colors"
          >
            {scoring ? <Loader2 size={15} className="animate-spin" /> : <Zap size={15} className="text-coral" />}
            Score all
          </button>
          <div className="flex border border-operational-border rounded-sm overflow-hidden">
            <button
              data-testid="view-kanban"
              onClick={() => setView("kanban")}
              className={`px-3 py-2 transition-colors ${view === "kanban" ? "bg-operational-surface text-coral" : "text-operational-muted"}`}
            >
              <Kanban size={15} />
            </button>
            <button
              data-testid="view-list"
              onClick={() => setView("list")}
              className={`px-3 py-2 transition-colors ${view === "list" ? "bg-operational-surface text-coral" : "text-operational-muted"}`}
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
        <div className="p-6 font-mono text-sm text-operational-muted sm-pulse">loading…</div>
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
              className="w-72 shrink-0 border-r border-operational-border flex flex-col"
              data-testid={`stage-${stage}`}
            >
              <div className="px-4 py-3 border-b border-operational-border flex items-center justify-between">
                <span className="font-body text-xs uppercase tracking-wider text-operational-muted flex items-center gap-2">
                  {stage === "Won" && <span className="w-1.5 h-1.5 bg-coral rounded-sm" />}
                  {stage}
                </span>
                <span className="font-mono text-xs text-operational-text">{money(totalByStage(stage))}</span>
              </div>
              <div className="flex-1 overflow-y-auto p-2 space-y-2">
                {deals.filter((d) => d.data.stage === stage).map((d) => (
                  <div
                    key={d.id}
                    draggable
                    onDragStart={() => setDragId(d.id)}
                    onClick={() => setOpen(d)}
                    className="bg-operational-surface border border-operational-border hover:border-coral p-3 rounded-sm cursor-pointer transition-colors"
                    data-testid="deal-card"
                  >
                    <div className="font-display text-sm text-operational-text mb-2 leading-snug">{d.data.title || "Untitled"}</div>
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-sm text-coral">{money(d.data.value)}</span>
                      <span className="font-body text-xs text-operational-muted truncate max-w-[55%]">{d.data.contact}</span>
                    </div>
                    {d.data._score !== undefined && d.data._score !== "" && (
                      <div className="mt-2.5 pt-2.5 border-t border-operational-border">
                        <div className="flex items-center gap-1.5 mb-1">
                          <Zap size={11} className="text-coral" />
                          <span className={`font-mono text-xs ${scoreColor(Number(d.data._score))}`}>{d.data._score}/100</span>
                          <span className="font-mono text-[10px] uppercase tracking-wider text-operational-muted">close score</span>
                        </div>
                        {d.data._next_action && (
                          <p className="font-body text-xs text-operational-muted leading-snug">{d.data._next_action}</p>
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
            <thead className="sticky top-0 bg-operational-surface">
              <tr>
                {["Deal", "Value", "Stage", "Contact"].map((h) => (
                  <th key={h} className="text-left font-body text-[11px] uppercase tracking-wider text-operational-muted px-4 py-2.5 border-b border-r border-operational-border">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {deals.map((d) => (
                <tr key={d.id} onClick={() => setOpen(d)} className="hover:bg-operational-surface cursor-pointer transition-colors" data-testid="deal-row">
                  <td className="font-body text-sm px-4 py-2.5 border-b border-r border-operational-border">{d.data.title}</td>
                  <td className="font-mono text-sm text-right px-4 py-2.5 border-b border-r border-operational-border">{money(d.data.value)}</td>
                  <td className="font-body text-sm px-4 py-2.5 border-b border-r border-operational-border">
                    <span className="inline-block border border-operational-border px-2 py-0.5 rounded-sm text-xs">{d.data.stage}</span>
                  </td>
                  <td className="font-body text-sm px-4 py-2.5 border-b border-operational-border">{d.data.contact}</td>
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
