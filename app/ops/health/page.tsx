"use client";

import Link from "next/link";
import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import {
  Activity,
  AlertTriangle,
  ArrowLeft,
  Cpu,
  Database,
  Gauge,
  HardDrive,
  MemoryStick,
  Moon,
  Network,
  Radio,
  RefreshCw,
  Server,
  ShieldCheck,
  SignalHigh,
  Sun,
  Zap,
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

const ThemeCtx = createContext<"light" | "dark">("light");
const useIsDark = () => useContext(ThemeCtx) === "dark";

const ICONS: Record<string, typeof Cpu> = {
  runtime: Server,
  cpu: Cpu,
  memory: MemoryStick,
  disk: HardDrive,
  store: Database,
  feedHub: Radio,
  engine: Zap,
  network: Network,
  load: Gauge,
};

const CHECK_TITLE: Record<string, string> = {
  engine: "分析引擎",
  store: "业务计数器",
  cpu: "CPU 使用率",
  memory: "内存",
  disk: "磁盘",
  network: "网络流量",
  load: "负载均值",
  runtime: "Go 运行时",
};

const STATUS_TINT: Record<CheckStatus, { color: string; soft: string; label: string }> = {
  ok: { color: "var(--mint-deep)", soft: "var(--mint-soft)", label: "正常" },
  warn: { color: "var(--amber-deep)", soft: "var(--amber-soft)", label: "告警" },
  down: { color: "var(--coral)", soft: "var(--coral-soft)", label: "故障" },
};

export default function OpsHealthPage() {
  const [report, setReport] = useState<Report | null>(null);
  const [series, setSeries] = useState<Series | null>(null);
  const [info, setInfo] = useState<Info | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pingMs, setPingMs] = useState<number | null>(null);
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const aborter = useRef<AbortController | null>(null);

  // Apply theme to <html> only while this page is mounted, so leaving the
  // route doesn't persist a dark state onto the rest of the app.
  useEffect(() => {
    const stored = window.localStorage.getItem("ops-theme");
    const initial: "light" | "dark" =
      stored === "dark" || stored === "light"
        ? stored
        : window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light";
    setTheme(initial);
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    if (theme === "dark") root.classList.add("dark");
    else root.classList.remove("dark");
    window.localStorage.setItem("ops-theme", theme);
    return () => {
      // restore on unmount so other routes keep their default light theme.
      root.classList.remove("dark");
    };
  }, [theme]);

  const toggleTheme = useCallback(() => {
    setTheme((t) => (t === "dark" ? "light" : "dark"));
  }, []);

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
      if (!hRes.ok) throw new Error(`health HTTP ${hRes.status}`);
      if (!sRes.ok) throw new Error(`series HTTP ${sRes.status}`);
      if (!iRes.ok) throw new Error(`info HTTP ${iRes.status}`);
      setReport((await hRes.json()) as Report);
      setSeries((await sRes.json()) as Series);
      setInfo((await iRes.json()) as Info);
      setError(null);
      setUpdatedAt(new Date());

      const pStart = performance.now();
      await fetch(`${API}/api/v1/ops/ping`, { cache: "no-store", signal: ctrl.signal });
      setPingMs(Math.round(performance.now() - pStart));
    } catch (e) {
      if ((e as { name?: string }).name === "AbortError") return;
      setError((e as Error).message || "无法连接后端");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const t = setInterval(load, REFRESH_MS);
    return () => {
      clearInterval(t);
      aborter.current?.abort();
    };
  }, [load]);

  const overallTint = STATUS_TINT[report?.status ?? "down"];
  const isDark = theme === "dark";

  return (
    <ThemeCtx.Provider value={theme}>
    <div className="min-h-screen bg-canvas text-ink">
      <header className="sticky top-0 z-20 bg-canvas/85 backdrop-blur-xl border-b border-border">
        <div className="px-6 md:px-10 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <Link
              href="/"
              className="w-9 h-9 rounded-xl bg-surface border border-border flex items-center justify-center hover:bg-canvas-2 transition-colors shrink-0"
              aria-label="返回首页"
            >
              <ArrowLeft size={15} />
            </Link>
            <div
              className="w-9 h-9 rounded-2xl flex items-center justify-center font-display text-white font-extrabold shadow-md shrink-0"
              style={{ background: "linear-gradient(135deg, var(--indigo), var(--indigo-deep))" }}
            >
              S
            </div>
            <div className="min-w-0">
              <div className="font-display text-[calc(15px*var(--fz))] font-extrabold truncate">服务运维监测</div>
              <div className="font-mono text-[calc(10px*var(--fz))] uppercase tracking-[0.18em] text-ink-soft font-bold truncate">
                OPS · HEALTH DASHBOARD
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {pingMs != null && (
              <div className="hidden md:flex items-center gap-2 px-3 py-2 rounded-full bg-surface border border-border">
                <SignalHigh size={14} className="text-ink-soft" />
                <span className="font-mono text-[calc(11px*var(--fz))] font-bold">RTT {pingMs} ms</span>
              </div>
            )}
            <button
              type="button"
              onClick={toggleTheme}
              className="w-10 h-10 rounded-full bg-surface border border-border flex items-center justify-center hover:bg-canvas-2 transition-colors"
              aria-label={theme === "dark" ? "切换到浅色模式" : "切换到深色模式"}
              title={theme === "dark" ? "切换到浅色模式" : "切换到深色模式"}
            >
              {theme === "dark" ? <Sun size={15} /> : <Moon size={15} />}
            </button>
            <button
              type="button"
              onClick={load}
              className="btn-ghost py-2 px-3 text-[calc(12px*var(--fz))] flex items-center gap-2"
              disabled={loading}
            >
              <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
              刷新
            </button>
          </div>
        </div>
      </header>

      <main className="px-6 md:px-10 py-8 page-enter">
        <section
          className="panel p-6 mb-5 relative overflow-hidden"
          style={{ borderColor: !isDark && report ? overallTint.color : undefined }}
        >
          {!isDark && (
            <div
              className="absolute -top-12 -right-12 w-48 h-48 rounded-full opacity-50"
              style={{ background: report ? overallTint.soft : "var(--canvas-2)" }}
            />
          )}
          <div className="relative flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <div className="font-mono text-[calc(10px*var(--fz))] uppercase tracking-[0.18em] text-ink-soft font-bold">
                OVERALL STATUS
              </div>
              <div className="mt-2 flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-2xl flex items-center justify-center"
                  style={{
                    background: report ? overallTint.soft : "var(--canvas-2)",
                    color: report ? overallTint.color : "var(--ink-soft)",
                  }}
                >
                  {report?.status === "ok" ? (
                    <ShieldCheck size={18} />
                  ) : (
                    <AlertTriangle size={18} />
                  )}
                </div>
                <div>
                  <div className="font-display text-[calc(26px*var(--fz))] font-extrabold leading-none">
                    {report ? overallTint.label : error ? "无法连接" : "加载中"}
                  </div>
                  <div className="mt-1 text-[calc(12px*var(--fz))] text-ink-soft font-semibold">
                    {report
                      ? `${report.service} · ${report.version}`
                      : error ?? "正在请求 /api/v1/ops/health"}
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 min-w-0 md:min-w-[420px]">
              <Stat label="RUNTIME" value={report ? formatUptime(report.uptimeSec) : "—"} />
              <Stat
                label="CHECKS"
                value={report ? `${report.checks.length} 项` : "—"}
                sub={report ? countByStatus(report.checks) : undefined}
              />
              <Stat
                label="UPDATED"
                value={updatedAt ? formatTime(updatedAt) : "—"}
                sub={`每 ${REFRESH_MS / 1000}s 自动刷新`}
              />
            </div>
          </div>
        </section>

        {info && <SystemInfoStrip info={info} />}

        {error && (
          <div
            className="panel p-4 mb-6 flex items-start gap-3"
            style={{ borderColor: "var(--coral)", background: "var(--coral-soft)" }}
          >
            <AlertTriangle size={16} style={{ color: "var(--coral)" }} className="mt-0.5" />
            <div className="text-[calc(13px*var(--fz))] font-semibold" style={{ color: "var(--coral)" }}>
              {error}。请确认后端运行于 {API}，或通过 NEXT_PUBLIC_API_URL 调整地址。
            </div>
          </div>
        )}

        <ChartsGrid series={series} />

        <div className="mt-10 mb-4 flex items-end justify-between gap-3 flex-wrap">
          <div>
            <div className="font-mono text-[calc(10px*var(--fz))] uppercase tracking-[0.18em] text-ink-soft font-bold">
              CHECKS
            </div>
            <h2 className="font-display text-[calc(22px*var(--fz))] font-extrabold mt-1">检查项明细</h2>
          </div>
          {report && (
            <div className="flex items-center gap-2">
              {(["ok", "warn", "down"] as CheckStatus[]).map((s) => {
                const tint = STATUS_TINT[s];
                const n = report.checks.filter((c) => c.status === s).length;
                return (
                  <span
                    key={s}
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-full font-mono text-[calc(11px*var(--fz))] font-extrabold"
                    style={{ background: tint.soft, color: tint.color }}
                  >
                    <span
                      aria-hidden
                      className="w-1.5 h-1.5 rounded-full"
                      style={{ background: tint.color }}
                    />
                    {tint.label} · {n}
                  </span>
                );
              })}
            </div>
          )}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          {(report?.checks ?? Array.from({ length: 7 }).map(() => null)).map((c, i) =>
            c ? <CheckCard key={c.name + i} check={c} /> : <SkeletonCard key={`sk-${i}`} />
          )}
        </div>

        <p className="mt-8 font-mono text-[calc(10px*var(--fz))] uppercase tracking-[0.18em] text-ink-soft font-bold">
          外部依赖通过环境变量 OPS_DEPENDENCIES 配置（格式：name=url,name=url）。
        </p>
      </main>
    </div>
    </ThemeCtx.Provider>
  );
}

function SystemInfoStrip({ info }: { info: Info }) {
  const items: { label: string; value: string; wide?: boolean }[] = [
    { label: "HOSTNAME", value: info.hostname ?? "—" },
    { label: "KERNEL", value: info.kernelVersion ?? info.kernelArch ?? "—", wide: true },
    { label: "GO RUNTIME", value: `${info.goVersion} · ${info.numCPU} cores` },
    {
      label: "HOST UPTIME",
      value: info.hostUptimeSec ? formatUptime(info.hostUptimeSec) : "—",
    },
    { label: "TOTAL MEM", value: info.totalMemMB ? `${formatMB(info.totalMemMB)}` : "—" },
    { label: "PID", value: String(info.pid) },
  ];
  return (
    <section className="panel p-5 mb-5">
      <div className="font-mono text-[calc(10px*var(--fz))] uppercase tracking-[0.18em] text-ink-soft font-bold mb-3">
        SYSTEM INFO
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-8 gap-3">
        {items.map((it) => (
          <div
            key={it.label}
            className={`rounded-2xl bg-canvas-2 p-3 min-w-0 ${it.wide ? "md:col-span-2" : ""}`}
          >
            <div className="font-mono text-[calc(10px*var(--fz))] uppercase tracking-[0.14em] text-ink-soft font-bold">
              {it.label}
            </div>
            <div
              className="mt-1 font-display text-[calc(13px*var(--fz))] font-extrabold leading-snug break-words"
              title={it.value}
            >
              {it.value}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function ChartsGrid({ series }: { series: Series | null }) {
  const samples = series?.samples ?? [];
  const hasData = samples.length >= 2;

  const cpu = samples.map((s) => s.cpuPct);
  const mem = samples.map((s) => s.memPct);
  const rx = samples.map((s) => s.netRxBps);
  const tx = samples.map((s) => s.netTxBps);
  const load1 = samples.map((s) => s.load1);
  const last = samples[samples.length - 1];
  const lastTs = last ? new Date(last.t) : null;

  return (
    <section className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <ChartCard
        icon={Cpu}
        title="CPU 使用率"
        subtitle={hasData ? `${last.cpuPct.toFixed(1)}%` : "—"}
        unit="%"
        data={cpu}
        min={0}
        max={100}
        tint="var(--indigo)"
        soft="var(--indigo-soft)"
        formatY={(v) => `${v.toFixed(1)}%`}
        lastTs={lastTs}
      />
      <ChartCard
        icon={MemoryStick}
        title="内存使用率"
        subtitle={hasData ? `${last.memPct.toFixed(1)}%` : "—"}
        unit="%"
        data={mem}
        min={0}
        max={100}
        tint="var(--coral)"
        soft="var(--coral-soft)"
        formatY={(v) => `${v.toFixed(1)}%`}
        lastTs={lastTs}
      />
      <NetworkChartCard
        title="网络流量"
        rx={rx}
        tx={tx}
        lastRx={hasData ? last.netRxBps : null}
        lastTx={hasData ? last.netTxBps : null}
        lastTs={lastTs}
      />
      <ChartCard
        icon={Gauge}
        title="负载均值 (load1)"
        subtitle={hasData ? last.load1.toFixed(2) : "—"}
        unit="load"
        data={load1}
        tint="var(--indigo-deep)"
        soft="var(--indigo-soft)"
        formatY={(v) => v.toFixed(2)}
        lastTs={lastTs}
      />
    </section>
  );
}

function NetworkChartCard({
  title,
  rx,
  tx,
  lastRx,
  lastTx,
  lastTs,
}: {
  title: string;
  rx: number[];
  tx: number[];
  lastRx: number | null;
  lastTx: number | null;
  lastTs: Date | null;
}) {
  const isDark = useIsDark();
  const rxColor = "var(--mint-deep)";
  const txColor = "var(--amber-deep)";
  const rxSoft = "var(--mint-soft)";

  return (
    <div className="panel panel-lift p-4 relative overflow-hidden">
      {!isDark && (
        <div
          className="absolute -top-8 -right-8 w-28 h-28 rounded-full opacity-50"
          style={{ background: rxSoft }}
        />
      )}
      <div className="relative flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: rxSoft, color: rxColor }}
          >
            <Network size={15} />
          </div>
          <div className="min-w-0">
            <div className="font-mono text-[calc(10px*var(--fz))] uppercase tracking-[0.16em] text-ink-soft font-bold">
              {title}
            </div>
            <div className="flex items-baseline gap-3 mt-1">
              <span className="numplate text-[calc(20px*var(--fz))] leading-none truncate" style={{ color: rxColor }}>
                ↓ {lastRx != null ? humanRate(lastRx) : "—"}
              </span>
              <span className="numplate text-[calc(20px*var(--fz))] leading-none truncate" style={{ color: txColor }}>
                ↑ {lastTx != null ? humanRate(lastTx) : "—"}
              </span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Legend color={rxColor} label="下行" />
          <Legend color={txColor} label="上行" />
        </div>
      </div>

      <DualSparkline
        a={{ data: rx, stroke: rxColor, fill: rxSoft }}
        b={{ data: tx, stroke: txColor }}
        height={80}
      />

      <div className="relative mt-3 grid grid-cols-2 gap-3 pt-3 border-t border-border">
        <NetSummary label="↓ 下行" data={rx} color={rxColor} />
        <NetSummary label="↑ 上行" data={tx} color={txColor} />
      </div>

      {lastTs && (
        <div className="relative mt-3 pt-2 border-t border-border font-mono text-[calc(10px*var(--fz))] uppercase tracking-[0.14em] text-ink-soft font-bold flex items-center gap-1.5">
          <Activity size={11} />
          采样于 {formatTime(lastTs)}
        </div>
      )}
    </div>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <span className="flex items-center gap-1 font-mono text-[calc(10px*var(--fz))] font-bold text-ink-soft">
      <span aria-hidden className="w-2 h-2 rounded-full" style={{ background: color }} />
      {label}
    </span>
  );
}

function NetSummary({ label, data, color }: { label: string; data: number[]; color: string }) {
  const stats = computeStats(data);
  return (
    <div>
      <div
        className="font-mono text-[calc(10px*var(--fz))] uppercase tracking-[0.14em] font-extrabold"
        style={{ color }}
      >
        {label}
      </div>
      <div className="mt-1 grid grid-cols-3 gap-1">
        <MiniStat label="MIN" value={stats ? humanRate(stats.min) : "—"} />
        <MiniStat label="AVG" value={stats ? humanRate(stats.avg) : "—"} />
        <MiniStat label="MAX" value={stats ? humanRate(stats.max) : "—"} />
      </div>
    </div>
  );
}

function ChartCard({
  icon: Icon,
  title,
  subtitle,
  data,
  min,
  max,
  tint,
  soft,
  formatY,
  wide,
  lastTs,
}: {
  icon: typeof Cpu;
  title: string;
  subtitle: string;
  unit: string;
  data: number[];
  min?: number;
  max?: number;
  tint: string;
  soft: string;
  formatY?: (v: number) => string;
  wide?: boolean;
  lastTs?: Date | null;
}) {
  const fmt = formatY ?? ((v: number) => v.toFixed(2));
  const stats = computeStats(data);
  const trend = computeTrend(data);
  const isDark = useIsDark();

  return (
    <div
      className={`panel panel-lift p-4 relative overflow-hidden ${wide ? "lg:col-span-2" : ""}`}
    >
      {!isDark && (
        <div
          className="absolute -top-8 -right-8 w-28 h-28 rounded-full opacity-50"
          style={{ background: soft }}
        />
      )}
      <div className="relative flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: soft, color: tint }}
          >
            <Icon size={15} />
          </div>
          <div className="min-w-0">
            <div className="font-mono text-[calc(10px*var(--fz))] uppercase tracking-[0.16em] text-ink-soft font-bold">
              {title}
            </div>
            <div className="numplate text-[calc(22px*var(--fz))] leading-none mt-1 truncate">{subtitle}</div>
          </div>
        </div>
        {trend && (
          <div
            className="flex items-center gap-1 px-2 py-0.5 rounded-full font-mono text-[calc(10px*var(--fz))] font-extrabold shrink-0"
            style={{ background: trend.up ? "var(--coral-soft)" : "var(--mint-soft)", color: trend.up ? "var(--coral)" : "var(--mint-deep)" }}
            title={`相对前段 ${trend.up ? "上升" : "下降"} ${trend.delta}`}
          >
            <span style={{ display: "inline-block", transform: trend.up ? "rotate(-45deg)" : "rotate(45deg)" }}>→</span>
            {trend.delta}
          </div>
        )}
      </div>

      <Sparkline
        data={data}
        stroke={tint}
        fill={soft}
        min={min}
        max={max}
        height={wide ? 96 : 80}
        formatY={fmt}
      />

      {stats && (
        <div className="relative mt-3 grid grid-cols-3 gap-2 pt-3 border-t border-border">
          <MiniStat label="MIN" value={fmt(stats.min)} />
          <MiniStat label="AVG" value={fmt(stats.avg)} />
          <MiniStat label="MAX" value={fmt(stats.max)} />
        </div>
      )}

      {lastTs && (
        <div className="relative mt-3 pt-2 border-t border-border font-mono text-[calc(10px*var(--fz))] uppercase tracking-[0.14em] text-ink-soft font-bold flex items-center gap-1.5">
          <Activity size={11} />
          采样于 {formatTime(lastTs)}
        </div>
      )}
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="font-mono text-[calc(9px*var(--fz))] uppercase tracking-[0.14em] text-ink-soft font-bold">
        {label}
      </div>
      <div className="font-mono text-[calc(12px*var(--fz))] font-extrabold mt-0.5 truncate">{value}</div>
    </div>
  );
}

function computeStats(data: number[]) {
  if (data.length < 2) return null;
  const lo = Math.min(...data);
  const hi = Math.max(...data);
  const avg = data.reduce((a, b) => a + b, 0) / data.length;
  return { min: lo, max: hi, avg };
}

function computeTrend(data: number[]) {
  if (data.length < 6) return null;
  const half = Math.floor(data.length / 2);
  const a = avg(data.slice(0, half));
  const b = avg(data.slice(half));
  const diff = b - a;
  const base = Math.max(Math.abs(a), 1);
  const pct = (diff / base) * 100;
  if (Math.abs(pct) < 1) return null;
  const up = pct > 0;
  const sign = up ? "+" : "";
  return { up, delta: `${sign}${pct.toFixed(1)}%` };
}

function avg(xs: number[]) {
  if (!xs.length) return 0;
  return xs.reduce((a, b) => a + b, 0) / xs.length;
}

function Sparkline({
  data,
  stroke,
  fill,
  min,
  max,
  height = 64,
  formatY,
}: {
  data: number[];
  stroke: string;
  fill: string;
  min?: number;
  max?: number;
  height?: number;
  formatY?: (v: number) => string;
}) {
  const width = 720;
  const padX = 4;
  const padY = 8;
  const w = width - padX * 2;
  const h = height - padY * 2;

  const safe = data.length >= 2 ? data : [0, 0];
  const lo = min != null ? min : Math.min(...safe);
  const hiRaw = max != null ? max : Math.max(...safe);
  const hi = hiRaw - lo < 1e-6 ? lo + 1 : hiRaw;

  const stepX = safe.length > 1 ? w / (safe.length - 1) : w;
  const points = safe.map((v, i) => {
    const x = padX + i * stepX;
    const y = padY + h - ((v - lo) / (hi - lo)) * h;
    return [x, Number.isFinite(y) ? y : padY + h] as const;
  });

  const lineD = points.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(1)} ${y.toFixed(1)}`).join(" ");
  const areaD =
    `M${padX} ${padY + h} ` +
    points.map(([x, y]) => `L${x.toFixed(1)} ${y.toFixed(1)}`).join(" ") +
    ` L${padX + w} ${padY + h} Z`;

  const last = safe[safe.length - 1];
  const lastY = points[points.length - 1][1];
  const lastX = points[points.length - 1][0];

  // Three evenly-spaced gridlines across the body — keeps the chart legible
  // at the larger size without becoming busy.
  const gridYs = [0.25, 0.5, 0.75].map((f) => padY + h * f);
  const gradId = `chart-grad-${Math.round(parseFloat(stroke.length.toString()) * 1000) || 0}-${stroke.replace(/[^a-z0-9]/gi, "")}`;

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      className="w-full block"
      style={{ height }}
      role="img"
      aria-label="time series"
    >
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={stroke} stopOpacity="0.35" />
          <stop offset="100%" stopColor={stroke} stopOpacity="0.02" />
        </linearGradient>
      </defs>
      {gridYs.map((y, i) => (
        <line
          key={i}
          x1={padX}
          x2={padX + w}
          y1={y}
          y2={y}
          stroke="currentColor"
          strokeOpacity="0.08"
          strokeDasharray="3 4"
        />
      ))}
      <path d={areaD} fill={`url(#${gradId})`} />
      <path
        d={lineD}
        stroke={stroke}
        strokeWidth={2}
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx={lastX} cy={lastY} r={4} fill={stroke} opacity={0.18} />
      <circle cx={lastX} cy={lastY} r={2.5} fill={stroke} />
      <title>{`最新值 ${formatY ? formatY(last) : last.toFixed(2)}`}</title>
    </svg>
  );
}

function DualSparkline({
  a,
  b,
  height = 80,
}: {
  a: { data: number[]; stroke: string; fill: string };
  b: { data: number[]; stroke: string };
  height?: number;
}) {
  const width = 720;
  const padX = 4;
  const padY = 8;
  const w = width - padX * 2;
  const h = height - padY * 2;

  const aSafe = a.data.length >= 2 ? a.data : [0, 0];
  const bSafe = b.data.length >= 2 ? b.data : [0, 0];
  const lo = 0;
  const hiRaw = Math.max(...aSafe, ...bSafe, 1);
  const hi = hiRaw <= 0 ? 1 : hiRaw;

  const buildPoints = (data: number[]) => {
    const stepX = data.length > 1 ? w / (data.length - 1) : w;
    return data.map((v, i) => {
      const x = padX + i * stepX;
      const y = padY + h - ((v - lo) / (hi - lo)) * h;
      return [x, Number.isFinite(y) ? y : padY + h] as const;
    });
  };

  const aPoints = buildPoints(aSafe);
  const bPoints = buildPoints(bSafe);

  const lineFrom = (pts: readonly (readonly [number, number])[]) =>
    pts.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(1)} ${y.toFixed(1)}`).join(" ");
  const areaFrom = (pts: readonly (readonly [number, number])[]) =>
    `M${padX} ${padY + h} ` +
    pts.map(([x, y]) => `L${x.toFixed(1)} ${y.toFixed(1)}`).join(" ") +
    ` L${padX + w} ${padY + h} Z`;

  const gridYs = [0.25, 0.5, 0.75].map((f) => padY + h * f);
  const gradId = `dual-grad-${a.stroke.replace(/[^a-z0-9]/gi, "")}`;

  const aLast = aPoints[aPoints.length - 1];
  const bLast = bPoints[bPoints.length - 1];

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      className="w-full block"
      style={{ height }}
      role="img"
      aria-label="network throughput"
    >
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={a.stroke} stopOpacity="0.3" />
          <stop offset="100%" stopColor={a.stroke} stopOpacity="0.02" />
        </linearGradient>
      </defs>
      {gridYs.map((y, i) => (
        <line
          key={i}
          x1={padX}
          x2={padX + w}
          y1={y}
          y2={y}
          stroke="currentColor"
          strokeOpacity="0.08"
          strokeDasharray="3 4"
        />
      ))}
      <path d={areaFrom(aPoints)} fill={`url(#${gradId})`} />
      <path
        d={lineFrom(aPoints)}
        stroke={a.stroke}
        strokeWidth={2}
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d={lineFrom(bPoints)}
        stroke={b.stroke}
        strokeWidth={2}
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeDasharray="0"
      />
      <circle cx={aLast[0]} cy={aLast[1]} r={2.5} fill={a.stroke} />
      <circle cx={bLast[0]} cy={bLast[1]} r={2.5} fill={b.stroke} />
    </svg>
  );
}

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-2xl bg-canvas-2 p-3">
      <div className="font-mono text-[calc(10px*var(--fz))] uppercase tracking-[0.14em] text-ink-soft font-bold">
        {label}
      </div>
      <div className="mt-1 numplate text-[calc(18px*var(--fz))] leading-tight">{value}</div>
      {sub && <div className="mt-1 text-[calc(11px*var(--fz))] text-ink-soft font-semibold">{sub}</div>}
    </div>
  );
}

function CheckCard({ check }: { check: Check }) {
  const tint = STATUS_TINT[check.status];
  const Icon = ICONS[check.name] ?? Activity;
  const title = CHECK_TITLE[check.name] ?? check.name;
  const isDark = useIsDark();
  const showAccent = !isDark; // 在浅色模式下用左色条 + 状态色描边突出非 OK；深色模式保持中性
  return (
    <div
      className="panel panel-lift p-5 relative overflow-hidden flex flex-col"
      style={{ borderColor: showAccent && check.status !== "ok" ? tint.color : undefined }}
    >
      {showAccent && (
        <span
          aria-hidden
          className="absolute left-0 top-0 bottom-0 w-1"
          style={{ background: tint.color, opacity: check.status === "ok" ? 0.35 : 0.85 }}
        />
      )}
      {showAccent && (
        <div
          className="absolute -top-10 -right-10 w-28 h-28 rounded-full opacity-60"
          style={{ background: tint.soft }}
        />
      )}

      <div className="relative flex items-start justify-between gap-3 mb-4">
        <div className="flex items-center gap-3 min-w-0">
          <div
            className="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0"
            style={{ background: tint.soft, color: tint.color }}
          >
            <Icon size={18} />
          </div>
          <div className="min-w-0">
            <div className="font-mono text-[calc(10px*var(--fz))] uppercase tracking-[0.16em] text-ink-soft font-bold">
              {check.name}
            </div>
            <div className="font-display text-[calc(20px*var(--fz))] font-extrabold leading-tight truncate">
              {title}
            </div>
          </div>
        </div>
        <span
          className="flex items-center gap-1.5 font-mono text-[calc(11px*var(--fz))] uppercase tracking-[0.14em] font-extrabold px-2.5 py-1 rounded-full shrink-0"
          style={{ background: tint.soft, color: tint.color }}
        >
          <span
            aria-hidden
            className="w-1.5 h-1.5 rounded-full"
            style={{ background: tint.color }}
          />
          {tint.label}
        </span>
      </div>

      {(check.message || check.latencyMs != null) && (
        <div className="relative mb-3 flex flex-wrap items-center gap-x-3 gap-y-1">
          {check.message && (
            <span className="text-[calc(13px*var(--fz))] font-semibold" style={{ color: tint.color }}>
              {check.message}
            </span>
          )}
          {check.latencyMs != null && (
            <span className="font-mono text-[calc(12px*var(--fz))] text-ink-soft font-bold">
              {check.latencyMs} ms
            </span>
          )}
        </div>
      )}

      {check.detail && (
        <dl className="relative flex flex-col gap-0">
          {Object.entries(check.detail).map(([k, v], i) => (
            <div
              key={k}
              className={`flex items-baseline justify-between gap-3 py-2 ${
                i > 0 ? "border-t border-border" : ""
              }`}
            >
              <dt className="font-mono text-[calc(11px*var(--fz))] uppercase tracking-[0.1em] text-ink-soft font-bold shrink-0">
                {k}
              </dt>
              <dd
                className="font-mono text-[calc(13px*var(--fz))] font-extrabold text-right break-all"
                title={typeof v === "string" ? v : undefined}
              >
                {formatDetail(v)}
              </dd>
            </div>
          ))}
        </dl>
      )}
    </div>
  );
}

function SkeletonCard() {
  return (
    <div className="panel p-5 animate-pulse">
      <div className="flex items-center justify-between mb-4">
        <div className="w-10 h-10 rounded-xl bg-canvas-2" />
        <div className="w-14 h-5 rounded-full bg-canvas-2" />
      </div>
      <div className="h-5 w-24 rounded bg-canvas-2 mb-3" />
      <div className="h-3 w-full rounded bg-canvas-2 mb-1.5" />
      <div className="h-3 w-3/4 rounded bg-canvas-2" />
    </div>
  );
}

function countByStatus(checks: Check[]) {
  const ok = checks.filter((c) => c.status === "ok").length;
  const warn = checks.filter((c) => c.status === "warn").length;
  const down = checks.filter((c) => c.status === "down").length;
  return `ok ${ok} · warn ${warn} · down ${down}`;
}

function formatTime(d: Date) {
  return d.toLocaleTimeString("zh-CN", { hour12: false });
}

function formatUptime(sec: number) {
  if (sec < 60) return `${Math.round(sec)}s`;
  const m = Math.floor(sec / 60);
  if (m < 60) return `${m}m ${Math.round(sec % 60)}s`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ${m % 60}m`;
  const d = Math.floor(h / 24);
  return `${d}d ${h % 24}h`;
}

function formatMB(mb: number) {
  if (mb >= 1024) return `${(mb / 1024).toFixed(2)} GB`;
  return `${mb.toFixed(0)} MB`;
}

function humanRate(bps: number) {
  if (!Number.isFinite(bps) || bps < 0) bps = 0;
  const KB = 1024;
  const MB = KB * 1024;
  const GB = MB * 1024;
  if (bps >= GB) return `${(bps / GB).toFixed(2)} GB/s`;
  if (bps >= MB) return `${(bps / MB).toFixed(2)} MB/s`;
  if (bps >= KB) return `${(bps / KB).toFixed(1)} KB/s`;
  return `${bps.toFixed(0)} B/s`;
}

function formatDetail(v: unknown): string {
  if (v == null) return "—";
  if (typeof v === "number") {
    return Number.isInteger(v) ? v.toLocaleString() : v.toFixed(2);
  }
  if (typeof v === "string") {
    if (/^\d{4}-\d{2}-\d{2}T/.test(v)) {
      const d = new Date(v);
      if (!Number.isNaN(d.getTime())) return d.toLocaleTimeString("zh-CN", { hour12: false });
    }
    return v;
  }
  if (typeof v === "boolean") return v ? "true" : "false";
  return JSON.stringify(v);
}
