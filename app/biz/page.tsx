"use client";
import { useEffect, useMemo, useState } from "react";
import { ShieldCheck, PhoneOff, Radio, Waves, ScanLine, ArrowUpRight, Circle, Building2, MessageSquareWarning, AlertTriangle, Bell } from "lucide-react";
import AppShell from "@/components/AppShell";
import CountUp from "@/components/shared/CountUp";
import { BIZ_NAV } from "@/lib/nav";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import type { Appeal, CallLog } from "@/lib/domain-types";

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
  const userName = user?.name ?? "用户";
  const monthBlocked = useMemo(() => calls.filter((c) => c.verdict === "拦截" && isSameMonth(c.createdAt, now)).length, [calls]);
  const todayCalls = useMemo(() => calls.filter((c) => isSameDay(c.createdAt, now)).length, [calls]);
  const todayBlocked = useMemo(() => calls.filter((c) => c.verdict === "拦截" && isSameDay(c.createdAt, now)).length, [calls]);
  const todayWarned = useMemo(() => calls.filter((c) => c.verdict === "预警" && isSameDay(c.createdAt, now)).length, [calls]);
  const pendingAppeals = useMemo(() => appeals.filter((a) => a.status === "处理中").length, [appeals]);
  const alerts = calls.slice(0, 5);

  return (
    <AppShell role="biz" userName={userName} nav={BIZ_NAV} breadcrumb={["SENTINEL", "企业用户", "首页"]}>
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="font-mono text-[calc(11px*var(--fz))] uppercase tracking-[0.18em] text-ink-soft font-bold mb-2">
            BUSINESS PORTAL{user?.dept ? ` · ${user.dept}` : ""}
          </div>
          <h1 className="font-display text-[calc(32px*var(--fz))] md:text-[calc(40px*var(--fz))] font-extrabold tracking-tight">
            欢迎回来，{userName}
          </h1>
          <p className="mt-2 text-[calc(14px*var(--fz))] text-ink-soft font-medium">
            本月已拦截可疑通话 <CountUp to={monthBlocked} duration={1200} className="font-extrabold text-coral-deep" /> 起，
            申诉 <CountUp to={pendingAppeals} duration={900} className="font-extrabold text-indigo-deep" /> 起处理中。
          </p>
        </div>
        <div className="flex items-center gap-3">
          <a href="/biz/appeal" className="btn-ghost py-2.5 px-4 text-[calc(13px*var(--fz))]">
            <MessageSquareWarning size={14} /> 提交申诉
          </a>
          <a href="/biz/calls" className="btn-indigo py-2.5 px-4 text-[calc(13px*var(--fz))]">
            <Radio size={14} /> 查看通话记录 <ArrowUpRight size={14} />
          </a>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          { label: "通话记录", num: callsTotal, sub: "条累计判决", tint: "var(--indigo)", soft: "var(--indigo-soft)", icon: Building2 },
          { label: "今日拦截", num: todayBlocked, sub: `今日通话 ${todayCalls} 条`, tint: "var(--coral)", soft: "var(--coral-soft)", icon: PhoneOff },
          { label: "申诉处理中", num: pendingAppeals, sub: `累计 ${appeals.length} 起`, tint: "var(--amber)", soft: "var(--amber-soft)", icon: MessageSquareWarning },
          { label: "今日预警", num: todayWarned, sub: "次风险提示", tint: "var(--mint-deep)", soft: "var(--mint-soft)", icon: Bell },
        ].map((k) => (
          <div key={k.label} className="panel panel-lift p-5 relative overflow-hidden">
            <div className="absolute -top-8 -right-8 w-24 h-24 rounded-full opacity-60" style={{ background: k.soft }} />
            <div className="relative flex items-center justify-between mb-4">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: k.soft, color: k.tint }}>
                <k.icon size={18} />
              </div>
              <span className="font-mono text-[calc(10px*var(--fz))] uppercase tracking-[0.14em] text-ink-soft font-bold">{k.label}</span>
            </div>
            <CountUp
              to={k.num}
              duration={1100}
              className="relative numplate text-[calc(36px*var(--fz))] leading-none"
            />
            <div className="relative mt-2 text-[calc(12px*var(--fz))] text-ink-soft font-semibold">{k.sub}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-12 gap-5">
        <section className="col-span-12 lg:col-span-8 panel p-6">
          <div className="flex items-center justify-between mb-5">
            <div>
              <div className="font-mono text-[calc(10px*var(--fz))] uppercase tracking-[0.14em] text-ink-soft font-bold">RECENT ALERTS</div>
              <h2 className="font-display text-[calc(22px*var(--fz))] font-extrabold mt-1">近期拦截</h2>
            </div>
            <a href="/biz/calls" className="flex items-center gap-1 font-mono text-[calc(11px*var(--fz))] uppercase tracking-[0.14em] text-indigo-deep font-bold hover:underline">
              全部 <ArrowUpRight size={12} />
            </a>
          </div>
          {alerts.length === 0 ? (
            <div className="py-12 text-center text-[calc(13px*var(--fz))] text-ink-soft font-medium">
              暂无通话判决记录
            </div>
          ) : (
            <div className="space-y-2">
              {alerts.map((a) => {
                const tone = a.verdict === "拦截" ? "coral" : a.verdict === "预警" ? "amber" : "mint";
                return (
                  <div key={a.id} className="flex items-center gap-4 p-4 rounded-2xl hover:bg-canvas-2 transition-colors">
                    <div className="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0" style={{ background: `var(--${tone}-soft)`, color: `var(--${tone}-deep)` }}>
                      {a.verdict === "拦截" ? <PhoneOff size={18} /> : a.verdict === "预警" ? <AlertTriangle size={18} /> : <ShieldCheck size={18} />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-display text-[calc(14px*var(--fz))] font-extrabold truncate">{a.phone}</span>
                        <span className="font-mono text-[calc(9px*var(--fz))] uppercase tracking-[0.14em] px-2 py-0.5 rounded-full font-bold" style={{ background: `var(--${tone}-soft)`, color: `var(--${tone}-deep)` }}>
                          {a.verdict}
                        </span>
                      </div>
                      <div className="mt-0.5 text-[calc(12px*var(--fz))] text-ink-soft font-medium truncate">{a.region || "未知归属地"} · {a.reason || "—"}</div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="font-mono text-[calc(10px*var(--fz))] uppercase tracking-[0.14em] text-ink-soft font-bold">{relTime(a.createdAt)}</div>
                      <a href="/biz/calls" className="font-mono text-[calc(11px*var(--fz))] text-indigo-deep font-bold hover:underline">详情</a>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        <section className="col-span-12 lg:col-span-4 panel p-6">
          <div className="mb-5">
            <div className="font-mono text-[calc(10px*var(--fz))] uppercase tracking-[0.14em] text-ink-soft font-bold">ENGINE STATUS</div>
            <h2 className="font-display text-[calc(22px*var(--fz))] font-extrabold mt-1">引擎实况</h2>
          </div>
          <div className="space-y-3">
            {[
              { icon: Radio, name: "L1 来电溯源", desc: "信令规则 · 实时比对", tint: "var(--indigo)", soft: "var(--indigo-soft)" },
              { icon: Waves, name: "L2 语音转写", desc: "Whisper ASR · 文本提取", tint: "var(--mint-deep)", soft: "var(--mint-soft)" },
              { icon: ScanLine, name: "L3 话术语义", desc: "DeepSeek / Qwen · 风险判定", tint: "var(--coral)", soft: "var(--coral-soft)" },
            ].map((l) => (
              <div key={l.name} className="p-4 rounded-2xl bg-canvas-2">
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: l.soft, color: l.tint }}>
                      <l.icon size={13} />
                    </div>
                    <span className="font-display text-[calc(13px*var(--fz))] font-extrabold">{l.name}</span>
                  </div>
                </div>
                <div className="font-mono text-[calc(10px*var(--fz))] uppercase tracking-[0.12em] text-ink-soft font-bold">
                  {l.desc}
                </div>
              </div>
            ))}
          </div>
          <div className="mt-5 p-4 rounded-2xl" style={{ background: "var(--mint-soft)" }}>
            <div className="flex items-center gap-2">
              <Circle size={8} className="fill-mint-deep text-mint-deep animate-pulse" />
              <span className="font-mono text-[calc(10px*var(--fz))] uppercase tracking-[0.14em] font-bold text-mint-deep">系统运转正常</span>
            </div>
            <div className="mt-1 text-[calc(12px*var(--fz))] text-mint-deep font-semibold">
              {engine
                ? `本次启动以来已分析 ${engine.analyzed} 通来电${engine.failed > 0 ? `，失败 ${engine.failed} 次` : ""}。`
                : "三层引擎已就绪，企业级接入可用。"}
            </div>
          </div>
        </section>
      </div>
    </AppShell>
  );
}

