"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowUpLeft, Radar as RadarIcon, Activity, Waves,
  Map as MapIcon, Cpu, Terminal, AlertTriangle,
} from "lucide-react";

const PHONE_PREFIXES = ["+86-138","+86-186","+855-23","+95-9","+856-21","+84-28","+90-553","+62-21","+91-90","+960-7"];
const ORIGINS = ["MM/YGN","KH/PNH","LA/VTE","VN/SGN","TH/BKK","PH/MNL","MY/KUL","NG/LAG","IN/BOM","AE/DXB"];
const SCRIPT_HITS = ["URGENCY · 今天必须办","TRANSFER · 安全账户","ISOLATE · 不能告诉家人","CREDS · 验证码 / 卡号","AUTHORITY · 公检法","RELATIVE · 克隆孙子","DEEPFAKE · 实时换声"];
const VERBS = ["INTERCEPT","ANALYZE","VOICEPRINT","ROUTE","BLOCK","FLAG","TRACE","ESCALATE"];
const API = (typeof process !== "undefined" && process.env.NEXT_PUBLIC_API_URL) || "http://localhost:8080";

const r = <T,>(a: T[]): T => a[Math.floor(Math.random()*a.length)];
const rint = (a: number, b: number) => Math.floor(a + Math.random()*(b-a+1));
const phone = () => `${r(PHONE_PREFIXES)}-${rint(100,999)}-${rint(1000,9999)}`;
const pad = (n: number, l=2) => String(n).padStart(l,"0");

type FeedEvent = { id: string; t: Date; verb: string; phone: string; origin: string; script: string; tone: "block"|"warn"|"watch"|"safe" };

const TONE = {
  block: "var(--coral)",
  warn:  "var(--amber)",
  watch: "var(--indigo)",
  safe:  "var(--mint)",
} as const;

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
  useEffect(() => {
    let done = false;
    fetch(`${API}/api/v1/defcon`).then(r => r.json()).then(d => { if (!done && typeof d?.level === "number") setLevel(d.level); }).catch(()=>{});
    return () => { done = true; };
  }, []);
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
              onClick={()=>setLevel(n as any)}
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
      <div className="flex-1" />
      <span className="hidden md:inline font-mono text-[10px] uppercase tracking-[0.16em] font-bold" style={{ color: "rgba(242, 243, 247, 0.55)" }}>
        全球威胁指数 · 实时同步
      </span>
    </div>
  );
}

function useFeed() {
  const [events, setEvents] = useState<FeedEvent[]>([]);
  const simRef = useRef<number | null>(null);
  useEffect(() => {
    let closed = false;
    let es: EventSource | null = null;
    const pushSim = () => {
      const tones: FeedEvent["tone"][] = ["block","warn","watch","safe"];
      const tone = tones[rint(0,3)];
      setEvents(prev => [{ id: crypto.randomUUID(), t: new Date(), verb: r(VERBS), phone: phone(), origin: r(ORIGINS), script: r(SCRIPT_HITS), tone }, ...prev].slice(0,48));
    };
    const startSim = () => {
      if (simRef.current) return;
      simRef.current = window.setInterval(pushSim, 1200) as any;
      pushSim();
    };
    try {
      es = new EventSource(`${API}/api/v1/feed/stream`);
      es.onmessage = (m) => {
        try {
          const d = JSON.parse(m.data);
          setEvents(prev => [{ id: d.id || crypto.randomUUID(), t: new Date(d.t || Date.now()), verb: d.verb || r(VERBS), phone: d.phone || phone(), origin: d.origin || r(ORIGINS), script: d.script || r(SCRIPT_HITS), tone: d.tone || "watch" }, ...prev].slice(0,48));
        } catch {}
      };
      es.onerror = () => { if (!closed) startSim(); es?.close(); es = null; };
    } catch { startSim(); }
    const fallback = setTimeout(() => startSim(), 1400);
    return () => {
      closed = true;
      if (simRef.current) clearInterval(simRef.current);
      es?.close();
      clearTimeout(fallback);
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
        {events.length === 0 && <div className="p-4" style={{ color: "rgba(242, 243, 247, 0.55)" }}>正在连接事件流…</div>}
        {events.map(e => (
          <div key={e.id} className="px-4 py-2 flex items-start gap-2 hover:bg-white/[0.03]">
            <span className="w-1.5 h-1.5 mt-1.5 rounded-full shrink-0" style={{ background: TONE[e.tone] }} />
            <span className="shrink-0" style={{ color: "rgba(242, 243, 247, 0.55)" }}>{pad(e.t.getHours())}:{pad(e.t.getMinutes())}:{pad(e.t.getSeconds())}</span>
            <span className="font-extrabold shrink-0" style={{ color: TONE[e.tone] }}>{e.verb}</span>
            <span className="truncate">{e.phone} · {e.origin}</span>
          </div>
        ))}
      </div>
    </Panel>
  );
}

function Voiceprint() {
  const [bars, setBars] = useState<number[]>(Array.from({length: 38}, () => Math.random()));
  useEffect(() => {
    const id = setInterval(() => setBars(Array.from({length: 38}, (_,i) => Math.abs(Math.sin(Date.now()/200 + i*0.3))*0.7 + Math.random()*0.3)), 120);
    return () => clearInterval(id);
  }, []);
  return (
    <Panel title="Voiceprint · 声纹频谱" icon={Waves} tag="F0 · BREATH · SYNTH" className="flex-1">
      <div className="p-4 h-full flex flex-col justify-between gap-3">
        <div className="flex items-end gap-[3px] flex-1">
          {bars.map((h, i) => (
            <div
              key={i}
              className="flex-1 rounded-full transition-[height] duration-150"
              style={{ height: `${h*100}%`, background: i<13 ? "var(--mint)" : i<26 ? "var(--amber)" : "var(--coral)" }}
            />
          ))}
        </div>
        <div className="grid grid-cols-3 gap-2 font-mono text-[10px] font-bold">
          {[{k:"F0",v:"unstable"},{k:"BREATH",v:"absent"},{k:"SYNTH",v:"0.94"}].map(x => (
            <div key={x.k} className="p-2.5 rounded-xl border border-white/10 bg-white/[0.03]">
              <div className="uppercase tracking-wider text-[9px]" style={{ color: "rgba(242, 243, 247, 0.55)" }}>{x.k}</div>
              <div className="mt-0.5 font-extrabold" style={{ color: "var(--coral)" }}>{x.v}</div>
            </div>
          ))}
        </div>
      </div>
    </Panel>
  );
}

function Radar() {
  const [angle, setAngle] = useState(0);
  useEffect(() => {
    let id: number;
    const loop = () => { setAngle(a => (a + 0.8) % 360); id = requestAnimationFrame(loop); };
    id = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(id);
  }, []);
  const pings = useMemo(() => Array.from({length: 8}, (_,i) => ({
    x: 50 + Math.cos(i*1.3)*(18+i*3), y: 50 + Math.sin(i*1.7)*(18+i*2.2),
    tone: i%3===0 ? "var(--coral)" : i%3===1 ? "var(--amber)" : "var(--mint)"
  })), []);
  return (
    <Panel title="Tactical Radar · 战术雷达" icon={RadarIcon} tag="SWEEP · 4.5°/s" className="h-full">
      <div className="relative h-full p-4">
        <div className="relative h-full w-full">
          <svg viewBox="0 0 100 100" className="absolute inset-0 w-full h-full">
            <defs>
              <radialGradient id="ringGrad">
                <stop offset="0%" stopColor="rgba(91, 95, 222, 0.25)" />
                <stop offset="100%" stopColor="rgba(91, 95, 222, 0)" />
              </radialGradient>
            </defs>
            <circle cx="50" cy="50" r="48" fill="url(#ringGrad)" />
            {[12,24,36,48].map(r => (
              <circle key={r} cx="50" cy="50" r={r} fill="none" stroke="rgba(91, 95, 222, 0.25)" strokeWidth="0.2" />
            ))}
            <line x1="50" y1="2" x2="50" y2="98" stroke="rgba(91, 95, 222, 0.18)" strokeWidth="0.15" />
            <line x1="2" y1="50" x2="98" y2="50" stroke="rgba(91, 95, 222, 0.18)" strokeWidth="0.15" />
            <g style={{ transformOrigin: "50px 50px", transform: `rotate(${angle}deg)` }}>
              <path d="M50 50 L 50 2 A 48 48 0 0 1 94 30 Z" fill="rgba(62, 213, 152, 0.22)" />
            </g>
            {pings.map((p,i) => (
              <circle key={i} cx={p.x} cy={p.y} r="0.8" fill={p.tone}>
                <animate attributeName="r" values="0.8;2.4;0.8" dur="2s" repeatCount="indefinite" begin={`${i*0.25}s`} />
                <animate attributeName="opacity" values="1;0.2;1" dur="2s" repeatCount="indefinite" begin={`${i*0.25}s`} />
              </circle>
            ))}
          </svg>
          <div className="absolute top-3 left-3 font-mono text-[10px] uppercase tracking-[0.14em] font-bold" style={{ color: "rgba(242, 243, 247, 0.55)" }}>
            LAT 39.9° · LON 116.4°
          </div>
          <div className="absolute bottom-3 right-3 font-mono text-[10px] uppercase tracking-[0.14em] font-bold" style={{ color: "var(--mint)" }}>
            8 CONTACTS · 3 HOSTILE
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
              </div>
              <div className="mt-0.5 font-mono text-[11px] font-medium truncate">{e.script}</div>
            </div>
          </div>
        ))}
      </div>
    </Panel>
  );
}

function Counters() {
  const [stats, setStats] = useState({ intercepted: 14382910, blocked: 284917, escalated: 1283 });
  useEffect(() => {
    const id = setInterval(() => setStats(s => ({ intercepted: s.intercepted + rint(10,40), blocked: s.blocked + rint(0,3), escalated: s.escalated + (Math.random()<0.2?1:0) })), 1400);
    return () => clearInterval(id);
  }, []);
  return (
    <Panel title="Counters · 计数器" icon={Cpu} className="flex-1">
      <div className="p-3 space-y-2.5 font-mono">
        {[
          {k:"INTERCEPTED",v:stats.intercepted,c:"var(--mint)"},
          {k:"BLOCKED",v:stats.blocked,c:"var(--coral)"},
          {k:"ESCALATED",v:stats.escalated,c:"var(--amber)"},
        ].map(x => (
          <div key={x.k} className="flex items-center justify-between p-2 rounded-xl" style={{ background: "rgba(255,255,255,0.03)" }}>
            <span className="text-[10px] uppercase tracking-wider font-bold" style={{ color: "rgba(242, 243, 247, 0.55)" }}>{x.k}</span>
            <span className="text-[20px] numplate" style={{ color: x.c }}>{x.v.toLocaleString()}</span>
          </div>
        ))}
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
    <Panel title="Global Map · ASCII" icon={MapIcon} tag="LIVE" className="h-[26%]">
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
