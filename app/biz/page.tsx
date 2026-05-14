"use client";
import { ShieldCheck, Bell, ListChecks, PhoneOff, Radio, Waves, ScanLine, ArrowUpRight, Plus, Circle, Building2, MessageSquareWarning, AlertTriangle } from "lucide-react";
import AppShell from "@/components/AppShell";
import { BIZ_NAV } from "@/lib/nav";

const ALERTS = [
  { t: "2 分钟前", phone: "+855 23 8123 4551", loc: "柬埔寨 · 金边", tone: "block", reason: "AI 合成语音 · 0.94" },
  { t: "14 分钟前", phone: "+95 9 7712 8830", loc: "缅甸 · 仰光", tone: "warn", reason: "客服话术伪冒" },
  { t: "38 分钟前", phone: "+86 173 8800 1234", loc: "未知 · 长途", tone: "block", reason: "信令层伪冒" },
  { t: "1 小时前", phone: "+86 010 5566 7788", loc: "北京 · 移动", tone: "safe", reason: "已通过验证" },
  { t: "2 小时前", phone: "+84 28 6677 2210", loc: "越南 · 胡志明", tone: "warn", reason: "刷单返利诱导" },
];

export default function BizHome() {
  return (
    <AppShell role="biz" userName="周珩" nav={BIZ_NAV} breadcrumb={["SENTINEL", "企业用户", "首页"]}>
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="font-mono text-[11px] uppercase tracking-[0.18em] text-ink-soft font-bold mb-2">
            BUSINESS PORTAL · 95533 客服中心
          </div>
          <h1 className="font-display text-[32px] md:text-[40px] font-extrabold tracking-tight">
            欢迎回来，周珩
          </h1>
          <p className="mt-2 text-[14px] text-ink-soft font-medium">
            本月已拦截冒充话术 <span className="font-extrabold text-coral-deep">2,318 起</span>，
            申诉 <span className="font-extrabold text-indigo-deep">12 起处理中</span>。
          </p>
        </div>
        <div className="flex items-center gap-3">
          <a href="/biz/appeal" className="btn-ghost py-2.5 px-4 text-[13px]">
            <MessageSquareWarning size={14} /> 提交申诉
          </a>
          <a href="/biz/calls" className="btn-indigo py-2.5 px-4 text-[13px]">
            <Radio size={14} /> 查看通话记录 <ArrowUpRight size={14} />
          </a>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          { label: "今日通话", val: "4,128", sub: "条客服 + API 调用", tint: "var(--indigo)", soft: "var(--indigo-soft)", icon: Building2 },
          { label: "拦截命中", val: "186", sub: "次诈骗伪冒", tint: "var(--coral)", soft: "var(--coral-soft)", icon: PhoneOff },
          { label: "申诉处理中", val: "12", sub: "起待复核", tint: "var(--amber)", soft: "var(--amber-soft)", icon: MessageSquareWarning },
          { label: "本月误报率", val: "0.28%", sub: "环比 ↓ 0.06", tint: "var(--mint-deep)", soft: "var(--mint-soft)", icon: ListChecks },
        ].map((k) => (
          <div key={k.label} className="panel panel-lift p-5 relative overflow-hidden">
            <div className="absolute -top-8 -right-8 w-24 h-24 rounded-full opacity-60" style={{ background: k.soft }} />
            <div className="relative flex items-center justify-between mb-4">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: k.soft, color: k.tint }}>
                <k.icon size={18} />
              </div>
              <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-soft font-bold">{k.label}</span>
            </div>
            <div className="relative numplate text-[36px] leading-none">{k.val}</div>
            <div className="relative mt-2 text-[12px] text-ink-soft font-semibold">{k.sub}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-12 gap-5">
        <section className="col-span-12 lg:col-span-8 panel p-6">
          <div className="flex items-center justify-between mb-5">
            <div>
              <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-soft font-bold">RECENT ALERTS</div>
              <h2 className="font-display text-[22px] font-extrabold mt-1">近期拦截</h2>
            </div>
            <a href="/biz/calls" className="flex items-center gap-1 font-mono text-[11px] uppercase tracking-[0.14em] text-indigo-deep font-bold hover:underline">
              全部 <ArrowUpRight size={12} />
            </a>
          </div>
          <div className="space-y-2">
            {ALERTS.map((a, i) => {
              const tone = a.tone === "block" ? "coral" : a.tone === "warn" ? "amber" : "mint";
              const label = a.tone === "block" ? "拦截" : a.tone === "warn" ? "预警" : "通过";
              return (
                <div key={i} className="flex items-center gap-4 p-4 rounded-2xl hover:bg-canvas-2 transition-colors">
                  <div className="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0" style={{ background: `var(--${tone}-soft)`, color: `var(--${tone}-deep)` }}>
                    {a.tone === "block" ? <PhoneOff size={18} /> : a.tone === "warn" ? <AlertTriangle size={18} /> : <ShieldCheck size={18} />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-display text-[14px] font-extrabold truncate">{a.phone}</span>
                      <span className="font-mono text-[9px] uppercase tracking-[0.14em] px-2 py-0.5 rounded-full font-bold" style={{ background: `var(--${tone}-soft)`, color: `var(--${tone}-deep)` }}>
                        {label}
                      </span>
                    </div>
                    <div className="mt-0.5 text-[12px] text-ink-soft font-medium truncate">{a.loc} · {a.reason}</div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-soft font-bold">{a.t}</div>
                    <a href="/biz/calls" className="font-mono text-[11px] text-indigo-deep font-bold hover:underline">详情</a>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <section className="col-span-12 lg:col-span-4 panel p-6">
          <div className="mb-5">
            <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-soft font-bold">ENGINE STATUS</div>
            <h2 className="font-display text-[22px] font-extrabold mt-1">引擎实况</h2>
          </div>
          <div className="space-y-3">
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
                  <div className="h-full rounded-full" style={{ width: `${l.load}%`, background: l.tint }} />
                </div>
                <div className="mt-1.5 font-mono text-[10px] uppercase tracking-[0.12em] text-ink-soft font-bold">负载 {l.load}%</div>
              </div>
            ))}
          </div>
          <div className="mt-5 p-4 rounded-2xl" style={{ background: "var(--mint-soft)" }}>
            <div className="flex items-center gap-2">
              <Circle size={8} className="fill-mint-deep text-mint-deep animate-pulse" />
              <span className="font-mono text-[10px] uppercase tracking-[0.14em] font-bold text-mint-deep">系统运转正常</span>
            </div>
            <div className="mt-1 text-[12px] text-mint-deep font-semibold">三层引擎已就绪，企业级 SLA 99.9%。</div>
          </div>
        </section>
      </div>
    </AppShell>
  );
}
