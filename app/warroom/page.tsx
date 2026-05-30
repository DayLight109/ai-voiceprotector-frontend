"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Activity,
  AlertTriangle,
  ArrowLeft,
  ChevronRight,
  Clock3,
  Cpu,
  Gauge,
  HardDrive,
  Network,
  Radio,
  Server,
  Shield,
  Sparkles,
  TerminalSquare,
  Workflow,
} from "lucide-react";
import { type FeedEvent, streamFeed, api, APIError } from "@/lib/api";

type Metric = {
  id: string;
  label: string;
  value: number;
  min: number;
  max: number;
  delta: number;
};

type Device = {
  id: string;
  name: string;
  zone: string;
  health: number;
  state: "online" | "watch" | "risk";
};

type AlertItem = {
  id: string;
  title: string;
  detail: string;
  level: "critical" | "warning" | "notice";
  time: string;
};

type Target = {
  id: string;
  x: number;
  y: number;
  label: string;
  heading: number;
  speed: number;
  level: "critical" | "warning" | "trace";
  pulseDelay: number;
};

const cutCorner =
  "polygon(18px 0, calc(100% - 18px) 0, 100% 18px, 100% calc(100% - 18px), calc(100% - 18px) 100%, 18px 100%, 0 calc(100% - 18px), 0 18px)";
const titleFont =
  '"Rajdhani","Orbitron","Segoe UI","Microsoft YaHei",sans-serif';
const monoFont =
  '"Cascadia Code","JetBrains Mono","Consolas","SFMono-Regular",monospace';

const baseMetrics: Metric[] = [
  { id: "cpu", label: "CPU LOAD", value: 68, min: 24, max: 96, delta: 5.4 },
  { id: "memory", label: "MEMORY GRID", value: 61, min: 28, max: 94, delta: 4.2 },
  { id: "storage", label: "STORAGE BUS", value: 44, min: 14, max: 82, delta: 2.6 },
  { id: "network", label: "NETWORK FLOW", value: 76, min: 22, max: 98, delta: 6.8 },
];

const baseDevices: Device[] = [
  { id: "d1", name: "Aegis-01", zone: "CORE", health: 98, state: "online" },
  { id: "d2", name: "Aegis-02", zone: "EDGE", health: 86, state: "online" },
  { id: "d3", name: "Helix-03", zone: "SECTOR-7", health: 72, state: "watch" },
  { id: "d4", name: "Helix-08", zone: "SECTOR-2", health: 63, state: "watch" },
  { id: "d5", name: "Vanta-11", zone: "WEST ARC", health: 39, state: "risk" },
  { id: "d6", name: "Vanta-14", zone: "NORTH GRID", health: 81, state: "online" },
];

const baseAlerts: AlertItem[] = [
  {
    id: "al-1",
    title: "异常声纹聚类上升",
    detail: "核心策略链检测到连续高相似声纹命中。",
    level: "critical",
    time: "--:--:--",
  },
  {
    id: "al-2",
    title: "边缘节点流量抖动",
    detail: "南向链路出现不稳定脉冲，建议展开追踪。",
    level: "warning",
    time: "--:--:--",
  },
  {
    id: "al-3",
    title: "审计镜像回写完成",
    detail: "数据留痕与证据镜像已完成固化。",
    level: "notice",
    time: "--:--:--",
  },
  {
    id: "al-4",
    title: "自动阻断已触发",
    detail: "动态防护策略完成拦截并进入观察队列。",
    level: "critical",
    time: "--:--:--",
  },
];

const baseTargets: Target[] = [
  { id: "tg-1", x: 58, y: 33, label: "CN-ALPHA", heading: 122, speed: 12.3, level: "critical", pulseDelay: 0 },
  { id: "tg-2", x: 28, y: 59, label: "GRID-KILO", heading: 287, speed: 8.7, level: "warning", pulseDelay: 0.45 },
  { id: "tg-3", x: 67, y: 69, label: "ARC-SIGMA", heading: 36, speed: 6.2, level: "trace", pulseDelay: 0.9 },
  { id: "tg-4", x: 44, y: 22, label: "VECTOR-09", heading: 198, speed: 14.8, level: "critical", pulseDelay: 1.35 },
  { id: "tg-5", x: 36, y: 44, label: "TRACE-11", heading: 309, speed: 5.5, level: "warning", pulseDelay: 1.8 },
];

const initialLogs = [
  "00:00:01 MISSION BUS ONLINE",
  "00:00:04 THREAT GRAPH SYNCHRONIZED",
  "00:00:06 EVIDENCE PIPE READY",
  "00:00:09 RADAR SWEEP CALIBRATED",
  "00:00:13 SESSION TRACE ARMED",
  "00:00:16 TACTICAL GRID SEALED",
];

const logTemplates = [
  "EDGE RISK MODEL REFRESHED",
  "VOICEPRINT STREAM RESEALED",
  "SUSPECT SESSION MOVED TO QUARANTINE",
  "TACTICAL INDEX RECOMPUTED",
  "SIGNAL GATEWAY LATENCY NORMALIZED",
  "FORENSIC SNAPSHOT SIGNED",
];

const targetNames = [
  "DELTA-17",
  "OMEGA-32",
  "HEX-04",
  "RIFT-88",
  "LENS-26",
  "SIGMA-03",
];

const metricIcons = {
  cpu: Cpu,
  memory: Gauge,
  storage: HardDrive,
  network: Network,
};

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function drift(value: number, delta: number, min: number, max: number) {
  return clamp(value + (Math.random() - 0.5) * delta * 2, min, max);
}

function alertTone(level: AlertItem["level"]) {
  if (level === "critical") return "#ff4d6d";
  if (level === "warning") return "#ffb347";
  return "#57f5ff";
}

function targetTone(level: Target["level"]) {
  if (level === "critical") return "#ff5d7a";
  if (level === "warning") return "#7cf6ff";
  return "#b794ff";
}

function deviceTone(state: Device["state"]) {
  if (state === "risk") return "#ff5d7a";
  if (state === "watch") return "#ffd36a";
  return "#66f5ff";
}

function nowTime() {
  return new Date().toLocaleTimeString("zh-CN", { hour12: false });
}

function nowClock() {
  return new Date().toLocaleString("zh-CN", {
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

export default function WarroomPage() {
  const [clock, setClock] = useState("--:--:--");
  const [metrics, setMetrics] = useState(baseMetrics);
  const [devices, setDevices] = useState(baseDevices);
  const [alerts, setAlerts] = useState(baseAlerts);
  const [logs, setLogs] = useState(initialLogs);
  const [targets, setTargets] = useState(baseTargets);
  const [signal, setSignal] = useState<number[]>([38, 44, 57, 51, 63, 58, 71, 65, 60, 73, 69, 75]);
  const [threatIndex, setThreatIndex] = useState(78);
  const [sessions, setSessions] = useState(1684);
  const [blocked, setBlocked] = useState(296);
  const [integrity, setIntegrity] = useState(96.8);
  const seedRef = useRef(0);

  // ── 真实后端接入状态 ───────────────────────────────────
  // defcon: 真实防御等级(/api/v1/defcon);statsSynced: 是否已成功拉到 /stats。
  // statsSynced 为 true 后,下方随机 drift 动画对这些真实指标停手,改由后端数据驱动。
  const [defcon, setDefcon] = useState<number | null>(null);
  const [defconWarn, setDefconWarn] = useState<string | null>(null);
  const [statsSynced, setStatsSynced] = useState(false);

  useEffect(() => {
    const updateClock = () => setClock(nowClock());
    updateClock();
    const timer = window.setInterval(updateClock, 1000);
    return () => window.clearInterval(timer);
  }, []);

  // ── DEFCON 真实防御等级(/api/v1/defcon)───────────────
  useEffect(() => {
    let done = false;
    api.getDefcon()
      .then((d) => { if (!done && typeof d?.level === "number") setDefcon(d.level); })
      .catch(() => {});
    return () => { done = true; };
  }, []);

  // ── 计数器:轮询 /api/v1/stats 真实数据 ─────────────────
  // 成功后 setStatsSynced(true),threatIndex/blocked/sessions 改由后端驱动;
  // 失败则保持 false,下方随机 drift 动画继续兜底(暂时的假数据展示)。
  useEffect(() => {
    let stop = false;
    const pull = async () => {
      try {
        const s = await api.getStats();
        if (stop) return;
        if (typeof s.blockedCalls === "number") setBlocked(s.blockedCalls);
        if (typeof s.interceptedCalls === "number") setSessions(s.interceptedCalls);
        if (typeof s.defcon === "number") setDefcon(s.defcon);
        // threatIndex 用 AI 克隆 + 话术命中的相对热度粗略映射到 0-100 观感
        if (typeof s.aiCloneDetected === "number") {
          const heat = Math.min(98, 42 + s.aiCloneDetected * 6 + (s.scriptHits ?? 0) * 2);
          setThreatIndex(Math.round(heat));
        }
        setStatsSynced(true);
      } catch {
        // 静默:未同步成功时由随机动画兜底
      }
    };
    void pull();
    const id = window.setInterval(pull, 5000);
    return () => { stop = true; window.clearInterval(id); };
  }, []);

  useEffect(() => {
    setAlerts((prev) =>
      prev.map((item, index) => ({
        ...item,
        time: new Date(Date.now() - index * 16_000).toLocaleTimeString("zh-CN", {
          hour12: false,
        }),
      })),
    );
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => {
      seedRef.current += 1;

      setMetrics((prev) =>
        prev.map((metric) => ({
          ...metric,
          value: drift(metric.value, metric.delta, metric.min, metric.max),
        })),
      );

      setDevices((prev) =>
        prev.map((device) => {
          const health = Math.round(drift(device.health, device.state === "risk" ? 8 : 4.5, 26, 99));
          const state = health < 48 ? "risk" : health < 76 ? "watch" : "online";
          return { ...device, health, state };
        }),
      );

      // 这三项有真实后端数据(/stats):同步成功后停止随机抖动,交给后端驱动。
      if (!statsSynced) {
        setThreatIndex((prev) => Math.round(drift(prev, 4.8, 42, 98)));
        setSessions((prev) => Math.round(drift(prev, 60, 1220, 3420)));
        setBlocked((prev) => Math.round(drift(prev, 18, 180, 760)));
      }
      setIntegrity((prev) => Number(drift(prev, 0.5, 88.4, 99.5).toFixed(1)));

      setSignal((prev) => [...prev.slice(1), Math.round(drift(prev[prev.length - 1] ?? 50, 9, 22, 92))]);

      setTargets((prev) => {
        const shifted = prev.map((target) => ({
          ...target,
          x: drift(target.x, target.level === "critical" ? 2.4 : 1.6, 16, 84),
          y: drift(target.y, target.level === "critical" ? 2.8 : 1.7, 14, 86),
          heading: Math.round((target.heading + drift(8, 6, 1, 16)) % 360),
          speed: Number(drift(target.speed, 1.2, 3.6, 18.8).toFixed(1)),
        }));
        if (Math.random() < 0.42) {
          const next: Target = {
            id: `tg-${Date.now()}`,
            x: drift(50, 34, 18, 82),
            y: drift(50, 30, 16, 84),
            label: targetNames[Math.floor(Math.random() * targetNames.length)],
            heading: Math.round(drift(180, 170, 0, 359)),
            speed: Number(drift(9, 5.6, 3.8, 18.1).toFixed(1)),
            level: Math.random() > 0.72 ? "critical" : Math.random() > 0.4 ? "warning" : "trace",
            pulseDelay: (seedRef.current % 6) * 0.28,
          };
          return [next, ...shifted].slice(0, 7);
        }
        return shifted;
      });

      setLogs((prev) => [
        `${nowTime()} ${logTemplates[Math.floor(Math.random() * logTemplates.length)]}`,
        ...prev,
      ].slice(0, 7));

      if (Math.random() < 0.5) {
        const level: AlertItem["level"] =
          Math.random() > 0.75 ? "critical" : Math.random() > 0.42 ? "warning" : "notice";
        setAlerts((prev) => [
          {
            id: `al-${Date.now()}`,
            title:
              level === "critical"
                ? "高危目标重新锁定"
                : level === "warning"
                ? "链路波动上升"
                : "审计数据已归档",
            detail:
              level === "critical"
                ? "扫描网格捕获二次命中，已推送应急防护。"
                : level === "warning"
                ? "边缘节点抖动增强，建议查看路径回放。"
                : "实时日志与证据镜像已同步完成。",
            level,
            time: nowTime(),
          },
          ...prev,
        ].slice(0, 5));
      }
    }, 1800);

    return () => window.clearInterval(timer);
  }, [statsSynced]);

  useEffect(() => {
    const stop = streamFeed({
      onEvent(ev: FeedEvent) {
        const level: AlertItem["level"] =
          ev.level === "danger" ? "critical" : ev.level === "warn" ? "warning" : "notice";
        setAlerts((prev) => [
          {
            id: ev.id,
            title: `${ev.side.toUpperCase()} / ${ev.verb.toUpperCase()}`,
            detail: ev.payload,
            level,
            time: new Date(ev.ts).toLocaleTimeString("zh-CN", { hour12: false }),
          },
          ...prev,
        ].slice(0, 5));

        setLogs((prev) => [
          `${new Date(ev.ts).toLocaleTimeString("zh-CN", { hour12: false })} ${ev.payload}`,
          ...prev,
        ].slice(0, 7));

        if (level !== "notice") {
          const targetLevel: Target["level"] = level === "critical" ? "critical" : "warning";
          setTargets((prev) => [
            {
              id: `feed-${ev.id}`,
              x: drift(50, 30, 18, 82),
              y: drift(50, 28, 16, 84),
              label: ev.side.slice(0, 9).toUpperCase(),
              heading: Math.round(drift(180, 180, 0, 359)),
              speed: Number(drift(10, 6, 4, 18).toFixed(1)),
              level: targetLevel,
              pulseDelay: 0.16,
            },
            ...prev,
          ].slice(0, 7));
        }
      },
    });

    return () => stop();
  }, []);

  const primaryTarget = targets[0];
  const criticalAlerts = alerts.filter((item) => item.level === "critical").length;
  const systemMode = useMemo(() => {
    if (criticalAlerts >= 2 || threatIndex > 82) return "RED VECTOR";
    if (threatIndex > 68) return "AMBER WATCH";
    return "CYAN STABLE";
  }, [criticalAlerts, threatIndex]);

  // DEFCON 1(最危急)→ 5(和平)。后端默认 5。
  const defconLabels = ["", "CRITICAL", "HIGH", "ELEVATED", "ADVISORY", "PEACE"];
  const defconTone = (n: number) =>
    n <= 1 ? "#ff4d6d" : n === 2 ? "#ff7b9a" : n === 3 ? "#ffb347" : n === 4 ? "#7df6ff" : "#66f5ff";

  async function pickDefcon(n: number) {
    setDefcon(n);
    setDefconWarn(null);
    try {
      const d = await api.setDefcon(n);
      if (typeof d?.level === "number") setDefcon(d.level);
    } catch (e) {
      if (e instanceof APIError && (e.status === 403 || e.code === "RBAC_FORBIDDEN")) {
        setDefconWarn("仅系统管理员可调整 DEFCON");
      } else if (e instanceof APIError && e.status === 401) {
        setDefconWarn("请先登录");
      } else {
        setDefconWarn("同步失败,已本地切换");
      }
      setTimeout(() => setDefconWarn(null), 3000);
    }
  }

  return (
    <main
      className="relative h-[100dvh] overflow-hidden bg-[#08101f] text-white"
      style={{ fontFamily: titleFont }}
    >
      <WarroomBackdrop critical={criticalAlerts > 0} />

      <div className="relative z-10 grid h-full min-h-0 grid-rows-[auto_minmax(0,1fr)] px-4 py-4 lg:px-5">
        <header className="grid grid-cols-1 gap-3 pb-4 lg:grid-cols-[auto_1fr_auto] lg:items-center">
          <div className="flex items-center gap-3 animate-[cmd-slide-left_820ms_cubic-bezier(0.22,1,0.36,1)_both]">
            <Link
              href="/"
              className="group inline-flex h-11 w-11 items-center justify-center bg-white/[0.05] text-cyan-100 transition duration-300 hover:text-white"
              style={{
                clipPath: cutCorner,
                boxShadow: "inset 0 0 0 1px rgba(120,236,255,0.18), 0 0 28px rgba(87,245,255,0.08)",
              }}
              aria-label="返回首页"
            >
              <ArrowLeft size={17} className="transition duration-300 group-hover:scale-110" />
            </Link>

            <div className="flex items-center gap-3">
              <div
                className="flex h-12 w-12 items-center justify-center bg-gradient-to-br from-cyan-300/16 to-fuchsia-400/14 text-cyan-100"
                style={{
                  clipPath: cutCorner,
                  boxShadow: "inset 0 0 0 1px rgba(125,246,255,0.2), 0 0 34px rgba(118,106,255,0.12)",
                }}
              >
                <Shield size={22} />
              </div>
              <div>
                <div className="text-[11px] uppercase tracking-[0.44em] text-cyan-100/60">
                  Sentinel Tactical Screen
                </div>
                <h1 className="text-[32px] font-black tracking-[0.18em] text-white">
                  指挥中心
                </h1>
              </div>
            </div>
          </div>

          <div
            className="relative overflow-hidden bg-white/[0.05] px-4 py-3 backdrop-blur-xl animate-[cmd-fade_900ms_ease-out_both]"
            style={{
              clipPath: cutCorner,
              boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.08), 0 0 0 1px rgba(80,235,255,0.04)",
            }}
          >
            <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(90deg,transparent,rgba(255,255,255,0.04),transparent)]" />
            <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
              <HeadStat
                label="Defcon"
                value={defcon !== null ? `${defcon} · ${defconLabels[defcon] ?? ""}` : systemMode}
                tone={defcon !== null ? defconTone(defcon) : criticalAlerts > 0 ? "#ff7b9a" : "#7df6ff"}
              />
              <HeadStat label="Threat Index" value={`${threatIndex}`} tone="#7df6ff" />
              <HeadStat label="Blocked" value={`${blocked}`} tone="#b794ff" />
              <HeadStat label="Integrity" value={`${integrity.toFixed(1)}%`} tone="#e6f7ff" />
            </div>

            {/* DEFCON 调级条:点击切换真实防御等级(后端要求 sysadmin)*/}
            <div className="mt-3 flex items-center gap-2">
              <span className="text-[9px] uppercase tracking-[0.3em] text-cyan-100/45">Set Defcon</span>
              <div className="flex gap-1">
                {[5, 4, 3, 2, 1].map((n) => {
                  const active = n === defcon;
                  return (
                    <button
                      key={n}
                      type="button"
                      onClick={() => pickDefcon(n)}
                      className="h-6 w-6 text-[11px] font-bold transition duration-200 hover:scale-110"
                      style={{
                        clipPath: cutCorner,
                        color: active ? "#08101f" : defconTone(n),
                        background: active ? defconTone(n) : "rgba(255,255,255,0.05)",
                        boxShadow: `inset 0 0 0 1px ${defconTone(n)}55`,
                        fontFamily: monoFont,
                      }}
                    >
                      {n}
                    </button>
                  );
                })}
              </div>
              {defconWarn ? (
                <span className="text-[10px] tracking-[0.1em]" style={{ color: "#ffb347" }}>
                  {defconWarn}
                </span>
              ) : null}
            </div>
          </div>

          <div className="justify-self-end animate-[cmd-slide-right_820ms_cubic-bezier(0.22,1,0.36,1)_both]">
            <div
              className="bg-white/[0.05] px-4 py-3 text-right backdrop-blur-xl"
              style={{
                clipPath: cutCorner,
                boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.08), 0 0 32px rgba(100,130,255,0.09)",
              }}
            >
              <div className="text-[10px] uppercase tracking-[0.36em] text-cyan-100/55">
                Tactical Time
              </div>
              <div
                className="mt-1 text-[20px] font-bold tracking-[0.14em] text-cyan-50"
                style={{ fontFamily: monoFont }}
              >
                {clock}
              </div>
            </div>
          </div>
        </header>

        <section className="grid min-h-0 grid-cols-1 gap-4 xl:grid-cols-[290px_minmax(0,1fr)_320px]">
          <aside className="grid min-h-0 grid-rows-[minmax(0,0.52fr)_minmax(0,0.48fr)] gap-4">
            <GlassPanel
              title="系统状态"
              subtitle="System Telemetry"
              icon={Cpu}
              accent="cyan"
            >
              <div className="space-y-4">
                {metrics.map((metric) => (
                  <MetricStrip key={metric.id} metric={metric} />
                ))}
              </div>

              <div className="mt-5 grid grid-cols-2 gap-3">
                <SmallStat label="Active Sessions" value={sessions} tone="#7df6ff" />
                <SmallStat label="Target Lock" value={targets.length} tone="#b794ff" />
                <SmallStat label="Critical Alerts" value={criticalAlerts} tone="#ff7b9a" />
                <SmallStat label="Data Sync" value={99.2} suffix="%" tone="#d8f8ff" />
              </div>
            </GlassPanel>

            <GlassPanel
              title="设备列表"
              subtitle="Device Matrix"
              icon={Server}
              accent="violet"
            >
              <div className="space-y-3">
                {devices.map((device) => (
                  <DeviceRow key={device.id} device={device} />
                ))}
              </div>

              <div className="mt-5 grid grid-cols-2 gap-3">
                <ActionChip icon={Workflow} label="节点编排" />
                <ActionChip icon={Sparkles} label="策略回放" />
              </div>
            </GlassPanel>
          </aside>

          <section className="grid min-h-0 grid-rows-[minmax(0,1fr)_180px] gap-4">
            <GlassPanel
              title="核心扫描区"
              subtitle="Holographic Threat Sweep"
              icon={Radio}
              accent="cyan"
              breathing
              className="min-h-0"
            >
              <RadarDisplay
                targets={targets}
                sessions={sessions}
                blocked={blocked}
                primaryTarget={primaryTarget}
                threatIndex={threatIndex}
              />
            </GlassPanel>

            <div className="grid min-h-0 grid-cols-1 gap-4 lg:grid-cols-[1.1fr_0.95fr_0.95fr]">
              <GlassPanel
                title="信号波形"
                subtitle="Live Spectrum"
                icon={Activity}
                accent="violet"
                compact
              >
                <SpectrumPanel series={signal} />
              </GlassPanel>

              <GlassPanel
                title="目标坐标"
                subtitle="Target Coordinates"
                icon={TerminalSquare}
                accent="cyan"
                compact
              >
                <TargetInfo target={primaryTarget} />
              </GlassPanel>

              <GlassPanel
                title="战术入口"
                subtitle="Quick Actions"
                icon={Workflow}
                accent="violet"
                compact
              >
                <div className="grid h-full grid-cols-1 gap-3">
                  <ActionLink href="/ops/health" label="实时监测" desc="设备波形与资源详情" />
                  <ActionLink href="/sysadmin/risk-dashboard" label="风险总览" desc="进入风险分析大屏" />
                  <ActionLink href="/app/identity" label="身份核验" desc="查看证件上传与核验" />
                </div>
              </GlassPanel>
            </div>
          </section>

          <aside className="grid min-h-0 grid-rows-[minmax(0,0.54fr)_minmax(0,0.46fr)] gap-4">
            <GlassPanel
              title="警报列表"
              subtitle="Priority Alerts"
              icon={AlertTriangle}
              accent="violet"
            >
              <div className="space-y-3">
                {alerts.map((alert, index) => (
                  <AlertRow key={alert.id} alert={alert} index={index} />
                ))}
              </div>
            </GlassPanel>

            <GlassPanel
              title="实时日志"
              subtitle="Command Logs"
              icon={Clock3}
              accent="cyan"
            >
              <div className="space-y-2.5">
                {logs.map((log, index) => (
                  <div
                    key={`${log}-${index}`}
                    className="group bg-black/18 px-3 py-2.5 text-[11px] uppercase tracking-[0.24em] text-cyan-100/72 transition duration-300 hover:text-white"
                    style={{
                      clipPath: cutCorner,
                      boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.05)",
                    }}
                  >
                    {log}
                  </div>
                ))}
              </div>
            </GlassPanel>
          </aside>
        </section>
      </div>
    </main>
  );
}

function WarroomBackdrop({ critical }: { critical: boolean }) {
  return (
    <>
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(95,168,255,0.16),transparent_28%),radial-gradient(circle_at_80%_18%,rgba(164,104,255,0.12),transparent_24%),radial-gradient(circle_at_50%_60%,rgba(69,234,255,0.08),transparent_38%),linear-gradient(180deg,#08101f_0%,#0b1528_54%,#0a1322_100%)]" />
      <div
        className="pointer-events-none absolute inset-0 opacity-40 animate-[cmd-grid-drift_18s_linear_infinite]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(125,246,255,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(125,246,255,0.08) 1px, transparent 1px)",
          backgroundSize: "48px 48px",
        }}
      />
      <div
        className="pointer-events-none absolute inset-0 opacity-20"
        style={{
          backgroundImage:
            "radial-gradient(rgba(255,255,255,0.7) 0.8px, transparent 0.9px), radial-gradient(rgba(125,246,255,0.5) 0.7px, transparent 0.8px)",
          backgroundSize: "170px 170px, 220px 220px",
          backgroundPosition: "0 0, 80px 50px",
        }}
      />
      {critical ? (
        <div className="pointer-events-none absolute inset-0 animate-[cmd-alert_1.6s_ease-in-out_infinite] shadow-[inset_0_0_0_1px_rgba(255,93,122,0.25),inset_0_0_120px_rgba(255,93,122,0.08)]" />
      ) : null}
      <style jsx global>{`
        @keyframes cmd-grid-drift {
          0% { transform: translate3d(0,0,0); }
          50% { transform: translate3d(-16px,14px,0); }
          100% { transform: translate3d(0,0,0); }
        }
        @keyframes cmd-radar-spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes cmd-ripple {
          0% { transform: scale(0.55); opacity: 0.72; }
          100% { transform: scale(2.5); opacity: 0; }
        }
        @keyframes cmd-breath {
          0%, 100% { box-shadow: inset 0 0 0 1px rgba(255,255,255,0.08), 0 0 22px rgba(125,246,255,0.06); }
          50% { box-shadow: inset 0 0 0 1px rgba(125,246,255,0.18), 0 0 42px rgba(125,246,255,0.12); }
        }
        @keyframes cmd-slide-left {
          from { opacity: 0; transform: translateX(-32px); }
          to { opacity: 1; transform: translateX(0); }
        }
        @keyframes cmd-slide-right {
          from { opacity: 0; transform: translateX(32px); }
          to { opacity: 1; transform: translateX(0); }
        }
        @keyframes cmd-fade {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes cmd-alert {
          0%, 100% { opacity: 0.12; }
          50% { opacity: 0.32; }
        }
      `}</style>
    </>
  );
}

function GlassPanel({
  title,
  subtitle,
  icon: Icon,
  children,
  accent,
  compact,
  breathing,
  className = "",
}: {
  title: string;
  subtitle: string;
  icon: typeof Cpu;
  children: React.ReactNode;
  accent: "cyan" | "violet";
  compact?: boolean;
  breathing?: boolean;
  className?: string;
}) {
  const glow =
    accent === "cyan"
      ? "radial-gradient(circle at top right, rgba(87,245,255,0.18), transparent 42%)"
      : "radial-gradient(circle at top right, rgba(183,148,255,0.2), transparent 42%)";

  return (
    <section
      className={`relative min-h-0 overflow-hidden ${className}`}
      style={{ clipPath: cutCorner }}
    >
      <div className="absolute inset-0 bg-white/[0.055] backdrop-blur-xl" />
      <div className="absolute inset-0" style={{ backgroundImage: glow }} />
      <div
        className={breathing ? "absolute inset-0 animate-[cmd-breath_4.6s_ease-in-out_infinite]" : "absolute inset-0"}
        style={{ boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.08)" }}
      />
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.05),transparent_24%,rgba(255,255,255,0.02)_100%)]" />

      <div className={`relative z-10 flex h-full min-h-0 flex-col ${compact ? "p-3" : "p-4"}`}>
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div
              className="flex h-10 w-10 items-center justify-center bg-white/[0.06] text-cyan-100 transition duration-300 hover:scale-105 hover:shadow-[0_0_20px_rgba(125,246,255,0.16)]"
              style={{
                clipPath: cutCorner,
                boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.08)",
              }}
            >
              <Icon size={17} />
            </div>
            <div>
              <div className="text-[16px] font-bold tracking-[0.12em] text-white">{title}</div>
              <div className="text-[10px] uppercase tracking-[0.36em] text-cyan-100/52">{subtitle}</div>
            </div>
          </div>
          <div className="h-px flex-1 bg-[linear-gradient(90deg,rgba(125,246,255,0.35),transparent)]" />
        </div>

        <div className="mt-4 min-h-0 flex-1">{children}</div>
      </div>
    </section>
  );
}

function HeadStat({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: string;
}) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-[0.34em] text-cyan-100/55">{label}</div>
      <div
        className="mt-1 text-[18px] font-bold tracking-[0.12em]"
        style={{ color: tone, fontFamily: monoFont }}
      >
        {value}
      </div>
    </div>
  );
}

function MetricStrip({ metric }: { metric: Metric }) {
  const Icon = metricIcons[metric.id as keyof typeof metricIcons] ?? Cpu;
  const warn = metric.value > 82;
  const soft =
    metric.id === "network"
      ? "from-cyan-300 via-violet-400 to-fuchsia-400"
      : metric.id === "storage"
      ? "from-violet-300 via-cyan-300 to-fuchsia-400"
      : "from-cyan-300 via-cyan-200 to-violet-400";

  return (
    <div
      className="group bg-black/18 px-3 py-3 transition duration-300 hover:-translate-y-1 hover:shadow-[0_0_20px_rgba(125,246,255,0.10)]"
      style={{ clipPath: cutCorner, boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.06)" }}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center bg-white/[0.06] text-cyan-100 transition duration-300 group-hover:text-white">
            <Icon size={16} />
          </div>
          <div>
            <div className="text-[11px] uppercase tracking-[0.34em] text-cyan-100/60">{metric.label}</div>
            <div className="mt-1 text-[11px] tracking-[0.18em] text-white/78">
              {warn ? "警戒波动" : "稳定运行"}
            </div>
          </div>
        </div>
        <div className="text-right">
          <div
            className="text-[28px] font-black tracking-[0.12em]"
            style={{ color: warn ? "#ffb347" : "#7df6ff", fontFamily: monoFont }}
          >
            <AnimatedNumber value={metric.value} />
          </div>
          <div className="text-[10px] uppercase tracking-[0.3em] text-cyan-100/48">percent</div>
        </div>
      </div>

      <div className="mt-3 h-[3px] bg-white/8">
        <div
          className={`h-full bg-gradient-to-r ${soft} transition-[width] duration-1000`}
          style={{
            width: `${metric.value}%`,
            boxShadow: warn
              ? "0 0 16px rgba(255,179,71,0.28)"
              : "0 0 18px rgba(125,246,255,0.28)",
          }}
        />
      </div>
    </div>
  );
}

function SmallStat({
  label,
  value,
  tone,
  suffix = "",
}: {
  label: string;
  value: number;
  tone: string;
  suffix?: string;
}) {
  return (
    <div
      className="bg-black/18 px-3 py-3"
      style={{ clipPath: cutCorner, boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.06)" }}
    >
      <div className="text-[10px] uppercase tracking-[0.32em] text-cyan-100/48">{label}</div>
      <div
        className="mt-2 text-[22px] font-bold tracking-[0.12em]"
        style={{ color: tone, fontFamily: monoFont }}
      >
        <AnimatedNumber value={value} decimals={suffix ? 1 : 0} />
        {suffix}
      </div>
    </div>
  );
}

function DeviceRow({ device }: { device: Device }) {
  const tone = deviceTone(device.state);
  return (
    <button
      type="button"
      className="group flex w-full items-center justify-between gap-3 bg-black/18 px-3 py-3 text-left transition duration-300 hover:-translate-y-1 hover:shadow-[0_0_22px_rgba(125,246,255,0.10)]"
      style={{ clipPath: cutCorner, boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.06)" }}
    >
      <div>
        <div className="text-[12px] font-semibold tracking-[0.16em] text-white">{device.name}</div>
        <div className="mt-1 text-[10px] uppercase tracking-[0.32em] text-cyan-100/48">{device.zone}</div>
      </div>
      <div className="text-right">
        <div
          className="text-[20px] font-bold tracking-[0.12em]"
          style={{ color: tone, fontFamily: monoFont }}
        >
          <AnimatedNumber value={device.health} />
        </div>
        <div className="mt-1 inline-flex items-center gap-2 text-[10px] uppercase tracking-[0.24em]" style={{ color: tone }}>
          <span className="h-[6px] w-[6px] rounded-full" style={{ backgroundColor: tone, boxShadow: `0 0 12px ${tone}` }} />
          {device.state}
        </div>
      </div>
    </button>
  );
}

function ActionChip({
  icon: Icon,
  label,
}: {
  icon: typeof Workflow;
  label: string;
}) {
  return (
    <button
      type="button"
      className="group flex items-center justify-center gap-2 bg-black/18 px-3 py-3 text-[11px] uppercase tracking-[0.26em] text-cyan-100/75 transition duration-300 hover:text-white"
      style={{ clipPath: cutCorner, boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.06)" }}
    >
      <Icon size={14} className="transition duration-300 group-hover:scale-110 group-hover:drop-shadow-[0_0_10px_rgba(125,246,255,0.45)]" />
      {label}
    </button>
  );
}

function RadarDisplay({
  targets,
  sessions,
  blocked,
  primaryTarget,
  threatIndex,
}: {
  targets: Target[];
  sessions: number;
  blocked: number;
  primaryTarget: Target;
  threatIndex: number;
}) {
  return (
    <div className="relative h-full min-h-0 overflow-hidden">
      <div
        className="absolute inset-0 bg-black/18"
        style={{ clipPath: cutCorner, boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.04)" }}
      />
      <div className="absolute inset-[4%] border border-cyan-200/10" style={{ clipPath: cutCorner }} />
      <div className="absolute left-1/2 top-1/2 h-[90%] w-[90%] -translate-x-1/2 -translate-y-1/2 rounded-full border border-cyan-200/12" />
      <div className="absolute left-1/2 top-1/2 h-[72%] w-[72%] -translate-x-1/2 -translate-y-1/2 rounded-full border border-cyan-200/10" />
      <div className="absolute left-1/2 top-1/2 h-[54%] w-[54%] -translate-x-1/2 -translate-y-1/2 rounded-full border border-cyan-200/10" />
      <div className="absolute left-1/2 top-1/2 h-[34%] w-[34%] -translate-x-1/2 -translate-y-1/2 rounded-full border border-cyan-200/10" />
      <div className="absolute left-1/2 top-[7%] bottom-[7%] w-px -translate-x-1/2 bg-cyan-200/10" />
      <div className="absolute top-1/2 left-[7%] right-[7%] h-px -translate-y-1/2 bg-cyan-200/10" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(117,240,255,0.10),transparent_44%),radial-gradient(circle_at_center,rgba(183,148,255,0.10),transparent_62%)]" />

      <div className="absolute left-1/2 top-1/2 h-[92%] w-[92%] -translate-x-1/2 -translate-y-1/2 rounded-full overflow-hidden">
        <div className="absolute inset-0 animate-[cmd-radar-spin_7.6s_linear_infinite]">
          <div className="absolute inset-0 rounded-full bg-[conic-gradient(from_30deg,transparent_0deg,rgba(87,245,255,0.52)_42deg,rgba(183,148,255,0.18)_78deg,transparent_120deg)] blur-[0.5px]" />
        </div>
      </div>

      {targets.map((target) => (
        <RadarTarget key={target.id} target={target} />
      ))}

      <div className="absolute left-4 top-4 grid gap-3 sm:grid-cols-3">
        <RadarBadge label="Threat Index" value={threatIndex} tone="#7df6ff" />
        <RadarBadge label="Sessions" value={sessions} tone="#b794ff" />
        <RadarBadge label="Blocked" value={blocked} tone="#e8fbff" />
      </div>

      <div
        className="absolute bottom-4 left-4 right-4 grid gap-3 bg-black/26 p-3 backdrop-blur-md md:grid-cols-[1.1fr_0.9fr_0.9fr]"
        style={{ clipPath: cutCorner, boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.06)" }}
      >
        <div>
          <div className="text-[10px] uppercase tracking-[0.34em] text-cyan-100/50">Target Lock</div>
          <div className="mt-2 text-[18px] font-bold tracking-[0.16em] text-white">{primaryTarget.label}</div>
          <div className="mt-1 text-[11px] tracking-[0.18em] text-cyan-100/70">高亮目标已进入动态跟踪与取证链。</div>
        </div>
        <div>
          <div className="text-[10px] uppercase tracking-[0.34em] text-cyan-100/50">Coordinates</div>
          <div className="mt-2 text-[16px] font-bold tracking-[0.14em] text-cyan-50" style={{ fontFamily: monoFont }}>
            X {primaryTarget.x.toFixed(1)} / Y {primaryTarget.y.toFixed(1)}
          </div>
        </div>
        <div>
          <div className="text-[10px] uppercase tracking-[0.34em] text-cyan-100/50">Vector</div>
          <div className="mt-2 text-[16px] font-bold tracking-[0.14em] text-fuchsia-100" style={{ fontFamily: monoFont }}>
            HDG {primaryTarget.heading} / {primaryTarget.speed.toFixed(1)} km
          </div>
        </div>
      </div>
    </div>
  );
}

function RadarBadge({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: string;
}) {
  return (
    <div
      className="bg-black/22 px-3 py-2.5 backdrop-blur-md"
      style={{ clipPath: cutCorner, boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.06)" }}
    >
      <div className="text-[9px] uppercase tracking-[0.34em] text-cyan-100/50">{label}</div>
      <div className="mt-1 text-[18px] font-bold tracking-[0.14em]" style={{ color: tone, fontFamily: monoFont }}>
        <AnimatedNumber value={value} />
      </div>
    </div>
  );
}

function RadarTarget({ target }: { target: Target }) {
  const tone = targetTone(target.level);
  return (
    <div className="absolute -translate-x-1/2 -translate-y-1/2" style={{ left: `${target.x}%`, top: `${target.y}%` }}>
      <div
        className="absolute left-1/2 top-1/2 h-12 w-12 -translate-x-1/2 -translate-y-1/2 rounded-full border"
        style={{
          borderColor: tone,
          animation: "cmd-ripple 2.1s ease-out infinite",
          animationDelay: `${target.pulseDelay}s`,
        }}
      />
      <div
        className="relative h-3.5 w-3.5 rounded-full"
        style={{
          backgroundColor: tone,
          boxShadow: `0 0 18px ${tone}`,
        }}
      />
      <div className="absolute left-5 top-1/2 -translate-y-1/2 whitespace-nowrap text-[10px] uppercase tracking-[0.24em] text-white/88">
        {target.label}
      </div>
    </div>
  );
}

function SpectrumPanel({ series }: { series: number[] }) {
  const path = series
    .map((value, index) => {
      const x = (index / (series.length - 1)) * 100;
      const y = 100 - value;
      return `${index === 0 ? "M" : "L"} ${x.toFixed(2)} ${y.toFixed(2)}`;
    })
    .join(" ");

  const fillPath = `M 0 100 ${series
    .map((value, index) => {
      const x = (index / (series.length - 1)) * 100;
      const y = 100 - value;
      return `L ${x.toFixed(2)} ${y.toFixed(2)}`;
    })
    .join(" ")} L 100 100 Z`;

  return (
    <div className="grid h-full grid-cols-[1fr_auto] gap-3">
      <div className="relative overflow-hidden bg-black/18" style={{ clipPath: cutCorner, boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.06)" }}>
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="h-full w-full">
          {[20, 40, 60, 80].map((line) => (
            <line key={line} x1="0" x2="100" y1={line} y2={line} stroke="rgba(125,246,255,0.12)" strokeDasharray="2 3" />
          ))}
          <path d={fillPath} fill="url(#spec-fill)" opacity="0.55" />
          <path d={path} fill="none" stroke="url(#spec-line)" strokeWidth="2" strokeLinecap="round" />
          <defs>
            <linearGradient id="spec-line" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#7df6ff" />
              <stop offset="100%" stopColor="#b794ff" />
            </linearGradient>
            <linearGradient id="spec-fill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="rgba(125,246,255,0.38)" />
              <stop offset="100%" stopColor="rgba(183,148,255,0.02)" />
            </linearGradient>
          </defs>
        </svg>
      </div>

      <div className="grid w-[92px] grid-rows-3 gap-3">
        <TinyValue label="Peak" value={Math.max(...series)} tone="#7df6ff" />
        <TinyValue label="Avg" value={Math.round(series.reduce((sum, value) => sum + value, 0) / series.length)} tone="#b794ff" />
        <TinyValue label="Drift" value={series[series.length - 1] - series[0]} tone="#f6f8ff" />
      </div>
    </div>
  );
}

function TinyValue({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: string;
}) {
  return (
    <div className="bg-black/18 px-2 py-2" style={{ clipPath: cutCorner, boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.06)" }}>
      <div className="text-[9px] uppercase tracking-[0.28em] text-cyan-100/48">{label}</div>
      <div className="mt-1 text-[16px] font-bold tracking-[0.12em]" style={{ color: tone, fontFamily: monoFont }}>
        <AnimatedNumber value={value} />
      </div>
    </div>
  );
}

function TargetInfo({ target }: { target: Target }) {
  const tone = targetTone(target.level);
  return (
    <div className="grid h-full grid-cols-2 gap-3">
      {[
        ["Target", target.label],
        ["Coord-X", target.x.toFixed(1)],
        ["Coord-Y", target.y.toFixed(1)],
        ["Heading", `${target.heading}°`],
        ["Velocity", `${target.speed.toFixed(1)} km`],
        ["Level", target.level.toUpperCase()],
      ].map(([label, value]) => (
        <div key={label} className="bg-black/18 px-3 py-3" style={{ clipPath: cutCorner, boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.06)" }}>
          <div className="text-[9px] uppercase tracking-[0.3em] text-cyan-100/48">{label}</div>
          <div className="mt-2 text-[14px] font-bold tracking-[0.12em]" style={{ color: tone, fontFamily: monoFont }}>
            {value}
          </div>
        </div>
      ))}
    </div>
  );
}

function ActionLink({
  href,
  label,
  desc,
}: {
  href: string;
  label: string;
  desc: string;
}) {
  return (
    <Link
      href={href}
      className="group flex items-center justify-between gap-3 bg-black/18 px-3 py-3 transition duration-300 hover:-translate-y-1 hover:shadow-[0_0_20px_rgba(125,246,255,0.10)]"
      style={{ clipPath: cutCorner, boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.06)" }}
    >
      <div>
        <div className="text-[12px] font-semibold tracking-[0.16em] text-white">{label}</div>
        <div className="mt-1 text-[10px] tracking-[0.12em] text-cyan-100/58">{desc}</div>
      </div>
      <ChevronRight size={18} className="text-cyan-100/74 transition duration-300 group-hover:translate-x-1 group-hover:text-white" />
    </Link>
  );
}

function AlertRow({
  alert,
  index,
}: {
  alert: AlertItem;
  index: number;
}) {
  const tone = alertTone(alert.level);
  return (
    <div
      className={`relative overflow-hidden bg-black/18 px-3 py-3 transition duration-300 hover:-translate-y-1 hover:shadow-[0_0_22px_rgba(125,246,255,0.10)] ${alert.level === "critical" ? "animate-[cmd-alert_1.8s_ease-in-out_infinite]" : ""}`}
      style={{
        clipPath: cutCorner,
        boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.06)",
        animationDelay: `${index * 80}ms`,
      }}
    >
      <div className="absolute bottom-0 left-0 top-0 w-[3px]" style={{ backgroundColor: tone, boxShadow: `0 0 16px ${tone}` }} />
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[12px] font-semibold tracking-[0.14em] text-white">{alert.title}</span>
            <span className="text-[9px] uppercase tracking-[0.28em]" style={{ color: tone }}>
              {alert.level}
            </span>
          </div>
          <div className="mt-2 text-[11px] leading-5 tracking-[0.08em] text-cyan-100/66">{alert.detail}</div>
        </div>
        <div className="text-[10px] uppercase tracking-[0.28em] text-cyan-100/46" style={{ fontFamily: monoFont }}>
          {alert.time}
        </div>
      </div>
    </div>
  );
}

function AnimatedNumber({
  value,
  decimals = 0,
}: {
  value: number;
  decimals?: number;
}) {
  const [display, setDisplay] = useState(value);

  useEffect(() => {
    const start = display;
    const end = value;
    const duration = 520;
    const begin = performance.now();
    let frame = 0;

    const tick = (time: number) => {
      const progress = clamp((time - begin) / duration, 0, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(start + (end - start) * eased);
      if (progress < 1) {
        frame = window.requestAnimationFrame(tick);
      }
    };

    frame = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(frame);
  }, [display, value]);

  return <>{display.toFixed(decimals)}</>;
}
