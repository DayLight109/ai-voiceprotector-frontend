"use client";
import { useEffect, useState } from "react";
import AppShell from "@/components/AppShell";
import PageHeader from "@/components/shared/PageHeader";
import { SYSADMIN_NAV } from "@/lib/nav";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { AlertOctagon, MapPin, Activity, ShieldOff, Bot } from "lucide-react";

type RiskIndex = { index: number; sampleSize: number; blocked: number; aiJudged: number; windowHours: number };
type Region = { region: string; count: number };
type Ev = { id: string; phone: string; region: string; verdict: string; reason: string; riskScore: number; createdAt: string };

const REFRESH_MS = 15_000;

function verdictView(verdict: string): { verb: string; level: "danger" | "warn" | "info" } {
  if (verdict === "拦截") return { verb: "BLOCK", level: "danger" };
  if (verdict === "预警") return { verb: "ALERT", level: "warn" };
  return { verb: "PASS", level: "info" };
}

function relTime(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  if (!Number.isFinite(ms) || ms < 0) return "刚刚";
  const s = Math.floor(ms / 1000);
  if (s < 60) return s <= 5 ? "刚刚" : `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}

function defconOf(index: number): string {
  if (index >= 80) return "DEFCON 1 · CRITICAL";
  if (index >= 60) return "DEFCON 2 · ADVISORY";
  if (index >= 40) return "DEFCON 3 · ELEVATED";
  if (index >= 20) return "DEFCON 4 · GUARDED";
  return "DEFCON 5 · NORMAL";
}

export default function RiskDashboard() {
  const { user } = useAuth();
  const [clock, setClock] = useState("");
  const [risk, setRisk] = useState<RiskIndex | null>(null);
  const [stats, setStats] = useState<Record<string, number> | null>(null);
  const [regions, setRegions] = useState<Region[]>([]);
  const [events, setEvents] = useState<Ev[]>([]);

  // 时钟每秒走；业务数据 15s 轮询真实接口
  useEffect(() => {
    const tick = () => {
      const d = new Date();
      setClock(`${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}:${String(d.getSeconds()).padStart(2, "0")}`);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    let alive = true;
    const load = async () => {
      const [ri, st, rg, ev] = await Promise.allSettled([
        api.dashboard.riskIndex(),
        api.getStats(),
        api.dashboard.regions(),
        api.dashboard.events({ limit: 8 }),
      ]);
      if (!alive) return;
      if (ri.status === "fulfilled") setRisk(ri.value);
      if (st.status === "fulfilled") setStats(st.value as Record<string, number>);
      if (rg.status === "fulfilled") setRegions(rg.value);
      if (ev.status === "fulfilled") setEvents(ev.value.data ?? []);
    };
    void load();
    const id = setInterval(load, REFRESH_MS);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, []);

  const idx = risk?.index ?? 0;
  const regionTotal = regions.reduce((a, r) => a + r.count, 0);
  const gaugeColor = idx >= 60 ? "var(--coral)" : idx >= 30 ? "var(--amber)" : "var(--mint)";
  const gaugeDeep = idx >= 60 ? "var(--coral-deep)" : idx >= 30 ? "var(--amber-deep)" : "var(--mint-deep)";

  const cards = [
    { k: "已拦截", v: stats?.interceptedCalls, c: "var(--mint-deep)", Icon: Activity },
    { k: "已阻断", v: stats?.blockedCalls, c: "var(--coral)", Icon: ShieldOff },
    { k: "AI 话术命中", v: stats?.aiJudgedFraud, c: "var(--amber-deep)", Icon: Bot },
  ];

  return (
    <AppShell role="sysadmin" userName={user?.name ?? "系统管理员"} nav={SYSADMIN_NAV} breadcrumb={["SENTINEL", "系统管理员", "风险大屏"]}>
      <PageHeader
        eyebrow="RISK SITUATION ROOM"
        title="风险大屏"
        desc="实时告警事件 · 高危地区分布 · 风险仪表盘。"
        actions={
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-canvas-2 border border-border font-mono text-[calc(12px*var(--fz))] font-bold">
            <span className="w-2 h-2 rounded-full animate-pulse" style={{ background: "var(--mint)" }} />
            LIVE · {clock}
          </div>
        }
      />

      <div className="grid grid-cols-12 gap-5">
        {/* 风险仪表盘 */}
        <section className="col-span-12 lg:col-span-4">
          <div className="panel p-6 mb-5 text-center" style={{ background: "linear-gradient(160deg, var(--coral-soft), var(--amber-soft))" }}>
            <div className="font-mono text-[calc(10px*var(--fz))] uppercase tracking-[0.14em] text-ink-soft font-bold">
              RISK INDEX · 近 {risk?.windowHours ?? 1}h
            </div>
            <Gauge value={idx} color={gaugeColor} />
            <div className="numplate text-[calc(40px*var(--fz))] leading-none -mt-12" style={{ color: gaugeDeep }}>
              {risk ? idx : "—"}
            </div>
            <div className="mt-1 font-mono text-[calc(11px*var(--fz))] uppercase tracking-[0.14em] font-bold" style={{ color: gaugeDeep }}>
              {defconOf(idx)}
            </div>
            <div className="mt-2 font-mono text-[calc(10px*var(--fz))] text-ink-soft font-bold">
              样本 {risk?.sampleSize ?? 0} · 阻断 {risk?.blocked ?? 0} · AI 命中 {risk?.aiJudged ?? 0}
            </div>
          </div>

          <div className="space-y-3">
            {cards.map((s) => (
              <div key={s.k} className="panel p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "var(--canvas-2)", color: s.c }}>
                  <s.Icon size={16} />
                </div>
                <div className="flex-1">
                  <div className="font-mono text-[calc(10px*var(--fz))] uppercase tracking-[0.14em] text-ink-soft font-bold">{s.k}</div>
                  <div className="numplate text-[calc(22px*var(--fz))]" style={{ color: s.c }}>
                    {s.v === undefined ? "—" : s.v.toLocaleString()}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* 告警事件 */}
        <section className="col-span-12 lg:col-span-4 panel p-6">
          <div className="mb-5">
            <div className="font-mono text-[calc(10px*var(--fz))] uppercase tracking-[0.14em] text-ink-soft font-bold">LIVE EVENTS</div>
            <h2 className="font-display text-[calc(20px*var(--fz))] font-extrabold mt-1">告警事件流</h2>
          </div>
          {events.length === 0 ? (
            <div className="py-10 text-center text-[calc(13px*var(--fz))] text-ink-soft font-medium">
              暂无通话判决记录
            </div>
          ) : (
            <div className="space-y-2">
              {events.map((e) => {
                const v = verdictView(e.verdict);
                return (
                  <div key={e.id} className="flex items-start gap-3 p-3 rounded-2xl bg-canvas-2/60">
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: v.level === "danger" ? "var(--coral-soft)" : v.level === "warn" ? "var(--amber-soft)" : "var(--indigo-soft)", color: v.level === "danger" ? "var(--coral-deep)" : v.level === "warn" ? "var(--amber-deep)" : "var(--indigo-deep)" }}>
                      <AlertOctagon size={14} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[calc(11px*var(--fz))] font-extrabold" style={{ color: v.level === "danger" ? "var(--coral-deep)" : v.level === "warn" ? "var(--amber-deep)" : "var(--indigo-deep)" }}>{v.verb}</span>
                        <span className="font-mono text-[calc(11px*var(--fz))] font-bold truncate">{e.phone}</span>
                      </div>
                      <div className="mt-0.5 text-[calc(12px*var(--fz))] text-ink-soft font-medium truncate">
                        {e.reason || `风险分 ${e.riskScore}`}
                      </div>
                    </div>
                    <span className="font-mono text-[calc(10px*var(--fz))] uppercase tracking-[0.14em] text-ink-soft font-bold">{relTime(e.createdAt)}</span>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* 高危地区 */}
        <section className="col-span-12 lg:col-span-4 panel p-6">
          <div className="mb-5">
            <div className="font-mono text-[calc(10px*var(--fz))] uppercase tracking-[0.14em] text-ink-soft font-bold">HIGH-RISK REGIONS · 24H</div>
            <h2 className="font-display text-[calc(20px*var(--fz))] font-extrabold mt-1">高危地区</h2>
          </div>
          {regions.length === 0 ? (
            <div className="py-10 text-center text-[calc(13px*var(--fz))] text-ink-soft font-medium">
              近 24 小时暂无地区数据
            </div>
          ) : (
            <div className="space-y-3">
              {regions.map((r) => {
                const share = regionTotal > 0 ? Math.round((r.count / regionTotal) * 100) : 0;
                return (
                  <div key={r.region}>
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <MapPin size={12} className="text-ink-soft" />
                        <span className="font-display text-[calc(13px*var(--fz))] font-extrabold">{r.region}</span>
                      </div>
                      <span className="font-mono text-[calc(11px*var(--fz))] font-bold">
                        {r.count.toLocaleString()} · {share}%
                      </span>
                    </div>
                    <div className="h-2 rounded-full bg-canvas-2 overflow-hidden">
                      <div className="h-full rounded-full transition-all" style={{ width: `${Math.min(100, share * 3)}%`, background: share >= 20 ? "var(--coral)" : share >= 10 ? "var(--amber)" : "var(--indigo)" }} />
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

function Gauge({ value, color }: { value: number; color: string }) {
  const r = 60;
  const c = 2 * Math.PI * r;
  return (
    <svg viewBox="0 0 160 100" className="w-full h-32 mx-auto">
      <circle cx="80" cy="80" r={r} fill="none" stroke="var(--canvas-2)" strokeWidth="14" strokeDasharray={`${c / 2} ${c}`} transform="rotate(180 80 80)" strokeLinecap="round" />
      <circle cx="80" cy="80" r={r} fill="none" stroke={color} strokeWidth="14" strokeDasharray={`${(c / 2) * (value / 100)} ${c}`} transform="rotate(180 80 80)" strokeLinecap="round" />
    </svg>
  );
}
