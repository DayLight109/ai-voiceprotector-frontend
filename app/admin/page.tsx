"use client";
import { useEffect, useState } from "react";
import { Shield, FileBarChart2, AlertTriangle, ArrowUpRight, TrendingUp, TrendingDown, Users, Mic2, Sliders, Database } from "lucide-react";
import AppShell from "@/components/AppShell";
import CountUp from "@/components/shared/CountUp";
import { ADMIN_NAV } from "@/lib/nav";
import Link from "next/link";

const TRENDS = [
  { day: "周一", v: 62 },
  { day: "周二", v: 78 },
  { day: "周三", v: 55 },
  { day: "周四", v: 88 },
  { day: "周五", v: 92 },
  { day: "周六", v: 71 },
  { day: "今日", v: 96 },
];

export default function AdminDashboard() {
  const [chartIn, setChartIn] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setChartIn(true), 80);
    return () => clearTimeout(t);
  }, []);
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
            <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-ink-soft font-bold">CONTROL CENTER</span>
          </div>
          <h1 className="font-display text-[32px] md:text-[40px] font-extrabold tracking-tight">
            企业控制台 · 总览
          </h1>
          <p className="mt-2 text-[14px] text-ink-soft font-medium">
            最近 24 小时累计判决 <CountUp to={1283471} duration={1300} className="font-extrabold text-ink" /> 通话，
            阻断 <CountUp to={9824} duration={1100} className="font-extrabold text-coral-deep" /> 起 AI 合成诈骗。
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button className="btn-ghost py-2.5 px-4 text-[13px]">
            <FileBarChart2 size={14} /> 导出周报
          </button>
          <a href="/warroom" className="btn-indigo py-2.5 px-4 text-[13px]">
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
            <div className="relative font-mono text-[10px] uppercase tracking-[0.14em] text-ink-soft font-bold">{k.label}</div>
            <CountUp
              to={k.num}
              decimals={k.decimals}
              suffix={k.suffix}
              duration={1100}
              className="relative mt-2 numplate text-[36px] leading-none block"
            />
            <div className="relative mt-3 flex items-center gap-1.5 font-mono text-[11px] font-bold" style={{ color: k.up ? "var(--mint-deep)" : "var(--coral-deep)" }}>
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
              <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-soft font-bold">7-DAY TREND</div>
              <h2 className="font-display text-[22px] font-extrabold mt-1">本周拦截趋势</h2>
            </div>
            <div className="flex items-center gap-1 p-1 rounded-full bg-canvas-2 border border-border">
              {["7 天", "30 天", "90 天"].map((t, i) => (
                <button
                  key={t}
                  className="px-3 py-1 rounded-full text-[12px] font-bold transition-colors"
                  style={{
                    background: i === 0 ? "var(--surface)" : "transparent",
                    color: i === 0 ? "var(--ink)" : "var(--ink-soft)",
                  }}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          <div className="h-56 flex items-end justify-between gap-3 px-1">
            {TRENDS.map((d, i) => (
              <div key={d.day} className="flex-1 flex flex-col items-center gap-2">
                <div className="w-full flex items-end justify-center" style={{ height: "180px" }}>
                  <div
                    className="w-full max-w-[42px] rounded-t-xl relative group cursor-pointer transition-[height,opacity] duration-700 ease-out hover:opacity-90"
                    style={{
                      height: chartIn ? `${d.v}%` : "0%",
                      opacity: chartIn ? 1 : 0,
                      transitionDelay: `${i * 80}ms`,
                      background: i === TRENDS.length - 1 ? "linear-gradient(to top, var(--coral), var(--amber))" : "linear-gradient(to top, var(--indigo), var(--indigo-deep))",
                    }}
                  >
                    <div className="absolute -top-7 left-1/2 -translate-x-1/2 px-1.5 py-0.5 rounded-md font-mono text-[10px] font-bold text-white opacity-0 group-hover:opacity-100 transition-opacity" style={{ background: "var(--ink)" }}>
                      {d.v}k
                    </div>
                  </div>
                </div>
                <div className="font-mono text-[10px] uppercase tracking-[0.14em] font-bold" style={{ color: i === TRENDS.length - 1 ? "var(--ink)" : "var(--ink-soft)" }}>
                  {d.day}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 grid grid-cols-3 gap-4 pt-5 border-t border-border">
            {[
              { k: "AI 合成", v: 62.4, c: "var(--coral)" },
              { k: "话术诈骗", v: 23.1, c: "var(--amber)" },
              { k: "号码伪冒", v: 14.5, c: "var(--indigo)" },
            ].map((s) => (
              <div key={s.k}>
                <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.14em] text-ink-soft font-bold">
                  <span className="w-2 h-2 rounded-full" style={{ background: s.c }} />
                  {s.k}
                </div>
                <CountUp
                  to={s.v}
                  decimals={1}
                  suffix="%"
                  duration={1000}
                  className="numplate text-[22px] mt-1 block"
                />
              </div>
            ))}
          </div>
        </section>

        {/* 实时告警 */}
        <section className="col-span-12 lg:col-span-4 panel p-6">
          <div className="flex items-center justify-between mb-5">
            <div>
              <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-soft font-bold">PRIORITY</div>
              <h2 className="font-display text-[22px] font-extrabold mt-1">高危事件</h2>
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
                  <div className="font-display text-[13px] font-extrabold truncate">{a.title}</div>
                  <div className="mt-0.5 font-mono text-[10px] uppercase tracking-[0.12em] text-ink-soft font-bold truncate">
                    {a.code} · {a.region}
                  </div>
                </div>
                <span className="font-mono text-[10px] text-ink-soft font-bold">{a.t}</span>
              </a>
            ))}
          </div>
        </section>

        {/* 快捷管理入口 */}
        <section className="col-span-12 panel p-6">
          <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
            <div>
              <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-soft font-bold">ADMIN MODULES</div>
              <h2 className="font-display text-[22px] font-extrabold mt-1">管理模块</h2>
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
                  <div className="font-display text-[14px] font-extrabold">{a.title}</div>
                  <div className="mt-0.5 font-mono text-[10px] uppercase tracking-[0.14em] text-ink-soft font-bold">{a.desc}</div>
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
