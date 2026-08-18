import { useState, useRef, useEffect } from "react";
import { API } from "@/lib/api";
import { Sparkles, ArrowUp, X } from "lucide-react";

const SUGGESTIONS = [
  "What's my total pipeline value?",
  "Which deals are most at risk?",
  "Summarize my qualified contacts",
];

export default function AIChatPanel({ onClose }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const scrollRef = useRef(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, streaming]);

  const send = async (text) => {
    const q = (text ?? input).trim();
    if (!q || streaming) return;
    setInput("");
    setMessages((m) => [...m, { role: "user", content: q }, { role: "assistant", content: "" }]);
    setStreaming(true);
    try {
      const resp = await fetch(`${API}/chat`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: q }),
      });
      if (!resp.ok || !resp.body) throw new Error("chat failed");
      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        setMessages((m) => {
          const copy = [...m];
          copy[copy.length - 1] = { role: "assistant", content: copy[copy.length - 1].content + chunk };
          return copy;
        });
      }
    } catch {
      setMessages((m) => {
        const copy = [...m];
        copy[copy.length - 1] = { role: "assistant", content: "Sorry — I couldn't reach the pipeline just now." };
        return copy;
      });
    } finally {
      setStreaming(false);
    }
  };

  return (
    <div className="flex flex-col h-full" data-testid="ai-chat-panel">
      <div className="px-5 py-4 border-b border-quiet-border flex items-center gap-2 shrink-0">
        <Sparkles size={16} className="text-coral" />
        <h3 className="font-display font-medium text-base">Ask your pipeline anything</h3>
        {onClose && (
          <button
            onClick={onClose}
            data-testid="copilot-close"
            className="ml-auto text-quiet-muted hover:text-quiet-text transition-colors"
            title="Close"
          >
            <X size={18} />
          </button>
        )}
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
        {messages.length === 0 && (
          <div className="space-y-3">
            <p className="font-body text-sm text-quiet-muted leading-relaxed">
              I read your live pipeline. Ask about deals, contacts, or what to do next.
            </p>
            <div className="space-y-2">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  data-testid="chat-suggestion"
                  onClick={() => send(s)}
                  className="block w-full text-left font-body text-sm text-quiet-text bg-quiet-surface hover:bg-quiet-border border border-quiet-border px-3 py-2 rounded-sm transition-colors"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((m, i) =>
          m.role === "user" ? (
            <div key={i} className="flex justify-end">
              <div className="max-w-[85%] bg-quiet-surface border border-quiet-border text-quiet-text font-body text-sm px-3 py-2 rounded-sm rounded-tr-none">
                {m.content}
              </div>
            </div>
          ) : (
            <div key={i} className="max-w-[92%] sm-fade-up">
              <div className="font-mono text-[10px] uppercase tracking-wider text-coral mb-1">SalesMind</div>
              <div className="font-body text-sm text-quiet-text whitespace-pre-wrap leading-relaxed">
                {m.content}
                {streaming && i === messages.length - 1 && (
                  <span className="inline-block w-1.5 h-4 bg-coral ml-0.5 align-middle sm-pulse" />
                )}
              </div>
            </div>
          )
        )}
      </div>

      <div className="p-3 border-t border-quiet-border">
        <div className="flex items-end gap-2 bg-quiet-surface border border-quiet-border rounded-sm focus-within:ring-1 focus-within:ring-coral transition-colors">
          <textarea
            data-testid="chat-input"
            rows={1}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send();
              }
            }}
            placeholder="Ask about your pipeline…"
            className="flex-1 bg-transparent resize-none font-body text-sm px-3 py-2.5 focus:outline-none max-h-32"
          />
          <button
            data-testid="chat-send"
            onClick={() => send()}
            disabled={streaming || !input.trim()}
            className="m-1.5 shrink-0 w-8 h-8 flex items-center justify-center bg-coral hover:bg-coral-hover disabled:opacity-40 text-white rounded-sm transition-colors"
          >
            <ArrowUp size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
