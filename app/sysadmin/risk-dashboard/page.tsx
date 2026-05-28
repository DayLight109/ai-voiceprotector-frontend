"use client";
import { useEffect, useState } from "react";
import AppShell from "@/components/AppShell";
import PageHeader from "@/components/shared/PageHeader";
import { SYSADMIN_NAV } from "@/lib/nav";
import { AlertOctagon, TrendingUp, MapPin, Activity, ShieldOff, AlertTriangle } from "lucide-react";

const REGIONS = [
  { name: "缅甸 仰光", code: "MM/YGN", count: 1284, share: 32 },
  { name: "柬埔寨 金边", code: "KH/PNH", count: 982, share: 24 },
  { name: "越南 胡志明", code: "VN/SGN", count: 643, share: 16 },
  { name: "老挝 万象", code: "LA/VTE", count: 412, share: 10 },
  { name: "泰国 曼谷", code: "TH/BKK", count: 311, share: 8 },
  { name: "菲律宾 马尼拉", code: "PH/MNL", count: 254, share: 6 },
  { name: "其他", code: "—", count: 175, share: 4 },
];

const EVENTS = [
  { ts: "刚刚", verb: "BLOCK", phone: "+855 23 8123 4551", reason: "AI 合成 + 转账话术", level: "danger" },
  { ts: "47s", verb: "ALERT", phone: "+95 9 7712 8830", reason: "公检法冒充", level: "warn" },
  { ts: "1m", verb: "BLOCK", phone: "+86 173 8800 1234", reason: "信令穿透", level: "danger" },
  { ts: "2m", verb: "WATCH", phone: "+84 28 6677 2210", reason: "刷单返利", level: "info" },
  { ts: "3m", verb: "BLOCK", phone: "+960 7 3344 2111", reason: "AI 换声", level: "danger" },
  { ts: "4m", verb: "ALERT", phone: "+62 21 5566 0011", reason: "验证码索取", level: "warn" },
];

export default function RiskDashboard() {
  const [clock, setClock] = useState("");
  const [stats, setStats] = useState({ intercept: 14_382_910, block: 284_917, escalate: 1_283 });

  useEffect(() => {
    const id = setInterval(() => {
      const d = new Date();
      setClock(`${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}:${String(d.getSeconds()).padStart(2, "0")}`);
      setStats((s) => ({
        intercept: s.intercept + Math.floor(Math.random() * 30 + 10),
        block: s.block + (Math.random() < 0.4 ? 1 : 0),
        escalate: s.escalate + (Math.random() < 0.1 ? 1 : 0),
      }));
    }, 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <AppShell role="sysadmin" userName="陈安怡" nav={SYSADMIN_NAV} breadcrumb={["SENTINEL", "系统管理员", "风险大屏"]}>
      <PageHeader
        eyebrow="RISK SITUATION ROOM"
        title="风险大屏"
        desc="实时告警事件 · 高危地区分布 · 风险仪表盘。"
        actions={
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-canvas-2 border border-border font-mono text-[12px] font-bold">
            <span className="w-2 h-2 rounded-full animate-pulse" style={{ background: "var(--mint)" }} />
            LIVE · {clock}
          </div>
        }
      />

      <div className="grid grid-cols-12 gap-5">
        {/* 风险仪表盘 */}
        <section className="col-span-12 lg:col-span-4">
          <div className="panel p-6 mb-5 text-center" style={{ background: "linear-gradient(160deg, var(--coral-soft), var(--amber-soft))" }}>
            <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-soft font-bold">RISK INDEX</div>
            <Gauge value={78} />
            <div className="numplate text-[40px] leading-none -mt-12" style={{ color: "var(--coral-deep)" }}>78</div>
            <div className="mt-1 font-mono text-[11px] uppercase tracking-[0.14em] font-bold text-coral-deep">
              DEFCON 2 · ADVISORY
            </div>
          </div>

          <div className="space-y-3">
            {[
              { k: "已拦截", v: stats.intercept.toLocaleString(), c: "var(--mint-deep)", Icon: Activity },
              { k: "已阻断", v: stats.block.toLocaleString(), c: "var(--coral)", Icon: ShieldOff },
              { k: "已上报", v: stats.escalate.toLocaleString(), c: "var(--amber-deep)", Icon: AlertTriangle },
            ].map((s) => (
              <div key={s.k} className="panel p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "var(--canvas-2)", color: s.c }}>
                  <s.Icon size={16} />
                </div>
                <div className="flex-1">
                  <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-soft font-bold">{s.k}</div>
                  <div className="numplate text-[22px]" style={{ color: s.c }}>{s.v}</div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* 告警事件 */}
        <section className="col-span-12 lg:col-span-4 panel p-6">
          <div className="mb-5">
            <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-soft font-bold">LIVE EVENTS</div>
            <h2 className="font-display text-[20px] font-extrabold mt-1">告警事件流</h2>
          </div>
          <div className="space-y-2">
            {EVENTS.map((e, i) => (
              <div key={i} className="flex items-start gap-3 p-3 rounded-2xl bg-canvas-2/60">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: e.level === "danger" ? "var(--coral-soft)" : e.level === "warn" ? "var(--amber-soft)" : "var(--indigo-soft)", color: e.level === "danger" ? "var(--coral-deep)" : e.level === "warn" ? "var(--amber-deep)" : "var(--indigo-deep)" }}>
                  <AlertOctagon size={14} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[11px] font-extrabold" style={{ color: e.level === "danger" ? "var(--coral-deep)" : e.level === "warn" ? "var(--amber-deep)" : "var(--indigo-deep)" }}>{e.verb}</span>
                    <span className="font-mono text-[11px] font-bold truncate">{e.phone}</span>
                  </div>
                  <div className="mt-0.5 text-[12px] text-ink-soft font-medium truncate">{e.reason}</div>
                </div>
                <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-soft font-bold">{e.ts}</span>
              </div>
            ))}
          </div>
        </section>

        {/* 高危地区 */}
        <section className="col-span-12 lg:col-span-4 panel p-6">
          <div className="mb-5">
            <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-soft font-bold">HIGH-RISK REGIONS</div>
            <h2 className="font-display text-[20px] font-extrabold mt-1">高危地区</h2>
          </div>
          <div className="space-y-3">
            {REGIONS.map((r) => (
              <div key={r.code}>
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <MapPin size={12} className="text-ink-soft" />
                    <span className="font-display text-[13px] font-extrabold">{r.name}</span>
                  </div>
                  <span className="font-mono text-[11px] font-bold">{r.count.toLocaleString()}</span>
                </div>
                <div className="h-2 rounded-full bg-canvas-2 overflow-hidden">
                  <div className="h-full rounded-full transition-all" style={{ width: `${r.share * 3}%`, background: r.share >= 20 ? "var(--coral)" : r.share >= 10 ? "var(--amber)" : "var(--indigo)" }} />
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </AppShell>
  );
}

function Gauge({ value }: { value: number }) {
  const r = 60;
  const c = 2 * Math.PI * r;
  return (
    <svg viewBox="0 0 160 100" className="w-full h-32 mx-auto">
      <circle cx="80" cy="80" r={r} fill="none" stroke="var(--canvas-2)" strokeWidth="14" strokeDasharray={`${c / 2} ${c}`} transform="rotate(180 80 80)" strokeLinecap="round" />
      <circle cx="80" cy="80" r={r} fill="none" stroke="var(--coral)" strokeWidth="14" strokeDasharray={`${(c / 2) * (value / 100)} ${c}`} transform="rotate(180 80 80)" strokeLinecap="round" />
    </svg>
  );
}
