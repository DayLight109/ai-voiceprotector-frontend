"use client";
import { useEffect, useMemo, useState } from "react";
import { ShieldCheck, PhoneOff, Radio, Waves, ScanLine, ArrowUpRight, Building2, MessageSquareWarning, AlertTriangle, Bell } from "lucide-react";
import Link from "next/link";
import AppShell from "@/components/AppShell";
import CountUp from "@/components/shared/CountUp";
import { BIZ_NAV } from "@/lib/nav";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import type { Appeal, CallLog } from "@/lib/domain-types";

const WEEKDAYS = ["SUNDAY", "MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY"];
const MONTHS = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];

function relTime(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  if (!Number.isFinite(ms) || ms < 0) return "刚刚";
  const m = Math.floor(ms / 60000);
  if (m < 1) return "刚刚";
  if (m < 60) return `${m} 分钟前`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} 小时前`;
  return `${Math.floor(h / 24)} 天前`;
}

function isSameDay(iso: string, now: Date): boolean {
  const d = new Date(iso);
  return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate();
}

function isSameMonth(iso: string, now: Date): boolean {
  const d = new Date(iso);
  return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
}

export default function BizHome() {
  const { user } = useAuth();
  const [calls, setCalls] = useState<CallLog[]>([]);
  const [callsTotal, setCallsTotal] = useState(0);
  const [appeals, setAppeals] = useState<Appeal[]>([]);
  const [engine, setEngine] = useState<{ analyzed: number; failed: number } | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      const [c, ap, ov] = await Promise.allSettled([
        api.calls.list({ pageSize: 100 }),
        api.appeals.list({ pageSize: 100 }),
        api.warroom.overview(),
      ]);
      if (!alive) return;
      if (c.status === "fulfilled") {
        setCalls(c.value.data ?? []);
        setCallsTotal(c.value.meta?.total ?? (c.value.data?.length ?? 0));
      }
      if (ap.status === "fulfilled") setAppeals(ap.value.data ?? []);
      if (ov.status === "fulfilled") setEngine(ov.value.engine ?? null);
    })();
    return () => {
      alive = false;
    };
  }, []);

  const now = new Date();
  const dateLine = `${WEEKDAYS[now.getDay()]} · ${MONTHS[now.getMonth()]} ${now.getDate()}`;
  const userName = user?.name ?? "用户";
  const monthBlocked = useMemo(() => calls.filter((c) => c.verdict === "拦截" && isSameMonth(c.createdAt, now)).length, [calls]);
  const todayCalls = useMemo(() => calls.filter((c) => isSameDay(c.createdAt, now)).length, [calls]);
  const todayBlocked = useMemo(() => calls.filter((c) => c.verdict === "拦截" && isSameDay(c.createdAt, now)).length, [calls]);
  const todayWarned = useMemo(() => calls.filter((c) => c.verdict === "预警" && isSameDay(c.createdAt, now)).length, [calls]);
  const pendingAppeals = useMemo(() => appeals.filter((a) => a.status === "处理中").length, [appeals]);
  const alerts = calls.slice(0, 5);
  const engineSummary = engine
    ? `本次启动以来已分析 ${engine.analyzed} 通来电${engine.failed > 0 ? `，失败 ${engine.failed} 次` : ""}。`
    : "三层引擎已就绪，企业级接入可用。";

  const stats = [
    { label: "通话记录", val: callsTotal, sub: "条累计判决", tint: "var(--indigo)", soft: "var(--indigo-soft)", icon: Building2 },
    { label: "今日拦截", val: todayBlocked, sub: `今日通话 ${todayCalls} 条`, tint: "var(--coral)", soft: "var(--coral-soft)", icon: PhoneOff },
    { label: "申诉处理中", val: pendingAppeals, sub: `累计 ${appeals.length} 起`, tint: "var(--amber)", soft: "var(--amber-soft)", icon: MessageSquareWarning },
    { label: "今日预警", val: todayWarned, sub: "次风险提示", tint: "var(--mint-deep)", soft: "var(--mint-soft)", icon: Bell },
  ];

  return (
    <AppShell role="biz" userName={userName} nav={BIZ_NAV} breadcrumb={["SENTINEL", "企业用户", "首页"]}>
      <div className="space-y-6">
        <section className="grid gap-5 xl:grid-cols-[minmax(0,1.42fr)_minmax(340px,0.88fr)]">
          <div className="relative overflow-hidden rounded-[32px] border border-border bg-surface p-6 shadow-[0_24px_60px_rgba(9,20,38,0.08)] md:p-8">
            <div className="pointer-events-none absolute right-[-44px] top-[-64px] h-44 w-44 rounded-full bg-[radial-gradient(circle,rgba(216,227,251,0.95),transparent_72%)]" />
            <div className="pointer-events-none absolute bottom-[-80px] left-[-20px] h-44 w-44 rounded-full bg-[radial-gradient(circle,rgba(203,219,245,0.68),transparent_74%)]" />
            <div className="relative flex h-full flex-col justify-between gap-8">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="max-w-[720px]">
                  <div className="inline-flex rounded-full bg-[var(--indigo-soft)] px-4 py-2 text-[12px] font-bold uppercase tracking-[0.14em] text-ink-soft">
                    {dateLine}
                  </div>
                  <h1 className="mt-5 text-[clamp(30px,2.8vw,44px)] font-extrabold leading-[1.05] tracking-[-0.03em] text-[var(--ink)]">
                    欢迎回来，{userName}
                  </h1>
                  <p className="mt-4 max-w-[620px] text-[16px] leading-[1.7] text-ink-soft">
                    本月已拦截可疑通话
                    <span className="mx-2 font-extrabold text-[var(--coral-deep)]">{monthBlocked} 起</span>
                    ，申诉
                    <span className="mx-2 font-extrabold text-[var(--indigo)]">{pendingAppeals} 起</span>
                    处理中。
                  </p>
                </div>
                <div className="rounded-full border border-border bg-surface-2 px-4 py-2 text-[12px] font-bold uppercase tracking-[0.14em] text-ink-soft shadow-[0_10px_24px_rgba(9,20,38,0.05)]">
                  BUSINESS PORTAL{user?.dept ? ` · ${user.dept}` : ""}
                </div>
              </div>
              <div className="flex flex-wrap gap-3">
                <Link
                  href="/biz/appeal"
                  className="inline-flex h-[54px] items-center gap-2 rounded-full border border-border bg-surface px-6 text-[15px] font-semibold text-[var(--ink)] shadow-[0_10px_24px_rgba(9,20,38,0.06)] transition duration-200 hover:-translate-y-0.5 hover:bg-[var(--indigo-soft)]"
                >
                  <MessageSquareWarning size={16} />
                  提交申诉
                </Link>
                <Link
                  href="/biz/calls"
                  className="inline-flex h-[54px] items-center gap-2 rounded-full bg-[var(--indigo)] px-6 text-[15px] font-bold text-white shadow-[0_18px_36px_rgba(9,20,38,0.2)] transition duration-200 hover:-translate-y-0.5"
                >
                  <Radio size={16} />
                  查看通话记录
                  <ArrowUpRight size={16} />
                </Link>
              </div>
            </div>
          </div>

          <section className="relative overflow-hidden rounded-[32px] px-6 py-7 text-white shadow-[0_30px_80px_rgba(8,8,22,0.5)] md:px-7" style={{ background: "linear-gradient(150deg, #07061a 0%, #110f3a 52%, #1c1960 100%)" }}>
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_18%,rgba(62,213,152,0.18),transparent_26%),radial-gradient(circle_at_82%_78%,rgba(255,181,71,0.16),transparent_30%),linear-gradient(180deg,rgba(255,255,255,0.05),rgba(255,255,255,0)_40%)]" />
            <div className="relative">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/[0.08] px-4 py-2 text-[12px] font-medium uppercase tracking-[0.12em] text-[#d8e3fb]">
                <span className="h-2.5 w-2.5 rounded-full bg-[#37d99c] shadow-[0_0_0_4px_rgba(55,217,156,0.15)]" />
                ENGINE STATUS
              </div>
              <h2 className="mt-6 text-[28px] font-bold leading-[1.15] tracking-[-0.02em] text-white">
                三层引擎企业级在线
              </h2>
              <p className="mt-4 text-[15px] leading-[1.75] text-[#cdd8ee]">{engineSummary}</p>
              <div className="mt-7 grid gap-3">
                {[
                  { icon: Radio, name: "L1 来电溯源", desc: "信令规则 · 实时比对" },
                  { icon: Waves, name: "L2 声纹取证", desc: "ONNX 声纹 · 合成识别" },
                  { icon: ScanLine, name: "L3 话术语义", desc: "千问 LLM · 话术分类" },
                ].map((l) => (
                  <div key={l.name} className="flex items-center gap-3 rounded-[22px] border border-white/10 bg-white/[0.06] px-4 py-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-[12px] bg-white/[0.1] text-[#d8e3fb]">
                      <l.icon size={15} />
                    </div>
                    <div className="min-w-0">
                      <div className="text-[13px] font-bold text-white">{l.name}</div>
                      <div className="mt-0.5 text-[11px] font-medium uppercase tracking-[0.1em] text-[#8ea1c1]">{l.desc}</div>
                    </div>
                  </div>
                ))}
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
              <div className="relative mt-6 text-[42px] font-extrabold leading-none tracking-[-0.05em] text-[var(--ink)]">
                <CountUp to={k.val} />
              </div>
              <div className="relative mt-2 text-[13px] font-medium text-ink-soft">{k.sub}</div>
            </div>
          ))}
        </div>

        <section className="rounded-[32px] border border-border bg-surface p-6 shadow-[0_24px_60px_rgba(9,20,38,0.08)]">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <div className="text-[11px] font-bold uppercase tracking-[0.14em] text-ink-soft">RECENT ALERTS</div>
              <h2 className="mt-2 text-[28px] font-bold tracking-[-0.02em] text-[var(--ink)]">近期拦截</h2>
            </div>
            <Link
              href="/biz/calls"
              className="inline-flex items-center gap-1 rounded-full bg-[var(--indigo-soft)] px-4 py-2 text-[12px] font-bold uppercase tracking-[0.14em] text-[var(--indigo-deep)] transition hover:bg-[var(--indigo-soft)]"
            >
              全部
              <ArrowUpRight size={13} />
            </Link>
          </div>

          {alerts.length === 0 ? (
            <div className="rounded-[24px] border border-dashed border-border bg-canvas-2 py-14 text-center text-[14px] font-medium text-ink-soft">
              暂无通话判决记录
            </div>
          ) : (
            <div className="space-y-3">
              {alerts.map((a) => {
                const tone = a.verdict === "拦截"
                  ? { bg: "var(--coral-soft)", fg: "var(--coral-deep)", icon: PhoneOff }
                  : a.verdict === "预警"
                    ? { bg: "var(--amber-soft)", fg: "var(--amber-deep)", icon: AlertTriangle }
                    : { bg: "var(--mint-soft)", fg: "var(--mint-deep)", icon: ShieldCheck };
                const ToneIcon = tone.icon;
                return (
                  <div
                    key={a.id}
                    className="flex items-center gap-4 rounded-[24px] border border-border bg-canvas-2 px-4 py-4 transition duration-200 hover:-translate-y-0.5 hover:border-border hover:shadow-[0_16px_30px_rgba(9,20,38,0.06)]"
                  >
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[18px]" style={{ background: tone.bg, color: tone.fg }}>
                      <ToneIcon size={18} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="truncate text-[15px] font-bold text-[var(--ink)]">{a.phone}</span>
                        <span className="rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-[0.14em]" style={{ background: tone.bg, color: tone.fg }}>
                          {a.verdict}
                        </span>
                      </div>
                      <div className="mt-1 truncate text-[13px] font-medium text-ink-soft">
                        {a.region || "未知归属地"} · {a.reason || "—"}
                      </div>
                    </div>
                    <div className="shrink-0 text-right">
                      <div className="text-[11px] font-bold uppercase tracking-[0.14em] text-ink-soft">{relTime(a.createdAt)}</div>
                      <Link href="/biz/calls" className="text-[12px] font-bold text-[var(--indigo)] hover:underline">详情</Link>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </AppShell>
  );
}
