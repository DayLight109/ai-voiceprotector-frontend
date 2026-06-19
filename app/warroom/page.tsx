"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  AlertTriangle,
  ArrowLeft,
  ChevronRight,
  Clock3,
  Cpu,
  Gauge,
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
  unit?: "percent" | "mbps" | "count";
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

const emptyMetrics: Metric[] = [
  { id: "cpu", label: "CPU LOAD", value: 0, min: 0, max: 100, delta: 0, unit: "percent" },
  { id: "memory", label: "MEMORY GRID", value: 0, min: 0, max: 100, delta: 0, unit: "percent" },
  { id: "network", label: "NETWORK FLOW", value: 0, min: 0, max: 1000, delta: 0, unit: "mbps" },
  { id: "goroutines", label: "GOROUTINES", value: 0, min: 0, max: 10000, delta: 0, unit: "count" },
];

const metricIcons = {
  cpu: Cpu,
  memory: Gauge,
  network: Network,
  goroutines: Workflow,
};

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
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

function stableHash(input: string) {
  let hash = 2166136261;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function targetFromEvent(ev: FeedEvent, level: Target["level"]): Target {
  const hash = stableHash(`${ev.id}:${ev.side}:${ev.payload}`);
  return {
    id: `feed-${ev.id}`,
    x: 18 + (hash % 64),
    y: 16 + (Math.floor(hash / 97) % 68),
    label: ev.side.slice(0, 9).toUpperCase(),
    heading: hash % 360,
    speed: Number((4 + ((hash >>> 8) % 120) / 10).toFixed(1)),
    level,
    pulseDelay: ((hash >>> 16) % 6) * 0.16,
  };
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
  const [metrics, setMetrics] = useState(emptyMetrics);
  const [devices, setDevices] = useState<Device[]>([]);
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [logs, setLogs] = useState<string[]>([]);
  const [targets, setTargets] = useState<Target[]>([]);
  const [signal, setSignal] = useState<number[]>([]);
  const [threatIndex, setThreatIndex] = useState(0);
  const [sessions, setSessions] = useState(0);
  const [blocked, setBlocked] = useState(0);
  const [integrity, setIntegrity] = useState(100);

  // ── 真实后端接入状态 ───────────────────────────────────
  // defcon: 真实防御等级(/api/v1/defcon); feedSubs: SSE 订阅数。
  // 未取到后端数据时保持空态或 0 值，不再使用本地假数据兜底。
  const [defcon, setDefcon] = useState<number | null>(null);
  const [defconWarn, setDefconWarn] = useState<string | null>(null);
  const [feedSubs, setFeedSubs] = useState<number | null>(null);

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

  // ── 轮询 /api/v1/warroom/overview:runtime 指标 + 计数器 + 引擎统计 ──
  // 成功后四个系统指标卡、Blocked/Sessions/Integrity/Threat 全部由真实数据驱动。
  useEffect(() => {
    let stop = false;
    const pull = async () => {
      try {
        const ov = await api.warroom.overview();
        if (stop) return;
        const rt = ov.runtime;
        const mbps = ((rt.netRxBps + rt.netTxBps) * 8) / 1_000_000;
        setMetrics([
          { id: "cpu", label: "CPU LOAD", value: Math.round(rt.cpuPct), min: 0, max: 100, delta: 0, unit: "percent" },
          { id: "memory", label: "MEMORY GRID", value: Math.round(rt.memPct), min: 0, max: 100, delta: 0, unit: "percent" },
          { id: "network", label: "NETWORK FLOW", value: Number(mbps.toFixed(1)), min: 0, max: 1000, delta: 0, unit: "mbps" },
          { id: "goroutines", label: "GOROUTINES", value: rt.goroutines, min: 0, max: 10000, delta: 0, unit: "count" },
        ]);
        setBlocked(ov.counters.blockedCalls);
        setSessions(ov.counters.interceptedCalls);
        setDefcon(ov.defcon);
        setFeedSubs(ov.hub?.subscribers ?? null);
        // Integrity = 引擎判决成功率;无判决时视为 100%
        const tot = ov.engine.analyzed + ov.engine.failed;
        setIntegrity(tot > 0 ? Number(((ov.engine.analyzed / tot) * 100).toFixed(1)) : 100);
        // threatIndex 用 AI 克隆 + 话术命中的相对热度粗略映射到 0-100 观感
        const heat = Math.min(98, 42 + ov.counters.aiCloneDetected * 6 + ov.counters.scriptHits * 2);
        setThreatIndex(Math.round(heat));
      } catch {
        // 静默：未同步成功时保持空态或 0 值。
      }
    };
    void pull();
    const id = window.setInterval(pull, 5000);
    return () => { stop = true; window.clearInterval(id); };
  }, []);

  // ── 设备列表：真实 /api/v1/devices ─────────
  useEffect(() => {
    let alive = true;
    api.devices.list({ pageSize: 8 })
      .then((r) => {
        if (!alive) return;
        const rows = r.data ?? [];
        if (!rows.length) return;
        setDevices(rows.slice(0, 6).map((d) => ({
          id: d.id,
          name: d.name,
          zone: d.type === "enterprise" ? "ENTERPRISE" : "FAMILY",
          // health 为真实在线状态的固定映射(online/warn/offline),非实测值
          health: d.status === "online" ? 98 : d.status === "warn" ? 65 : 30,
          state: d.status === "online" ? "online" : d.status === "warn" ? "watch" : "risk",
        })));
      })
      .catch(() => {});
    return () => { alive = false; };
  }, []);

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
            targetFromEvent(ev, targetLevel),
            ...prev,
          ].slice(0, 7));
        }
      },
    });

    return () => stop();
  }, []);

  const primaryTarget = targets[0] ?? null;
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
                <div className="text-[calc(11px*var(--fz))] uppercase tracking-[0.44em] text-cyan-100/60">
                  Sentinel Tactical Screen
                </div>
                <h1 className="text-[calc(32px*var(--fz))] font-black tracking-[0.18em] text-white">
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
              <span className="text-[calc(9px*var(--fz))] uppercase tracking-[0.3em] text-cyan-100/45">Set Defcon</span>
              <div className="flex gap-1">
                {[5, 4, 3, 2, 1].map((n) => {
                  const active = n === defcon;
                  return (
                    <button
                      key={n}
                      type="button"
                      onClick={() => pickDefcon(n)}
                      className="h-6 w-6 text-[calc(11px*var(--fz))] font-bold transition duration-200 hover:scale-110"
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
                <span className="text-[calc(10px*var(--fz))] tracking-[0.1em]" style={{ color: "#ffb347" }}>
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
              <div className="text-[calc(10px*var(--fz))] uppercase tracking-[0.36em] text-cyan-100/55">
                Tactical Time
              </div>
              <div
                className="mt-1 text-[calc(20px*var(--fz))] font-bold tracking-[0.14em] text-cyan-50"
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
                <SmallStat label="Intercepted" value={sessions} tone="#7df6ff" />
                <SmallStat label="Target Lock" value={targets.length} tone="#b794ff" />
                <SmallStat label="Critical Alerts" value={criticalAlerts} tone="#ff7b9a" />
                <SmallStat label="Feed Subs" value={feedSubs ?? 0} tone="#d8f8ff" />
              </div>
            </GlassPanel>

            <GlassPanel
              title="设备列表"
              subtitle="Device Matrix"
              icon={Server}
              accent="violet"
            >
              <div className="space-y-3">
                {devices.length > 0 ? (
                  devices.map((device) => (
                    <DeviceRow key={device.id} device={device} />
                  ))
                ) : (
                  <EmptyPanelText text="等待真实设备数据" />
                )}
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
              subtitle="Real-time Events"
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
                subtitle="Signal"
                icon={Activity}
                accent="violet"
                compact
              >
                <SpectrumPanel series={signal} />
              </GlassPanel>

              <GlassPanel
                title="目标坐标"
                subtitle="Coordinates"
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
                {alerts.length > 0 ? (
                  alerts.map((alert, index) => (
                    <AlertRow key={alert.id} alert={alert} index={index} />
                  ))
                ) : (
                  <EmptyPanelText text="等待真实告警事件" />
                )}
              </div>
            </GlassPanel>

            <GlassPanel
              title="实时日志"
              subtitle="Command Logs"
              icon={Clock3}
              accent="cyan"
            >
              <div className="space-y-2.5">
                {logs.length > 0 ? (
                  logs.map((log, index) => (
                    <div
                      key={`${log}-${index}`}
                      className="group bg-black/18 px-3 py-2.5 text-[calc(11px*var(--fz))] uppercase tracking-[0.24em] text-cyan-100/72 transition duration-300 hover:text-white"
                      style={{
                        clipPath: cutCorner,
                        boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.05)",
                      }}
                    >
                      {log}
                    </div>
                  ))
                ) : (
                  <EmptyPanelText text="等待真实日志事件" />
                )}
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
              <div className="text-[calc(16px*var(--fz))] font-bold tracking-[0.12em] text-white">{title}</div>
              <div className="text-[calc(10px*var(--fz))] uppercase tracking-[0.36em] text-cyan-100/52">{subtitle}</div>
            </div>
          </div>
          <div className="h-px flex-1 bg-[linear-gradient(90deg,rgba(125,246,255,0.35),transparent)]" />
        </div>

        <div className="mt-4 min-h-0 flex-1">{children}</div>
      </div>
    </section>
  );
}

function EmptyPanelText({ text }: { text: string }) {
  return (
    <div
      className="flex min-h-[92px] items-center justify-center bg-black/18 px-3 py-4 text-center text-[calc(11px*var(--fz))] uppercase tracking-[0.24em] text-cyan-100/42"
      style={{ clipPath: cutCorner, boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.05)", fontFamily: monoFont }}
    >
      {text}
    </div>
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
      <div className="text-[calc(10px*var(--fz))] uppercase tracking-[0.34em] text-cyan-100/55">{label}</div>
      <div
        className="mt-1 text-[calc(18px*var(--fz))] font-bold tracking-[0.12em]"
        style={{ color: tone, fontFamily: monoFont }}
      >
        {value}
      </div>
    </div>
  );
}

function MetricStrip({ metric }: { metric: Metric }) {
  const Icon = metricIcons[metric.id as keyof typeof metricIcons] ?? Cpu;
  const unit = metric.unit ?? "percent";
  // 非百分比指标按经验量程折算进度条宽度
  const barPct =
    unit === "percent"
      ? metric.value
      : unit === "mbps"
      ? Math.min(100, metric.value * 2)
      : Math.min(100, metric.value / 5);
  const warn = barPct > 82;
  const soft =
    metric.id === "network"
      ? "from-cyan-300 via-violet-400 to-fuchsia-400"
      : metric.id === "goroutines"
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
            <div className="text-[calc(11px*var(--fz))] uppercase tracking-[0.34em] text-cyan-100/60">{metric.label}</div>
            <div className="mt-1 text-[calc(11px*var(--fz))] tracking-[0.18em] text-white/78">
              {warn ? "警戒波动" : "稳定运行"}
            </div>
          </div>
        </div>
        <div className="text-right">
          <div
            className="text-[calc(28px*var(--fz))] font-black tracking-[0.12em]"
            style={{ color: warn ? "#ffb347" : "#7df6ff", fontFamily: monoFont }}
          >
            <AnimatedNumber value={metric.value} decimals={unit === "mbps" ? 1 : 0} />
          </div>
          <div className="text-[calc(10px*var(--fz))] uppercase tracking-[0.3em] text-cyan-100/48">{unit}</div>
        </div>
      </div>

      <div className="mt-3 h-[3px] bg-white/8">
        <div
          className={`h-full bg-gradient-to-r ${soft} transition-[width] duration-1000`}
          style={{
            width: `${barPct}%`,
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
      <div className="text-[calc(10px*var(--fz))] uppercase tracking-[0.32em] text-cyan-100/48">{label}</div>
      <div
        className="mt-2 text-[calc(22px*var(--fz))] font-bold tracking-[0.12em]"
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
        <div className="text-[calc(12px*var(--fz))] font-semibold tracking-[0.16em] text-white">{device.name}</div>
        <div className="mt-1 text-[calc(10px*var(--fz))] uppercase tracking-[0.32em] text-cyan-100/48">{device.zone}</div>
      </div>
      <div className="text-right">
        <div
          className="text-[calc(20px*var(--fz))] font-bold tracking-[0.12em]"
          style={{ color: tone, fontFamily: monoFont }}
        >
          <AnimatedNumber value={device.health} />
        </div>
        <div className="mt-1 inline-flex items-center gap-2 text-[calc(10px*var(--fz))] uppercase tracking-[0.24em]" style={{ color: tone }}>
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
      className="group flex items-center justify-center gap-2 bg-black/18 px-3 py-3 text-[calc(11px*var(--fz))] uppercase tracking-[0.26em] text-cyan-100/75 transition duration-300 hover:text-white"
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
  primaryTarget: Target | null;
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

      {targets.length === 0 && (
        <div
          className="absolute left-1/2 top-1/2 w-[min(360px,70%)] -translate-x-1/2 -translate-y-1/2 bg-black/24 px-4 py-4 text-center text-[calc(11px*var(--fz))] uppercase tracking-[0.26em] text-cyan-100/52"
          style={{ clipPath: cutCorner, boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.06)", fontFamily: monoFont }}
        >
          等待真实事件进入扫描区
        </div>
      )}

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
          <div className="text-[calc(10px*var(--fz))] uppercase tracking-[0.34em] text-cyan-100/50">Target Lock</div>
          <div className="mt-2 text-[calc(18px*var(--fz))] font-bold tracking-[0.16em] text-white">{primaryTarget?.label ?? "NO TARGET"}</div>
          <div className="mt-1 text-[calc(11px*var(--fz))] tracking-[0.18em] text-cyan-100/70">
            {primaryTarget ? "高亮目标已进入动态跟踪与取证链。" : "等待真实告警或事件流。"}
          </div>
        </div>
        <div>
          <div className="text-[calc(10px*var(--fz))] uppercase tracking-[0.34em] text-cyan-100/50">Coordinates</div>
          <div className="mt-2 text-[calc(16px*var(--fz))] font-bold tracking-[0.14em] text-cyan-50" style={{ fontFamily: monoFont }}>
            {primaryTarget ? `X ${primaryTarget.x.toFixed(1)} / Y ${primaryTarget.y.toFixed(1)}` : "X -- / Y --"}
          </div>
        </div>
        <div>
          <div className="text-[calc(10px*var(--fz))] uppercase tracking-[0.34em] text-cyan-100/50">Vector</div>
          <div className="mt-2 text-[calc(16px*var(--fz))] font-bold tracking-[0.14em] text-fuchsia-100" style={{ fontFamily: monoFont }}>
            {primaryTarget ? `HDG ${primaryTarget.heading} / ${primaryTarget.speed.toFixed(1)} km` : "HDG -- / -- km"}
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
      <div className="text-[calc(9px*var(--fz))] uppercase tracking-[0.34em] text-cyan-100/50">{label}</div>
      <div className="mt-1 text-[calc(18px*var(--fz))] font-bold tracking-[0.14em]" style={{ color: tone, fontFamily: monoFont }}>
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
      <div className="absolute left-5 top-1/2 -translate-y-1/2 whitespace-nowrap text-[calc(10px*var(--fz))] uppercase tracking-[0.24em] text-white/88">
        {target.label}
      </div>
    </div>
  );
}

function SpectrumPanel({ series }: { series: number[] }) {
  if (series.length < 2) {
    return (
      <div className="grid h-full grid-cols-[1fr_auto] gap-3">
        <div className="relative flex items-center justify-center overflow-hidden bg-black/18" style={{ clipPath: cutCorner, boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.06)" }}>
          <div className="text-center text-[calc(11px*var(--fz))] uppercase tracking-[0.26em] text-cyan-100/42" style={{ fontFamily: monoFont }}>
            等待真实信号数据
          </div>
        </div>
        <div className="grid w-[92px] grid-rows-3 gap-3">
          <TinyValue label="Peak" value={0} tone="#7df6ff" />
          <TinyValue label="Avg" value={0} tone="#b794ff" />
          <TinyValue label="Drift" value={0} tone="#f6f8ff" />
        </div>
      </div>
    );
  }

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
      <div className="text-[calc(9px*var(--fz))] uppercase tracking-[0.28em] text-cyan-100/48">{label}</div>
      <div className="mt-1 text-[calc(16px*var(--fz))] font-bold tracking-[0.12em]" style={{ color: tone, fontFamily: monoFont }}>
        <AnimatedNumber value={value} />
      </div>
    </div>
  );
}

function TargetInfo({ target }: { target: Target | null }) {
  if (!target) return <EmptyPanelText text="等待真实目标坐标" />;

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
          <div className="text-[calc(9px*var(--fz))] uppercase tracking-[0.3em] text-cyan-100/48">{label}</div>
          <div className="mt-2 text-[calc(14px*var(--fz))] font-bold tracking-[0.12em]" style={{ color: tone, fontFamily: monoFont }}>
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
        <div className="text-[calc(12px*var(--fz))] font-semibold tracking-[0.16em] text-white">{label}</div>
        <div className="mt-1 text-[calc(10px*var(--fz))] tracking-[0.12em] text-cyan-100/58">{desc}</div>
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
            <span className="text-[calc(12px*var(--fz))] font-semibold tracking-[0.14em] text-white">{alert.title}</span>
            <span className="text-[calc(9px*var(--fz))] uppercase tracking-[0.28em]" style={{ color: tone }}>
              {alert.level}
            </span>
          </div>
          <div className="mt-2 text-[calc(11px*var(--fz))] leading-5 tracking-[0.08em] text-cyan-100/66">{alert.detail}</div>
        </div>
        <div className="text-[calc(10px*var(--fz))] uppercase tracking-[0.28em] text-cyan-100/46" style={{ fontFamily: monoFont }}>
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
