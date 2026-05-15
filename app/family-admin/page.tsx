"use client";
import AppShell from "@/components/AppShell";
import PageHeader from "@/components/shared/PageHeader";
import CountUp from "@/components/shared/CountUp";
import { FAMILY_ADMIN_NAV } from "@/lib/nav";
import { SEED } from "@/lib/mock";
import { useLocalStorage } from "@/lib/storage";
import { Users, Mic2, Sliders, Database, ArrowUpRight, Activity, TrendingUp } from "lucide-react";
import Link from "next/link";

export default function FamilyAdminHome() {
  const [users] = useLocalStorage("family.users", SEED.managedUsers);
  const [recordings] = useLocalStorage("family.recordings", SEED.recordings);
  const [blist] = useLocalStorage("family.blacklist", SEED.blacklist);

  return (
    <AppShell role="family-admin" userName="李梦楠" nav={FAMILY_ADMIN_NAV} breadcrumb={["SENTINEL", "家庭管理员", "总览"]}>
      <PageHeader
        eyebrow="FAMILY ADMIN"
        title="家庭管理员控制台"
        desc="管理家庭成员、录音数据、私有黑名单与风控策略。"
        actions={
          <Link href="/family-admin/users" className="btn-indigo py-2.5 px-4 text-[13px]">
            <Users size={14} /> 用户管理 <ArrowUpRight size={14} />
          </Link>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          { label: "家庭成员", val: users.length, kind: "num", sub: "在管账号", icon: Users, tint: "var(--indigo)", soft: "var(--indigo-soft)" },
          { label: "录音数据", val: recordings.length, kind: "num", sub: "条已留样", icon: Mic2, tint: "var(--mint-deep)", soft: "var(--mint-soft)" },
          { label: "黑名单", val: blist.length, kind: "num", sub: "条私有规则", icon: Database, tint: "var(--coral)", soft: "var(--coral-soft)" },
          { label: "当前风控", val: "L3", kind: "text", sub: "弹窗预警级别", icon: Sliders, tint: "var(--amber-deep)", soft: "var(--amber-soft)" },
        ].map((k) => (
          <div key={k.label} className="panel panel-lift p-5 relative overflow-hidden">
            <div className="absolute -top-8 -right-8 w-24 h-24 rounded-full opacity-60" style={{ background: k.soft }} />
            <div className="relative flex items-center justify-between mb-4">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: k.soft, color: k.tint }}>
                <k.icon size={18} />
              </div>
              <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-soft font-bold">{k.label}</span>
            </div>
            {k.kind === "num" ? (
              <CountUp
                to={k.val as number}
                duration={1100}
                className="relative numplate text-[36px] leading-none block"
              />
            ) : (
              <div className="relative numplate text-[36px] leading-none">{k.val}</div>
            )}
            <div className="relative mt-2 text-[12px] text-ink-soft font-semibold">{k.sub}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-12 gap-5">
        <section className="col-span-12 lg:col-span-8 panel p-6">
          <div className="mb-5">
            <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-soft font-bold">QUICK ACTIONS</div>
            <h2 className="font-display text-[22px] font-extrabold mt-1">快捷管理</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {[
              { href: "/family-admin/users", icon: Users, title: "多用户管理", desc: "增 / 删 / 编辑家人账号", tint: "var(--indigo)", soft: "var(--indigo-soft)" },
              { href: "/family-admin/recordings", icon: Mic2, title: "录音管理", desc: "查看 / 删除录音 · 上传开关", tint: "var(--mint-deep)", soft: "var(--mint-soft)" },
              { href: "/family-admin/risk-level", icon: Sliders, title: "风控等级", desc: "L1–L5 自定义规则", tint: "var(--amber-deep)", soft: "var(--amber-soft)" },
              { href: "/family-admin/blacklist", icon: Database, title: "私有黑名单库", desc: "CSV / XLSX 批量导入", tint: "var(--coral)", soft: "var(--coral-soft)" },
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

        <section className="col-span-12 lg:col-span-4 panel p-6">
          <div className="mb-5">
            <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-soft font-bold">FAMILY ACTIVITY</div>
            <h2 className="font-display text-[22px] font-extrabold mt-1">本周活动</h2>
          </div>
          <div className="space-y-3">
            {[
              { label: "新增白名单", v: 3, icon: TrendingUp, tint: "var(--mint-deep)" },
              { label: "AI 合成拦截", v: 7, icon: Activity, tint: "var(--coral)" },
              { label: "策略调整", v: 2, icon: Sliders, tint: "var(--amber-deep)" },
            ].map((s) => (
              <div key={s.label} className="flex items-center gap-3 p-3 rounded-2xl bg-canvas-2">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-surface">
                  <s.icon size={14} style={{ color: s.tint }} />
                </div>
                <div className="flex-1 font-display text-[13px] font-extrabold">{s.label}</div>
                <span style={{ color: s.tint }}>
                  <CountUp
                    to={s.v}
                    duration={900}
                    className="numplate text-[22px]"
                  />
                </span>
              </div>
            ))}
          </div>
        </section>
      </div>
    </AppShell>
  );
}
