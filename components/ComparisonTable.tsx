import { Check, Minus, X } from "lucide-react";

const ROWS = [
  { f: "来电号码溯源", a: "full", b: "partial", c: "none", d: "partial" },
  { f: "信令跳转检测", a: "full", b: "none", c: "none", d: "none" },
  { f: "AI 声纹识别", a: "full", b: "none", c: "none", d: "none" },
  { f: "话术语义模型", a: "full", b: "none", c: "partial", d: "none" },
  { f: "实时打断", a: "full", b: "none", c: "none", d: "none" },
  { f: "家属同步推送", a: "full", b: "none", c: "none", d: "partial" },
  { f: "端侧推理", a: "full", b: "none", c: "none", d: "none" },
  { f: "毫秒级延迟", a: "full", b: "partial", c: "none", d: "partial" },
];

const HEAD = [
  { key: "a", name: "SENTINEL", tag: "本方案", highlight: true },
  { key: "b", name: "运营商拦截", tag: "号段黑名单" },
  { key: "c", name: "反诈中心", tag: "举报后置" },
  { key: "d", name: "手机厂商", tag: "本机黑名单" },
];

function Cell({ v, highlight }: { v: string; highlight?: boolean }) {
  if (v === "full")
    return (
      <div className="flex items-center gap-2">
        <div
          className="w-7 h-7 rounded-xl flex items-center justify-center shadow-sm"
          style={{
            background: highlight ? "var(--mint)" : "var(--mint-soft)",
            color: highlight ? "#FFFFFF" : "var(--mint-deep)",
          }}
        >
          <Check size={14} strokeWidth={3} />
        </div>
        <span className="font-mono text-[11px] font-bold" style={{ color: highlight ? "var(--mint-deep)" : "var(--ink-soft)" }}>
          全面
        </span>
      </div>
    );
  if (v === "partial")
    return (
      <div className="flex items-center gap-2">
        <div
          className="w-7 h-7 rounded-xl flex items-center justify-center"
          style={{ background: "var(--amber-soft)", color: "var(--amber-deep)" }}
        >
          <Minus size={14} strokeWidth={3} />
        </div>
        <span className="font-mono text-[11px] font-bold text-ink-soft">部分</span>
      </div>
    );
  return (
    <div className="flex items-center gap-2">
      <div
        className="w-7 h-7 rounded-xl flex items-center justify-center"
        style={{ background: "var(--canvas-2)", color: "var(--ink-ghost)" }}
      >
        <X size={14} strokeWidth={3} />
      </div>
      <span className="font-mono text-[11px] font-bold" style={{ color: "var(--ink-ghost)" }}>无</span>
    </div>
  );
}

export default function ComparisonTable() {
  return (
    <section id="compare" className="relative py-24 md:py-32 bg-canvas">
      <div className="max-w-[1400px] mx-auto px-5 md:px-8">
        <div className="mb-14 max-w-3xl">
          <div className="section-idx mb-4"><b>06</b>与现有方案对比</div>
          <h2 className="mega text-[clamp(2.4rem,5.5vw,5rem)]">
            并排摆开，
            <br />
            差距一目了然。
          </h2>
        </div>

        <div className="overflow-x-auto -mx-5 md:mx-0">
          <div className="min-w-[760px] px-5 md:px-0">
            <div className="panel overflow-hidden" style={{ boxShadow: "var(--shadow-lg)" }}>
              <div className="grid grid-cols-[1.4fr_1fr_1fr_1fr_1fr]">
                <div className="p-5 md:p-6 border-b border-border bg-canvas-2 font-mono text-[10px] uppercase tracking-[0.14em] text-ink-soft font-bold">
                  能力 / 方案
                </div>
                {HEAD.map((h) => (
                  <div
                    key={h.key}
                    className={`p-5 md:p-6 border-b border-border border-l border-border/50 ${
                      h.highlight ? "" : "bg-canvas-2"
                    }`}
                    style={h.highlight ? { background: "linear-gradient(135deg, var(--indigo), var(--indigo-deep))" } : {}}
                  >
                    <div
                      className={`font-display text-[18px] md:text-[20px] font-extrabold tracking-tight ${
                        h.highlight ? "text-white" : "text-ink"
                      }`}
                    >
                      {h.name}
                    </div>
                    <div
                      className="mt-1 font-mono text-[10px] uppercase tracking-[0.14em] font-bold"
                      style={{ color: h.highlight ? "rgba(255,255,255,0.75)" : "var(--ink-soft)" }}
                    >
                      {h.tag}
                    </div>
                  </div>
                ))}

                {ROWS.map((r, i) => (
                  <div key={r.f} className="contents group">
                    <div
                      className={`p-5 border-b border-border/60 font-display text-[15px] font-bold group-hover:bg-canvas-2/60 transition-colors ${
                        i === ROWS.length - 1 ? "border-b-0" : ""
                      }`}
                    >
                      {r.f}
                    </div>
                    {(["a", "b", "c", "d"] as const).map((k) => (
                      <div
                        key={k}
                        className={`p-5 border-b border-border/60 border-l border-border/30 group-hover:bg-canvas-2/60 transition-colors ${
                          k === "a" ? "" : ""
                        } ${i === ROWS.length - 1 ? "border-b-0" : ""}`}
                        style={k === "a" ? { background: "color-mix(in srgb, var(--indigo-soft) 45%, transparent)" } : {}}
                      >
                        <Cell v={(r as any)[k]} highlight={k === "a"} />
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-2 font-mono text-[11px] text-ink-soft font-bold">
          <span className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full" style={{ background: "var(--mint)" }} />
            全面 · 端到端实现
          </span>
          <span className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full" style={{ background: "var(--amber)" }} />
            部分 · 覆盖不完整或事后
          </span>
          <span className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full" style={{ background: "var(--ink-ghost)" }} />
            无 · 尚不具备
          </span>
        </div>
      </div>
    </section>
  );
}
