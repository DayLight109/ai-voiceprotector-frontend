"use client";
import { LayoutDashboard, Users2, Sliders, Shield, FileBarChart2, Database, FileLock2, Server, AlertTriangle, ArrowUpRight, MoreHorizontal, Search, TrendingUp, TrendingDown } from "lucide-react";
import AppShell from "@/components/AppShell";

const NAV = [
  { href: "/admin", label: "总览", icon: LayoutDashboard },
  { href: "/admin", label: "用户管理", icon: Users2 },
  { href: "/admin", label: "策略配置", icon: Sliders },
  { href: "/admin", label: "三层引擎", icon: Shield },
  { href: "/admin", label: "数据统计", icon: FileBarChart2 },
  { href: "/admin", label: "证据留样", icon: Database, badge: 12 },
  { href: "/admin", label: "审计日志", icon: FileLock2 },
  { href: "/admin", label: "服务器", icon: Server },
];

const TRENDS = [
  { day: "周一", v: 62 },
  { day: "周二", v: 78 },
  { day: "周三", v: 55 },
  { day: "周四", v: 88 },
  { day: "周五", v: 92 },
  { day: "周六", v: 71 },
  { day: "今日", v: 96 },
];

const USERS = [
  { id: "U-1024", name: "李梦楠", role: "企业管理员", dept: "杭州反诈中心", status: "active", last: "刚刚" },
  { id: "U-1018", name: "周珩", role: "客服专员", dept: "建设银行 · 95533", status: "active", last: "12 分钟前" },
  { id: "U-1009", name: "陈安怡", role: "审计", dept: "公安部刑侦三处", status: "review", last: "2 小时前" },
  { id: "U-0997", name: "刘旭东", role: "运营", dept: "中国联通安全部", status: "active", last: "今天 09:24" },
  { id: "U-0982", name: "张梓豪", role: "实习", dept: "网信办合作组", status: "suspended", last: "昨天" },
];

export default function AdminDashboard() {
  return (
    <AppShell
      role="admin"
      userName="李梦楠"
      nav={NAV}
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
            最近 24 小时累计判决 <span className="font-extrabold text-ink">1,283,471</span> 通话，
            阻断 <span className="font-extrabold text-coral-deep">9,824</span> 起 AI 合成诈骗。
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
          { label: "判决通话", val: "1.28M", delta: "+12.4%", up: true, tint: "var(--indigo)", soft: "var(--indigo-soft)" },
          { label: "拦截诈骗", val: "9,824", delta: "+5.7%", up: true, tint: "var(--coral)", soft: "var(--coral-soft)" },
          { label: "误报率", val: "0.31%", delta: "-0.08", up: false, tint: "var(--mint-deep)", soft: "var(--mint-soft)" },
          { label: "P99 延迟", val: "118ms", delta: "+2ms", up: true, tint: "var(--amber-deep)", soft: "var(--amber-soft)" },
        ].map((k) => (
          <div key={k.label} className="panel panel-lift p-5 relative overflow-hidden">
            <div className="absolute -top-8 -right-8 w-24 h-24 rounded-full opacity-50" style={{ background: k.soft }} />
            <div className="relative font-mono text-[10px] uppercase tracking-[0.14em] text-ink-soft font-bold">{k.label}</div>
            <div className="relative mt-2 numplate text-[36px] leading-none">{k.val}</div>
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
                    className="w-full max-w-[42px] rounded-t-xl relative group cursor-pointer transition-all hover:opacity-90"
                    style={{
                      height: `${d.v}%`,
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
              { k: "AI 合成", v: "62.4%", c: "var(--coral)" },
              { k: "话术诈骗", v: "23.1%", c: "var(--amber)" },
              { k: "号码伪冒", v: "14.5%", c: "var(--indigo)" },
            ].map((s) => (
              <div key={s.k}>
                <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.14em] text-ink-soft font-bold">
                  <span className="w-2 h-2 rounded-full" style={{ background: s.c }} />
                  {s.k}
                </div>
                <div className="numplate text-[22px] mt-1">{s.v}</div>
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

        {/* 用户管理 */}
        <section className="col-span-12 panel p-6">
          <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
            <div>
              <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-soft font-bold">USER MANAGEMENT</div>
              <h2 className="font-display text-[22px] font-extrabold mt-1">账号与权限</h2>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2 px-3 py-2 rounded-full bg-canvas-2 border border-border w-64">
                <Search size={14} className="text-ink-soft" />
                <input placeholder="搜索姓名 / 部门 / 工号" className="flex-1 bg-transparent text-[13px] font-medium placeholder:text-ink-ghost focus:outline-none" />
              </div>
              <button className="btn-indigo py-2 px-3 text-[12px]">
                + 新增成员
              </button>
            </div>
          </div>

          <div className="overflow-x-auto -mx-2">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="text-left font-mono text-[10px] uppercase tracking-[0.14em] text-ink-soft font-bold">
                  <th className="px-3 py-3">工号</th>
                  <th className="px-3 py-3">姓名</th>
                  <th className="px-3 py-3">角色</th>
                  <th className="px-3 py-3">部门</th>
                  <th className="px-3 py-3">状态</th>
                  <th className="px-3 py-3">最近活动</th>
                  <th className="px-3 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {USERS.map((u) => {
                  const s = u.status;
                  const sBg = s === "active" ? "var(--mint-soft)" : s === "review" ? "var(--amber-soft)" : "var(--coral-soft)";
                  const sFg = s === "active" ? "var(--mint-deep)" : s === "review" ? "var(--amber-deep)" : "var(--coral-deep)";
                  const sLabel = s === "active" ? "正常" : s === "review" ? "审核中" : "已停用";
                  return (
                    <tr key={u.id} className="border-t border-border hover:bg-canvas-2/60 transition-colors">
                      <td className="px-3 py-3 font-mono text-[12px] font-bold text-ink-soft">{u.id}</td>
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full flex items-center justify-center font-display text-white text-[11px] font-extrabold" style={{ background: "linear-gradient(135deg, var(--indigo), var(--coral))" }}>
                            {u.name.slice(0, 1)}
                          </div>
                          <span className="font-display font-extrabold">{u.name}</span>
                        </div>
                      </td>
                      <td className="px-3 py-3 font-medium">{u.role}</td>
                      <td className="px-3 py-3 text-ink-soft font-medium">{u.dept}</td>
                      <td className="px-3 py-3">
                        <span className="font-mono text-[10px] uppercase tracking-[0.14em] px-2 py-1 rounded-full font-bold" style={{ background: sBg, color: sFg }}>
                          {sLabel}
                        </span>
                      </td>
                      <td className="px-3 py-3 font-mono text-[11px] text-ink-soft font-bold">{u.last}</td>
                      <td className="px-3 py-3 text-right">
                        <button className="w-8 h-8 rounded-lg hover:bg-canvas-2 flex items-center justify-center">
                          <MoreHorizontal size={14} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </AppShell>
  );
}
