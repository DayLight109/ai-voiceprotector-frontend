"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { Play, Pause, RotateCcw, Phone, PhoneOff, ShieldAlert, Radio, Waves, ScanLine } from "lucide-react";

type Phase = "IDLE" | "RING" | "ANSWER" | "ANALYZE" | "WARN" | "BLOCK";
type Event = { t: number; phase: Phase; side: "trace" | "voice" | "script" | "system"; msg: string; risk?: number };

const TIMELINE: Event[] = [
  { t: 0, phase: "RING", side: "system", msg: "来电 · +86 138 0013 4921" },
  { t: 0.6, phase: "RING", side: "trace", msg: "查询号段归属：北京 · 联通", risk: 8 },
  { t: 1.4, phase: "RING", side: "trace", msg: "信令层回溯 → 柬埔寨 · 金边", risk: 62 },
  { t: 2.2, phase: "ANSWER", side: "system", msg: "用户接听" },
  { t: 2.8, phase: "ANALYZE", side: "voice", msg: "采集首段声纹 · 440ms", risk: 55 },
  { t: 3.6, phase: "ANALYZE", side: "voice", msg: "F0 抖动异常 · 合成特征 +", risk: 74 },
  { t: 4.4, phase: "ANALYZE", side: "script", msg: "识别关键词：「我是警察」", risk: 80 },
  { t: 5.3, phase: "ANALYZE", side: "voice", msg: "呼吸特征缺失 · SYNTH 0.94", risk: 89 },
  { t: 6.1, phase: "WARN", side: "script", msg: "识别：「打到这个安全账户」", risk: 96 },
  { t: 7.0, phase: "WARN", side: "system", msg: "屏幕警示 · 家属推送" },
  { t: 8.2, phase: "BLOCK", side: "system", msg: "通话中断 · 证据链加密留存" },
  { t: 9.4, phase: "BLOCK", side: "system", msg: "判决：BLOCK · 三路共识" },
];

const DURATION = 12.5;
const PHASE_META: Record<Phase, { label: string; tone: string; color: string; bg: string }> = {
  IDLE: { label: "待机", tone: "待接入", color: "var(--ink-soft)", bg: "var(--canvas-2)" },
  RING: { label: "响铃", tone: "溯源中", color: "var(--indigo-deep)", bg: "var(--indigo-soft)" },
  ANSWER: { label: "接听", tone: "采样中", color: "var(--indigo-deep)", bg: "var(--indigo-soft)" },
  ANALYZE: { label: "分析", tone: "判决中", color: "var(--amber-deep)", bg: "var(--amber-soft)" },
  WARN: { label: "警示", tone: "家属同步", color: "var(--amber-deep)", bg: "var(--amber-soft)" },
  BLOCK: { label: "拦截", tone: "已中断", color: "var(--coral-deep)", bg: "var(--coral-soft)" },
};

export default function CallSimulator() {
  const [t, setT] = useState(0);
  const [playing, setPlaying] = useState(false);
  const raf = useRef<number>(0);
  const last = useRef<number>(0);

  useEffect(() => {
    if (!playing) return;
    const loop = (now: number) => {
      if (last.current) {
        const dt = (now - last.current) / 1000;
        setT((x) => {
          const n = x + dt;
          if (n >= DURATION) {
            setPlaying(false);
            return DURATION;
          }
          return n;
        });
      }
      last.current = now;
      raf.current = requestAnimationFrame(loop);
    };
    raf.current = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf.current);
      last.current = 0;
    };
  }, [playing]);

  const events = useMemo(() => TIMELINE.filter((e) => e.t <= t), [t]);
  const phase: Phase = useMemo(() => {
    const last = events[events.length - 1];
    return last ? last.phase : "IDLE";
  }, [events]);

  const RISK_ANCHORS = useMemo(() => {
    const points = TIMELINE
      .filter((e) => typeof e.risk === "number")
      .map((e) => ({ t: e.t, risk: e.risk as number }));
    const blockT = TIMELINE.find((e) => e.phase === "BLOCK")!.t;
    return [{ t: 0, risk: 0 }, ...points, { t: blockT, risk: 100 }];
  }, []);
  const risk = useMemo(() => {
    for (let i = 0; i < RISK_ANCHORS.length - 1; i++) {
      const a = RISK_ANCHORS[i];
      const b = RISK_ANCHORS[i + 1];
      if (t >= a.t && t <= b.t) {
        const span = Math.max(0.0001, b.t - a.t);
        const k = (t - a.t) / span;
        return a.risk + (b.risk - a.risk) * k;
      }
    }
    return RISK_ANCHORS[RISK_ANCHORS.length - 1].risk;
  }, [t, RISK_ANCHORS]);

  const PHASE_MARKS = useMemo(() => {
    const order: Phase[] = ["RING", "ANSWER", "ANALYZE", "WARN", "BLOCK"];
    return order.map((p) => ({ phase: p, t: TIMELINE.find((e) => e.phase === p)!.t }));
  }, []);
  const VISUAL_END = PHASE_MARKS[PHASE_MARKS.length - 1].t;
  const progress = Math.min(1, t / VISUAL_END);

  const reset = () => {
    setT(0);
    setPlaying(false);
    last.current = 0;
  };

  return (
    <section id="simulator" className="relative py-24 md:py-32 bg-canvas-2 overflow-hidden">
      <div className="absolute inset-0 -z-10 dot-grid-fine opacity-40" />
      <div className="max-w-[1400px] mx-auto px-5 md:px-8">
        <div className="mb-14 grid grid-cols-12 gap-6 items-end">
          <div className="col-span-12 md:col-span-7">
            <div className="section-idx mb-4"><b>05</b>12.5 秒实战演示</div>
            <h2 className="mega text-[clamp(2.4rem,5.5vw,5rem)]">
              从<span className="mega-italic" style={{ color: "var(--coral)" }}> 响铃 </span>到
              <br />
              <span className="underline-soft">拦截</span>，只走 9 秒。
            </h2>
          </div>
          <div className="col-span-12 md:col-span-5 text-[14px] leading-[1.75] text-ink-2 font-medium">
            按下播放，跟随时间轴看三条引擎如何并行工作。每一条新证据到来时，
            右侧判决器会立刻重算风险分数——从绿色的 SAFE，跃迁到红色的 BLOCK。
          </div>
        </div>

        <div className="grid grid-cols-12 gap-5">
          <div className="col-span-12 lg:col-span-4">
            <PhoneMock phase={phase} risk={risk} t={t} />
          </div>

          <div className="col-span-12 lg:col-span-8 space-y-5">
            <div className="panel p-5 md:p-6">
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setPlaying((p) => !p)}
                    className="w-12 h-12 rounded-full flex items-center justify-center hover:scale-105 transition-transform shadow-md text-white"
                    style={{ background: "var(--indigo)" }}
                  >
                    {playing ? <Pause size={16} fill="currentColor" /> : <Play size={16} fill="currentColor" className="ml-0.5" />}
                  </button>
                  <button
                    onClick={reset}
                    className="w-12 h-12 rounded-full border border-border flex items-center justify-center hover:bg-canvas-2 transition-colors bg-surface"
                  >
                    <RotateCcw size={14} />
                  </button>
                  <div>
                    <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-soft font-bold">
                      TIMELINE · {phase}
                    </div>
                    <div className="font-display text-[20px] font-extrabold">
                      {t.toFixed(1)}s <span className="text-ink-soft text-[14px] font-semibold">/ {DURATION}s</span>
                    </div>
                  </div>
                </div>
                <RiskMeter value={risk} />
              </div>

              <div className="relative h-10 rounded-full bg-canvas-2 overflow-hidden">
                <div
                  className="absolute inset-y-0 left-0 rounded-full"
                  style={{
                    width: `${progress * 100}%`,
                    background: "linear-gradient(to right, var(--mint), var(--amber), var(--coral))",
                  }}
                />
                {PHASE_MARKS.slice(1, -1).map((m) => (
                  <div
                    key={m.phase}
                    className="absolute top-1.5 bottom-1.5 w-[2px] bg-white/60"
                    style={{ left: `${(m.t / VISUAL_END) * 100}%` }}
                  />
                ))}
                <div
                  className="absolute top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-surface border-[3px] shadow-lg"
                  style={{
                    left: `calc(${progress * 100}% - 10px)`,
                    borderColor: "var(--indigo)",
                  }}
                />
              </div>
              <div className="relative mt-3 h-4 font-mono text-[10px] font-bold uppercase tracking-wider text-ink-soft">
                {PHASE_MARKS.map((m, i) => {
                  const last = i === PHASE_MARKS.length - 1;
                  return (
                    <span
                      key={m.phase}
                      className="absolute top-0"
                      style={{
                        left: `${(m.t / VISUAL_END) * 100}%`,
                        transform: i === 0 ? "translateX(0)" : last ? "translateX(-100%)" : "translateX(-50%)",
                        color: last ? "var(--coral-deep)" : undefined,
                      }}
                    >
                      {m.phase}
                    </span>
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              <LanePanel icon={Radio} title="溯源 L1" color="var(--indigo)" soft="var(--indigo-soft)" events={events.filter((e) => e.side === "trace")} />
              <LanePanel icon={Waves} title="声纹 L2" color="var(--mint-deep)" soft="var(--mint-soft)" events={events.filter((e) => e.side === "voice")} />
              <LanePanel icon={ScanLine} title="话术 L3" color="var(--coral)" soft="var(--coral-soft)" events={events.filter((e) => e.side === "script")} />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function PhoneMock({ phase, risk, t }: { phase: Phase; risk: number; t: number }) {
  const meta = PHASE_META[phase];
  const blocked = phase === "BLOCK";
  return (
    <div
      className="relative mx-auto w-full max-w-[340px] aspect-[9/18] rounded-[40px] p-2.5"
      style={{
        background: "linear-gradient(145deg, var(--deep), var(--deep-2))",
        boxShadow: "var(--shadow-xl)",
      }}
    >
      <div className="absolute top-3 left-1/2 -translate-x-1/2 w-20 h-5 rounded-full z-20" style={{ background: "#0A0B12" }} />
      <div
        className="relative w-full h-full rounded-[32px] overflow-hidden flex flex-col items-center justify-between py-10 px-5 transition-colors"
        style={{
          background: blocked ? "var(--coral)" : "var(--surface)",
        }}
      >
        <div
          className="flex w-full items-center justify-between font-mono text-[10px] mt-2 font-bold"
          style={{ color: blocked ? "rgba(255,255,255,0.9)" : "var(--ink-soft)" }}
        >
          <span>{new Date().toTimeString().slice(0, 5)}</span>
          <span className="uppercase tracking-[0.14em]">SENTINEL</span>
        </div>

        <div className="flex flex-col items-center gap-3 text-center">
          <div
            className="w-24 h-24 rounded-full flex items-center justify-center relative shadow-md"
            style={{ background: blocked ? "rgba(255,255,255,0.15)" : meta.bg, color: blocked ? "#FFFFFF" : meta.color }}
          >
            {blocked ? <PhoneOff size={36} strokeWidth={1.75} /> : <Phone size={36} strokeWidth={1.75} />}
            {!blocked && phase !== "IDLE" && (
              <span
                className="absolute inset-0 rounded-full border-2 animate-ping"
                style={{ borderColor: meta.color, opacity: 0.5 }}
              />
            )}
          </div>
          <div
            className="font-display text-[22px] font-extrabold"
            style={{ color: blocked ? "#FFFFFF" : "var(--ink)" }}
          >
            +86 138 ···· 4921
          </div>
          <div
            className="font-mono text-[11px] font-bold"
            style={{ color: blocked ? "rgba(255,255,255,0.75)" : "var(--ink-soft)" }}
          >
            显示：北京联通 · 实际：金边
          </div>
          <div
            className="mt-2 px-3 py-1.5 rounded-full font-mono text-[11px] font-bold uppercase tracking-[0.12em]"
            style={{
              background: blocked ? "#FFFFFF" : meta.bg,
              color: blocked ? "var(--coral-deep)" : meta.color,
            }}
          >
            {meta.label} · {meta.tone}
          </div>
        </div>

        <div className="w-full space-y-2">
          {blocked ? (
            <>
              <div className="text-center text-[14px] font-bold text-white flex items-center justify-center gap-2">
                <ShieldAlert size={18} />
                已拦截 AI 合成通话
              </div>
              <div className="text-center font-mono text-[10px] uppercase tracking-[0.14em] font-bold text-white/75">
                证据留存 · 紧急联系人已通知
              </div>
            </>
          ) : (
            <>
              <div className="flex items-center justify-between font-mono text-[10px] font-bold uppercase tracking-[0.12em] text-ink-soft">
                <span>RISK</span>
                <span>{Math.round(risk)} / 100</span>
              </div>
              <div className="h-2 rounded-full bg-canvas-2 overflow-hidden">
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${risk}%`,
                    background: risk < 40 ? "var(--mint)" : risk < 75 ? "var(--amber)" : "var(--coral)",
                  }}
                />
              </div>
              <div className="font-mono text-[10px] font-bold uppercase tracking-[0.12em] text-center text-ink-soft">
                T+{t.toFixed(2)}s · 三路并行分析中
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function RiskMeter({ value }: { value: number }) {
  const tone = value < 40 ? "SAFE" : value < 75 ? "WATCH" : "BLOCK";
  const bg = value < 40 ? "var(--mint-soft)" : value < 75 ? "var(--amber-soft)" : "var(--coral-soft)";
  const fg = value < 40 ? "var(--mint-deep)" : value < 75 ? "var(--amber-deep)" : "var(--coral-deep)";
  return (
    <div className="flex items-center gap-3">
      <div className="text-right">
        <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-soft font-bold">风险</div>
        <div className="numplate text-[24px]" style={{ color: fg }}>{Math.round(value)}</div>
      </div>
      <div
        className="w-14 h-14 rounded-2xl flex items-center justify-center font-mono text-[11px] font-extrabold tracking-wider shadow-md"
        style={{ background: bg, color: fg }}
      >
        {tone}
      </div>
    </div>
  );
}

function LanePanel({ icon: Icon, title, color, soft, events }: any) {
  return (
    <div className="panel p-4 h-56 flex flex-col">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: soft, color }}>
            <Icon size={13} />
          </div>
          <span className="font-display text-[13px] font-extrabold">{title}</span>
        </div>
        <span className="font-mono text-[10px] font-bold text-ink-soft">{events.length} evt</span>
      </div>
      <div className="flex-1 overflow-hidden relative">
        <div className="space-y-2 font-mono text-[11px] leading-tight absolute inset-0 overflow-y-auto pr-1">
          {events.length === 0 && (
            <div className="text-ink-soft italic text-[11px] font-medium">等待事件…</div>
          )}
          {events.map((e: any, i: number) => (
            <div key={i} className="flex items-start gap-2 text-ink-2 font-medium">
              <span className="text-ink-soft shrink-0 font-bold">T+{e.t.toFixed(1)}</span>
              <span className="truncate">{e.msg}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
