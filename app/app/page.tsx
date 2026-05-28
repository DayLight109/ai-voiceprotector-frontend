"use client";
import { ShieldCheck, Bell, Users, ListChecks, PhoneOff, Radio, Waves, ScanLine, ArrowUpRight, Plus, Circle } from "lucide-react";
import Link from "next/link";
import AppShell from "@/components/AppShell";
import CountUp from "@/components/shared/CountUp";
import { FAMILY_NAV } from "@/lib/nav";

const ALERTS = [
  { t: "2 分钟前", phone: "+86 138 0013 4921", loc: "柬埔寨 · 金边", tone: "block", reason: "AI 合成语音 · 0.94" },
  { t: "14 分钟前", phone: "+86 186 6688 7712", loc: "缅甸 · 仰光", tone: "warn", reason: "转账话术命中" },
  { t: "38 分钟前", phone: "+855 23 8123 4551", loc: "柬埔寨 · 西港", tone: "block", reason: "信令层伪冒" },
  { t: "1 小时前", phone: "+86 173 1234 5678", loc: "北京 · 联通", tone: "safe", reason: "已通过验证" },
  { t: "2 小时前", phone: "+84 28 6677 2210", loc: "越南 · 胡志明", tone: "warn", reason: "公安冒充话术" },
];

const MEMBERS = [
  { name: "父亲 · 王建国", age: 68, phone: "138 0013 xxxx", status: "online", today: 12, blocked: 2 },
  { name: "母亲 · 李秀芬", age: 65, phone: "139 0011 xxxx", status: "online", today: 8, blocked: 1 },
  { name: "儿子 · 王小明", age: 12, phone: "186 6688 xxxx", status: "offline", today: 3, blocked: 0 },
];

export default function FamilyDashboard() {
  return (
    <AppShell
      role="family"
      userName="王磊"
      nav={FAMILY_NAV}
      breadcrumb={["SENTINEL", "家庭用户", "首页"]}
    >
      {/* 头部欢迎 */}
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="font-mono text-[11px] uppercase tracking-[0.18em] text-ink-soft font-bold mb-2">
            TUESDAY · MAY 13
          </div>
          <h1 className="font-display text-[32px] md:text-[40px] font-extrabold tracking-tight">
            晚上好，王磊
          </h1>
          <p className="mt-2 text-[14px] text-ink-soft font-medium">
            今天已为你和家人拦截 <span className="font-extrabold text-coral-deep">3 通</span> 可疑来电。
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/app/protection?tab=whitelist&add=1" className="btn-ghost py-2.5 px-4 text-[13px]">
            <Plus size={14} /> 添加白名单
          </Link>
          <button className="btn-indigo py-2.5 px-4 text-[13px]">
            <ShieldCheck size={14} /> 模拟演练
          </button>
        </div>
      </div>

      {/* KPI 四宫格 */}
      <div className="stagger grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          { label: "今日拦截", val: 3, sub: "次 AI 合成通话", tint: "var(--coral)", soft: "var(--coral-soft)", icon: PhoneOff },
          { label: "本月预警", val: 47, sub: "已推送家属", tint: "var(--amber)", soft: "var(--amber-soft)", icon: Bell },
          { label: "白名单", val: 128, sub: "可信联系人", tint: "var(--mint)", soft: "var(--mint-soft)", icon: ListChecks },
          { label: "守护设备", val: 3, sub: "家庭成员在线", tint: "var(--indigo)", soft: "var(--indigo-soft)", icon: Users },
        ].map((k) => (
          <div key={k.label} className="panel panel-lift p-5 relative overflow-hidden">
            <div className="absolute -top-8 -right-8 w-24 h-24 rounded-full opacity-60" style={{ background: k.soft }} />
            <div className="relative flex items-center justify-between mb-4">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: k.soft, color: k.tint }}>
                <k.icon size={18} />
              </div>
              <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-soft font-bold">{k.label}</span>
            </div>
            <div className="relative numplate text-[36px] leading-none">
              <CountUp to={k.val} />
            </div>
            <div className="relative mt-2 text-[12px] text-ink-soft font-semibold">{k.sub}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-12 gap-5">
        {/* 告警记录 */}
        <section className="col-span-12 lg:col-span-8 panel p-6">
          <div className="flex items-center justify-between mb-5">
            <div>
              <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-soft font-bold">RECENT ALERTS</div>
              <h2 className="font-display text-[22px] font-extrabold mt-1">近期告警</h2>
            </div>
            <a href="#" className="flex items-center gap-1 font-mono text-[11px] uppercase tracking-[0.14em] text-indigo-deep font-bold hover:underline">
              全部 <ArrowUpRight size={12} />
            </a>
          </div>

          <div className="stagger space-y-2">
            {ALERTS.map((a, i) => {
              const tone = a.tone === "block" ? "coral" : a.tone === "warn" ? "amber" : "mint";
              const label = a.tone === "block" ? "拦截" : a.tone === "warn" ? "预警" : "通过";
              const bg = `var(--${tone}-soft)`;
              const fg = `var(--${tone}-deep)`;
              return (
                <div key={i} className="flex items-center gap-4 p-4 rounded-2xl hover:bg-canvas-2 transition-colors">
                  <div
                    className="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0"
                    style={{ background: bg, color: fg }}
                  >
                    {a.tone === "block" ? <PhoneOff size={18} /> : a.tone === "warn" ? <Bell size={18} /> : <ShieldCheck size={18} />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-display text-[14px] font-extrabold truncate">{a.phone}</span>
                      <span
                        className="font-mono text-[9px] uppercase tracking-[0.14em] px-2 py-0.5 rounded-full font-bold"
                        style={{ background: bg, color: fg }}
                      >
                        {label}
                      </span>
                    </div>
                    <div className="mt-0.5 text-[12px] text-ink-soft font-medium truncate">
                      {a.loc} · {a.reason}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-soft font-bold">{a.t}</div>
                    <a href="#" className="font-mono text-[11px] text-indigo-deep font-bold hover:underline">详情</a>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* 三层引擎状态 */}
        <section className="col-span-12 lg:col-span-4 panel p-6">
          <div className="mb-5">
            <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-soft font-bold">ENGINE STATUS</div>
            <h2 className="font-display text-[22px] font-extrabold mt-1">引擎实况</h2>
          </div>

          <div className="stagger space-y-3">
            {[
              { icon: Radio, name: "L1 来电溯源", lat: "22ms", load: 68, tint: "var(--indigo)", soft: "var(--indigo-soft)" },
              { icon: Waves, name: "L2 声纹取证", lat: "61ms", load: 82, tint: "var(--mint-deep)", soft: "var(--mint-soft)" },
              { icon: ScanLine, name: "L3 话术语义", lat: "37ms", load: 54, tint: "var(--coral)", soft: "var(--coral-soft)" },
            ].map((l) => (
              <div key={l.name} className="p-4 rounded-2xl bg-canvas-2">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: l.soft, color: l.tint }}>
                      <l.icon size={13} />
                    </div>
                    <span className="font-display text-[13px] font-extrabold">{l.name}</span>
                  </div>
                  <span className="font-mono text-[11px] font-bold" style={{ color: l.tint }}>{l.lat}</span>
                </div>
                <div className="h-1.5 rounded-full bg-surface overflow-hidden">
                  <div className="h-full rounded-full bar-grow" style={{ "--bar-w": `${l.load}%`, width: `${l.load}%`, background: l.tint } as any} />
                </div>
                <div className="mt-1.5 font-mono text-[10px] uppercase tracking-[0.12em] text-ink-soft font-bold">
                  负载 {l.load}%
                </div>
              </div>
            ))}
          </div>

          <div className="mt-5 p-4 rounded-2xl" style={{ background: "var(--mint-soft)" }}>
            <div className="flex items-center gap-2">
              <Circle size={8} className="fill-mint-deep text-mint-deep animate-pulse" />
              <span className="font-mono text-[10px] uppercase tracking-[0.14em] font-bold text-mint-deep">系统运转正常</span>
            </div>
            <div className="mt-1 text-[12px] text-mint-deep font-semibold">三层引擎已就绪，24 小时全域守护中。</div>
          </div>
        </section>

        {/* 家庭成员 */}
        <section className="col-span-12 panel p-6">
          <div className="flex items-center justify-between mb-5">
            <div>
              <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-soft font-bold">FAMILY MEMBERS</div>
              <h2 className="font-display text-[22px] font-extrabold mt-1">家庭成员</h2>
            </div>
            <button className="btn-ghost py-2 px-3 text-[12px]">
              <Plus size={12} /> 添加成员
            </button>
          </div>

          <div className="stagger grid grid-cols-1 md:grid-cols-3 gap-4">
            {MEMBERS.map((m) => (
              <div key={m.name} className="p-5 rounded-2xl border border-border hover:shadow-md transition-all hover:-translate-y-0.5 press-soft">
                <div className="flex items-center gap-3 mb-4">
                  <div
                    className="w-12 h-12 rounded-full flex items-center justify-center font-display text-white font-extrabold text-[16px] shadow-md"
                    style={{ background: "linear-gradient(135deg, var(--indigo), var(--coral))" }}
                  >
                    {m.name.split(" ")[1]?.slice(0, 1) ?? m.name.slice(0, 1)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-display text-[15px] font-extrabold truncate">{m.name}</div>
                    <div className="font-mono text-[11px] text-ink-soft font-bold">{m.age} 岁 · {m.phone}</div>
                  </div>
                  <span
                    className="font-mono text-[9px] uppercase tracking-[0.14em] px-2 py-1 rounded-full font-bold flex items-center gap-1.5"
                    style={{
                      background: m.status === "online" ? "var(--mint-soft)" : "var(--canvas-2)",
                      color: m.status === "online" ? "var(--mint-deep)" : "var(--ink-soft)",
                    }}
                  >
                    <span className="w-1.5 h-1.5 rounded-full" style={{ background: m.status === "online" ? "var(--mint)" : "var(--ink-ghost)" }} />
                    {m.status === "online" ? "在线" : "离线"}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-3 pt-3 border-t border-border">
                  <div>
                    <div className="numplate text-[20px]">{m.today}</div>
                    <div className="font-mono text-[10px] uppercase tracking-[0.12em] text-ink-soft font-bold">今日通话</div>
                  </div>
                  <div>
                    <div className="numplate text-[20px]" style={{ color: "var(--coral-deep)" }}>{m.blocked}</div>
                    <div className="font-mono text-[10px] uppercase tracking-[0.12em] text-ink-soft font-bold">已拦截</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </AppShell>
  );
}
