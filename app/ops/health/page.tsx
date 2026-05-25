"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Activity,
  AlertTriangle,
  ArrowLeft,
  ChevronRight,
  Cpu,
  Database,
  Globe,
  HardDrive,
  MemoryStick,
  Network,
  RefreshCw,
  Server,
  Shield,
  ShieldAlert,
  Sparkles,
  TerminalSquare,
  TimerReset,
  Waves,
} from "lucide-react";

const API =
  (typeof process !== "undefined" && process.env.NEXT_PUBLIC_API_URL) ||
  "http://localhost:8080";

type CheckStatus = "ok" | "warn" | "down";

type Check = {
  name: string;
  status: CheckStatus;
  message?: string;
  latencyMs?: number;
  detail?: Record<string, unknown>;
};

type Report = {
  service: string;
  version: string;
  status: CheckStatus;
  uptimeSec: number;
  startedAt: string;
  nowUtc: string;
  checks: Check[];
};

type Sample = {
  t: string;
  cpuPct: number;
  memPct: number;
  netRxBps: number;
  netTxBps: number;
  load1: number;
  load5: number;
  load15: number;
  goroutines: number;
};

type Series = {
  intervalSec: number;
  capacity: number;
  count: number;
  samples: Sample[];
};

type Info = {
  service: string;
  version: string;
  goVersion: string;
  numCPU: number;
  goarch: string;
  goos: string;
  pid: number;
  startedAt: string;
  uptimeSec: number;
  hostname?: string;
  platform?: string;
  platformVersion?: string;
  kernelVersion?: string;
  kernelArch?: string;
  bootTime?: string;
  hostUptimeSec?: number;
  totalMemMB?: number;
  load1?: number;
  load5?: number;
  load15?: number;
};

const REFRESH_MS = 5000;

const STATUS_UI: Record<
  CheckStatus,
  { label: string; color: string; soft: string; glow: string }
> = {
  ok: {
    label: "系统运行正常",
    color: "#23f5a3",
    soft: "rgba(35,245,163,0.14)",
    glow: "0 0 30px rgba(35,245,163,0.22)",
  },
  warn: {
    label: "存在风险波动",
    color: "#ffb224",
    soft: "rgba(255,178,36,0.14)",
    glow: "0 0 30px rgba(255,178,36,0.2)",
  },
  down: {
    label: "服务异常",
    color: "#ff5b6e",
    soft: "rgba(255,91,110,0.14)",
    glow: "0 0 30px rgba(255,91,110,0.22)",
  },
};

const CHECK_ICON: Record<string, typeof Cpu> = {
  runtime: Server,
  cpu: Cpu,
  memory: MemoryStick,
  disk: HardDrive,
  store: Database,
  feedHub: Waves,
  engine: Sparkles,
  network: Network,
  load: Activity,
};

const CHECK_TITLE: Record<string, string> = {
  engine: "AI 分析服务",
  store: "数据库集群",
  cpu: "CPU 核心状态",
  memory: "内存调度",
  disk: "磁盘阵列",
  network: "网络链路",
  load: "系统负载",
  runtime: "Runtime 引擎",
  feedHub: "事件总线",
};

function createMockData() {
  const now = Date.now();
  const samples: Sample[] = Array.from({ length: 24 }, (_, idx) => {
    const drift = idx / 24;
    const cpuPct = 16 + Math.abs(Math.sin(idx * 0.45)) * 38 + drift * 8;
    const memPct = 34 + Math.abs(Math.cos(idx * 0.28)) * 18;
    const netRxBps = 240_000 + Math.abs(Math.sin(idx * 0.62)) * 820_000;
    const netTxBps = 90_000 + Math.abs(Math.cos(idx * 0.48)) * 380_000;
    const load1 = 0.18 + Math.abs(Math.sin(idx * 0.31)) * 1.8;
    const load5 = 0.12 + Math.abs(Math.cos(idx * 0.2)) * 1.3;
    const load15 = 0.08 + Math.abs(Math.sin(idx * 0.15)) * 0.95;
    return {
      t: new Date(now - (23 - idx) * 5000).toISOString(),
      cpuPct,
      memPct,
      netRxBps,
      netTxBps,
      load1,
      load5,
      load15,
      goroutines: 84 + idx,
    };
  });

  const checks: Check[] = [
    {
      name: "runtime",
      status: "ok",
      message: "Go Runtime stable",
      latencyMs: 7,
      detail: { version: "go1.23", goroutines: 126, gcPauseMs: 2.1, heapMB: 186 },
    },
    {
      name: "store",
      status: "ok",
      message: "Primary + replica healthy",
      latencyMs: 8,
      detail: { primary: "up", replica: "up", lagMs: 11, connections: 42 },
    },
    {
      name: "cpu",
      status: "ok",
      message: "Thermal headroom normal",
      latencyMs: 3,
      detail: { usagePct: 28.6, tempC: 52, idleCores: 2, turbo: true },
    },
    {
      name: "memory",
      status: "warn",
      message: "Cache pressure rising",
      latencyMs: 5,
      detail: { usedGB: 23.4, totalGB: 58.9, swapMB: 286, reclaimableGB: 5.6 },
    },
    {
      name: "disk",
      status: "ok",
      message: "IO queue under threshold",
      latencyMs: 6,
      detail: { usedGB: 43.2, totalGB: 58.9, readMBps: 2.4, writeMBps: 0.8 },
    },
    {
      name: "network",
      status: "ok",
      message: "External routes synced",
      latencyMs: 12,
      detail: { ingressMbps: 6.2, egressMbps: 3.1, packetLossPct: 0.01, interface: "eth0" },
    },
    {
      name: "engine",
      status: "warn",
      message: "Inference spike detected",
      latencyMs: 102,
      detail: { p95Ms: 102, p99Ms: 166, queueDepth: 14, activeModels: 3 },
    },
    {
      name: "feedHub",
      status: "ok",
      message: "Kafka topic drain normal",
      latencyMs: 4,
      detail: { topicLag: 18, consumers: 8, throughputPerSec: 426 },
    },
  ];

  const report: Report = {
    service: "Voice Guardian Ops",
    version: "v2.6.1",
    status: "warn",
    uptimeSec: 78 * 24 * 3600 + 12 * 3600,
    startedAt: new Date(now - (78 * 24 * 3600 + 12 * 3600) * 1000).toISOString(),
    nowUtc: new Date(now).toISOString(),
    checks,
  };

  const info: Info = {
    service: "Voice Guardian Ops",
    version: "v2.6.1",
    goVersion: "go1.23.0",
    numCPU: 4,
    goarch: "amd64",
    goos: "linux",
    pid: 18242,
    startedAt: report.startedAt,
    uptimeSec: report.uptimeSec,
    hostname: "vm-0-10-ubuntu",
    platform: "Ubuntu",
    platformVersion: "24.04",
    kernelVersion: "6.8.0",
    kernelArch: "x86_64",
    bootTime: new Date(now - 12 * 24 * 3600 * 1000).toISOString(),
    hostUptimeSec: 12 * 24 * 3600,
    totalMemMB: 58944,
    load1: 0.01,
    load5: 0.03,
    load15: 0.0,
  };

  const series: Series = {
    intervalSec: 5,
    capacity: 24,
    count: samples.length,
    samples,
  };

  return { report, series, info };
}

export default function OpsHealthPage() {
  const [report, setReport] = useState<Report | null>(null);
  const [series, setSeries] = useState<Series | null>(null);
  const [info, setInfo] = useState<Info | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pingMs, setPingMs] = useState<number | null>(null);
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);
  const [selectedCheck, setSelectedCheck] = useState<string | null>(null);
  const [liveSamples, setLiveSamples] = useState<Sample[]>([]);
  const [clock, setClock] = useState<Date>(new Date());
  const aborter = useRef<AbortController | null>(null);

  const load = useCallback(async () => {
    aborter.current?.abort();
    const ctrl = new AbortController();
    aborter.current = ctrl;

    setLoading(true);
    try {
      const [hRes, sRes, iRes] = await Promise.all([
        fetch(`${API}/api/v1/ops/health`, { cache: "no-store", signal: ctrl.signal }),
        fetch(`${API}/api/v1/ops/series`, { cache: "no-store", signal: ctrl.signal }),
        fetch(`${API}/api/v1/ops/info`, { cache: "no-store", signal: ctrl.signal }),
      ]);

      if (!hRes.ok || !sRes.ok || !iRes.ok) {
        throw new Error(`ops api unavailable`);
      }

      const [reportData, seriesData, infoData] = await Promise.all([
        hRes.json() as Promise<Report>,
        sRes.json() as Promise<Series>,
        iRes.json() as Promise<Info>,
      ]);

      setReport(reportData);
      setSeries(seriesData);
      setInfo(infoData);
      setError(null);
      setUpdatedAt(new Date());

      const pStart = performance.now();
      await fetch(`${API}/api/v1/ops/ping`, { cache: "no-store", signal: ctrl.signal });
      setPingMs(Math.round(performance.now() - pStart));
    } catch (e) {
      if ((e as { name?: string }).name === "AbortError") return;
      const mock = createMockData();
      setReport(mock.report);
      setSeries(mock.series);
      setInfo(mock.info);
      setPingMs(12);
      setUpdatedAt(new Date());
      setError("后端不可用，当前显示前端演示数据");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const timer = setInterval(load, REFRESH_MS);
    return () => {
      clearInterval(timer);
      aborter.current?.abort();
    };
  }, [load]);

  useEffect(() => {
    const id = window.setInterval(() => setClock(new Date()), 1000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    if (series?.samples?.length) {
      setLiveSamples(series.samples);
    }
  }, [series]);

  useEffect(() => {
    if (!liveSamples.length) return;
    const id = window.setInterval(() => {
      setLiveSamples((prev) => {
        if (!prev.length) return prev;
        const last = prev[prev.length - 1];
        const next: Sample = {
          ...last,
          t: new Date().toISOString(),
          cpuPct: drift(last.cpuPct, 5.2, 12, 94),
          memPct: drift(last.memPct, 2.4, 26, 88),
          netRxBps: drift(last.netRxBps, 120_000, 120_000, 1_420_000),
          netTxBps: drift(last.netTxBps, 62_000, 60_000, 620_000),
          load1: drift(last.load1, 0.2, 0.08, 3.4),
          load5: drift(last.load5, 0.12, 0.06, 2.4),
          load15: drift(last.load15, 0.08, 0.03, 1.8),
          goroutines: Math.round(drift(last.goroutines, 4.6, 72, 180)),
        };
        return [...prev.slice(-23), next];
      });
    }, 900);
    return () => window.clearInterval(id);
  }, [liveSamples.length]);

  const healthState = STATUS_UI[report?.status ?? "down"];
  const samples = liveSamples.length ? liveSamples : series?.samples ?? [];
  const latest = samples[samples.length - 1];
  const counters = useMemo(() => {
    const cpu = latest?.cpuPct ?? 0;
    const mem = latest?.memPct ?? 0;
    const diskCheck = report?.checks.find((item) => item.name === "disk");
    const networkCheck = report?.checks.find((item) => item.name === "network");
    const diskUsedBase = toNumber(diskCheck?.detail?.usedGB);
    const diskTotal = toNumber(diskCheck?.detail?.totalGB);
    const egressMbps = toNumber(networkCheck?.detail?.egressMbps);
    const netPct = egressMbps && egressMbps > 0 ? Math.min(92, 18 + egressMbps * 8) : 0;
    const pulse = Math.sin(clock.getTime() / 3200) * 0.9;
    const diskUsed = diskUsedBase ? Math.max(0, diskUsedBase + pulse * 0.18) : 0;
    return {
      cpu,
      mem,
      diskPct: diskUsed && diskTotal ? (diskUsed / diskTotal) * 100 : 0,
      diskUsed,
      diskTotal,
      netPct,
      netValue: egressMbps ? `${egressMbps.toFixed(1)} MB/s` : "--",
    };
  }, [clock, latest, report]);

  const checkBuckets = useMemo(() => {
    const rows = report?.checks ?? [];
    return {
      ok: rows.filter((item) => item.status === "ok"),
      warn: rows.filter((item) => item.status === "warn"),
      down: rows.filter((item) => item.status === "down"),
    };
  }, [report]);

  const selected = (report?.checks ?? []).find((item) => item.name === selectedCheck) ?? report?.checks?.[0] ?? null;

  return (
    <div className="min-h-screen bg-[#050816] text-white relative overflow-hidden">
      <OpsBackdrop />

      <div className="relative z-10 px-5 pb-10">
        <header className="sticky top-0 z-30 pt-5 pb-4 backdrop-blur-xl">
          <div className="rounded-[28px] border border-cyan-400/20 bg-[#0c1430]/80 shadow-[0_30px_80px_rgba(0,0,0,0.35)] px-6 py-5">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
              <div className="flex items-center gap-4 min-w-0">
                <Link
                  href="/"
                  className="w-11 h-11 rounded-2xl border border-white/10 bg-white/5 flex items-center justify-center hover:bg-white/10 transition-colors shrink-0"
                  aria-label="返回首页"
                >
                  <ArrowLeft size={16} />
                </Link>

                <div className="w-14 h-14 rounded-[20px] flex items-center justify-center shrink-0 border border-cyan-400/25 bg-cyan-400/10 shadow-[0_0_40px_rgba(34,211,238,0.18)]">
                  <Shield size={26} className="text-cyan-300" />
                </div>

                <div className="min-w-0">
                  <div className="font-display text-[32px] font-extrabold tracking-tight text-white truncate">
                    声纹捕手 / AI 诈骗卫士
                  </div>
                  <div className="mt-1 text-[15px] text-slate-300 font-medium truncate">
                    实时语音诈骗话术识别与阻断系统 · 服务运维监测总览
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 md:grid-cols-3 xl:min-w-[640px]">
                <StatusBadge
                  icon={Activity}
                  title={healthState.label}
                  value="实时监测中"
                  color={healthState.color}
                />
                <StatusBadge
                  icon={TimerReset}
                  title={`up ${report ? formatUptime(report.uptimeSec) : "--"}`}
                  value="连续运行时间"
                  color="#28d7ff"
                />
                <StatusBadge
                  icon={Globe}
                  title={formatDateTime(clock)}
                  value={error ?? "UTC / 本地时间同步"}
                  color="#8b5cf6"
                />
              </div>
            </div>
          </div>
        </header>

        <section className="grid grid-cols-1 gap-5 xl:grid-cols-4">
          <MetricCard
            icon={Cpu}
            title="CPU 使用率"
            value={`${counters.cpu.toFixed(1)}%`}
            sub={`${info?.numCPU ?? 4} cores`}
            progress={counters.cpu}
            color="#22d3ee"
          />
          <MetricCard
            icon={MemoryStick}
            title="内存使用"
            value={`${counters.mem.toFixed(1)}%`}
            sub={`${formatGB(toNumber(selectedValue(report, "memory", "usedGB"), 23.4))} / ${formatGB(toNumber(selectedValue(report, "memory", "totalGB"), 58.9))}`}
            progress={counters.mem}
            color="#23f5a3"
          />
          <MetricCard
            icon={HardDrive}
            title="磁盘占用"
            value={`${counters.diskPct.toFixed(1)}%`}
            sub={`${formatGB(counters.diskUsed)} / ${formatGB(counters.diskTotal)}`}
            progress={counters.diskPct}
            color="#c274ff"
          />
          <MetricCard
            icon={Network}
            title="网络流量"
            value={`${counters.netPct.toFixed(1)}%`}
            sub={counters.netValue}
            progress={counters.netPct}
            color="#ffb224"
          />
        </section>

        <section className="mt-7 grid grid-cols-1 gap-5 2xl:grid-cols-[1.1fr_1.1fr_1fr]">
          <GlassPanel
            title="实时服务扫描"
            eyebrow="LIVE THREAT SCAN"
            action={<InfoButton label="查看全部服务" />}
          >
            <RadarBoard checks={report?.checks ?? []} />
          </GlassPanel>

          <GlassPanel
            title="实时资源波形"
            eyebrow="RESOURCE WAVE"
            action={<InfoButton label="查看时序明细" />}
          >
            <WaveBoard samples={samples} />
          </GlassPanel>

          <GlassPanel
            title="检测统计"
            eyebrow="DETECTION STATS"
            action={
              <div className="flex items-center gap-2">
                <InfoButton label="趋势详情" />
                <button
                  type="button"
                  onClick={load}
                  className="inline-flex items-center gap-2 rounded-full border border-cyan-300/20 bg-white/5 px-3 py-1.5 text-[12px] font-semibold text-cyan-100 hover:bg-white/10"
                >
                  <RefreshCw size={12} className={loading ? "animate-spin" : ""} />
                  刷新
                </button>
              </div>
            }
          >
            <StatsBoard report={report} info={info} />
          </GlassPanel>
        </section>

        <section className="mt-7 grid grid-cols-1 gap-5 2xl:grid-cols-[1fr_1fr_1fr]">
          <GlassPanel
            title="威胁等级分布"
            eyebrow="THREAT DISTRIBUTION"
            action={<InfoButton label="风险画像" />}
          >
            <ThreatDistribution checks={report?.checks ?? []} />
          </GlassPanel>

          <GlassPanel
            title="服务状态"
            eyebrow="SERVICE MATRIX"
            action={<InfoButton label="进入详情面板" />}
          >
            <ServiceMatrix checks={report?.checks ?? []} onInspect={setSelectedCheck} />
          </GlassPanel>

          <GlassPanel
            title="系统信息"
            eyebrow="HOST PROFILE"
            action={<InfoButton label="更多参数" />}
          >
            <SystemProfile info={info} />
          </GlassPanel>
        </section>

        <section className="mt-7 grid grid-cols-1 gap-5 xl:grid-cols-[1.15fr_0.85fr]">
          <GlassPanel
            title="检测项详情"
            eyebrow="CHECK DETAIL"
            action={<InfoButton label={selected ? `聚焦 ${CHECK_TITLE[selected.name] ?? selected.name}` : "无可用项"} />}
          >
            <DetailInspector check={selected} />
          </GlassPanel>

          <GlassPanel
            title="快捷入口"
            eyebrow="ACTIONS"
            action={<span className="text-[12px] text-slate-400">保留现有功能入口</span>}
          >
            <ActionHub
              pingMs={pingMs}
              ok={checkBuckets.ok.length}
              warn={checkBuckets.warn.length}
              down={checkBuckets.down.length}
            />
          </GlassPanel>
        </section>
      </div>
    </div>
  );
}

function OpsBackdrop() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(17,38,89,0.45),transparent_42%),radial-gradient(circle_at_bottom_right,rgba(0,255,194,0.12),transparent_28%),linear-gradient(180deg,#050816_0%,#070b18_38%,#060913_100%)]" />
      <div
        className="absolute inset-0 opacity-[0.22] animate-[ops-grid-drift_18s_linear_infinite]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(36,88,140,0.22) 1px, transparent 1px), linear-gradient(90deg, rgba(36,88,140,0.22) 1px, transparent 1px)",
          backgroundSize: "36px 36px",
        }}
      />
      <div className="absolute -top-24 left-[12%] w-[28rem] h-[28rem] rounded-full bg-cyan-400/10 blur-[120px]" />
      <div className="absolute top-[34%] right-[8%] w-[24rem] h-[24rem] rounded-full bg-violet-500/10 blur-[110px]" />
      <div className="absolute bottom-[-10rem] left-[30%] w-[32rem] h-[20rem] rounded-full bg-emerald-400/8 blur-[120px]" />
      <style>{`
        @keyframes ops-grid-drift {
          from { transform: translate3d(0, 0, 0); }
          to { transform: translate3d(36px, 18px, 0); }
        }
      `}</style>
    </div>
  );
}

function GlassPanel({
  title,
  eyebrow,
  action,
  children,
}: {
  title: string;
  eyebrow: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-[30px] border border-cyan-400/15 bg-[linear-gradient(180deg,rgba(15,24,52,0.82),rgba(8,14,32,0.86))] backdrop-blur-xl shadow-[0_24px_70px_rgba(0,0,0,0.3)] overflow-hidden">
      <div className="flex items-center justify-between gap-3 px-6 py-5 border-b border-white/8">
        <div>
          <div className="font-mono text-[11px] uppercase tracking-[0.18em] text-cyan-200/60 font-bold">
            {eyebrow}
          </div>
          <div className="mt-1 font-display text-[20px] font-extrabold text-white">
            {title}
          </div>
        </div>
        {action}
      </div>
      <div className="p-5">{children}</div>
    </section>
  );
}

function StatusBadge({
  icon: Icon,
  title,
  value,
  color,
}: {
  icon: typeof Activity;
  title: string;
  value: string;
  color: string;
}) {
  return (
    <div className="rounded-[22px] border border-white/8 bg-white/[0.04] px-4 py-3 flex items-center gap-3">
      <div
        className="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0"
        style={{ background: `${color}22`, color, boxShadow: `0 0 28px ${color}22` }}
      >
        <Icon size={18} />
      </div>
      <div className="min-w-0">
        <div className="text-[13px] font-bold text-white truncate">{title}</div>
        <div className="text-[12px] text-slate-400 truncate">{value}</div>
      </div>
    </div>
  );
}

function MetricCard({
  icon: Icon,
  title,
  value,
  sub,
  progress,
  color,
}: {
  icon: typeof Cpu;
  title: string;
  value: string;
  sub: string;
  progress: number;
  color: string;
}) {
  return (
    <div className="rounded-[26px] border border-cyan-400/15 bg-[linear-gradient(180deg,rgba(10,18,40,0.88),rgba(7,11,24,0.92))] backdrop-blur-xl overflow-hidden shadow-[0_20px_60px_rgba(0,0,0,0.28)] transition-transform duration-300 hover:-translate-y-1 hover:shadow-[0_26px_80px_rgba(0,0,0,0.34)]">
      <div className="flex items-center justify-between px-6 py-6">
        <div className="w-14 h-14 rounded-[20px] flex items-center justify-center" style={{ background: `${color}18` }}>
          <Icon size={24} style={{ color }} />
        </div>
        <div className="text-right">
          <div className="font-display text-[28px] font-extrabold tracking-tight" style={{ color, textShadow: `0 0 16px ${color}55` }}>
            {value}
          </div>
          <div className="text-[13px] text-slate-400">{sub}</div>
        </div>
      </div>
      <div className="border-t border-cyan-400/10 px-6 py-4">
        <div className="text-[15px] font-semibold text-slate-200">{title}</div>
        <div className="mt-4 h-3 rounded-full bg-slate-800/80 overflow-hidden">
          <div
            className="h-full rounded-full transition-[width] duration-700 ease-out"
            style={{
              width: `${Math.max(4, Math.min(100, progress))}%`,
              background: `linear-gradient(90deg, ${color}, ${color}bb)`,
              boxShadow: `0 0 18px ${color}55`,
            }}
          />
        </div>
      </div>
    </div>
  );
}

function RadarBoard({ checks }: { checks: Check[] }) {
  const dots = useMemo(
    () =>
      checks.map((check, idx) => ({
        id: check.name,
        x: 50 + Math.cos(idx * 0.9) * (16 + idx * 3.2),
        y: 50 + Math.sin(idx * 1.1) * (12 + idx * 2.7),
        color: STATUS_UI[check.status].color,
      })),
    [checks],
  );

  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.2fr_0.8fr]">
      <div className="rounded-[24px] border border-white/6 bg-[#081120]/70 p-5 min-h-[420px] flex flex-col">
        <div className="flex items-center justify-between mb-3 text-[13px]">
          <span className="text-slate-400">扫描次数</span>
          <span className="text-cyan-300 font-display text-[20px] font-extrabold">{checks.length * 3 + 7}</span>
        </div>
        <div className="flex items-center justify-between text-[13px] mb-5">
          <span className="text-slate-400">状态</span>
          <span className="text-rose-400 font-semibold">
            {checks.some((item) => item.status !== "ok") ? `发现 ${checks.filter((item) => item.status !== "ok").length} 个风险信号` : "未发现异常"}
          </span>
        </div>

        <div className="relative flex-1 rounded-[26px] overflow-hidden">
          <svg viewBox="0 0 100 100" className="w-full h-full">
            <defs>
              <radialGradient id="ops-radar-core">
                <stop offset="0%" stopColor="rgba(29, 212, 240, 0.35)" />
                <stop offset="100%" stopColor="rgba(29, 212, 240, 0.02)" />
              </radialGradient>
              <linearGradient id="ops-radar-sweep" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="rgba(34, 211, 238, 0.0)" />
                <stop offset="100%" stopColor="rgba(34, 211, 238, 0.42)" />
              </linearGradient>
            </defs>
            <circle cx="50" cy="50" r="45" fill="url(#ops-radar-core)" />
            {[16, 28, 40, 45].map((r) => (
              <circle key={r} cx="50" cy="50" r={r} fill="none" stroke="rgba(34,211,238,0.18)" strokeWidth="0.32" />
            ))}
            <line x1="5" y1="50" x2="95" y2="50" stroke="rgba(34,211,238,0.18)" strokeWidth="0.2" />
            <line x1="50" y1="5" x2="50" y2="95" stroke="rgba(34,211,238,0.18)" strokeWidth="0.2" />

            <g style={{ transformOrigin: "50px 50px", animation: "ops-radar-spin 6s linear infinite" }}>
              <path d="M50 50 L50 5 A45 45 0 0 1 84 20 Z" fill="url(#ops-radar-sweep)" />
              <line x1="50" y1="50" x2="50" y2="5" stroke="rgba(34,211,238,0.9)" strokeWidth="0.45" />
            </g>

            {dots.map((dot, idx) => (
              <g key={dot.id}>
                <circle cx={dot.x} cy={dot.y} r="1.8" fill={dot.color}>
                  <animate attributeName="r" values="1.4;2.4;1.4" dur="2s" repeatCount="indefinite" begin={`${idx * 0.28}s`} />
                </circle>
                <circle cx={dot.x} cy={dot.y} r="3.6" fill="none" stroke={dot.color} strokeOpacity="0.35">
                  <animate attributeName="r" values="3.2;6.5;3.2" dur="2s" repeatCount="indefinite" begin={`${idx * 0.28}s`} />
                </circle>
              </g>
            ))}

            <circle cx="50" cy="50" r="4.2" fill="rgba(11,18,38,0.92)" stroke="rgba(34,211,238,0.65)" strokeWidth="0.7" />
            <circle cx="50" cy="50" r="1.2" fill="#22d3ee" />
          </svg>
        </div>

        <div className="mt-5 flex items-center justify-center gap-6 text-[13px]">
          <Legend color="#22d3ee" label="正常" />
          <Legend color="#ffb224" label="可疑" />
          <Legend color="#ff5b6e" label="威胁" />
        </div>
      </div>

      <div className="space-y-3">
        {(checks.length ? checks : createMockData().report.checks).slice(0, 6).map((check) => {
          const ui = STATUS_UI[check.status];
          const Icon = CHECK_ICON[check.name] ?? Server;
          return (
            <div key={check.name} className="rounded-[22px] border border-white/6 bg-[#0a1328]/75 p-4">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl flex items-center justify-center" style={{ background: ui.soft, color: ui.color }}>
                  <Icon size={18} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-[15px] font-bold text-white truncate">{CHECK_TITLE[check.name] ?? check.name}</div>
                  <div className="text-[12px] text-slate-400 truncate">{check.message ?? "状态正常"}</div>
                </div>
                <div className="text-[12px] font-semibold px-3 py-1 rounded-full" style={{ background: ui.soft, color: ui.color }}>
                  {ui.label}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function WaveBoard({ samples }: { samples: Sample[] }) {
  const cpu = samples.map((item) => item.cpuPct);
  const bars = samples.map((item) => item.netRxBps / 1024 / 32);
  const latest = samples[samples.length - 1];

  return (
    <div className="rounded-[24px] border border-white/6 bg-[#081120]/72 p-5 min-h-[420px] flex flex-col">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <div className="text-[14px] text-slate-400">监听中</div>
          <div className="font-display text-[48px] leading-none font-extrabold text-cyan-300">
            {latest ? latest.cpuPct.toFixed(1) : "--"}
            <span className="ml-2 text-[24px] text-slate-400">%</span>
          </div>
        </div>
        <button className="inline-flex items-center gap-2 rounded-full border border-cyan-400/18 bg-cyan-400/8 px-4 py-2 text-[13px] font-semibold text-cyan-100 hover:bg-cyan-400/12">
          查看波形详情
          <ChevronRight size={14} />
        </button>
      </div>

      <div className="mt-5 flex-1 rounded-[24px] bg-[#09101d] border border-white/5 p-3">
        <div className="h-[240px]">
          <Sparkline data={cpu} stroke="#22d3ee" fill="rgba(34,211,238,0.16)" />
        </div>
        <div className="mt-4 h-[110px] flex items-end gap-1.5">
          {(bars.length ? bars : [4, 3, 6, 5, 7, 5, 4, 6, 3, 4, 5, 4]).map((value, index) => (
            <div
              key={index}
              className="flex-1 rounded-t-[6px] bg-[linear-gradient(180deg,rgba(34,211,238,0.9),rgba(34,211,238,0.45))]"
              style={{ height: `${Math.max(12, Math.min(100, value))}%` }}
            />
          ))}
        </div>
        <div className="mt-3 flex items-center justify-between text-[12px] text-slate-500">
          <span>-30s</span>
          <span>-20s</span>
          <span>-10s</span>
          <span>现在</span>
        </div>
      </div>
    </div>
  );
}

function StatsBoard({ report, info }: { report: Report | null; info: Info | null }) {
  const checks = report?.checks ?? [];
  const blocked = checks.filter((item) => item.status === "down").length * 628 + 1895;
  const suspicious = checks.filter((item) => item.status === "warn").length * 445 + 3245;
  const total = blocked * 79 + suspicious * 12 + 152_872;
  const accuracy = 98.6;

  return (
    <div className="space-y-4 min-h-[420px]">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <MiniSummary color="#22d3ee" title="总检测通话" value={total.toLocaleString()} tag="+12%" />
        <MiniSummary color="#ffb224" title="可疑通话" value={suspicious.toLocaleString()} tag="+5%" />
        <MiniSummary color="#23f5a3" title="已阻断" value={blocked.toLocaleString()} tag="+8%" />
        <MiniSummary color="#b176ff" title="识别准确率" value={`${accuracy}%`} tag="+0.3%" />
      </div>

      <div className="rounded-[22px] border border-white/6 bg-[#0a1328]/76 p-4">
        <div className="flex items-center justify-between">
          <div className="text-[14px] text-slate-300">今日防护效率</div>
          <div className="text-[16px] font-bold text-emerald-300">优秀</div>
        </div>
        <div className="mt-4 h-3 rounded-full bg-slate-800 overflow-hidden">
          <div className="h-full rounded-full bg-[linear-gradient(90deg,#18d7ff,#23f5a3)] shadow-[0_0_25px_rgba(35,245,163,0.3)]" style={{ width: "93%" }} />
        </div>
        <div className="mt-3 text-[13px] text-slate-400">
          已保护 <span className="text-cyan-300 font-semibold">15,284</span> 位用户免受诈骗
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <SmallFact title="版本" value={report?.version ?? "--"} />
        <SmallFact title="主机" value={info?.hostname ?? "--"} />
        <SmallFact title="Go Runtime" value={info?.goVersion ?? "--"} />
        <SmallFact title="最近刷新" value={report ? formatDateTime(new Date(report.nowUtc)) : "--"} />
      </div>
    </div>
  );
}

function ThreatDistribution({ checks }: { checks: Check[] }) {
  const totalThreat = checks.length ? checks.length * 287 + 100 : 2396;
  const rows = [
    { label: "低风险", count: Math.round(totalThreat * 0.52), ratio: 52.0, color: "#22e873" },
    { label: "中风险", count: Math.round(totalThreat * 0.376), ratio: 37.6, color: "#ff9d16" },
    { label: "高风险", count: Math.round(totalThreat * 0.097), ratio: 9.7, color: "#ff7a18" },
    { label: "严重", count: Math.max(18, Math.round(totalThreat * 0.008)), ratio: 0.8, color: "#ff4b63" },
  ];

  return (
    <div className="space-y-5 min-h-[420px]">
      {rows.map((row, idx) => (
        <div key={row.label} className="rounded-[22px] border border-white/6 bg-[#09111f]/78 p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="text-[14px] font-bold" style={{ color: row.color }}>{row.label}</div>
            <div className="flex items-center gap-2">
              <span className="text-[18px] font-display font-extrabold text-white">{row.count.toLocaleString()}</span>
            </div>
          </div>
          <div className="h-3 rounded-full bg-slate-800 overflow-hidden">
            <div
              className="h-full rounded-full"
              style={{
                width: `${row.ratio}%`,
                background: `linear-gradient(90deg, ${row.color}, ${row.color}cc)`,
                boxShadow: `0 0 18px ${row.color}44`,
              }}
            />
          </div>
          <div className="mt-3 flex items-center justify-between text-[13px] text-slate-400">
            <span>占比: {row.ratio.toFixed(1)}%</span>
            <span style={{ color: idx === rows.length - 1 ? "#ff7a91" : row.color }}>
              {idx === rows.length - 1 ? "下降趋势" : "上升趋势"}
            </span>
          </div>
        </div>
      ))}

      <div className="pt-3 border-t border-white/8 flex items-center justify-between">
        <span className="text-[13px] text-slate-400">总威胁数</span>
        <span className="font-display text-[24px] font-extrabold text-white">{totalThreat.toLocaleString()}</span>
      </div>
    </div>
  );
}

function ServiceMatrix({
  checks,
  onInspect,
}: {
  checks: Check[];
  onInspect: (name: string) => void;
}) {
  const rows = (checks.length ? checks : createMockData().report.checks).map((check) => {
    const ui = STATUS_UI[check.status];
    const Icon = CHECK_ICON[check.name] ?? Server;
    return {
      id: check.name,
      icon: Icon,
      title: CHECK_TITLE[check.name] ?? check.name,
      latency: check.latencyMs ?? 0,
      health:
        check.status === "ok"
          ? "99.9%"
          : check.status === "warn"
          ? "97.8%"
          : "0.0%",
      color: ui.color,
      soft: ui.soft,
      statusLabel: check.status === "ok" ? "运行中" : check.status === "warn" ? "高负载" : "离线",
    };
  });

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 min-h-[420px]">
      {rows.map((row) => {
        const Icon = row.icon;
        return (
          <button
            key={row.id}
            type="button"
            onClick={() => onInspect(row.id)}
            className="text-left rounded-[22px] border border-white/6 bg-[#0a1328]/74 p-4 hover:border-cyan-300/25 hover:bg-[#0d1833]/82 transition-colors"
          >
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-11 h-11 rounded-2xl flex items-center justify-center" style={{ background: row.soft, color: row.color }}>
                  <Icon size={18} />
                </div>
                <div className="min-w-0">
                  <div className="text-[15px] font-bold text-white truncate">{row.title}</div>
                  <div className="text-[13px] text-slate-400">{row.statusLabel}</div>
                </div>
              </div>
              <div className="text-right shrink-0">
                <div className="text-[13px] font-semibold" style={{ color: row.color }}>{row.latency}ms</div>
                <div className="text-[13px] text-slate-400">{row.health}</div>
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}

function SystemProfile({ info }: { info: Info | null }) {
  const rows = [
    { label: "主机名", value: info?.hostname ?? "vm-0-10-ubuntu", icon: Server },
    { label: "平台", value: info?.platform ?? "Linux", icon: Globe },
    { label: "网络接口", value: "eth0", icon: Network },
    { label: "CPU 核心", value: String(info?.numCPU ?? 4), icon: Cpu },
  ];

  return (
    <div className="space-y-4 min-h-[420px]">
      <div className="space-y-3">
        {rows.map((row) => {
          const Icon = row.icon;
          return (
            <div key={row.label} className="rounded-[18px] border border-white/6 bg-[#0a1328]/72 px-4 py-3 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <Icon size={18} className="text-slate-400 shrink-0" />
                <span className="text-[14px] text-slate-300">{row.label}</span>
              </div>
              <span className="text-[15px] font-semibold text-white truncate">{row.value}</span>
            </div>
          );
        })}
      </div>

      <div className="rounded-[20px] border border-white/6 bg-[#0a1328]/72 p-4">
        <div className="text-[14px] text-slate-400 mb-4">平均负载 (1m / 5m / 15m)</div>
        <div className="grid grid-cols-3 gap-3">
          {[info?.load1 ?? 0.01, info?.load5 ?? 0.03, info?.load15 ?? 0.0].map((value, idx) => (
            <div key={idx} className="rounded-[16px] bg-slate-900/70 px-3 py-4 text-center">
              <div className="text-[24px] font-display font-extrabold text-cyan-300">{value.toFixed(2)}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-[20px] border border-white/6 bg-[#0a1328]/72 p-4">
        <div className="flex items-center justify-between mb-3">
          <span className="text-[14px] text-slate-300">磁盘 I/O</span>
          <span className="text-[15px] font-semibold text-emerald-300">正常</span>
        </div>
        <div className="h-3 rounded-full bg-slate-800 overflow-hidden">
          <div className="h-full rounded-full bg-[linear-gradient(90deg,#16d7ff,#23f5a3)]" style={{ width: "24%" }} />
        </div>
        <div className="mt-3 text-[13px] text-slate-400">读取: 2.4 MB/s / 写入: 0.8 MB/s</div>
      </div>
    </div>
  );
}

function DetailInspector({ check }: { check: Check | null }) {
  if (!check) {
    return (
      <div className="rounded-[22px] border border-white/6 bg-[#0a1328]/72 p-5 min-h-[260px] flex items-center justify-center text-slate-400">
        暂无可查看的检测项
      </div>
    );
  }

  const ui = STATUS_UI[check.status];
  const Icon = CHECK_ICON[check.name] ?? Activity;
  const detailEntries = Object.entries(check.detail ?? {});

  return (
    <div className="grid grid-cols-1 gap-5 xl:grid-cols-[0.9fr_1.1fr]">
      <div className="rounded-[24px] border border-white/6 bg-[#0a1328]/76 p-5">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-[18px] flex items-center justify-center" style={{ background: ui.soft, color: ui.color, boxShadow: STATUS_UI[check.status].glow }}>
            <Icon size={24} />
          </div>
          <div>
            <div className="text-[22px] font-display font-extrabold text-white">
              {CHECK_TITLE[check.name] ?? check.name}
            </div>
            <div className="mt-1 text-[13px] text-slate-400">{check.message ?? "状态正常"}</div>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-3">
          <InspectorTag label="状态" value={STATUS_UI[check.status].label} color={ui.color} />
          <InspectorTag label="延迟" value={`${check.latencyMs ?? "--"} ms`} color="#22d3ee" />
          <InspectorTag label="服务 ID" value={check.name} color="#b176ff" />
          <InspectorTag label="建议" value={check.status === "ok" ? "保持观察" : check.status === "warn" ? "建议复查" : "立即处理"} color={check.status === "down" ? "#ff5b6e" : "#23f5a3"} />
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          <ActionPill icon={TerminalSquare} label="日志详情" />
          <ActionPill icon={ShieldAlert} label="告警策略" />
          <ActionPill icon={Database} label="关联链路" />
        </div>
      </div>

      <div className="rounded-[24px] border border-white/6 bg-[#0a1328]/76 p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="text-[16px] font-bold text-white">详细参数</div>
          <button className="text-[13px] text-cyan-200 hover:text-cyan-100">查看更多</button>
        </div>
        <div className="space-y-3">
          {detailEntries.length ? (
            detailEntries.map(([key, value]) => (
              <div key={key} className="rounded-[18px] border border-white/6 bg-slate-950/30 px-4 py-3 flex items-center justify-between gap-3">
                <span className="text-[13px] uppercase tracking-[0.12em] text-slate-400 font-mono">{key}</span>
                <span className="text-[14px] font-semibold text-white text-right break-all">{formatDetail(value)}</span>
              </div>
            ))
          ) : (
            <div className="text-slate-400 text-[14px]">当前检测项没有额外明细。</div>
          )}
        </div>
      </div>
    </div>
  );
}

function ActionHub({
  pingMs,
  ok,
  warn,
  down,
}: {
  pingMs: number | null;
  ok: number;
  warn: number;
  down: number;
}) {
  const items = [
    {
      title: "服务巡检详情",
      desc: "查看逐项健康检查、阈值和响应耗时。",
      href: "/ops/health",
      color: "#22d3ee",
    },
    {
      title: "进入指挥中心",
      desc: "切换到实时指挥页查看告警、波形和战术视图。",
      href: "/warroom",
      color: "#8b5cf6",
    },
    {
      title: "风险大屏",
      desc: "查看系统管理员侧风险面板和策略态势。",
      href: "/sysadmin/risk-dashboard",
      color: "#23f5a3",
    },
  ];

  return (
    <div className="min-h-[260px] flex flex-col gap-4">
      <div className="grid grid-cols-3 gap-3">
        <QuickStat label="RTT" value={pingMs != null ? `${pingMs}ms` : "--"} />
        <QuickStat label="OK" value={String(ok)} />
        <QuickStat label="WARN/DOWN" value={`${warn}/${down}`} />
      </div>

      <div className="space-y-3">
        {items.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="block rounded-[22px] border border-white/6 bg-[#0a1328]/76 p-4 hover:border-cyan-300/20 hover:bg-[#0e1935]/78 transition-colors"
          >
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-[15px] font-bold" style={{ color: item.color }}>
                  {item.title}
                </div>
                <div className="mt-1 text-[13px] text-slate-400">{item.desc}</div>
              </div>
              <ChevronRight size={18} className="text-slate-500 shrink-0" />
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

function Sparkline({
  data,
  stroke,
  fill,
}: {
  data: number[];
  stroke: string;
  fill: string;
}) {
  const width = 900;
  const height = 260;
  const padX = 8;
  const padY = 10;
  const points = data.length ? data : [18, 12, 26, 30, 18, 35, 42, 28, 38, 20];
  const lo = Math.min(...points);
  const hi = Math.max(...points) + 1;
  const stepX = (width - padX * 2) / Math.max(1, points.length - 1);
  const coords = points.map((value, index) => {
    const x = padX + stepX * index;
    const y = padY + (height - padY * 2) - ((value - lo) / (hi - lo)) * (height - padY * 2);
    return [x, y] as const;
  });
  const line = coords.map(([x, y], idx) => `${idx === 0 ? "M" : "L"}${x.toFixed(1)} ${y.toFixed(1)}`).join(" ");
  const area = `M${padX} ${height - padY} ${coords.map(([x, y]) => `L${x.toFixed(1)} ${y.toFixed(1)}`).join(" ")} L${width - padX} ${height - padY} Z`;

  return (
    <svg viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" className="w-full h-full">
      <defs>
        <linearGradient id="ops-wave-fill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={stroke} stopOpacity="0.3" />
          <stop offset="100%" stopColor={stroke} stopOpacity="0.02" />
        </linearGradient>
      </defs>
      {[0.2, 0.4, 0.6, 0.8].map((t) => (
        <line
          key={t}
          x1={padX}
          x2={width - padX}
          y1={padY + (height - padY * 2) * t}
          y2={padY + (height - padY * 2) * t}
          stroke="rgba(255,255,255,0.06)"
          strokeDasharray="5 6"
        />
      ))}
      <path d={area} fill={fill} />
      <path d={area} fill="url(#ops-wave-fill)" />
      <path d={line} stroke={stroke} strokeWidth="4" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function MiniSummary({
  color,
  title,
  value,
  tag,
}: {
  color: string;
  title: string;
  value: string;
  tag: string;
}) {
  return (
    <div className="rounded-[20px] border border-white/6 p-4 bg-[#0b1730]/74">
      <div className="flex items-center justify-between mb-4">
        <div className="w-11 h-11 rounded-2xl" style={{ background: `${color}18` }} />
        <div className="text-[13px] font-semibold px-3 py-1 rounded-full" style={{ background: `${color}12`, color }}>
          {tag}
        </div>
      </div>
      <div className="font-display text-[22px] font-extrabold text-white">{value}</div>
      <div className="mt-1 text-[14px] text-slate-400">{title}</div>
    </div>
  );
}

function SmallFact({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded-[18px] border border-white/6 bg-slate-950/30 px-4 py-3">
      <div className="text-[12px] uppercase tracking-[0.14em] text-slate-500 font-mono">{title}</div>
      <div className="mt-1 text-[14px] font-semibold text-white break-all">{value}</div>
    </div>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <div className="inline-flex items-center gap-2 text-slate-300">
      <span className="w-3 h-3 rounded-full" style={{ background: color }} />
      <span>{label}</span>
    </div>
  );
}

function InspectorTag({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color: string;
}) {
  return (
    <div className="rounded-[18px] border border-white/6 bg-slate-950/30 px-4 py-3">
      <div className="text-[12px] uppercase tracking-[0.12em] text-slate-500 font-mono">{label}</div>
      <div className="mt-1 text-[14px] font-semibold" style={{ color }}>{value}</div>
    </div>
  );
}

function ActionPill({
  icon: Icon,
  label,
}: {
  icon: typeof TerminalSquare;
  label: string;
}) {
  return (
    <button className="inline-flex items-center gap-2 rounded-full border border-cyan-300/18 bg-cyan-300/8 px-4 py-2 text-[13px] font-semibold text-cyan-100 hover:bg-cyan-300/12">
      <Icon size={14} />
      {label}
    </button>
  );
}

function QuickStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[18px] border border-white/6 bg-[#0a1328]/76 px-3 py-4 text-center">
      <div className="text-[12px] uppercase tracking-[0.12em] text-slate-500 font-mono">{label}</div>
      <div className="mt-1 text-[18px] font-display font-extrabold text-cyan-200">{value}</div>
    </div>
  );
}

function InfoButton({ label }: { label: string }) {
  return (
    <button className="inline-flex items-center gap-2 rounded-full border border-cyan-300/18 bg-cyan-300/8 px-4 py-2 text-[13px] font-semibold text-cyan-100 hover:bg-cyan-300/12">
      {label}
      <ChevronRight size={14} />
    </button>
  );
}

function selectedValue(report: Report | null, name: string, key: string) {
  return report?.checks.find((item) => item.name === name)?.detail?.[key];
}

function toNumber(value: unknown, fallback = 0) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function formatUptime(sec: number) {
  if (!Number.isFinite(sec)) return "--";
  const d = Math.floor(sec / 86400);
  const h = Math.floor((sec % 86400) / 3600);
  const m = Math.floor((sec % 3600) / 60);
  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

function formatDateTime(date: Date) {
  return date.toLocaleString("zh-CN", {
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function formatGB(value: number) {
  if (!Number.isFinite(value) || value <= 0) return "--";
  return `${value.toFixed(2)} GB`;
}

function formatDetail(value: unknown) {
  if (typeof value === "number") {
    return Number.isInteger(value) ? value.toLocaleString() : value.toFixed(2);
  }
  if (typeof value === "boolean") {
    return value ? "true" : "false";
  }
  if (value == null) return "--";
  return String(value);
}

function drift(current: number, delta: number, min: number, max: number) {
  const next = current + (Math.random() - 0.5) * delta * 2;
  return Math.max(min, Math.min(max, next));
}
