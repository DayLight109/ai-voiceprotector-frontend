"use client";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Shield, FileBarChart2, AlertTriangle, ArrowUpRight, TrendingUp, TrendingDown, Users, Mic2, Sliders, Database, ChevronLeft, ChevronRight } from "lucide-react";
import AppShell from "@/components/AppShell";
import CountUp from "@/components/shared/CountUp";
import { ADMIN_NAV } from "@/lib/nav";
import Link from "next/link";

type RangeKey = "7" | "30" | "90";

const RANGES: { key: RangeKey; label: string }[] = [
  { key: "7", label: "7 天" },
  { key: "30", label: "30 天" },
  { key: "90", label: "90 天" },
];

const TRENDS_7_VALUES = [62, 78, 55, 88, 92, 71, 96];

// 标签用真实日期 M/D（从今天往前推 i 天）
function dateLabel(daysAgo: number): string {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

// 基于天数确定性生成（不随渲染抖动），周末略低、近 7 日抬升，最后一根为“今日”。
// fixed 提供时按位使用其数值（7 天用手挑值）。
function buildTrend(days: number, fixed?: number[]): { day: string; v: number }[] {
  const out: { day: string; v: number }[] = [];
  for (let i = days - 1; i >= 0; i--) {
    let v: number;
    if (fixed) {
      v = fixed[days - 1 - i];
    } else {
      const dow = (7 - (i % 7)) % 7; // 0=周日 … 6=周六，仅用于造型
      const weekend = dow === 0 || dow === 6 ? -10 : 0;
      const wave = Math.sin(i * 0.45) * 14 + Math.cos(i * 0.21) * 9;
      const recentLift = i < 7 ? (7 - i) * 2.2 : 0;
      const base = 64 + weekend + wave + recentLift;
      v = Math.max(28, Math.min(98, Math.round(base)));
    }
    out.push({ day: dateLabel(i), v });
  }
  return out;
}

const TREND_DATA: Record<RangeKey, { day: string; v: number }[]> = {
  "7": buildTrend(7, TRENDS_7_VALUES),
  "30": buildTrend(30),
  "90": buildTrend(90),
};

export default function AdminDashboard() {
  const [chartIn, setChartIn] = useState(false);
  const [range, setRange] = useState<RangeKey>("7");
  const trends = useMemo(() => TREND_DATA[range], [range]);

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
      userName="李梦楠"
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
            最近 24 小时累计判决 <CountUp to={1283471} duration={1300} className="font-extrabold text-ink" /> 通话，
            阻断 <CountUp to={9824} duration={1100} className="font-extrabold text-coral-deep" /> 起 AI 合成诈骗。
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button className="btn-ghost py-2.5 px-4 text-[calc(13px*var(--fz))]">
            <FileBarChart2 size={14} /> 导出周报
          </button>
          <a href="/warroom" className="btn-indigo py-2.5 px-4 text-[calc(13px*var(--fz))]">
            <Shield size={14} /> 进入指挥中心 <ArrowUpRight size={14} />
          </a>
        </div>
      </div>

      {/* KPI */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          { label: "判决通话", num: 1.28, suffix: "M", decimals: 2, delta: "+12.4%", up: true, tint: "var(--indigo)", soft: "var(--indigo-soft)" },
          { label: "拦截诈骗", num: 9824, suffix: "", decimals: 0, delta: "+5.7%", up: true, tint: "var(--coral)", soft: "var(--coral-soft)" },
          { label: "误报率", num: 0.31, suffix: "%", decimals: 2, delta: "-0.08", up: false, tint: "var(--mint-deep)", soft: "var(--mint-soft)" },
          { label: "P99 延迟", num: 118, suffix: "ms", decimals: 0, delta: "+2ms", up: true, tint: "var(--amber-deep)", soft: "var(--amber-soft)" },
        ].map((k) => (
          <div key={k.label} className="panel panel-lift p-5 relative overflow-hidden">
            <div className="absolute -top-8 -right-8 w-24 h-24 rounded-full opacity-50" style={{ background: k.soft }} />
            <div className="relative font-mono text-[calc(10px*var(--fz))] uppercase tracking-[0.14em] text-ink-soft font-bold">{k.label}</div>
            <CountUp
              to={k.num}
              decimals={k.decimals}
              suffix={k.suffix}
              duration={1100}
              className="relative mt-2 numplate text-[calc(36px*var(--fz))] leading-none block"
            />
            <div className="relative mt-3 flex items-center gap-1.5 font-mono text-[calc(11px*var(--fz))] font-bold" style={{ color: k.up ? "var(--mint-deep)" : "var(--coral-deep)" }}>
              {k.up ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
              {k.delta}
              <span className="text-ink-soft font-medium">vs 上周</span>
            </div>
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
                            height: chartIn ? `${d.v}%` : "0%",
                            opacity: chartIn ? 1 : 0,
                            transitionDelay: `${Math.min((trends.length - 1 - i) * 35, 350)}ms`,
                            background: isLast ? "linear-gradient(to top, var(--coral), var(--amber))" : "linear-gradient(to top, var(--indigo), var(--indigo-deep))",
                          }}
                        >
                          <div className="absolute -top-7 left-1/2 -translate-x-1/2 px-1.5 py-0.5 rounded-md font-mono text-[calc(10px*var(--fz))] font-bold text-white opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10" style={{ background: "var(--ink)" }}>
                            {d.day} · {d.v}k
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
            {[
              { k: "AI 合成", v: 62.4, c: "var(--coral)" },
              { k: "话术诈骗", v: 23.1, c: "var(--amber)" },
              { k: "号码伪冒", v: 14.5, c: "var(--indigo)" },
            ].map((s) => (
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
            <span className="tag-chip" data-tone="coral">5 待处置</span>
          </div>
          <div className="space-y-3">
            {[
              { t: "刚刚", code: "INC-39281", title: "异常号段批量呼出", region: "缅甸 / 仰光" },
              { t: "3m", code: "INC-39279", title: "AI 声纹突发尖峰", region: "柬埔寨 / 西港" },
              { t: "12m", code: "INC-39271", title: "公安话术大规模命中", region: "越南 / 胡志明" },
              { t: "28m", code: "INC-39264", title: "信令层穿透增多", region: "泰国 / 曼谷" },
            ].map((a) => (
              <a key={a.code} href="#" className="flex items-start gap-3 p-3 rounded-2xl hover:bg-canvas-2 transition-colors">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: "var(--coral-soft)", color: "var(--coral-deep)" }}>
                  <AlertTriangle size={16} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-display text-[calc(13px*var(--fz))] font-extrabold truncate">{a.title}</div>
                  <div className="mt-0.5 font-mono text-[calc(10px*var(--fz))] uppercase tracking-[0.12em] text-ink-soft font-bold truncate">
                    {a.code} · {a.region}
                  </div>
                </div>
                <span className="font-mono text-[calc(10px*var(--fz))] text-ink-soft font-bold">{a.t}</span>
              </a>
            ))}
          </div>
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
