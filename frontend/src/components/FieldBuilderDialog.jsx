import { useState } from "react";
import api, { apiErr } from "@/lib/api";
import { toast } from "sonner";
import { Sparkles, Plus, X, Loader2, Check } from "lucide-react";

const TYPES = ["text", "number", "email", "date", "select", "url", "boolean"];

export default function FieldBuilderDialog({ objectType, onClose, onCreated }) {
  const [tab, setTab] = useState("ai"); // ai | manual
  const [prompt, setPrompt] = useState("");
  const [proposed, setProposed] = useState([]);
  const [model, setModel] = useState("");
  const [thinking, setThinking] = useState(false);
  const [saving, setSaving] = useState(false);

  // manual
  const [label, setLabel] = useState("");
  const [type, setType] = useState("text");
  const [options, setOptions] = useState("");

  const runAI = async () => {
    if (!prompt.trim()) return;
    setThinking(true);
    setProposed([]);
    try {
      const { data } = await api.post("/fields/ai-build", { object_type: objectType, prompt });
      setProposed(data.fields.map((f) => ({ ...f, options: (f.options || []).join(", ") })));
      setModel(data.model);
    } catch (err) {
      toast.error(apiErr(err.response?.data?.detail));
    } finally {
      setThinking(false);
    }
  };

  const editProposed = (i, k, v) => {
    setProposed((p) => p.map((f, idx) => (idx === i ? { ...f, [k]: v } : f)));
  };
  const removeProposed = (i) => setProposed((p) => p.filter((_, idx) => idx !== i));

  const commitProposed = async () => {
    setSaving(true);
    try {
      for (const f of proposed) {
        await api.post("/fields", {
          object_type: objectType,
          label: f.label,
          type: f.type,
          options: f.type === "select" ? f.options.split(",").map((s) => s.trim()).filter(Boolean) : [],
          ai_generated: true,
          ai_prompt: f.reason || prompt,
        });
      }
      toast.success(`Added ${proposed.length} AI field${proposed.length > 1 ? "s" : ""}`);
      onCreated();
      onClose();
    } catch (err) {
      toast.error(apiErr(err.response?.data?.detail));
    } finally {
      setSaving(false);
    }
  };

  const commitManual = async () => {
    if (!label.trim()) return;
    setSaving(true);
    try {
      await api.post("/fields", {
        object_type: objectType,
        label,
        type,
        options: type === "select" ? options.split(",").map((s) => s.trim()).filter(Boolean) : [],
        ai_generated: false,
      });
      toast.success(`Added field "${label}"`);
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
      <div
        className="w-full max-w-lg bg-quiet-bg border border-quiet-border rounded-sm sm-fade-up"
        onClick={(e) => e.stopPropagation()}
        data-testid="field-builder-dialog"
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-quiet-border">
          <h3 className="font-display font-medium text-lg text-quiet-text">Add field · {objectType}</h3>
          <button onClick={onClose} className="text-quiet-muted hover:text-quiet-text" data-testid="field-builder-close">
            <X size={18} />
          </button>
        </div>

        <div className="flex border-b border-quiet-border">
          <button
            data-testid="tab-ai"
            onClick={() => setTab("ai")}
            className={`flex items-center gap-2 px-5 py-3 font-body text-sm transition-colors ${
              tab === "ai" ? "text-quiet-text border-b-2 border-coral" : "text-quiet-muted"
            }`}
          >
            <Sparkles size={14} className="text-coral" /> Use AI
          </button>
          <button
            data-testid="tab-manual"
            onClick={() => setTab("manual")}
            className={`px-5 py-3 font-body text-sm transition-colors ${
              tab === "manual" ? "text-quiet-text border-b-2 border-coral" : "text-quiet-muted"
            }`}
          >
            Manual
          </button>
        </div>

        <div className="p-5">
          {tab === "ai" ? (
            <>
              <label className="block font-body text-xs uppercase tracking-wider text-quiet-muted mb-2">
                Describe what to track
              </label>
              <div className="flex gap-2 mb-4">
                <input
                  data-testid="ai-field-prompt"
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && runAI()}
                  placeholder="e.g. track renewal date and plan tier"
                  className="flex-1 bg-quiet-surface border border-quiet-border text-quiet-text font-body text-sm px-3 py-2.5 rounded-sm focus:outline-none focus:ring-1 focus:ring-coral"
                />
                <button
                  data-testid="ai-field-generate"
                  onClick={runAI}
                  disabled={thinking || !prompt.trim()}
                  className="shrink-0 bg-coral hover:bg-coral-hover disabled:opacity-50 text-white font-body font-medium text-sm px-4 rounded-sm transition-colors flex items-center gap-2"
                >
                  {thinking ? <Loader2 size={15} className="animate-spin" /> : <Sparkles size={15} />}
                  Generate
                </button>
              </div>

              {model && (
                <div className="font-mono text-[10px] uppercase tracking-wider text-quiet-muted mb-3">
                  routed to {model} · edit before committing
                </div>
              )}

              <div className="space-y-3 max-h-72 overflow-y-auto">
                {proposed.map((f, i) => (
                  <div key={i} className="border border-quiet-border rounded-sm p-3 relative" data-testid="proposed-field">
                    <button
                      onClick={() => removeProposed(i)}
                      className="absolute top-2 right-2 text-quiet-muted hover:text-coral"
                    >
                      <X size={14} />
                    </button>
                    <div className="grid grid-cols-2 gap-2 mb-2">
                      <input
                        value={f.label}
                        onChange={(e) => editProposed(i, "label", e.target.value)}
                        className="bg-quiet-surface border border-quiet-border text-quiet-text font-body text-sm px-2 py-1.5 rounded-sm focus:outline-none focus:ring-1 focus:ring-coral"
                      />
                      <select
                        value={f.type}
                        onChange={(e) => editProposed(i, "type", e.target.value)}
                        className="bg-quiet-surface border border-quiet-border text-quiet-text font-mono text-xs px-2 py-1.5 rounded-sm focus:outline-none focus:ring-1 focus:ring-coral"
                      >
                        {TYPES.map((t) => (
                          <option key={t} value={t}>{t}</option>
                        ))}
                      </select>
                    </div>
                    {f.type === "select" && (
                      <input
                        value={f.options}
                        onChange={(e) => editProposed(i, "options", e.target.value)}
                        placeholder="comma,separated,options"
                        className="w-full bg-quiet-surface border border-quiet-border text-quiet-text font-body text-xs px-2 py-1.5 rounded-sm mb-2 focus:outline-none focus:ring-1 focus:ring-coral"
                      />
                    )}
                    {f.reason && <p className="font-body text-xs text-quiet-muted">{f.reason}</p>}
                  </div>
                ))}
              </div>

              {proposed.length > 0 && (
                <button
                  data-testid="commit-ai-fields"
                  onClick={commitProposed}
                  disabled={saving}
                  className="mt-4 w-full bg-coral hover:bg-coral-hover disabled:opacity-60 text-white font-body font-medium text-sm px-4 py-2.5 rounded-sm transition-colors flex items-center justify-center gap-2"
                >
                  {saving ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} />}
                  Commit {proposed.length} field{proposed.length > 1 ? "s" : ""}
                </button>
              )}
            </>
          ) : (
            <>
              <label className="block font-body text-xs uppercase tracking-wider text-quiet-muted mb-2">Label</label>
              <input
                data-testid="manual-field-label"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                className="w-full bg-quiet-surface border border-quiet-border text-quiet-text font-body text-sm px-3 py-2.5 mb-4 rounded-sm focus:outline-none focus:ring-1 focus:ring-coral"
              />
              <label className="block font-body text-xs uppercase tracking-wider text-quiet-muted mb-2">Type</label>
              <select
                data-testid="manual-field-type"
                value={type}
                onChange={(e) => setType(e.target.value)}
                className="w-full bg-quiet-surface border border-quiet-border text-quiet-text font-mono text-sm px-3 py-2.5 mb-4 rounded-sm focus:outline-none focus:ring-1 focus:ring-coral"
              >
                {TYPES.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
              {type === "select" && (
                <>
                  <label className="block font-body text-xs uppercase tracking-wider text-quiet-muted mb-2">
                    Options (comma separated)
                  </label>
                  <input
                    data-testid="manual-field-options"
                    value={options}
                    onChange={(e) => setOptions(e.target.value)}
                    className="w-full bg-quiet-surface border border-quiet-border text-quiet-text font-body text-sm px-3 py-2.5 mb-4 rounded-sm focus:outline-none focus:ring-1 focus:ring-coral"
                  />
                </>
              )}
              <button
                data-testid="commit-manual-field"
                onClick={commitManual}
                disabled={saving || !label.trim()}
                className="w-full bg-coral hover:bg-coral-hover disabled:opacity-60 text-white font-body font-medium text-sm px-4 py-2.5 rounded-sm transition-colors flex items-center justify-center gap-2"
              >
                <Plus size={15} /> Add field
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
