"use client";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Shield, AlertTriangle, ArrowUpRight, Users, Mic2, Sliders, Database, ChevronLeft, ChevronRight, Bot, PhoneCall, PhoneOff, MessageSquareText } from "lucide-react";
import AppShell from "@/components/AppShell";
import CountUp from "@/components/shared/CountUp";
import { ADMIN_NAV } from "@/lib/nav";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import type { CallLog } from "@/lib/domain-types";
import Link from "next/link";

type RangeKey = "7" | "30" | "90";

const RANGES: { key: RangeKey; label: string }[] = [
  { key: "7", label: "7 天" },
  { key: "30", label: "30 天" },
  { key: "90", label: "90 天" },
];

// 标签用真实日期 M/D（从今天往前推 i 天）
function dateLabel(daysAgo: number): string {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

function dayKey(d: Date): string {
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

// 从真实通话记录聚合：最近 N 天每日"拦截"判决数
function buildTrend(days: number, calls: CallLog[]): { day: string; v: number }[] {
  const byDay = new Map<string, number>();
  for (const c of calls) {
    if (c.verdict !== "拦截") continue;
    const d = new Date(c.createdAt);
    if (Number.isNaN(d.getTime())) continue;
    const k = dayKey(d);
    byDay.set(k, (byDay.get(k) ?? 0) + 1);
  }
  const out: { day: string; v: number }[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    out.push({ day: dateLabel(i), v: byDay.get(dayKey(d)) ?? 0 });
  }
  return out;
}

function relTime(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  if (!Number.isFinite(ms) || ms < 0) return "刚刚";
  const m = Math.floor(ms / 60000);
  if (m < 1) return "刚刚";
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}

export default function AdminDashboard() {
  const { user } = useAuth();
  const [chartIn, setChartIn] = useState(false);
  const [range, setRange] = useState<RangeKey>("7");
  const [calls, setCalls] = useState<CallLog[]>([]);
  const [callsTotal, setCallsTotal] = useState(0);
  const [stats, setStats] = useState<Record<string, number> | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      const [c, st] = await Promise.allSettled([
        api.calls.list({ pageSize: 100 }),
        api.getStats(),
      ]);
      if (!alive) return;
      if (c.status === "fulfilled") {
        setCalls(c.value.data ?? []);
        setCallsTotal(c.value.meta?.total ?? (c.value.data?.length ?? 0));
      }
      if (st.status === "fulfilled") setStats(st.value as Record<string, number>);
    })();
    return () => {
      alive = false;
    };
  }, []);

  const trends = useMemo(() => buildTrend(Number(range), calls), [range, calls]);
  const trendMax = useMemo(() => Math.max(1, ...trends.map((t) => t.v)), [trends]);

  // 判决占比（基于最近加载的真实记录）
  const verdictShares = useMemo(() => {
    const total = calls.length || 1;
    const n = (v: CallLog["verdict"]) => calls.filter((c) => c.verdict === v).length;
    return [
      { k: "拦截", v: (n("拦截") / total) * 100, c: "var(--coral)" },
      { k: "预警", v: (n("预警") / total) * 100, c: "var(--amber)" },
      { k: "通过", v: (n("通过") / total) * 100, c: "var(--indigo)" },
    ];
  }, [calls]);

  const incidents = useMemo(() => calls.filter((c) => c.verdict === "拦截").slice(0, 4), [calls]);

  useEffect(() => {
    const t = setTimeout(() => setChartIn(true), 80);
    return () => clearTimeout(t);
  }, []);

  // 切换区间时重放柱状生长动画
  const switchRange = (next: RangeKey) => {
    if (next === range) return;
    setChartIn(false);
    setRange(next);
    requestAnimationFrame(() => requestAnimationFrame(() => setChartIn(true)));
  };

  // 横轴可滚动：一屏约展示 10 天，其余靠滑动 / 翻页箭头；默认滚到最右（今天）。
  const VISIBLE = 10;
  const scrollRef = useRef<HTMLDivElement>(null);
  const [trackW, setTrackW] = useState(0);
  const [edge, setEdge] = useState<{ atStart: boolean; atEnd: boolean }>({ atStart: true, atEnd: true });

  const syncEdge = () => {
    const el = scrollRef.current;
    if (!el) return;
    const max = el.scrollWidth - el.clientWidth;
    setEdge({ atStart: el.scrollLeft <= 1, atEnd: el.scrollLeft >= max - 1 });
  };

  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const measure = () => { setTrackW(el.clientWidth); syncEdge(); };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // 区间 ≤ VISIBLE 天时铺满；更长则每根固定宽度，超出部分滚动。
  const scrollable = trends.length > VISIBLE;
  const colW = trackW > 0 ? trackW / VISIBLE : 0;
  const dense = trends.length > 30;
  const barMax = 40; // 三个区间柱宽一致
  const labelEvery = 1; // 每一天都标日期

  // 翻页：每次滚动约一屏（保留 1 天重叠便于衔接）
  const pageBy = (dir: -1 | 1) => {
    const el = scrollRef.current;
    if (!el) return;
    const step = Math.max(colW * (VISIBLE - 1), el.clientWidth * 0.9);
    el.scrollBy({ left: dir * step, behavior: "smooth" });
  };

  // 长按连续滑动：短按=翻一屏；按住超过 ~280ms 后逐帧平滑滑动直到松手。
  const holdRef = useRef<{ raf: number; timer: number; held: boolean }>({ raf: 0, timer: 0, held: false });

  const stopHold = () => {
    const h = holdRef.current;
    if (h.timer) { clearTimeout(h.timer); h.timer = 0; }
    if (h.raf) { cancelAnimationFrame(h.raf); h.raf = 0; }
    h.held = false;
  };

  const startHold = (dir: -1 | 1) => {
    const h = holdRef.current;
    stopHold();
    // 约 0.1 天/帧 的速度连续滑动（更慢）
    const perFrame = Math.max(colW * 0.1, 1);
    const loop = () => {
      const el = scrollRef.current;
      if (!el) return;
      el.scrollLeft += dir * perFrame;
      syncEdge();
      const max = el.scrollWidth - el.clientWidth;
      if ((dir < 0 && el.scrollLeft <= 0) || (dir > 0 && el.scrollLeft >= max)) {
        stopHold();
        return;
      }
      h.raf = requestAnimationFrame(loop);
    };
    h.timer = window.setTimeout(() => {
      h.held = true;
      h.raf = requestAnimationFrame(loop);
    }, 280);
  };

  // 松手：若未进入长按状态，则视为单击翻一屏
  const endHold = (dir: -1 | 1) => {
    const wasHeld = holdRef.current.held;
    stopHold();
    if (!wasHeld) pageBy(dir);
  };

  useEffect(() => stopHold, []);

  // 切区间或首次测量后，滚到最右端展示最新数据
  useEffect(() => {
    const el = scrollRef.current;
    if (el) { el.scrollLeft = el.scrollWidth; syncEdge(); }
  }, [range, trackW]);
  return (
    <AppShell
      role="admin"
      userName={user?.name ?? "管理员"}
      nav={ADMIN_NAV}
      breadcrumb={["SENTINEL", "管理控制台", "总览"]}
    >
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="tag-chip" data-live="true">系统正常</span>
            <span className="font-mono text-[calc(11px*var(--fz))] uppercase tracking-[0.14em] text-ink-soft font-bold">CONTROL CENTER</span>
          </div>
          <h1 className="font-display text-[calc(32px*var(--fz))] md:text-[calc(40px*var(--fz))] font-extrabold tracking-tight">
            企业控制台 · 总览
          </h1>
          <p className="mt-2 text-[calc(14px*var(--fz))] text-ink-soft font-medium">
            累计判决 <CountUp to={callsTotal} duration={1300} className="font-extrabold text-ink" /> 通话，
            拦截 <CountUp to={stats?.blockedCalls ?? 0} duration={1100} className="font-extrabold text-coral-deep" /> 起可疑通话。
          </p>
        </div>
        <div className="flex items-center gap-3">
          <a href="/warroom" className="btn-indigo py-2.5 px-4 text-[calc(13px*var(--fz))]">
            <Shield size={14} /> 进入指挥中心 <ArrowUpRight size={14} />
          </a>
        </div>
      </div>

      {/* KPI */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          { label: "判决通话", num: callsTotal, sub: "条累计记录", tint: "var(--indigo)", soft: "var(--indigo-soft)", icon: PhoneCall },
          { label: "拦截诈骗", num: stats?.blockedCalls ?? 0, sub: "起累计拦截", tint: "var(--coral)", soft: "var(--coral-soft)", icon: PhoneOff },
          { label: "AI 合成识别", num: stats?.aiCloneDetected ?? 0, sub: "次声纹判定 SYNTH", tint: "var(--amber-deep)", soft: "var(--amber-soft)", icon: Bot },
          { label: "话术命中", num: stats?.scriptHits ?? 0, sub: "次话术规则命中", tint: "var(--mint-deep)", soft: "var(--mint-soft)", icon: MessageSquareText },
        ].map((k) => (
          <div key={k.label} className="panel panel-lift p-5 relative overflow-hidden">
            <div className="absolute -top-8 -right-8 w-24 h-24 rounded-full opacity-50" style={{ background: k.soft }} />
            <div className="relative flex items-center justify-between">
              <span className="font-mono text-[calc(10px*var(--fz))] uppercase tracking-[0.14em] text-ink-soft font-bold">{k.label}</span>
              <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: k.soft, color: k.tint }}>
                <k.icon size={16} />
              </div>
            </div>
            <CountUp
              to={k.num}
              duration={1100}
              className="relative mt-2 numplate text-[calc(36px*var(--fz))] leading-none block"
            />
            <div className="relative mt-3 text-[calc(12px*var(--fz))] text-ink-soft font-semibold">{k.sub}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-12 gap-5">
        {/* 趋势图 */}
        <section className="col-span-12 lg:col-span-8 panel p-6">
          <div className="flex items-center justify-between mb-5">
            <div>
              <div className="font-mono text-[calc(10px*var(--fz))] uppercase tracking-[0.14em] text-ink-soft font-bold">{range}-DAY TREND</div>
              <h2 className="font-display text-[calc(22px*var(--fz))] font-extrabold mt-1">{range === "7" ? "本周拦截趋势" : `近 ${range} 天拦截趋势`}</h2>
            </div>
            <div className="flex items-center gap-1 p-1 rounded-full bg-canvas-2 border border-border">
              {RANGES.map((r) => {
                const active = r.key === range;
                return (
                  <button
                    key={r.key}
                    onClick={() => switchRange(r.key)}
                    className="px-3 py-1 rounded-full text-[calc(12px*var(--fz))] font-bold transition-colors"
                    style={{
                      background: active ? "var(--surface)" : "transparent",
                      color: active ? "var(--ink)" : "var(--ink-soft)",
                      boxShadow: active ? "var(--shadow-sm)" : "none",
                    }}
                  >
                    {r.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {scrollable && (
              <button
                onPointerDown={(e) => { e.preventDefault(); startHold(-1); }}
                onPointerUp={() => endHold(-1)}
                onPointerLeave={stopHold}
                onPointerCancel={stopHold}
                disabled={edge.atStart}
                aria-label="上一页（长按连续滑动）"
                className="shrink-0 w-9 h-9 rounded-full border border-border bg-surface flex items-center justify-center disabled:opacity-30 disabled:cursor-default hover:bg-canvas-2 transition-colors shadow-sm touch-none select-none"
              >
                <ChevronLeft size={16} />
              </button>
            )}
            <div
              ref={scrollRef}
              onScroll={syncEdge}
              className={`flex-1 min-w-0 h-56 overflow-x-auto overflow-y-hidden trend-scroll ${scrollable ? "" : "px-1"}`}
            >
              <div className={`h-full flex items-end ${dense ? "gap-[4px]" : "gap-3"}`} style={scrollable ? { width: colW * trends.length } : { width: "100%" }}>
                {trends.map((d, i) => {
                  const isLast = i === trends.length - 1;
                  const showLabel = isLast || (trends.length - 1 - i) % labelEvery === 0;
                  const heightPct = d.v === 0 ? 0 : Math.max(6, Math.round((d.v / trendMax) * 100));
                  return (
                    <div
                      key={`${range}-${i}`}
                      className="flex flex-col items-center gap-2 min-w-0 shrink-0"
                      style={scrollable ? { width: colW } : { flex: "1 1 0%" }}
                    >
                      <div className="w-full flex items-end justify-center" style={{ height: "180px" }}>
                        <div
                          className="w-full rounded-t-xl relative group cursor-pointer transition-[height,opacity] duration-500 ease-out hover:opacity-90"
                          style={{
                            maxWidth: `${barMax}px`,
                            height: chartIn ? `${heightPct}%` : "0%",
                            opacity: chartIn ? 1 : 0,
                            minHeight: d.v > 0 ? 4 : 2,
                            transitionDelay: `${Math.min((trends.length - 1 - i) * 35, 350)}ms`,
                            background: d.v === 0
                              ? "var(--canvas-3)"
                              : isLast
                                ? "linear-gradient(to top, var(--coral), var(--amber))"
                                : "linear-gradient(to top, var(--indigo), var(--indigo-deep))",
                          }}
                        >
                          <div className="absolute -top-7 left-1/2 -translate-x-1/2 px-1.5 py-0.5 rounded-md font-mono text-[calc(10px*var(--fz))] font-bold text-white opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10" style={{ background: "var(--ink)" }}>
                            {d.day} · {d.v} 起
                          </div>
                        </div>
                      </div>
                      {showLabel ? (
                        <div className="font-mono text-[calc(10px*var(--fz))] tracking-[0.02em] font-bold whitespace-nowrap" style={{ color: isLast ? "var(--ink)" : "var(--ink-soft)" }}>
                          {d.day}
                        </div>
                      ) : (
                        <div className="h-[14px]" />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
            {scrollable && (
              <button
                onPointerDown={(e) => { e.preventDefault(); startHold(1); }}
                onPointerUp={() => endHold(1)}
                onPointerLeave={stopHold}
                onPointerCancel={stopHold}
                disabled={edge.atEnd}
                aria-label="下一页（长按连续滑动）"
                className="shrink-0 w-9 h-9 rounded-full border border-border bg-surface flex items-center justify-center disabled:opacity-30 disabled:cursor-default hover:bg-canvas-2 transition-colors shadow-sm touch-none select-none"
              >
                <ChevronRight size={16} />
              </button>
            )}
          </div>

          <div className="mt-6 grid grid-cols-3 gap-4 pt-5 border-t border-border">
            {verdictShares.map((s) => (
              <div key={s.k}>
                <div className="flex items-center gap-2 font-mono text-[calc(10px*var(--fz))] uppercase tracking-[0.14em] text-ink-soft font-bold">
                  <span className="w-2 h-2 rounded-full" style={{ background: s.c }} />
                  {s.k}
                </div>
                <CountUp
                  to={s.v}
                  decimals={1}
                  suffix="%"
                  duration={1000}
                  className="numplate text-[calc(22px*var(--fz))] mt-1 block"
                />
              </div>
            ))}
          </div>
        </section>

        {/* 实时告警 */}
        <section className="col-span-12 lg:col-span-4 panel p-6">
          <div className="flex items-center justify-between mb-5">
            <div>
              <div className="font-mono text-[calc(10px*var(--fz))] uppercase tracking-[0.14em] text-ink-soft font-bold">PRIORITY</div>
              <h2 className="font-display text-[calc(22px*var(--fz))] font-extrabold mt-1">高危事件</h2>
            </div>
            <span className="tag-chip" data-tone="coral">{incidents.length} 条最新</span>
          </div>
          {incidents.length === 0 ? (
            <div className="py-12 text-center text-[calc(13px*var(--fz))] text-ink-soft font-medium">
              暂无拦截事件
            </div>
          ) : (
            <div className="space-y-3">
              {incidents.map((a) => (
                <Link key={a.id} href="/admin/recordings" className="flex items-start gap-3 p-3 rounded-2xl hover:bg-canvas-2 transition-colors">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: "var(--coral-soft)", color: "var(--coral-deep)" }}>
                    <AlertTriangle size={16} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-display text-[calc(13px*var(--fz))] font-extrabold truncate">{a.reason || "高风险通话拦截"}</div>
                    <div className="mt-0.5 font-mono text-[calc(10px*var(--fz))] uppercase tracking-[0.12em] text-ink-soft font-bold truncate">
                      {a.phone} · {a.region || "未知"}
                    </div>
                  </div>
                  <span className="font-mono text-[calc(10px*var(--fz))] text-ink-soft font-bold">{relTime(a.createdAt)}</span>
                </Link>
              ))}
            </div>
          )}
        </section>

        {/* 快捷管理入口 */}
        <section className="col-span-12 panel p-6">
          <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
            <div>
              <div className="font-mono text-[calc(10px*var(--fz))] uppercase tracking-[0.14em] text-ink-soft font-bold">ADMIN MODULES</div>
              <h2 className="font-display text-[calc(22px*var(--fz))] font-extrabold mt-1">管理模块</h2>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              { href: "/admin/users", icon: Users, title: "员工管理", desc: "增 / 删 / 编辑账号", tint: "var(--indigo)", soft: "var(--indigo-soft)" },
              { href: "/admin/recordings", icon: Mic2, title: "录音数据", desc: "管理通话留样", tint: "var(--mint-deep)", soft: "var(--mint-soft)" },
              { href: "/admin/risk-level", icon: Sliders, title: "风控等级", desc: "L1–L5 自定义规则", tint: "var(--amber-deep)", soft: "var(--amber-soft)" },
              { href: "/admin/blacklist", icon: Database, title: "企业黑名单", desc: "CSV / XLSX 批量导入", tint: "var(--coral)", soft: "var(--coral-soft)" },
            ].map((a) => (
              <Link key={a.href} href={a.href} className="panel panel-lift p-5 flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0" style={{ background: a.soft, color: a.tint }}>
                  <a.icon size={20} />
                </div>
                <div className="flex-1">
                  <div className="font-display text-[calc(14px*var(--fz))] font-extrabold">{a.title}</div>
                  <div className="mt-0.5 font-mono text-[calc(10px*var(--fz))] uppercase tracking-[0.14em] text-ink-soft font-bold">{a.desc}</div>
                </div>
                <ArrowUpRight size={16} className="text-ink-soft" />
              </Link>
            ))}
          </div>
        </section>
      </div>
    </AppShell>
  );
}

