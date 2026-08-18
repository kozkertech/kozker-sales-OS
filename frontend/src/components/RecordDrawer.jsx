import { useState, useEffect } from "react";
import api, { apiErr } from "@/lib/api";
import { toast } from "sonner";
import { X, Sparkles, Loader2, Clock } from "lucide-react";

function Field({ field, value, onChange }) {
  const base =
    "w-full bg-operational-surface border border-operational-border text-operational-text px-3 py-2 rounded-sm focus:outline-none focus:ring-1 focus:ring-coral transition-colors";
  if (field.type === "select") {
    return (
      <select className={`${base} font-body text-sm`} value={value || ""} onChange={(e) => onChange(e.target.value)} data-testid={`field-${field.key}`}>
        <option value="">—</option>
        {(field.options || []).map((o) => (
          <option key={o} value={o}>{o}</option>
        ))}
      </select>
    );
  }
  if (field.type === "boolean") {
    return (
      <select className={`${base} font-body text-sm`} value={value || ""} onChange={(e) => onChange(e.target.value)} data-testid={`field-${field.key}`}>
        <option value="">—</option>
        <option value="true">yes</option>
        <option value="false">no</option>
      </select>
    );
  }
  const isNum = field.type === "number";
  return (
    <input
      data-testid={`field-${field.key}`}
      type={field.type === "date" ? "date" : field.type === "number" ? "number" : "text"}
      className={`${base} ${isNum ? "font-mono" : "font-body"} text-sm`}
      value={value ?? ""}
      onChange={(e) => onChange(e.target.value)}
    />
  );
}

export default function RecordDrawer({ record, fields, onClose, onSaved }) {
  const [data, setData] = useState(record.data);
  const [saving, setSaving] = useState(false);
  const [activities, setActivities] = useState([]);
  const [note, setNote] = useState("");
  const [enriching, setEnriching] = useState({});

  useEffect(() => {
    api.get(`/records/${record.id}/activities`).then((r) => setActivities(r.data)).catch(() => {});
  }, [record.id]);

  const save = async () => {
    setSaving(true);
    try {
      const { data: updated } = await api.put(`/records/${record.id}`, { data });
      onSaved(updated);
      toast.success("Saved");
      onClose();
    } catch (err) {
      toast.error(apiErr(err.response?.data?.detail));
    } finally {
      setSaving(false);
    }
  };

  const addNote = async () => {
    if (!note.trim()) return;
    try {
      const { data: a } = await api.post("/activities", { record_id: record.id, type: "note", content: note });
      setActivities((xs) => [a, ...xs]);
      setNote("");
    } catch (err) {
      toast.error(apiErr(err.response?.data?.detail));
    }
  };

  const enrich = async (field) => {
    setEnriching((s) => ({ ...s, [field.key]: true }));
    try {
      const { data: res } = await api.post(`/records/${record.id}/enrich`, { field_key: field.key });
      setData((d) => ({ ...d, [field.key]: res.value }));
      toast.success(`AI filled ${field.label}`, { description: `via ${res.model}` });
    } catch (err) {
      toast.error(apiErr(err.response?.data?.detail));
    } finally {
      setEnriching((s) => ({ ...s, [field.key]: false }));
    }
  };

  const heading = data.name || data.title || "Record";

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/50" onClick={onClose}>
      <div
        className="op-zone w-full max-w-md bg-operational-bg border-l border-operational-border h-full flex flex-col sm-fade-up"
        onClick={(e) => e.stopPropagation()}
        data-testid="record-drawer"
      >
        <div className="h-16 shrink-0 px-5 flex items-center justify-between border-b border-operational-border">
          <h3 className="font-display font-medium text-lg text-operational-text truncate">{heading}</h3>
          <button onClick={onClose} className="text-operational-muted hover:text-operational-text" data-testid="drawer-close">
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {fields.map((f) => (
            <div key={f.id}>
              <label className="flex items-center gap-1.5 font-body text-xs uppercase tracking-wider text-operational-muted mb-1.5">
                {f.ai_generated && <Sparkles size={11} className="text-coral" />}
                {f.label}
                {f.ai_generated && (
                  <button
                    onClick={() => enrich(f)}
                    disabled={enriching[f.key]}
                    className="ml-auto text-coral hover:text-coral-hover normal-case tracking-normal flex items-center gap-1 text-[11px]"
                    data-testid={`drawer-enrich-${f.key}`}
                  >
                    {enriching[f.key] ? <Loader2 size={11} className="animate-spin" /> : <Sparkles size={11} />}
                    enrich
                  </button>
                )}
              </label>
              <Field field={f} value={data[f.key]} onChange={(v) => setData((d) => ({ ...d, [f.key]: v }))} />
            </div>
          ))}

          <div className="pt-4 border-t border-operational-border">
            <div className="flex items-center gap-2 font-body text-xs uppercase tracking-wider text-operational-muted mb-3">
              <Clock size={12} /> Activity
            </div>
            <div className="flex gap-2 mb-4">
              <input
                data-testid="note-input"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addNote()}
                placeholder="Add a note…"
                className="flex-1 bg-operational-surface border border-operational-border text-operational-text font-body text-sm px-3 py-2 rounded-sm focus:outline-none focus:ring-1 focus:ring-coral"
              />
              <button onClick={addNote} data-testid="add-note-btn" className="bg-operational-surface hover:bg-operational-border border border-operational-border text-operational-text font-body text-sm px-3 rounded-sm transition-colors">
                Add
              </button>
            </div>
            <div className="space-y-3">
              {activities.map((a) => (
                <div key={a.id} className="flex gap-2.5">
                  <span className={`mt-1.5 w-1.5 h-1.5 rounded-sm shrink-0 ${a.type === "ai" ? "bg-coral" : "bg-operational-muted"}`} />
                  <div>
                    <p className="font-body text-sm text-operational-text">{a.content}</p>
                    <p className="font-mono text-[10px] text-operational-muted">
                      {new Date(a.created_at).toLocaleString()}
                    </p>
                  </div>
                </div>
              ))}
              {activities.length === 0 && <p className="font-body text-sm text-operational-muted">No activity yet.</p>}
            </div>
          </div>
        </div>

        <div className="p-4 border-t border-operational-border">
          <button
            data-testid="save-record-btn"
            onClick={save}
            disabled={saving}
            className="w-full bg-coral hover:bg-coral-hover disabled:opacity-60 text-white font-body font-medium text-sm px-4 py-2.5 rounded-sm transition-colors"
          >
            {saving ? "Saving…" : "Save changes"}
          </button>
        </div>
      </div>
    </div>
  );
}
