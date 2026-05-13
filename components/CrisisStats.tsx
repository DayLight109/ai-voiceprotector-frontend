"use client";
import { useEffect, useRef, useState } from "react";
import { TrendingUp, Users, Clock, Brain } from "lucide-react";

function CountUp({ to, suffix = "", duration = 1400 }: { to: number; suffix?: string; duration?: number }) {
  const [val, setVal] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const started = useRef(false);
  useEffect(() => {
    if (!ref.current) return;
    const obs = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !started.current) {
          started.current = true;
          const start = performance.now();
          const tick = (t: number) => {
            const p = Math.min(1, (t - start) / duration);
            const eased = 1 - Math.pow(1 - p, 3);
            setVal(to * eased);
            if (p < 1) requestAnimationFrame(tick);
          };
          requestAnimationFrame(tick);
        }
      },
      { threshold: 0.3 }
    );
    obs.observe(ref.current);
    return () => obs.disconnect();
  }, [to, duration]);
  return (
    <span ref={ref}>
      {val >= 100 ? Math.round(val).toLocaleString() : val.toFixed(1)}
      {suffix}
    </span>
  );
}

const BIG = [
  { n: 36, suffix: " 亿", unit: "次", label: "全年拦截诈骗电话", icon: Clock, tint: "var(--indigo)", soft: "var(--indigo-soft)" },
  { n: 25.8, suffix: " 万", unit: "起", label: "侦破电信网络诈骗案件", icon: TrendingUp, tint: "var(--coral-deep)", soft: "var(--coral-soft)" },
  { n: 2170.7, suffix: " 万", unit: "元", label: "紧急止付冻结资金", icon: Users, tint: "var(--mint-deep)", soft: "var(--mint-soft)" },
  { n: 674.7, suffix: " 万", unit: "人", label: "面对面劝阻避免损失", icon: Brain, tint: "var(--amber-deep)", soft: "var(--amber-soft)" },
];

const AI_FACTS = [
  { k: "3 秒", v: "克隆所需音频", c: "var(--coral-soft)", t: "var(--coral-deep)" },
  { k: "85%", v: "声纹相似度", c: "var(--amber-soft)", t: "var(--amber-deep)" },
  { k: "70%", v: "无法辨别 AI", c: "var(--indigo-soft)", t: "var(--indigo-deep)" },
];

export default function CrisisStats() {
  return (
    <section id="crisis" className="relative py-24 md:py-32 bg-canvas">
      <div className="max-w-[1400px] mx-auto px-5 md:px-8">
        <div className="flex items-baseline justify-between mb-14 flex-wrap gap-4">
          <div>
            <div className="section-idx mb-4"><b>02</b>正在发生的事</div>
            <h2 className="mega text-[clamp(2.4rem,5.5vw,5rem)] max-w-[20ch]">
              一年，<span className="mega-italic" style={{ color: "var(--coral)" }}>36 亿</span> 次
              <br />
              伪装的陌生来电。
            </h2>
          </div>
          <div className="font-mono text-[11px] text-ink-soft max-w-sm font-medium">
            数据来源：公安部刑侦局 · 国家反诈大数据平台 · 2025 年度
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {BIG.map((s, i) => (
            <div
              key={s.label}
              className="panel panel-lift p-6 md:p-7 relative overflow-hidden"
            >
              <div
                className="absolute -top-8 -right-8 w-28 h-28 rounded-full opacity-60"
                style={{ background: s.soft }}
              />
              <div className="relative flex items-start justify-between mb-6">
                <div
                  className="w-11 h-11 rounded-2xl flex items-center justify-center"
                  style={{ background: s.soft, color: s.tint }}
                >
                  <s.icon size={20} />
                </div>
                <span className="font-mono text-[11px] font-bold text-ink-soft">0{i + 1}</span>
              </div>
              <div className="relative mt-5 numplate text-[clamp(2.2rem,4.5vw,3.4rem)] leading-none">
                <CountUp to={s.n} suffix={s.suffix} />
                <span className="text-[0.4em] ml-2 font-body font-bold text-ink-soft">{s.unit}</span>
              </div>
              <div className="relative mt-3 text-[13px] font-semibold text-ink-soft">
                {s.label}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-20 grid grid-cols-12 gap-6 md:gap-10">
          <div className="col-span-12 lg:col-span-5">
            <span className="tag-chip" data-tone="coral">AI 冲击 · 新威胁</span>
            <h3 className="mt-5 mega text-[clamp(1.75rem,3.5vw,2.5rem)]">
              声音不再是
              <br />
              <span className="underline-soft">身份的凭证</span>。
            </h3>
            <p className="mt-6 text-[15px] leading-[1.75] text-ink-2 font-medium max-w-[44ch]">
              深度伪造工具把&ldquo;我是你孙子&rdquo;变成可批量生产的流水线。
              熟悉的声线、哽咽的语气、甚至具体的称谓——都可以由一段 3 秒的抖音片段生成。
            </p>
          </div>

          <div className="col-span-12 lg:col-span-7 space-y-4">
            <div className="grid grid-cols-3 gap-3">
              {AI_FACTS.map((f) => (
                <div
                  key={f.v}
                  className="p-5 md:p-6 rounded-2xl relative overflow-hidden"
                  style={{ background: f.c }}
                >
                  <div className="numplate text-[clamp(1.75rem,4vw,3rem)] leading-none" style={{ color: f.t }}>
                    {f.k}
                  </div>
                  <div className="mt-3 font-body text-[12px] font-bold" style={{ color: f.t }}>
                    {f.v}
                  </div>
                </div>
              ))}
            </div>

            <div className="panel p-5">
              <div className="flex items-end justify-between mb-4">
                <div>
                  <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-soft font-bold">
                    AI 诈骗涉案金额
                  </div>
                  <div className="font-display text-[20px] font-extrabold mt-1">
                    2020 → 2024 · CAGR <span style={{ color: "var(--coral-deep)" }}>+1928.8%</span>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-soft font-bold">
                    2024 H1
                  </div>
                  <div className="font-display text-[20px] font-extrabold mt-1">1.85 亿</div>
                </div>
              </div>
              <div className="h-24 flex items-end gap-2">
                {[4, 8, 18, 45, 100].map((h, i) => (
                  <div key={i} className="flex-1 flex flex-col items-center gap-1.5">
                    <div
                      className="w-full rounded-t-xl transition-all"
                      style={{
                        height: `${h}%`,
                        background: `linear-gradient(to top, var(--indigo), var(--indigo-deep))`,
                        opacity: 0.4 + (i * 0.15),
                      }}
                    />
                    <div className="font-mono text-[10px] text-ink-soft font-bold">
                      {2020 + i}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
