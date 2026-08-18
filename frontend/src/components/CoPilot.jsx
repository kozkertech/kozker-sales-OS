import { useState } from "react";
import AIChatPanel from "@/components/AIChatPanel";
import { Sparkles } from "lucide-react";

export default function CoPilot() {
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* Dim backdrop when open */}
      {open && (
        <div
          className="fixed inset-0 bg-black/20 z-40 transition-opacity duration-200"
          onClick={() => setOpen(false)}
          data-testid="copilot-backdrop"
        />
      )}

      {/* Slide-in panel — always mounted so it can animate */}
      <div
        className={`fixed top-0 right-0 h-screen w-full sm:w-[400px] z-50 bg-white border-l border-quiet-border shadow-[0_0_40px_rgba(0,0,0,0.12)] flex flex-col transform transition-transform duration-300 ease-out ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
        data-testid="copilot-panel"
        aria-hidden={!open}
      >
        <AIChatPanel onClose={() => setOpen(false)} />
      </div>

      {/* Floating trigger */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          data-testid="copilot-trigger"
          title="Ask your pipeline"
          className="fixed bottom-8 right-8 w-14 h-14 z-40 bg-coral hover:bg-coral-hover text-white rounded-full shadow-[0_8px_24px_rgba(240,93,72,0.35)] flex items-center justify-center transition-transform duration-150 hover:scale-105 active:scale-95"
        >
          <Sparkles size={22} />
        </button>
      )}
    </>
  );
}
