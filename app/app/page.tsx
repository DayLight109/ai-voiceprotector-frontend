"use client";
import { useEffect, useMemo, useState } from "react";
import {
  ShieldCheck,
  Bell,
  Users,
  ListChecks,
  PhoneOff,
  Radio,
  Waves,
  ScanLine,
  ArrowUpRight,
  Plus,
  Circle,
  MonitorSmartphone,
} from "lucide-react";
import Link from "next/link";
import AppShell from "@/components/AppShell";
import CountUp from "@/components/shared/CountUp";
import { FAMILY_NAV } from "@/lib/nav";
import { api, ApiDevice } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import type { CallLog } from "@/lib/domain-types";

const WEEKDAYS = ["SUNDAY", "MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY"];
const MONTHS = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];

function greeting(h: number): string {
  if (h < 6) return "凌晨好";
  if (h < 12) return "早上好";
  if (h < 14) return "中午好";
  if (h < 18) return "下午好";
  return "晚上好";
}

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

export default function FamilyDashboard() {
  const { user } = useAuth();
  const [calls, setCalls] = useState<CallLog[]>([]);
  const [whitelistTotal, setWhitelistTotal] = useState<number | null>(null);
  const [devices, setDevices] = useState<ApiDevice[]>([]);
  const [engine, setEngine] = useState<{ analyzed: number; failed: number; lastAnalyzedAt?: string | null } | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      const [c, wl, dv, ov] = await Promise.allSettled([
        api.calls.list({ pageSize: 100 }),
        api.whitelist.list({ pageSize: 1 }),
        api.devices.list({ type: "family", pageSize: 100 }),
        api.warroom.overview(),
      ]);
      if (!alive) return;
      if (c.status === "fulfilled") setCalls(c.value.data ?? []);
      if (wl.status === "fulfilled") setWhitelistTotal(wl.value.meta?.total ?? (wl.value.data?.length ?? 0));
      if (dv.status === "fulfilled") setDevices(dv.value.data ?? []);
      if (ov.status === "fulfilled") setEngine(ov.value.engine ?? null);
    })();
    return () => {
      alive = false;
    };
  }, []);

  const now = new Date();
  const dateLine = `${WEEKDAYS[now.getDay()]} · ${MONTHS[now.getMonth()]} ${now.getDate()}`;
  const userName = user?.name ?? "用户";

  const todayBlocked = useMemo(() => calls.filter((c) => c.verdict === "拦截" && isSameDay(c.createdAt, now)).length, [calls, now]);
  const monthWarned = useMemo(() => calls.filter((c) => c.verdict === "预警" && isSameMonth(c.createdAt, now)).length, [calls, now]);
  const onlineDevices = devices.filter((d) => d.status === "online").length;
  const alerts = calls.slice(0, 5);
  const engineSummary = engine
    ? `本次启动以来已分析 ${engine.analyzed} 通来电${engine.failed > 0 ? `，失败 ${engine.failed} 次` : ""}。`
    : "三层引擎已就绪，24 小时全域守护中。";

  return (
    <AppShell
      role="family"
      userName={userName}
      nav={FAMILY_NAV}
      breadcrumb={["SENTINEL", "家庭用户", "首页"]}
    >
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
                  <h1 className="mt-5 text-[clamp(32px,3vw,48px)] font-extrabold leading-[1.05] tracking-[-0.03em] text-[var(--ink)]">
                    {greeting(now.getHours())}，{userName}
                  </h1>
                  <p className="mt-4 max-w-[620px] text-[16px] leading-[1.7] text-ink-soft">
                    今天已为你和家人拦截
                    <span className="mx-2 font-extrabold text-[var(--indigo)]">{todayBlocked} 通</span>
                    可疑来电，防护链路保持在线。
                  </p>
                </div>

                <div className="rounded-full border border-border bg-surface-2 px-4 py-2 text-[12px] font-bold uppercase tracking-[0.14em] text-ink-soft shadow-[0_10px_24px_rgba(9,20,38,0.05)]">
                  FAMILY SHIELD ACTIVE
                </div>
              </div>

              <div className="flex flex-wrap gap-3">
                <Link
                  href="/app/protection?tab=whitelist&add=1"
                  className="inline-flex h-[54px] items-center gap-2 rounded-full border border-border bg-surface px-6 text-[15px] font-semibold text-[var(--ink)] shadow-[0_10px_24px_rgba(9,20,38,0.06)] transition duration-200 hover:-translate-y-0.5 hover:bg-[var(--indigo-soft)]"
                >
                  <Plus size={16} />
                  添加白名单
                </Link>
                <Link
                  href="/app/protection"
                  className="inline-flex h-[54px] items-center gap-2 rounded-full bg-[var(--indigo)] px-6 text-[15px] font-bold text-white shadow-[0_18px_36px_rgba(91,95,222,0.32)] transition duration-200 hover:-translate-y-0.5 hover:bg-[var(--indigo-deep)]"
                >
                  <ShieldCheck size={16} />
                  实时防护
                </Link>
              </div>
            </div>
          </div>

          <section className="relative overflow-hidden rounded-[32px] px-6 py-7 text-white shadow-[0_30px_80px_rgba(8,8,22,0.5)] md:px-7" style={{ background: "linear-gradient(150deg, #07061a 0%, #110f3a 52%, #1c1960 100%)" }}>
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_18%,rgba(62,213,152,0.16),transparent_26%),radial-gradient(circle_at_82%_78%,rgba(255,181,71,0.14),transparent_30%),linear-gradient(180deg,rgba(255,255,255,0.05),rgba(255,255,255,0)_40%)]" />
            <div className="relative">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/[0.08] px-4 py-2 text-[12px] font-medium uppercase tracking-[0.12em] text-[#d8e3fb]">
                <span className="h-2.5 w-2.5 rounded-full bg-[#37d99c] shadow-[0_0_0_4px_rgba(55,217,156,0.15)]" />
                SYSTEM ACTIVE
              </div>

              <h2 className="mt-6 text-[30px] font-bold leading-[1.15] tracking-[-0.02em] text-white">
                守护引擎持续在线
              </h2>
              <p className="mt-4 text-[15px] leading-[1.75] text-[#cdd8ee]">
                {engineSummary}
              </p>

              <div className="mt-7 grid gap-3">
                <SummaryStrip
                  label="在线设备"
                  value={`${onlineDevices}/${devices.length || 0}`}
                  note={devices.length > 0 ? "设备在线率" : "暂无已绑定设备"}
                />
                <SummaryStrip
                  label="本月预警"
                  value={`${monthWarned}`}
                  note="已触发风险提示"
                />
                <SummaryStrip
                  label="最近分析"
                  value={engine?.lastAnalyzedAt ? relTime(engine.lastAnalyzedAt) : "待机中"}
                  note="最新引擎状态"
                />
              </div>
            </div>
          </section>
        </section>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {[
            {
              label: "今日拦截",
              val: todayBlocked,
              sub: "次可疑来电",
              tint: "var(--coral)",
              soft: "var(--coral-soft)",
              icon: PhoneOff,
            },
            {
              label: "本月预警",
              val: monthWarned,
              sub: "次预警提示",
              tint: "var(--amber)",
              soft: "var(--amber-soft)",
              icon: Bell,
            },
            {
              label: "白名单",
              val: whitelistTotal ?? 0,
              sub: "可信联系人",
              tint: "var(--mint-deep)",
              soft: "var(--mint-soft)",
              icon: ListChecks,
            },
            {
              label: "守护设备",
              val: devices.length,
              sub: `${onlineDevices} 台在线`,
              tint: "var(--indigo)",
              soft: "var(--indigo-soft)",
              icon: Users,
            },
          ].map((k) => (
            <div
              key={k.label}
              className="relative overflow-hidden rounded-[28px] border border-border bg-surface p-5 shadow-[0_18px_40px_rgba(9,20,38,0.06)] transition duration-200 hover:-translate-y-1 hover:shadow-[0_24px_54px_rgba(9,20,38,0.1)]"
            >
              <div
                className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full opacity-85"
                style={{ background: `radial-gradient(circle, ${k.soft}, transparent 72%)` }}
              />
              <div className="relative flex items-center justify-between">
                <div
                  className="flex h-12 w-12 items-center justify-center rounded-[16px]"
                  style={{ background: k.soft, color: k.tint }}
                >
                  <k.icon size={18} />
                </div>
                <span className="text-[11px] font-bold uppercase tracking-[0.14em] text-ink-soft">
                  {k.label}
                </span>
              </div>
              <div className="relative mt-6 text-[42px] font-extrabold leading-none tracking-[-0.05em] text-[var(--ink)]">
                <CountUp to={k.val} />
              </div>
              <div className="relative mt-2 text-[13px] font-medium text-ink-soft">{k.sub}</div>
            </div>
          ))}
        </div>

        <div className="grid gap-5 xl:grid-cols-[minmax(0,1.32fr)_minmax(320px,0.8fr)]">
          <section className="rounded-[32px] border border-border bg-surface p-6 shadow-[0_24px_60px_rgba(9,20,38,0.08)]">
            <div className="mb-6 flex items-center justify-between">
              <div>
                <div className="text-[11px] font-bold uppercase tracking-[0.14em] text-ink-soft">RECENT ALERTS</div>
                <h2 className="mt-2 text-[28px] font-bold tracking-[-0.02em] text-[var(--ink)]">近期告警</h2>
              </div>
              <Link
                href="/app/protection"
                className="inline-flex items-center gap-1 rounded-full bg-[var(--indigo-soft)] px-4 py-2 text-[12px] font-bold uppercase tracking-[0.14em] text-[var(--indigo-deep)] transition hover:opacity-80"
              >
                全部
                <ArrowUpRight size={13} />
              </Link>
            </div>

            {alerts.length === 0 ? (
              <div className="rounded-[24px] border border-dashed border-border bg-canvas-2 py-14 text-center text-[14px] font-medium text-ink-soft">
                暂无通话记录，守护已就绪
              </div>
            ) : (
              <div className="space-y-3">
                {alerts.map((a) => {
                  const tone = a.verdict === "拦截"
                    ? { bg: "var(--coral-soft)", fg: "var(--coral-deep)", icon: PhoneOff }
                    : a.verdict === "预警"
                      ? { bg: "var(--amber-soft)", fg: "var(--amber-deep)", icon: Bell }
                      : { bg: "var(--mint-soft)", fg: "var(--mint-deep)", icon: ShieldCheck };
                  const ToneIcon = tone.icon;
                  return (
                    <div
                      key={a.id}
                      className="flex items-center gap-4 rounded-[24px] border border-border bg-canvas-2 px-4 py-4 transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_16px_30px_rgba(9,20,38,0.06)]"
                    >
                      <div
                        className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[18px]"
                        style={{ background: tone.bg, color: tone.fg }}
                      >
                        <ToneIcon size={18} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="truncate text-[15px] font-bold text-[var(--ink)]">{a.phone}</span>
                          <span
                            className="rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-[0.14em]"
                            style={{ background: tone.bg, color: tone.fg }}
                          >
                            {a.verdict}
                          </span>
                        </div>
                        <div className="mt-1 truncate text-[13px] font-medium text-ink-soft">
                          {a.region || "未知归属地"} · {a.reason || "—"}
                        </div>
                      </div>
                      <div className="shrink-0 text-right text-[11px] font-bold uppercase tracking-[0.14em] text-ink-soft">
                        {relTime(a.createdAt)}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          <section className="rounded-[32px] border border-border bg-surface p-6 shadow-[0_24px_60px_rgba(9,20,38,0.08)]">
            <div className="mb-6">
              <div className="text-[11px] font-bold uppercase tracking-[0.14em] text-ink-soft">ENGINE STATUS</div>
              <h2 className="mt-2 text-[28px] font-bold tracking-[-0.02em] text-[var(--ink)]">引擎实况</h2>
            </div>

            <div className="space-y-3">
              {[
                { icon: Radio, name: "L1 来电溯源", desc: "信令规则 · 实时比对", tint: "var(--indigo)", soft: "var(--indigo-soft)" },
                { icon: Waves, name: "L2 声纹取证", desc: "ONNX 声纹 · 合成识别", tint: "var(--mint-deep)", soft: "var(--mint-soft)" },
                { icon: ScanLine, name: "L3 话术语义", desc: "千问 LLM · 话术分类", tint: "var(--coral)", soft: "var(--coral-soft)" },
              ].map((lane) => (
                <div key={lane.name} className="rounded-[22px] border border-border bg-canvas-2 p-4">
                  <div className="flex items-center gap-3">
                    <div
                      className="flex h-10 w-10 items-center justify-center rounded-[14px]"
                      style={{ background: lane.soft, color: lane.tint }}
                    >
                      <lane.icon size={16} />
                    </div>
                    <div className="min-w-0">
                      <div className="text-[14px] font-bold text-[var(--ink)]">{lane.name}</div>
                      <div className="mt-1 text-[11px] font-bold uppercase tracking-[0.12em] text-ink-soft">
                        {lane.desc}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-5 rounded-[24px] bg-[var(--mint-soft)] px-4 py-4">
              <div className="flex items-center gap-2">
                <Circle size={8} className="fill-[var(--mint-deep)] text-[var(--mint-deep)] animate-pulse" />
                <span className="text-[11px] font-bold uppercase tracking-[0.14em] text-[var(--mint-deep)]">
                  {engine && engine.failed > 0 && engine.analyzed === 0 ? "引擎待命中" : "系统运转正常"}
                </span>
              </div>
              <div className="mt-2 text-[13px] font-medium leading-[1.7] text-[var(--mint-deep)]">{engineSummary}</div>
            </div>
          </section>
        </div>

        <section className="rounded-[32px] border border-border bg-surface p-6 shadow-[0_24px_60px_rgba(9,20,38,0.08)]">
          <div className="mb-6">
            <div className="text-[11px] font-bold uppercase tracking-[0.14em] text-ink-soft">PROTECTED DEVICES</div>
            <h2 className="mt-2 text-[28px] font-bold tracking-[-0.02em] text-[var(--ink)]">守护设备</h2>
          </div>

          {devices.length === 0 ? (
            <div className="rounded-[24px] border border-dashed border-border bg-canvas-2 py-14 text-center">
              <MonitorSmartphone size={30} className="mx-auto mb-3 text-ink-ghost" />
              <div className="text-[14px] font-medium text-ink-soft">
                暂无绑定的家庭设备，可联系家庭管理员在设备管理中添加。
              </div>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {devices.slice(0, 6).map((m) => (
                <div
                  key={m.id}
                  className="rounded-[28px] border border-border bg-canvas-2 p-5 transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_18px_34px_rgba(9,20,38,0.06)]"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="flex h-12 w-12 items-center justify-center rounded-full text-[16px] font-extrabold text-white shadow-[0_12px_24px_rgba(9,20,38,0.12)]"
                      style={{ background: "linear-gradient(135deg, var(--indigo), var(--mint))" }}
                    >
                      {m.name.slice(0, 1)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[15px] font-bold text-[var(--ink)]">{m.name}</div>
                      <div className="mt-1 truncate text-[12px] font-medium text-ink-soft">
                        {m.contact || "未填联系人"}
                      </div>
                    </div>
                    <span
                      className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-[0.12em]"
                      style={{
                        background:
                          m.status === "online"
                            ? "var(--mint-soft)"
                            : m.status === "warn"
                              ? "var(--amber-soft)"
                              : "var(--canvas-3)",
                        color:
                          m.status === "online"
                            ? "var(--mint-deep)"
                            : m.status === "warn"
                              ? "var(--amber-deep)"
                              : "var(--ink-soft)",
                      }}
                    >
                      <span
                        className="h-2 w-2 rounded-full"
                        style={{
                          background:
                            m.status === "online"
                              ? "var(--mint)"
                              : m.status === "warn"
                                ? "var(--amber)"
                                : "var(--ink-ghost)",
                        }}
                      />
                      {m.status === "online" ? "在线" : m.status === "warn" ? "告警" : "离线"}
                    </span>
                  </div>

                  <div className="mt-5 grid grid-cols-2 gap-3 border-t border-border pt-4">
                    <div className="rounded-[18px] bg-surface px-4 py-3">
                      <div className="text-[14px] font-bold text-[var(--ink)]">{m.version || "—"}</div>
                      <div className="mt-1 text-[10px] font-bold uppercase tracking-[0.12em] text-ink-soft">
                        客户端版本
                      </div>
                    </div>
                    <div className="rounded-[18px] bg-surface px-4 py-3">
                      <div className="text-[14px] font-bold text-[var(--ink)]">{m.lastSeenAt ? relTime(m.lastSeenAt) : "—"}</div>
                      <div className="mt-1 text-[10px] font-bold uppercase tracking-[0.12em] text-ink-soft">
                        最近在线
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </AppShell>
  );
}

function SummaryStrip({
  label,
  value,
  note,
}: {
  label: string;
  value: string;
  note: string;
}) {
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
