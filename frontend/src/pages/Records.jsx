import { useState, useEffect, useCallback } from "react";
import api, { apiErr } from "@/lib/api";
import { toast } from "sonner";
import FieldBuilderDialog from "@/components/FieldBuilderDialog";
import RecordDrawer from "@/components/RecordDrawer";
import { Plus, Sparkles, Trash2, Loader2, Columns3, Lightbulb } from "lucide-react";

function fmtCell(field, value) {
  if (value === undefined || value === null || value === "") return "—";
  if (field.type === "number") return Number(value).toLocaleString();
  if (field.type === "boolean") return value ? "yes" : "no";
  return String(value);
}

export default function Records({ objectType, title }) {
  const [fields, setFields] = useState([]);
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showBuilder, setShowBuilder] = useState(false);
  const [openRecord, setOpenRecord] = useState(null);
  const [enriching, setEnriching] = useState({}); // `${recId}:${key}` -> bool
  const [suggesting, setSuggesting] = useState(false);
  const [suggestions, setSuggestions] = useState([]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [f, r] = await Promise.all([
        api.get(`/fields?object_type=${objectType}`),
        api.get(`/records?object_type=${objectType}`),
      ]);
      setFields(f.data);
      setRecords(r.data);
    } catch (err) {
      toast.error(apiErr(err.response?.data?.detail));
    } finally {
      setLoading(false);
    }
  }, [objectType]);

  useEffect(() => {
    load();
  }, [load]);

  const addRecord = async () => {
    const data = {};
    fields.forEach((f) => (data[f.key] = ""));
    try {
      const { data: rec } = await api.post("/records", { object_type: objectType, data });
      setRecords((rs) => [rec, ...rs]);
      setOpenRecord(rec);
    } catch (err) {
      toast.error(apiErr(err.response?.data?.detail));
    }
  };

  const removeRecord = async (id, e) => {
    e.stopPropagation();
    try {
      await api.delete(`/records/${id}`);
      setRecords((rs) => rs.filter((r) => r.id !== id));
      toast.success("Record deleted");
    } catch (err) {
      toast.error(apiErr(err.response?.data?.detail));
    }
  };

  const enrichCell = async (rec, field, e) => {
    e.stopPropagation();
    const key = `${rec.id}:${field.key}`;
    setEnriching((s) => ({ ...s, [key]: true }));
    try {
      const { data } = await api.post(`/records/${rec.id}/enrich`, { field_key: field.key });
      setRecords((rs) =>
        rs.map((r) => (r.id === rec.id ? { ...r, data: { ...r.data, [field.key]: data.value } } : r))
      );
      toast.success(`AI filled ${field.label}`, { description: `via ${data.model}` });
    } catch (err) {
      toast.error(apiErr(err.response?.data?.detail));
    } finally {
      setEnriching((s) => ({ ...s, [key]: false }));
    }
  };

  const deleteField = async (field) => {
    try {
      await api.delete(`/fields/${field.id}`);
      setFields((fs) => fs.filter((f) => f.id !== field.id));
      toast.success(`Removed ${field.label}`);
    } catch (err) {
      toast.error(apiErr(err.response?.data?.detail));
    }
  };

  const runSuggest = async () => {
    setSuggesting(true);
    try {
      const { data } = await api.post("/fields/ai-suggest", { object_type: objectType, prompt: "" });
      setSuggestions(data.fields || []);
    } catch (err) {
      toast.error(apiErr(err.response?.data?.detail));
    } finally {
      setSuggesting(false);
    }
  };

  return (
    <div className="op-zone h-full flex flex-col bg-operational-bg text-operational-text">
      {/* header */}
      <div className="h-16 shrink-0 px-6 flex items-center justify-between border-b border-operational-border">
        <div>
          <h1 className="font-display font-medium text-xl">{title}</h1>
          <span className="font-mono text-xs text-operational-muted">{records.length} rows · {fields.length} fields</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            data-testid="suggest-fields-btn"
            onClick={runSuggest}
            disabled={suggesting}
            className="flex items-center gap-2 bg-operational-surface hover:bg-operational-border border border-operational-border text-operational-text font-body text-sm px-3 py-2 rounded-sm transition-colors"
          >
            {suggesting ? <Loader2 size={15} className="animate-spin" /> : <Lightbulb size={15} className="text-coral" />}
            Suggest fields
          </button>
          <button
            data-testid="add-field-btn"
            onClick={() => setShowBuilder(true)}
            className="flex items-center gap-2 bg-operational-surface hover:bg-operational-border border border-operational-border text-operational-text font-body text-sm px-3 py-2 rounded-sm transition-colors"
          >
            <Columns3 size={15} /> Add field
          </button>
          <button
            data-testid="add-record-btn"
            onClick={addRecord}
            className="flex items-center gap-2 bg-coral hover:bg-coral-hover text-white font-body font-medium text-sm px-3 py-2 rounded-sm transition-colors"
          >
            <Plus size={15} /> New {objectType}
          </button>
        </div>
      </div>

      {suggestions.length > 0 && (
        <div className="px-6 py-3 border-b border-operational-border bg-operational-surface flex items-center gap-3 flex-wrap">
          <span className="font-mono text-[10px] uppercase tracking-wider text-coral">AI suggests</span>
          {suggestions.map((s, i) => (
            <button
              key={i}
              data-testid="suggested-field-chip"
              onClick={async () => {
                await api.post("/fields", { object_type: objectType, label: s.label, type: s.type || "text", ai_generated: true, ai_prompt: s.reason });
                setSuggestions((x) => x.filter((_, idx) => idx !== i));
                load();
                toast.success(`Added ${s.label}`);
              }}
              className="flex items-center gap-1.5 border border-operational-border hover:border-coral text-operational-text font-body text-xs px-2.5 py-1 rounded-sm transition-colors"
              title={s.reason}
            >
              <Plus size={12} /> {s.label} <span className="font-mono text-operational-muted">{s.type}</span>
            </button>
          ))}
          <button onClick={() => setSuggestions([])} className="ml-auto font-body text-xs text-operational-muted hover:text-operational-text">
            dismiss
          </button>
        </div>
      )}

      {/* table */}
      <div className="flex-1 overflow-auto">
        {loading ? (
          <div className="p-6 font-mono text-sm text-operational-muted sm-pulse">loading…</div>
        ) : (
          <table className="w-full border-collapse" data-testid="records-table">
            <thead className="sticky top-0 bg-operational-surface z-10">
              <tr>
                {fields.map((f) => (
                  <th
                    key={f.id}
                    className={`text-left font-body text-[11px] uppercase tracking-wider text-operational-muted font-medium px-4 py-2.5 border-b border-r border-operational-border whitespace-nowrap ${
                      f.ai_generated ? "border-t-2 border-t-coral" : ""
                    }`}
                  >
                    <span className="flex items-center gap-1.5 group">
                      {f.ai_generated && <Sparkles size={11} className="text-coral" />}
                      {f.label}
                      {!f.core && (
                        <button
                          onClick={() => deleteField(f)}
                          className="opacity-0 group-hover:opacity-100 text-operational-muted hover:text-coral transition-opacity"
                          data-testid={`delete-field-${f.key}`}
                        >
                          <Trash2 size={11} />
                        </button>
                      )}
                    </span>
                  </th>
                ))}
                <th className="px-4 py-2.5 border-b border-operational-border w-10" />
              </tr>
            </thead>
            <tbody>
              {records.map((r) => (
                <tr
                  key={r.id}
                  onClick={() => setOpenRecord(r)}
                  className="group hover:bg-operational-surface cursor-pointer transition-colors"
                  data-testid="record-row"
                >
                  {fields.map((f) => {
                    const key = `${r.id}:${f.key}`;
                    const empty = !r.data[f.key] && r.data[f.key] !== 0;
                    const isNum = f.type === "number";
                    return (
                      <td
                        key={f.id}
                        className={`px-4 py-2.5 border-b border-r border-operational-border align-middle ${
                          isNum ? "font-mono text-sm text-right" : "font-body text-sm"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className={empty ? "text-operational-muted" : "text-operational-text"}>
                            {fmtCell(f, r.data[f.key])}
                          </span>
                          {f.ai_generated && empty && (
                            <button
                              data-testid="enrich-cell-btn"
                              onClick={(e) => enrichCell(r, f, e)}
                              disabled={enriching[key]}
                              className="opacity-0 group-hover:opacity-100 shrink-0 text-coral hover:text-coral-hover transition-opacity"
                              title="AI enrich this cell"
                            >
                              {enriching[key] ? <Loader2 size={13} className="animate-spin" /> : <Sparkles size={13} />}
                            </button>
                          )}
                        </div>
                      </td>
                    );
                  })}
                  <td className="px-4 py-2.5 border-b border-operational-border text-center">
                    <button
                      data-testid="delete-record-btn"
                      onClick={(e) => removeRecord(r.id, e)}
                      className="opacity-0 group-hover:opacity-100 text-operational-muted hover:text-coral transition-opacity"
                    >
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
              ))}
              {records.length === 0 && (
                <tr>
                  <td colSpan={fields.length + 1} className="px-6 py-16 text-center font-body text-sm text-operational-muted">
                    No {title.toLowerCase()} yet. Create one to get started.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {showBuilder && (
        <FieldBuilderDialog objectType={objectType} onClose={() => setShowBuilder(false)} onCreated={load} />
      )}
      {openRecord && (
        <RecordDrawer
          record={openRecord}
          fields={fields}
          onClose={() => setOpenRecord(null)}
          onSaved={(updated) => {
            setRecords((rs) => rs.map((r) => (r.id === updated.id ? updated : r)));
          }}
        />
      )}
    </div>
  );
}
