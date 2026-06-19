"use client";
import { useEffect, useMemo, useState } from "react";
import { ShieldCheck, Bell, Users, ListChecks, PhoneOff, Radio, Waves, ScanLine, ArrowUpRight, Plus, Circle, MonitorSmartphone } from "lucide-react";
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

  const todayBlocked = useMemo(() => calls.filter((c) => c.verdict === "拦截" && isSameDay(c.createdAt, now)).length, [calls]);
  const monthWarned = useMemo(() => calls.filter((c) => c.verdict === "预警" && isSameMonth(c.createdAt, now)).length, [calls]);
  const onlineDevices = devices.filter((d) => d.status === "online").length;
  const alerts = calls.slice(0, 5);

  return (
    <AppShell
      role="family"
      userName={userName}
      nav={FAMILY_NAV}
      breadcrumb={["SENTINEL", "家庭用户", "首页"]}
    >
      {/* 头部欢迎 */}
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="font-mono text-[calc(11px*var(--fz))] uppercase tracking-[0.18em] text-ink-soft font-bold mb-2">
            {dateLine}
          </div>
          <h1 className="font-display text-[calc(32px*var(--fz))] md:text-[calc(40px*var(--fz))] font-extrabold tracking-tight">
            {greeting(now.getHours())}，{userName}
          </h1>
          <p className="mt-2 text-[calc(14px*var(--fz))] text-ink-soft font-medium">
            今天已为你和家人拦截 <span className="font-extrabold text-coral-deep">{todayBlocked} 通</span> 可疑来电。
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/app/protection?tab=whitelist&add=1" className="btn-ghost py-2.5 px-4 text-[calc(13px*var(--fz))]">
            <Plus size={14} /> 添加白名单
          </Link>
          <Link href="/app/protection" className="btn-indigo py-2.5 px-4 text-[calc(13px*var(--fz))]">
            <ShieldCheck size={14} /> 实时防护
          </Link>
        </div>
      </div>

      {/* KPI 四宫格 */}
      <div className="stagger grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          { label: "今日拦截", val: todayBlocked, sub: "次可疑来电", tint: "var(--coral)", soft: "var(--coral-soft)", icon: PhoneOff },
          { label: "本月预警", val: monthWarned, sub: "次预警提示", tint: "var(--amber)", soft: "var(--amber-soft)", icon: Bell },
          { label: "白名单", val: whitelistTotal ?? 0, sub: "可信联系人", tint: "var(--mint)", soft: "var(--mint-soft)", icon: ListChecks },
          { label: "守护设备", val: devices.length, sub: `${onlineDevices} 台在线`, tint: "var(--indigo)", soft: "var(--indigo-soft)", icon: Users },
        ].map((k) => (
          <div key={k.label} className="panel panel-lift p-5 relative overflow-hidden">
            <div className="absolute -top-8 -right-8 w-24 h-24 rounded-full opacity-60" style={{ background: k.soft }} />
            <div className="relative flex items-center justify-between mb-4">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: k.soft, color: k.tint }}>
                <k.icon size={18} />
              </div>
              <span className="font-mono text-[calc(10px*var(--fz))] uppercase tracking-[0.14em] text-ink-soft font-bold">{k.label}</span>
            </div>
            <div className="relative numplate text-[calc(36px*var(--fz))] leading-none">
              <CountUp to={k.val} />
            </div>
            <div className="relative mt-2 text-[calc(12px*var(--fz))] text-ink-soft font-semibold">{k.sub}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-12 gap-5">
        {/* 告警记录 */}
        <section className="col-span-12 lg:col-span-8 panel p-6">
          <div className="flex items-center justify-between mb-5">
            <div>
              <div className="font-mono text-[calc(10px*var(--fz))] uppercase tracking-[0.14em] text-ink-soft font-bold">RECENT ALERTS</div>
              <h2 className="font-display text-[calc(22px*var(--fz))] font-extrabold mt-1">近期告警</h2>
            </div>
            <Link href="/app/protection" className="flex items-center gap-1 font-mono text-[calc(11px*var(--fz))] uppercase tracking-[0.14em] text-indigo-deep font-bold hover:underline">
              全部 <ArrowUpRight size={12} />
            </Link>
          </div>

          {alerts.length === 0 ? (
            <div className="py-12 text-center text-[calc(13px*var(--fz))] text-ink-soft font-medium">
              暂无通话记录，守护已就绪
            </div>
          ) : (
            <div className="stagger space-y-2">
              {alerts.map((a) => {
                const tone = a.verdict === "拦截" ? "coral" : a.verdict === "预警" ? "amber" : "mint";
                const bg = `var(--${tone}-soft)`;
                const fg = `var(--${tone}-deep)`;
                return (
                  <div key={a.id} className="flex items-center gap-4 p-4 rounded-2xl hover:bg-canvas-2 transition-colors">
                    <div
                      className="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0"
                      style={{ background: bg, color: fg }}
                    >
                      {a.verdict === "拦截" ? <PhoneOff size={18} /> : a.verdict === "预警" ? <Bell size={18} /> : <ShieldCheck size={18} />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-display text-[calc(14px*var(--fz))] font-extrabold truncate">{a.phone}</span>
                        <span
                          className="font-mono text-[calc(9px*var(--fz))] uppercase tracking-[0.14em] px-2 py-0.5 rounded-full font-bold"
                          style={{ background: bg, color: fg }}
                        >
                          {a.verdict}
                        </span>
                      </div>
                      <div className="mt-0.5 text-[calc(12px*var(--fz))] text-ink-soft font-medium truncate">
                        {a.region || "未知归属地"} · {a.reason || "—"}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="font-mono text-[calc(10px*var(--fz))] uppercase tracking-[0.14em] text-ink-soft font-bold">{relTime(a.createdAt)}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* 三层引擎状态 */}
        <section className="col-span-12 lg:col-span-4 panel p-6">
          <div className="mb-5">
            <div className="font-mono text-[calc(10px*var(--fz))] uppercase tracking-[0.14em] text-ink-soft font-bold">ENGINE STATUS</div>
            <h2 className="font-display text-[calc(22px*var(--fz))] font-extrabold mt-1">引擎实况</h2>
          </div>

          <div className="stagger space-y-3">
            {[
              { icon: Radio, name: "L1 来电溯源", desc: "信令规则 · 实时比对", tint: "var(--indigo)", soft: "var(--indigo-soft)" },
              { icon: Waves, name: "L2 声纹取证", desc: "ONNX 声纹 · 合成识别", tint: "var(--mint-deep)", soft: "var(--mint-soft)" },
              { icon: ScanLine, name: "L3 话术语义", desc: "千问 LLM · 话术分类", tint: "var(--coral)", soft: "var(--coral-soft)" },
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
              <span className="font-mono text-[calc(10px*var(--fz))] uppercase tracking-[0.14em] font-bold text-mint-deep">
                {engine && engine.failed > 0 && engine.analyzed === 0 ? "引擎待命中" : "系统运转正常"}
              </span>
            </div>
            <div className="mt-1 text-[calc(12px*var(--fz))] text-mint-deep font-semibold">
              {engine
                ? `本次启动以来已分析 ${engine.analyzed} 通来电${engine.failed > 0 ? `，失败 ${engine.failed} 次` : ""}。`
                : "三层引擎已就绪，24 小时全域守护中。"}
            </div>
          </div>
        </section>

        {/* 守护设备 */}
        <section className="col-span-12 panel p-6">
          <div className="flex items-center justify-between mb-5">
            <div>
              <div className="font-mono text-[calc(10px*var(--fz))] uppercase tracking-[0.14em] text-ink-soft font-bold">PROTECTED DEVICES</div>
              <h2 className="font-display text-[calc(22px*var(--fz))] font-extrabold mt-1">守护设备</h2>
            </div>
          </div>

          {devices.length === 0 ? (
            <div className="py-10 text-center">
              <MonitorSmartphone size={28} className="mx-auto mb-3 text-ink-soft" />
              <div className="text-[calc(13px*var(--fz))] text-ink-soft font-medium">
                暂无绑定的家庭设备，可联系家庭管理员在设备管理中添加。
              </div>
            </div>
          ) : (
            <div className="stagger grid grid-cols-1 md:grid-cols-3 gap-4">
              {devices.slice(0, 6).map((m) => (
                <div key={m.id} className="p-5 rounded-2xl border border-border hover:shadow-md transition-all hover:-translate-y-0.5 press-soft">
                  <div className="flex items-center gap-3 mb-4">
                    <div
                      className="w-12 h-12 rounded-full flex items-center justify-center font-display text-white font-extrabold text-[calc(16px*var(--fz))] shadow-md"
                      style={{ background: "linear-gradient(135deg, var(--indigo), var(--coral))" }}
                    >
                      {m.name.slice(0, 1)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-display text-[calc(15px*var(--fz))] font-extrabold truncate">{m.name}</div>
                      <div className="font-mono text-[calc(11px*var(--fz))] text-ink-soft font-bold truncate">{m.contact || "未填联系人"}</div>
                    </div>
                    <span
                      className="font-mono text-[calc(9px*var(--fz))] uppercase tracking-[0.14em] px-2 py-1 rounded-full font-bold flex items-center gap-1.5"
                      style={{
                        background: m.status === "online" ? "var(--mint-soft)" : m.status === "warn" ? "var(--amber-soft)" : "var(--canvas-2)",
                        color: m.status === "online" ? "var(--mint-deep)" : m.status === "warn" ? "var(--amber-deep)" : "var(--ink-soft)",
                      }}
                    >
                      <span className="w-1.5 h-1.5 rounded-full" style={{ background: m.status === "online" ? "var(--mint)" : m.status === "warn" ? "var(--amber)" : "var(--ink-ghost)" }} />
                      {m.status === "online" ? "在线" : m.status === "warn" ? "告警" : "离线"}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-3 pt-3 border-t border-border">
                    <div>
                      <div className="font-display text-[calc(14px*var(--fz))] font-extrabold">{m.version || "—"}</div>
                      <div className="font-mono text-[calc(10px*var(--fz))] uppercase tracking-[0.12em] text-ink-soft font-bold">客户端版本</div>
                    </div>
                    <div>
                      <div className="font-display text-[calc(14px*var(--fz))] font-extrabold">{m.lastSeenAt ? relTime(m.lastSeenAt) : "—"}</div>
                      <div className="font-mono text-[calc(10px*var(--fz))] uppercase tracking-[0.12em] text-ink-soft font-bold">最近在线</div>
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

