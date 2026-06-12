"use client";
import AppShell from "@/components/AppShell";
import PageHeader from "@/components/shared/PageHeader";
import CountUp from "@/components/shared/CountUp";
import { SYSADMIN_NAV } from "@/lib/nav";
import { api, type ApiDevice } from "@/lib/api";
import { useResource } from "@/lib/use-resource";
import { SkeletonBar } from "@/components/shared/Skeleton";
import type { ScamRule, ScamSample } from "@/lib/mock";
import { ScrollText, BookMarked, Database, FlaskConical, Mic2, Bot, AlertOctagon, Server, HardDrive, ArrowUpRight, Activity, Cpu, AudioLines } from "lucide-react";
import Link from "next/link";

export default function SysAdminHome() {
  const rules = useResource<ScamRule>(() => api.rules.list({ pageSize: 1 }));
  const samples = useResource<ScamSample>(() => api.samples.list({ pageSize: 100, status: "待审核" }));
  const devices = useResource<ApiDevice>(() => api.devices.list({ pageSize: 100 }));

  return (
    <AppShell role="sysadmin" userName="陈安怡" nav={SYSADMIN_NAV} breadcrumb={["SENTINEL", "系统管理员", "总览"]}>
      <PageHeader
        eyebrow="SYSTEM ADMIN"
        title="系统总览"
        desc="掌控判定规则、知识库、声纹模型、智能体与全网设备。"
        actions={
          <Link href="/sysadmin/risk-dashboard" className="btn-indigo py-2.5 px-4 text-[calc(13px*var(--fz))]">
            <AlertOctagon size={14} /> 风险大屏 <ArrowUpRight size={14} />
          </Link>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          { label: "判定规则", num: rules.total, suffix: "", decimals: 0, sub: "条诈骗关键词", icon: ScrollText, tint: "var(--indigo)", soft: "var(--indigo-soft)", loading: rules.loading && rules.items.length === 0 },
          { label: "待审样本", num: samples.items.filter((s) => s.status === "待审核").length, suffix: "", decimals: 0, sub: "起需要复核", icon: FlaskConical, tint: "var(--coral)", soft: "var(--coral-soft)", loading: samples.loading && samples.items.length === 0 },
          { label: "在线设备", num: devices.items.filter((d) => d.status === "online").length, suffix: "", decimals: 0, sub: `/ ${devices.total} 总数`, icon: Server, tint: "var(--mint-deep)", soft: "var(--mint-soft)", loading: devices.loading && devices.items.length === 0 },
          { label: "声纹准确率", num: 99.24, suffix: "%", decimals: 2, sub: "voiceguard v2.6.1", icon: AudioLines, tint: "var(--amber-deep)", soft: "var(--amber-soft)", loading: false },
        ].map((k) => (
          <div key={k.label} className="panel panel-lift p-5 relative overflow-hidden">
            <div className="absolute -top-8 -right-8 w-24 h-24 rounded-full opacity-60" style={{ background: k.soft }} />
            <div className="relative flex items-center justify-between mb-4">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: k.soft, color: k.tint }}>
                <k.icon size={18} />
              </div>
              <span className="font-mono text-[calc(10px*var(--fz))] uppercase tracking-[0.14em] text-ink-soft font-bold">{k.label}</span>
            </div>
            {k.loading ? (
              <SkeletonBar className="relative h-9 w-24 mt-1" />
            ) : (
              <CountUp
                to={k.num}
                decimals={k.decimals}
                suffix={k.suffix}
                duration={1100}
                className="relative numplate text-[calc(36px*var(--fz))] leading-none block"
              />
            )}
            <div className="relative mt-2 text-[calc(12px*var(--fz))] text-ink-soft font-semibold">{k.sub}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-12 gap-5">
        <section className="col-span-12 lg:col-span-8 panel p-6">
          <div className="mb-5">
            <div className="font-mono text-[calc(10px*var(--fz))] uppercase tracking-[0.14em] text-ink-soft font-bold">MODULES</div>
            <h2 className="font-display text-[calc(22px*var(--fz))] font-extrabold mt-1">管理模块</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {[
              { href: "/sysadmin/rules", icon: ScrollText, title: "诈骗规则库", desc: "判别关键词 · 类别 · 权重" },
              { href: "/sysadmin/knowledge", icon: BookMarked, title: "反诈知识库", desc: "对外发布文章管理" },
              { href: "/sysadmin/blacklist", icon: Database, title: "黑名单总库", desc: "全局共享号段池" },
              { href: "/sysadmin/samples", icon: FlaskConical, title: "样本审核", desc: "诈骗样本 · 文字分析 · 导出 Word" },
              { href: "/sysadmin/audio-config", icon: Mic2, title: "音频分析配置", desc: "声纹样本 · 模型版本 · 准确率" },
              { href: "/sysadmin/agents", icon: Bot, title: "智能体管理", desc: "显示词 / Whisper / 千问 参数" },
              { href: "/sysadmin/devices/enterprise", icon: Server, title: "企业端设备", desc: "运行状态 · 行为审计" },
              { href: "/sysadmin/devices/family", icon: HardDrive, title: "家庭端设备", desc: "运行状态 · 行为审计" },
            ].map((a) => (
              <Link key={a.href} href={a.href} className="panel panel-lift p-4 flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0" style={{ background: "var(--indigo-soft)", color: "var(--indigo-deep)" }}>
                  <a.icon size={18} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-display text-[calc(14px*var(--fz))] font-extrabold truncate">{a.title}</div>
                  <div className="mt-0.5 font-mono text-[calc(10px*var(--fz))] uppercase tracking-[0.14em] text-ink-soft font-bold truncate">{a.desc}</div>
                </div>
                <ArrowUpRight size={14} className="text-ink-soft" />
              </Link>
            ))}
          </div>
        </section>

        <section className="col-span-12 lg:col-span-4 panel p-6">
          <div className="mb-5">
            <div className="font-mono text-[calc(10px*var(--fz))] uppercase tracking-[0.14em] text-ink-soft font-bold">SYSTEM HEALTH</div>
            <h2 className="font-display text-[calc(22px*var(--fz))] font-extrabold mt-1">系统健康</h2>
          </div>
          <div className="space-y-3">
            {[
              { label: "API 网关", v: "正常", tint: "var(--mint-deep)", icon: Activity },
              { label: "推理集群", v: "正常", tint: "var(--mint-deep)", icon: Cpu },
              { label: "事件流 SSE", v: "正常", tint: "var(--mint-deep)", icon: Activity },
              { label: "审计日志", v: "正常", tint: "var(--mint-deep)", icon: ScrollText },
            ].map((s) => (
              <div key={s.label} className="flex items-center gap-3 p-3 rounded-2xl bg-canvas-2">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-surface" style={{ color: s.tint }}>
                  <s.icon size={14} />
                </div>
                <div className="flex-1 font-display text-[calc(13px*var(--fz))] font-extrabold">{s.label}</div>
                <span className="font-mono text-[calc(10px*var(--fz))] uppercase tracking-[0.14em] font-bold" style={{ color: s.tint }}>{s.v}</span>
              </div>
            ))}
          </div>
        </section>
      </div>
    </AppShell>
  );
}
