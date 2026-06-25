"use client";
import AppShell from "@/components/AppShell";
import CountUp from "@/components/shared/CountUp";
import { FAMILY_ADMIN_NAV } from "@/lib/nav";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useResource } from "@/lib/use-resource";
import type { ManagedUser, Recording, BlackEntry } from "@/lib/domain-types";
import { Users, Mic2, Sliders, Database, ArrowUpRight, Activity, TrendingUp, ShieldCheck } from "lucide-react";
import Link from "next/link";

const WEEKDAYS = ["SUNDAY", "MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY"];
const MONTHS = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];

export default function FamilyAdminHome() {
  const { user } = useAuth();
  const users = useResource<ManagedUser>(() => api.users.list({ pageSize: 1 }));
  const recordings = useResource<Recording>(() => api.recordings.list({ pageSize: 1 }));
  const blist = useResource<BlackEntry>(() => api.blacklist.list({ pageSize: 1 }));

  const now = new Date();
  const dateLine = `${WEEKDAYS[now.getDay()]} · ${MONTHS[now.getMonth()]} ${now.getDate()}`;
  const adminName = user?.name ?? "管理员";

  const stats = [
    { label: "家庭成员", val: users.total, kind: "num" as const, loading: users.loading, sub: "在管账号", icon: Users, tint: "var(--indigo)", soft: "var(--indigo-soft)" },
    { label: "录音数据", val: recordings.total, kind: "num" as const, loading: recordings.loading, sub: "条已留样", icon: Mic2, tint: "var(--mint-deep)", soft: "var(--mint-soft)" },
    { label: "黑名单", val: blist.total, kind: "num" as const, loading: blist.loading, sub: "条私有规则", icon: Database, tint: "var(--coral)", soft: "var(--coral-soft)" },
    { label: "当前风控", val: "L3", kind: "text" as const, loading: false, sub: "弹窗预警级别", icon: Sliders, tint: "var(--amber)", soft: "var(--amber-soft)" },
  ];

  const quick = [
    { href: "/family-admin/users", icon: Users, title: "多用户管理", desc: "增 / 删 / 编辑家人账号", tint: "var(--indigo)", soft: "var(--indigo-soft)" },
    { href: "/family-admin/recordings", icon: Mic2, title: "录音管理", desc: "查看 / 删除录音 · 上传开关", tint: "var(--mint-deep)", soft: "var(--mint-soft)" },
    { href: "/family-admin/risk-level", icon: Sliders, title: "风控等级", desc: "L1–L5 自定义规则", tint: "var(--amber)", soft: "var(--amber-soft)" },
    { href: "/family-admin/blacklist", icon: Database, title: "私有黑名单库", desc: "CSV / XLSX 批量导入", tint: "var(--coral)", soft: "var(--coral-soft)" },
  ];

  const activity = [
    { label: "新增白名单", v: 3, icon: TrendingUp, tint: "var(--mint-deep)", soft: "var(--mint-soft)" },
    { label: "AI 合成拦截", v: 7, icon: Activity, tint: "var(--coral)", soft: "var(--coral-soft)" },
    { label: "策略调整", v: 2, icon: Sliders, tint: "var(--amber)", soft: "var(--amber-soft)" },
  ];

  return (
    <AppShell role="family-admin" nav={FAMILY_ADMIN_NAV} breadcrumb={["SENTINEL", "家庭管理员", "总览"]}>
      <div className="space-y-6">
        <section className="grid gap-5 xl:grid-cols-[minmax(0,1.42fr)_minmax(340px,0.88fr)]">
          <div className="relative overflow-hidden rounded-[32px] border border-border bg-surface p-6 shadow-[0_24px_60px_rgba(9,20,38,0.08)] md:p-8">
            <div className="pointer-events-none absolute right-[-44px] top-[-64px] h-44 w-44 rounded-full bg-[radial-gradient(circle,rgba(216,227,251,0.95),transparent_72%)] dark:hidden" />
            <div className="pointer-events-none absolute bottom-[-80px] left-[-20px] h-44 w-44 rounded-full bg-[radial-gradient(circle,rgba(203,219,245,0.68),transparent_74%)] dark:hidden" />
            <div className="relative flex h-full flex-col justify-between gap-8">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="max-w-[720px]">
                  <div className="inline-flex rounded-full bg-[var(--indigo-soft)] px-4 py-2 text-[12px] font-bold uppercase tracking-[0.14em] text-ink-soft">
                    {dateLine}
                  </div>
                  <h1 className="mt-5 text-[clamp(30px,2.8vw,44px)] font-extrabold leading-[1.05] tracking-[-0.03em] text-[var(--ink)]">
                    家庭管理员控制台
                  </h1>
                  <p className="mt-4 max-w-[620px] text-[16px] leading-[1.7] text-ink-soft">
                    {adminName}，在这里管理家庭成员、录音数据、私有黑名单与风控策略。
                  </p>
                </div>
                <div className="rounded-full border border-border bg-surface-2 px-4 py-2 text-[12px] font-bold uppercase tracking-[0.14em] text-ink-soft shadow-[0_10px_24px_rgba(9,20,38,0.05)]">
                  FAMILY ADMIN
                </div>
              </div>
              <div className="flex flex-wrap gap-3">
                <Link
                  href="/family-admin/users"
                  className="inline-flex h-[54px] items-center gap-2 rounded-full bg-[var(--indigo)] px-6 text-[15px] font-bold text-white shadow-[0_18px_36px_rgba(9,20,38,0.2)] transition duration-200 hover:-translate-y-0.5"
                >
                  <Users size={16} />
                  用户管理
                  <ArrowUpRight size={16} />
                </Link>
                <Link
                  href="/family-admin/risk-level"
                  className="inline-flex h-[54px] items-center gap-2 rounded-full border border-border bg-surface px-6 text-[15px] font-semibold text-[var(--ink)] shadow-[0_10px_24px_rgba(9,20,38,0.06)] transition duration-200 hover:-translate-y-0.5 hover:bg-[var(--indigo-soft)]"
                >
                  <Sliders size={16} />
                  风控策略
                </Link>
              </div>
            </div>
          </div>

          <section className="relative overflow-hidden rounded-[32px] px-6 py-7 text-white shadow-[0_30px_80px_rgba(8,8,22,0.5)] md:px-7" style={{ background: "linear-gradient(150deg, #07061a 0%, #110f3a 52%, #1c1960 100%)" }}>
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_18%,rgba(62,213,152,0.18),transparent_26%),radial-gradient(circle_at_82%_78%,rgba(255,181,71,0.16),transparent_30%),linear-gradient(180deg,rgba(255,255,255,0.05),rgba(255,255,255,0)_40%)]" />
            <div className="relative">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/[0.08] px-4 py-2 text-[12px] font-medium uppercase tracking-[0.12em] text-[#d8e3fb]">
                <span className="h-2.5 w-2.5 rounded-full bg-[#37d99c] shadow-[0_0_0_4px_rgba(55,217,156,0.15)]" />
                FAMILY SHIELD
              </div>
              <h2 className="mt-6 text-[28px] font-bold leading-[1.15] tracking-[-0.02em] text-white">
                家庭防护策略在线
              </h2>
              <p className="mt-4 text-[15px] leading-[1.75] text-[#cdd8ee]">
                当前风控等级 L3，私有黑名单与白名单实时生效，守护全家通话安全。
              </p>
              <div className="mt-7 grid gap-3">
                <SummaryStrip label="在管成员" value={`${users.total ?? 0}`} note="家庭账号总数" />
                <SummaryStrip label="留样录音" value={`${recordings.total ?? 0}`} note="可回溯通话" />
                <SummaryStrip label="黑名单" value={`${blist.total ?? 0}`} note="私有拦截规则" />
              </div>
            </div>
          </section>
        </section>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {stats.map((k) => (
            <div
              key={k.label}
              className="relative overflow-hidden rounded-[28px] border border-border bg-surface p-5 shadow-[0_18px_40px_rgba(9,20,38,0.06)] transition duration-200 hover:-translate-y-1 hover:shadow-[0_24px_54px_rgba(9,20,38,0.1)]"
            >
              <div
                className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full opacity-85"
                style={{ background: `radial-gradient(circle, ${k.soft}, transparent 72%)` }}
              />
              <div className="relative flex items-center justify-between">
                <div className="flex h-12 w-12 items-center justify-center rounded-[16px]" style={{ background: k.soft, color: k.tint }}>
                  <k.icon size={18} />
                </div>
                <span className="text-[11px] font-bold uppercase tracking-[0.14em] text-ink-soft">{k.label}</span>
              </div>
              {k.kind === "num" && k.loading ? (
                <div className="relative mt-6 h-[42px] w-20 animate-pulse rounded-xl bg-canvas-2" />
              ) : (
                <div className="relative mt-6 text-[42px] font-extrabold leading-none tracking-[-0.05em] text-[var(--ink)]">
                  {k.kind === "num" ? <CountUp to={k.val as number} /> : k.val}
                </div>
              )}
              <div className="relative mt-2 text-[13px] font-medium text-ink-soft">{k.sub}</div>
            </div>
          ))}
        </div>

        <div className="grid gap-5 xl:grid-cols-[minmax(0,1.32fr)_minmax(320px,0.8fr)]">
          <section className="rounded-[32px] border border-border bg-surface p-6 shadow-[0_24px_60px_rgba(9,20,38,0.08)]">
            <div className="mb-6">
              <div className="text-[11px] font-bold uppercase tracking-[0.14em] text-ink-soft">QUICK ACTIONS</div>
              <h2 className="mt-2 text-[28px] font-bold tracking-[-0.02em] text-[var(--ink)]">快捷管理</h2>
            </div>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              {quick.map((a) => (
                <Link
                  key={a.href}
                  href={a.href}
                  className="flex items-center gap-4 rounded-[24px] border border-border bg-canvas-2 px-4 py-4 transition duration-200 hover:-translate-y-0.5 hover:border-border hover:shadow-[0_16px_30px_rgba(9,20,38,0.06)]"
                >
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[18px]" style={{ background: a.soft, color: a.tint }}>
                    <a.icon size={20} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-[15px] font-bold text-[var(--ink)]">{a.title}</div>
                    <div className="mt-1 truncate text-[13px] font-medium text-ink-soft">{a.desc}</div>
                  </div>
                  <ArrowUpRight size={16} className="text-ink-soft" />
                </Link>
              ))}
            </div>
          </section>

          <section className="rounded-[32px] border border-border bg-surface p-6 shadow-[0_24px_60px_rgba(9,20,38,0.08)]">
            <div className="mb-6">
              <div className="text-[11px] font-bold uppercase tracking-[0.14em] text-ink-soft">FAMILY ACTIVITY</div>
              <h2 className="mt-2 text-[28px] font-bold tracking-[-0.02em] text-[var(--ink)]">本周活动</h2>
            </div>
            <div className="space-y-3">
              {activity.map((s) => (
                <div key={s.label} className="flex items-center gap-3 rounded-[22px] border border-border bg-canvas-2 p-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-[14px]" style={{ background: s.soft, color: s.tint }}>
                    <s.icon size={16} />
                  </div>
                  <div className="flex-1 text-[14px] font-bold text-[var(--ink)]">{s.label}</div>
                  <span style={{ color: s.tint }}>
                    <CountUp to={s.v} duration={900} className="text-[22px] font-extrabold tracking-[-0.02em]" />
                  </span>
                </div>
              ))}
            </div>
            <div className="mt-5 flex items-center gap-2 rounded-[24px] bg-[var(--mint-soft)] px-4 py-4">
              <ShieldCheck size={16} className="text-[var(--mint-deep)]" />
              <span className="text-[13px] font-medium text-[var(--mint-deep)]">家庭防护链路运转正常。</span>
            </div>
          </section>
        </div>
      </div>
    </AppShell>
  );
}

function SummaryStrip({ label, value, note }: { label: string; value: string; note: string }) {
  return (
    <div className="flex items-center justify-between rounded-[22px] border border-white/10 bg-white/[0.06] px-4 py-3">
      <div>
        <div className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#8ea1c1]">{label}</div>
        <div className="mt-1 text-[12px] font-medium text-[#cdd8ee]">{note}</div>
      </div>
      <div className="text-[20px] font-bold tracking-[-0.02em] text-white">{value}</div>
    </div>
  );
}
