"use client";
import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { CheckCircle2, AlertCircle, Info, X } from "lucide-react";

type Tone = "success" | "error" | "info";
type Item = { id: string; tone: Tone; title: string; desc?: string };

const Ctx = createContext<(t: Tone, title: string, desc?: string) => void>(() => {});

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<Item[]>([]);
  const push = useCallback((tone: Tone, title: string, desc?: string) => {
    const id = Math.random().toString(36).slice(2, 8);
    setItems((p) => [...p, { id, tone, title, desc }]);
    setTimeout(() => setItems((p) => p.filter((x) => x.id !== id)), 3000);
  }, []);

  return (
    <Ctx.Provider value={push}>
      {children}
      <div className="fixed top-6 right-6 z-[9999] flex flex-col gap-2 pointer-events-none">
        {items.map((it) => {
          const palette =
            it.tone === "success"
              ? { bg: "var(--mint-soft)", fg: "var(--mint-deep)", Icon: CheckCircle2 }
              : it.tone === "error"
              ? { bg: "var(--coral-soft)", fg: "var(--coral-deep)", Icon: AlertCircle }
              : { bg: "var(--indigo-soft)", fg: "var(--indigo-deep)", Icon: Info };
          const Icon = palette.Icon;
          return (
            <div
              key={it.id}
              className="pointer-events-auto rounded-2xl px-4 py-3 shadow-lg border border-border min-w-[280px] max-w-[360px] flex items-start gap-3 bg-surface rise"
            >
              <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0" style={{ background: palette.bg, color: palette.fg }}>
                <Icon size={15} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-display text-[calc(13px*var(--fz))] font-extrabold">{it.title}</div>
                {it.desc && <div className="mt-0.5 text-[calc(12px*var(--fz))] text-ink-soft font-medium">{it.desc}</div>}
              </div>
              <button onClick={() => setItems((p) => p.filter((x) => x.id !== it.id))} className="text-ink-soft hover:text-ink">
                <X size={14} />
              </button>
            </div>
          );
        })}
      </div>
    </Ctx.Provider>
  );
}

export function useToast() {
  return useContext(Ctx);
}
