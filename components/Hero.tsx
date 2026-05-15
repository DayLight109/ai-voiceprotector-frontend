"use client";
import { useEffect, useState } from "react";
import { ArrowUpRight, Play, Shield, Radio, Waves, ScanLine } from "lucide-react";

const STATIC_BARS = Array.from({ length: 44 }, (_, i) => 0.35 + ((i * 37) % 13) / 26);

export default function Hero() {
  const [mounted, setMounted] = useState(false);
  const [tick, setTick] = useState(0);
  useEffect(() => {
    setMounted(true);
    const id = setInterval(() => setTick((t) => (t + 1) % 60), 100);
    return () => clearInterval(id);
  }, []);

  const bars = mounted
    ? Array.from({ length: 44 }, (_, i) => {
        const base = Math.abs(Math.sin((i + tick / 3) * 0.42)) * 0.7;
        const jitter = Math.abs(Math.sin((i * 1.9 + tick) * 0.21)) * 0.35;
        return Math.min(1, base + jitter + 0.12);
      })
    : STATIC_BARS;

  return (
    <section className="relative overflow-hidden bg-canvas">
      <div className="absolute inset-0 -z-10">
        <div className="absolute inset-0 dot-grid opacity-50" />
        <div className="absolute -top-24 -right-24 w-[48vw] h-[48vw] rounded-full blob-indigo opacity-70" />
        <div className="absolute bottom-0 left-1/4 w-[32vw] h-[32vw] rounded-full blob-coral opacity-40" />
        <div className="absolute top-1/3 left-0 w-[24vw] h-[24vw] rounded-full blob-mint opacity-40" />
      </div>

      <div className="max-w-[1400px] mx-auto px-5 md:px-8 pt-14 md:pt-20 pb-20 md:pb-28">
        <div className="flex flex-wrap items-center gap-3 mb-8 rise">
          <span className="tag-chip" data-live="true">2026.Q2 · 公开测试</span>
          <span className="tag-chip" data-tone="indigo">端侧推理 · 零上云</span>
          <span className="tag-chip" data-tone="mint">延迟 &lt; 120ms</span>
        </div>

        <div className="grid grid-cols-12 gap-6 md:gap-10 items-end">
          <div className="col-span-12 lg:col-span-7">
            <div className="section-idx mb-6 rise" style={{ animationDelay: "0.05s" }}>
              <b>01</b>真相从不等待
            </div>
            <h1 className="mega text-[clamp(3.2rem,9vw,8.5rem)] rise" style={{ animationDelay: "0.1s" }}>
              当<span className="mega-italic" style={{ color: "var(--coral)" }}> 3 秒 </span>
              声音
              <br />
              能骗走
              <span className="underline-soft mx-2">一生积蓄</span>
            </h1>

            <p
              className="mt-8 max-w-[56ch] text-[17px] md:text-[18px] leading-[1.7] text-ink-2 rise font-medium"
              style={{ animationDelay: "0.25s" }}
            >
              SENTINEL 在通话接通前的毫秒里，完成来电溯源、声纹取证与话术语义三重比对。
              合成声音被当场识破，诈骗脚本被实时打断——
              <span className="font-bold text-ink">让每一通陌生来电，都先经过算法。</span>
            </p>

            <div className="mt-10 flex flex-wrap items-center gap-4 rise" style={{ animationDelay: "0.35s" }}>
              <a href="#simulator" className="btn-indigo">
                <Play size={14} fill="currentColor" />
                观看 12.5 秒实战
                <ArrowUpRight size={16} />
              </a>
              <a href="#defense" className="btn-ghost">
                了解三层引擎
              </a>
            </div>

            <div className="mt-14 grid grid-cols-3 gap-4 md:gap-6 max-w-xl rise" style={{ animationDelay: "0.5s" }}>
              {[
                { k: "3.6 亿", v: "日均拦截", c: "var(--indigo)" },
                { k: "<120ms", v: "判决延迟", c: "var(--mint-deep)" },
                { k: "99.2%", v: "召回率", c: "var(--coral)" },
              ].map((s) => (
                <div key={s.v} className="relative pl-4">
                  <span className="absolute left-0 top-1 bottom-1 w-1 rounded-full" style={{ background: s.c }} />
                  <div className="numplate text-[26px] md:text-[32px] leading-none">{s.k}</div>
                  <div className="font-body text-[12px] font-semibold text-ink-soft mt-1.5">
                    {s.v}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="col-span-12 lg:col-span-5 rise" style={{ animationDelay: "0.2s" }}>
            <div className="relative">
              <div className="absolute -inset-3 rounded-[32px] blob-indigo opacity-30 -z-10" />
              <div className="panel p-5 md:p-6 space-y-5 shadow-lg" style={{ boxShadow: "var(--shadow-xl)" }}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="signal-dot text-coral" />
                    <span className="font-mono text-[11px] font-bold uppercase tracking-[0.14em] text-ink">
                      LIVE · 实时审计
                    </span>
                  </div>
                  <span className="pill pill-coral">BLOCK</span>
                </div>

                <div>
                  <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-soft">
                    CALL ID · 0x4F82A1
                  </div>
                  <div className="mt-1 font-display text-[26px] font-extrabold tracking-tight">
                    +86 138 ···· 4921
                  </div>
                  <div className="mt-1 text-[13px] text-ink-soft font-medium">
                    显示归属：北京 · 联通 → 实际信令：柬埔寨 · 金边
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-canvas-2 border border-border">
                  <div className="flex items-center justify-between mb-3">
                    <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-soft">
                      声纹频谱 · 合成概率
                    </span>
                    <span className="pill pill-coral">0.94 SYNTH</span>
                  </div>
                  <div className="flex items-end gap-[3px] h-16">
                    {bars.map((h, i) => (
                      <div
                        key={i}
                        className="flex-1 rounded-full transition-[height] duration-150"
                        style={{
                          height: `${(h * 100).toFixed(2)}%`,
                          background:
                            i < 14 ? "var(--mint)" :
                            i < 28 ? "var(--amber)" : "var(--coral)",
                        }}
                      />
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  {[
                    { icon: Radio, label: "溯源", val: "跳转", tone: "coral-soft", color: "var(--coral-deep)" },
                    { icon: Waves, label: "声纹", val: "SYNTH", tone: "coral-soft", color: "var(--coral-deep)" },
                    { icon: ScanLine, label: "话术", val: "转账", tone: "amber-soft", color: "var(--amber-deep)" },
                  ].map((l) => (
                    <div
                      key={l.label}
                      className="p-3 rounded-2xl"
                      style={{ background: `var(--${l.tone})` }}
                    >
                      <l.icon size={14} style={{ color: l.color }} />
                      <div className="font-mono text-[10px] uppercase tracking-[0.12em] mt-2 opacity-75" style={{ color: l.color }}>
                        {l.label}
                      </div>
                      <div className="font-display text-[13px] font-extrabold mt-0.5" style={{ color: l.color }}>
                        {l.val}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex items-center gap-3 pt-3 border-t border-border">
                  <Shield size={16} style={{ color: "var(--mint-deep)" }} />
                  <div className="text-[12px] text-ink-soft font-medium">
                    已推送通知至紧急联系人 · 证据已本地加密留存
                  </div>
                </div>
              </div>

              <div
                className="absolute -bottom-4 -left-4 px-3 py-2 rounded-2xl shadow-lg rotate-[-3deg] font-mono text-[11px] font-bold uppercase tracking-[0.14em]"
                style={{ background: "var(--mint)", color: "var(--deep)" }}
              >
                耗时 · 94ms
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
