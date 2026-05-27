"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowUpLeft, Radar as RadarIcon, Activity, Waves,
  Map as MapIcon, Cpu, Terminal, AlertTriangle,
} from "lucide-react";
import { api, streamFeed, FeedEvent as BackendEvent, APIError } from "@/lib/api";

const API = (typeof process !== "undefined" && process.env.NEXT_PUBLIC_API_URL) || "http://localhost:8080";

const pad = (n: number, l=2) => String(n).padStart(l,"0");

type FeedEvent = {
  id: string;
  t: Date;
  verb: string;
  phone: string;
  origin: string;     // 来自后端 trace.actualOrigin（如 "CN" / "MM"）
  script: string;     // 来自后端 scriptCategory（如 "引导转账"）；可能为空
  riskScore: number;  // 0-100
  tone: "block"|"warn"|"watch"|"safe";
};

const TONE = {
  block: "var(--coral)",
  warn:  "var(--amber)",
  watch: "var(--indigo)",
  safe:  "var(--mint)",
} as const;

// adaptBackend 把后端 SSE 事件转成 UI 事件。所有展示字段都来自真实 payload；
// payload 由 publishVerdict 在 /api/v1/analyze 成功路径上写入，无任何随机回退。
function adaptBackend(be: BackendEvent): FeedEvent {
  let parsed: any = {};
  try { parsed = JSON.parse(be.payload || "{}"); } catch {}
  const score: number = typeof parsed.riskScore === "number" ? parsed.riskScore : 0;
  const tone: FeedEvent["tone"] =
    score >= 85 ? "block" :
    score >= 65 ? "warn"  :
    score >= 35 ? "watch" : "safe";
  return {
    id: be.id || crypto.randomUUID(),
    t: new Date(be.ts || Date.now()),
    verb: be.verb || "ANALYZE",
    phone: parsed.shownNumber || "—",
    origin: parsed.actualOrigin || parsed.registry || "??",
    script: parsed.scriptCategory || "",
    riskScore: score,
    tone,
  };
}

export default function WarroomPage() {
  return (
    <div className="relative h-screen w-screen overflow-hidden" style={{ background: "var(--deep)", color: "#F2F3F7" }}>
      <Atmosphere />
      <div className="relative z-10 flex h-full flex-col">
        <TopBar />
        <Defcon />
        <section className="grid min-h-0 flex-1 grid-cols-12 gap-3 px-4 pt-3 pb-3">
          <div className="col-span-12 lg:col-span-3 flex min-h-0 flex-col gap-3">
            <LiveFeed />
            <Voiceprint />
          </div>
          <div className="col-span-12 lg:col-span-6 min-h-0">
            <Radar />
          </div>
          <div className="col-span-12 lg:col-span-3 flex min-h-0 flex-col gap-3">
            <PriorityAlerts />
            <Counters />
            <AsciiMap />
          </div>
        </section>
        <Command />
        <Ticker />
      </div>
    </div>
  );
}

function Atmosphere() {
  return (
    <div className="absolute inset-0 pointer-events-none" aria-hidden>
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: "radial-gradient(rgba(242, 243, 247, 0.05) 1px, transparent 1px)",
          backgroundSize: "24px 24px",
        }}
      />
      <div className="absolute top-0 left-1/3 w-[60vw] h-[60vh] rounded-full" style={{ background: "radial-gradient(closest-side, rgba(91, 95, 222, 0.35), transparent 70%)", filter: "blur(60px)" }} />
      <div className="absolute bottom-0 right-0 w-[50vw] h-[50vh] rounded-full" style={{ background: "radial-gradient(closest-side, rgba(255, 107, 107, 0.18), transparent 70%)", filter: "blur(80px)" }} />
      <div className="absolute top-1/3 left-0 w-[30vw] h-[30vh] rounded-full" style={{ background: "radial-gradient(closest-side, rgba(62, 213, 152, 0.15), transparent 70%)", filter: "blur(60px)" }} />
    </div>
  );
}

function TopBar() {
  const [clock, setClock] = useState("--:--:--");
  useEffect(() => {
    const id = setInterval(() => {
      const d = new Date();
      setClock(`${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`);
    }, 1000);
    return () => clearInterval(id);
  }, []);
  return (
    <header className="flex items-center justify-between px-4 py-3 border-b border-white/10 bg-black/25 backdrop-blur-xl">
      <div className="flex items-center gap-4">
        <Link href="/" className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-white/15 hover:bg-white/5 transition-colors text-[12px] font-semibold">
          <ArrowUpLeft size={14} /> 返回主页
        </Link>
        <div className="flex items-center gap-2.5">
          <div
            className="w-9 h-9 rounded-2xl flex items-center justify-center font-display font-extrabold text-white shadow-md"
            style={{ background: "linear-gradient(135deg, var(--indigo), var(--indigo-deep))" }}
          >
            S
          </div>
          <div>
            <div className="font-display text-[16px] font-extrabold tracking-tight">SENTINEL · 指挥中心</div>
            <div className="font-mono text-[10px] uppercase tracking-[0.14em] font-bold" style={{ color: "rgba(242, 243, 247, 0.55)" }}>
              COMMAND CENTER / OPS
            </div>
          </div>
        </div>
      </div>
      <div className="hidden md:flex items-center gap-5 font-mono text-[11px] font-bold" style={{ color: "rgba(242, 243, 247, 0.65)" }}>
        <span className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: "var(--mint)" }} />ONLINE</span>
        <span>CONN · {API.replace(/^https?:\/\//, "")}</span>
        <span style={{ color: "var(--mint)" }}>{clock}</span>
      </div>
    </header>
  );
}

function Defcon() {
  const [level, setLevel] = useState<1|2|3|4|5>(2);
  const [warn, setWarn] = useState<string | null>(null);

  useEffect(() => {
    let done = false;
    api.getDefcon()
      .then(d => { if (!done && typeof d?.level === "number") setLevel(d.level as 1|2|3|4|5); })
      .catch(() => {});
    return () => { done = true; };
  }, []);

  async function pick(n: 1|2|3|4|5) {
    setLevel(n);
    setWarn(null);
    try {
      const d = await api.setDefcon(n);
      if (typeof d?.level === "number") setLevel(d.level as 1|2|3|4|5);
    } catch (e) {
      // 后端要求 sysadmin；本地 UI 已切，但需提示
      if (e instanceof APIError && (e.code === "RBAC_FORBIDDEN" || e.status === 403)) {
        setWarn("仅系统管理员可调整 DEFCON 等级");
      } else if (e instanceof APIError && e.status === 401) {
        setWarn("请先登录");
      } else {
        setWarn("同步失败，已在本地切换");
      }
      // 3 秒后清提示
      setTimeout(() => setWarn(null), 3000);
    }
  }

  const labels = ["PEACE","ADVISORY","ELEVATED","HIGH","CRITICAL"];
  const colors = ["var(--mint)","var(--mint-deep)","var(--amber)","var(--amber-deep)","var(--coral)"];
  return (
    <div className="flex items-center gap-3 px-4 py-2.5 border-b border-white/10 bg-black/20">
      <span className="font-mono text-[10px] uppercase tracking-[0.16em] font-bold" style={{ color: "rgba(242, 243, 247, 0.55)" }}>DEFCON</span>
      <div className="flex gap-1.5">
        {[5,4,3,2,1].map(n => {
          const active = n === level;
          return (
            <button
              key={n}
              onClick={() => pick(n as 1|2|3|4|5)}
              className="w-8 h-7 rounded-lg font-mono text-[11px] font-extrabold transition-all"
              style={{
                background: active ? colors[n-1] : "rgba(255,255,255,0.05)",
                color: active ? "var(--deep)" : "rgba(242, 243, 247, 0.55)",
                border: active ? "none" : "1px solid rgba(255,255,255,0.1)",
              }}
            >{n}</button>
          );
        })}
      </div>
      <span className="font-mono text-[11px] font-extrabold" style={{ color: colors[level-1] }}>
        {labels[level-1]}
      </span>
      {warn && (
        <span className="font-mono text-[10px] font-bold px-2 py-1 rounded" style={{ color: "var(--amber)", background: "rgba(255,255,255,0.05)" }}>
          {warn}
        </span>
      )}
      <div className="flex-1" />
      <span className="hidden md:inline font-mono text-[10px] uppercase tracking-[0.16em] font-bold" style={{ color: "rgba(242, 243, 247, 0.55)" }}>
        全球威胁指数 · 实时同步
      </span>
    </div>
  );
}

function useFeed() {
  const [events, setEvents] = useState<FeedEvent[]>([]);
  useEffect(() => {
    let closed = false;
    const stop = streamFeed({
      onEvent: (be) => {
        setEvents(prev => [adaptBackend(be), ...prev].slice(0, 48));
      },
      onError: () => { /* SSE 断开时保持空列表，等真实事件 */ },
      onClose: () => { /* 由 server / 用户离开页面触发 */ },
    });
    return () => {
      closed = true;
      void closed;
      stop?.();
    };
  }, []);
  return events;
}

function Panel({ title, icon: Icon, children, tag, className = "" }: any) {
  return (
    <div className={`flex min-h-0 flex-col rounded-2xl border border-white/10 bg-white/[0.035] backdrop-blur-sm overflow-hidden ${className}`}>
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/10 bg-white/[0.02]">
        <div className="flex items-center gap-2">
          {Icon && (
            <div className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ background: "rgba(91, 95, 222, 0.2)", color: "var(--indigo)" }}>
              <Icon size={12} />
            </div>
          )}
          <span className="font-mono text-[10px] uppercase tracking-[0.14em] font-extrabold">{title}</span>
        </div>
        {tag && <span className="font-mono text-[9px] uppercase tracking-[0.14em] font-bold" style={{ color: "rgba(242, 243, 247, 0.55)" }}>{tag}</span>}
      </div>
      <div className="min-h-0 flex-1 overflow-auto">{children}</div>
    </div>
  );
}

function LiveFeed() {
  const events = useFeed();
  return (
    <Panel title="Live Feed · 事件流" icon={Activity} tag={`${events.length} EVT`} className="h-[42%]">
      <div className="divide-y divide-white/5 font-mono text-[11px] font-medium">
        {events.length === 0 && (
          <div className="p-4" style={{ color: "rgba(242, 243, 247, 0.55)" }}>
            等待事件 — 调用 /api/v1/analyze 后此处出现真实事件
          </div>
        )}
        {events.map(e => (
          <div key={e.id} className="px-4 py-2 flex items-start gap-2 hover:bg-white/[0.03]">
            <span className="w-1.5 h-1.5 mt-1.5 rounded-full shrink-0" style={{ background: TONE[e.tone] }} />
            <span className="shrink-0" style={{ color: "rgba(242, 243, 247, 0.55)" }}>{pad(e.t.getHours())}:{pad(e.t.getMinutes())}:{pad(e.t.getSeconds())}</span>
            <span className="font-extrabold shrink-0" style={{ color: TONE[e.tone] }}>{e.verb}</span>
            <span className="truncate">{e.phone}{e.origin ? ` · ${e.origin}` : ""}{e.riskScore ? ` · ${e.riskScore}` : ""}</span>
          </div>
        ))}
      </div>
    </Panel>
  );
}

function Voiceprint() {
  // 三项指标全部来自最近一次 /api/v1/analyze 的 verdict。
  // 频谱条按 synthProbability 做确定性可视化（高合成概率 = 红色高峰），
  // 没有任何 Math.random。无 verdict 时显示 "—"。
  type Latest = Awaited<ReturnType<typeof api.warroom.latestVoiceprint>>;
  const [vp, setVp] = useState<Latest>(null);

  useEffect(() => {
    let stop = false;
    const pull = async () => {
      try {
        const d = await api.warroom.latestVoiceprint();
        if (!stop) setVp(d);
      } catch { /* 后端不可用就保持空 */ }
    };
    void pull();
    const id = setInterval(pull, 3000);
    return () => { stop = true; clearInterval(id); };
  }, []);

  // 38 条频谱：把 0..1 的 synthProb 映射成峰形（中段最高、两侧渐低），
  // 没数据时全部归零。这样观众一眼能从条形高度看出合成概率。
  const synth = vp?.voiceprint.synthProbability ?? 0;
  const bars = useMemo(() => {
    return Array.from({ length: 38 }, (_, i) => {
      const center = 18.5;
      const dist = Math.abs(i - center) / center;     // 0..1
      const shape = Math.cos((dist * Math.PI) / 2);   // 1 at center, 0 at edge
      return synth > 0 ? Math.max(0.05, shape * synth) : 0;
    });
  }, [synth]);

  const fmt = (v: number | undefined, digits = 2) =>
    v === undefined ? "—" : v.toFixed(digits);

  const stats = [
    { k: "F0",     v: fmt(vp?.voiceprint.f0Jitter, 3) },
    { k: "BREATH", v: fmt(vp?.voiceprint.breathScore) },
    { k: "SYNTH",  v: fmt(vp?.voiceprint.synthProbability) },
  ];

  return (
    <Panel
      title="Voiceprint · 声纹频谱"
      icon={Waves}
      tag={vp ? `verdict ${vp.voiceprint.verdict}` : "NO DATA"}
      className="flex-1"
    >
      <div className="p-4 h-full flex flex-col justify-between gap-3">
        <div className="flex items-end gap-[3px] flex-1">
          {bars.map((h, i) => (
            <div
              key={i}
              className="flex-1 rounded-full"
              style={{
                height: `${Math.max(2, h * 100)}%`,
                background: i < 13 ? "var(--mint)" : i < 26 ? "var(--amber)" : "var(--coral)",
                opacity: vp ? 1 : 0.25,
              }}
            />
          ))}
        </div>
        <div className="grid grid-cols-3 gap-2 font-mono text-[10px] font-bold">
          {stats.map(x => (
            <div key={x.k} className="p-2.5 rounded-xl border border-white/10 bg-white/[0.03]">
              <div className="uppercase tracking-wider text-[9px]" style={{ color: "rgba(242, 243, 247, 0.55)" }}>{x.k}</div>
              <div
                className="mt-0.5 font-extrabold"
                style={{ color: vp && x.k === "SYNTH" && (vp.voiceprint.synthProbability >= 0.85) ? "var(--coral)" : "var(--mint)" }}
              >
                {x.v}
              </div>
            </div>
          ))}
        </div>
      </div>
    </Panel>
  );
}

function Radar() {
  const [angle, setAngle] = useState(0);
  const angleRef = useRef(0);
  const particlesRef = useRef<{ id: number; x: number; y: number; born: number; life: number; size: number }[]>([]);
  const pidRef = useRef(0);
  const lastEmitRef = useRef(0);

  useEffect(() => {
    let id: number;
    const loop = (now: number) => {
      angleRef.current = (angleRef.current + 0.8) % 360;
      const a = angleRef.current;

      // 节流粒子发射 ~30Hz，单发；从扫描臂前缘附近随机半径采样
      if (now - lastEmitRef.current > 32) {
        const rad = ((a - 90) * Math.PI) / 180;
        const dist = 14 + Math.random() * 32;
        const jitter = (Math.random() - 0.5) * 0.04;
        const r = rad + jitter;
        particlesRef.current.push({
          id: pidRef.current++,
          x: 50 + Math.cos(r) * dist,
          y: 50 + Math.sin(r) * dist,
          born: now,
          life: 500 + Math.random() * 500,
          size: 0.18 + Math.random() * 0.32,
        });
        lastEmitRef.current = now;
      }

      // 清理过期粒子
      const alive: typeof particlesRef.current = [];
      for (const p of particlesRef.current) {
        if (now - p.born < p.life) alive.push(p);
      }
      if (alive.length > 160) alive.splice(0, alive.length - 160);
      particlesRef.current = alive;

      setAngle(a);
      id = requestAnimationFrame(loop);
    };
    id = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(id);
  }, []);

  const pings = useMemo(() => Array.from({ length: 8 }, (_, i) => ({
    x: 50 + Math.cos(i * 1.3) * (18 + i * 3),
    y: 50 + Math.sin(i * 1.7) * (18 + i * 2.2),
    tone: i % 3 === 0 ? "var(--coral)" : i % 3 === 1 ? "var(--amber)" : "rgb(96, 230, 220)",
  })), []);

  const now = typeof performance !== "undefined" ? performance.now() : 0;

  return (
    <Panel title="Tactical Radar · 战术雷达" icon={RadarIcon} tag="DEMO · 视觉演示" className="h-full">
      <div className="relative h-full p-4">
        <div className="relative h-full w-full">
          <svg viewBox="0 0 100 100" className="absolute inset-0 w-full h-full">
            <defs>
              <radialGradient id="ringGrad">
                <stop offset="0%" stopColor="rgba(46, 188, 200, 0.18)" />
                <stop offset="100%" stopColor="rgba(46, 188, 200, 0)" />
              </radialGradient>
              <linearGradient id="sweepGrad" x1="0" y1="0" x2="1" y2="0" gradientUnits="objectBoundingBox">
                <stop offset="0%" stopColor="rgba(46, 220, 230, 0.05)" />
                <stop offset="100%" stopColor="rgba(46, 220, 230, 0.45)" />
              </linearGradient>
              <filter id="edgeGlow" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="0.9" />
              </filter>
              <filter id="particleGlow" x="-100%" y="-100%" width="300%" height="300%">
                <feGaussianBlur stdDeviation="0.3" />
              </filter>
            </defs>

            <circle cx="50" cy="50" r="48" fill="url(#ringGrad)" />
            {[12, 24, 36, 48].map(r => (
              <circle key={r} cx="50" cy="50" r={r} fill="none"
                stroke="rgba(96, 200, 220, 0.22)" strokeWidth="0.18" />
            ))}
            <line x1="50" y1="2" x2="50" y2="98" stroke="rgba(96, 200, 220, 0.16)" strokeWidth="0.12" />
            <line x1="2" y1="50" x2="98" y2="50" stroke="rgba(96, 200, 220, 0.16)" strokeWidth="0.12" />

            {/* 扫描扇区：青色半透明 + 前缘电流蓝光 */}
            <g style={{ transformOrigin: "50px 50px", transform: `rotate(${angle}deg)` }}>
              <path d="M50 50 L 50 2 A 48 48 0 0 1 94 30 Z"
                fill="url(#sweepGrad)" opacity="0.85" />
              <line x1="50" y1="50" x2="50" y2="2"
                stroke="rgba(80, 200, 255, 0.5)" strokeWidth="0.55"
                strokeLinecap="round" filter="url(#edgeGlow)" />
              <line x1="50" y1="50" x2="50" y2="2"
                stroke="rgba(180, 240, 255, 0.95)" strokeWidth="0.18" strokeLinecap="round" />
            </g>

            {/* 拖尾粒子（细小 + 低不透明，作为前缘的光尘） */}
            <g filter="url(#particleGlow)">
              {particlesRef.current.map(p => {
                const age = (now - p.born) / p.life;
                if (age >= 1) return null;
                const alpha = (1 - age) * 0.55;
                return (
                  <circle
                    key={p.id}
                    cx={p.x}
                    cy={p.y}
                    r={p.size * (1 - age * 0.7)}
                    fill="rgb(140, 230, 245)"
                    opacity={alpha}
                  />
                );
              })}
            </g>

            {pings.map((p, i) => (
              <circle key={i} cx={p.x} cy={p.y} r="0.8" fill={p.tone}>
                <animate attributeName="r" values="0.8;2.4;0.8" dur="2s" repeatCount="indefinite" begin={`${i * 0.25}s`} />
                <animate attributeName="opacity" values="1;0.2;1" dur="2s" repeatCount="indefinite" begin={`${i * 0.25}s`} />
              </circle>
            ))}
          </svg>
          <div className="absolute top-3 left-3 font-mono text-[10px] uppercase tracking-[0.14em] font-bold" style={{ color: "rgba(242, 243, 247, 0.45)" }}>
            视觉演示 · 非实时坐标
          </div>
        </div>
      </div>
    </Panel>
  );
}

function PriorityAlerts() {
  const events = useFeed().filter(e => e.tone === "block" || e.tone === "warn").slice(0,5);
  return (
    <Panel title="Priority · 高危告警" icon={AlertTriangle} tag={`${events.length}`} className="h-[34%]">
      <div className="divide-y divide-white/5">
        {events.length === 0 && <div className="p-4 font-mono text-[11px] font-medium" style={{ color: "rgba(242, 243, 247, 0.55)" }}>无高危告警</div>}
        {events.map(e => (
          <div key={e.id} className="p-3 flex items-start gap-2">
            <span className="w-2 h-2 mt-1 rounded-full shrink-0 animate-pulse" style={{ background: TONE[e.tone] }} />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 font-mono text-[10px] font-bold">
                <span className="font-extrabold" style={{ color: TONE[e.tone] }}>{e.verb}</span>
                <span style={{ color: "rgba(242, 243, 247, 0.55)" }}>{e.phone}</span>
                <span style={{ color: "rgba(242, 243, 247, 0.55)" }}>· risk {e.riskScore}</span>
              </div>
              {e.script && (
                <div className="mt-0.5 font-mono text-[11px] font-medium truncate">{e.script}</div>
              )}
            </div>
          </div>
        ))}
      </div>
    </Panel>
  );
}

function Counters() {
  // 全部数字来自 /api/v1/warroom/overview。业务计数（intercepted/blocked/aiClones）
  // 由真实 /api/v1/analyze 调用驱动；CPU/Mem/订阅数由后端 sampler 实时采样。
  // 没有任何前端随机增量。
  type Overview = Awaited<ReturnType<typeof api.warroom.overview>>;
  const [data, setData] = useState<Overview | null>(null);
  const [err, setErr] = useState(false);

  useEffect(() => {
    let stop = false;
    const pull = async () => {
      try {
        const d = await api.warroom.overview();
        if (stop) return;
        setData(d);
        setErr(false);
      } catch {
        if (!stop) setErr(true);
      }
    };
    void pull();
    const id = setInterval(pull, 3000);
    return () => { stop = true; clearInterval(id); };
  }, []);

  const c = data?.counters;
  const rt = data?.runtime;
  const eng = data?.engine;
  const hub = data?.hub;

  const businessRows = [
    { k: "INTERCEPTED", v: c?.interceptedCalls, c: "var(--mint)" },
    { k: "BLOCKED",     v: c?.blockedCalls,     c: "var(--coral)" },
    { k: "AI CLONES",   v: c?.aiCloneDetected,  c: "var(--amber)" },
  ];
  const runtimeRows = [
    { k: "ANALYZED",    v: eng?.analyzed,    c: "var(--mint)",   suffix: "" },
    { k: "SUBSCRIBERS", v: hub?.subscribers, c: "var(--indigo)", suffix: "" },
    { k: "CPU",         v: rt?.cpuPct,       c: "var(--amber)",  suffix: "%" },
  ];

  const fmt = (v: number | undefined, suffix = "") => {
    if (v === undefined || v === null) return "—";
    if (suffix === "%") return `${Math.round(v * 10) / 10}${suffix}`;
    return `${v.toLocaleString()}${suffix}`;
  };

  return (
    <Panel title="Counters · 计数器" icon={Cpu} tag={err ? "OFFLINE" : "LIVE"} className="flex-1">
      <div className="p-3 space-y-2.5 font-mono">
        {businessRows.map(x => (
          <div key={x.k} className="flex items-center justify-between p-2 rounded-xl" style={{ background: "rgba(255,255,255,0.03)" }}>
            <span className="text-[10px] uppercase tracking-wider font-bold" style={{ color: "rgba(242, 243, 247, 0.55)" }}>{x.k}</span>
            <span className="text-[20px] numplate" style={{ color: x.c }}>{fmt(x.v)}</span>
          </div>
        ))}
        <div className="pt-1 mt-1 border-t border-white/5 space-y-2.5">
          {runtimeRows.map(x => (
            <div key={x.k} className="flex items-center justify-between p-2 rounded-xl" style={{ background: "rgba(255,255,255,0.03)" }}>
              <span className="text-[10px] uppercase tracking-wider font-bold" style={{ color: "rgba(242, 243, 247, 0.55)" }}>{x.k}</span>
              <span className="text-[16px] numplate" style={{ color: x.c }}>{fmt(x.v as number | undefined, x.suffix)}</span>
            </div>
          ))}
        </div>
      </div>
    </Panel>
  );
}

function AsciiMap() {
  const rows = [
    "╭─╮ NA  ╭──╮ EU   ╭───╮ AS  ",
    "│○│━━━━│◉ │━━━━━│ ◉ │━━━",
    "╰─╯    ╰──╯     ╰───╯    ",
    "  ╰─━─━─SINGAPORE─━─━─╯  ",
  ];
  return (
    <Panel title="Global Map · ASCII" icon={MapIcon} tag="DEMO" className="h-[26%]">
      <pre className="p-3 font-mono text-[10px] leading-tight whitespace-pre font-bold" style={{ color: "var(--mint)" }}>
{rows.join("\n")}
      </pre>
    </Panel>
  );
}

function Command() {
  const [line, setLine] = useState("");
  const target = "sentinel> scan --all-regions --deepfake-threshold=0.85 ";
  useEffect(() => {
    let i = 0;
    const id = setInterval(() => { setLine(target.slice(0, i)); i = (i+1) % (target.length+12); }, 55);
    return () => clearInterval(id);
  }, []);
  return (
    <div className="flex items-center gap-3 px-4 py-2.5 border-t border-white/10 bg-black/25 font-mono text-[11px] font-medium">
      <Terminal size={13} style={{ color: "var(--mint)" }} />
      <span style={{ color: "rgba(242, 243, 247, 0.55)" }}>/warroom</span>
      <span className="flex-1 truncate cursor-blink" style={{ color: "var(--mint)" }}>{line}</span>
    </div>
  );
}

function Ticker() {
  const items = ["SENTINEL · 公安部反电信诈骗协作平台", "JIT 推理 97.4ms 平均", "AI SYNTH 识别准确率 99.2%", "全球 7 区域接入 · 24h 监测", "紧急联络 96110"];
  const loop = [...items, ...items, ...items];
  return (
    <div className="relative overflow-hidden border-t border-white/10 bg-black/30">
      <div className="marquee-track py-2 font-mono text-[11px] whitespace-nowrap font-medium">
        {loop.map((t,i) => (
          <span key={i} className="inline-flex items-center gap-3" style={{ color: "rgba(242, 243, 247, 0.65)" }}>
            <span style={{ color: "var(--mint)" }}>▸</span>{t}
          </span>
        ))}
      </div>
    </div>
  );
}
