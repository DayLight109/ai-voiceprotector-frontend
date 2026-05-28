"use client";
import { useState } from "react";
import AppShell from "@/components/AppShell";
import PageHeader from "@/components/shared/PageHeader";
import DataTable from "@/components/shared/DataTable";
import Modal from "@/components/shared/Modal";
import FormRow from "@/components/shared/FormRow";
import Toggle from "@/components/shared/Toggle";
import { BIZ_NAV } from "@/lib/nav";
import { type CallLog } from "@/lib/mock";
import { useLocalStorage } from "@/lib/storage";
import { api } from "@/lib/api";
import { useResource } from "@/lib/use-resource";
import { PhoneCall, ShieldAlert, Eye, Heart } from "lucide-react";

export default function BizCallsPage() {
  const list = useResource<CallLog>(() => api.calls.list({ pageSize: 100 }));
  const [autoBlockHigh, setAutoBlockHigh] = useLocalStorage("biz.autoBlockHigh", true);
  const [careMode, setCareMode] = useLocalStorage("biz.careMode", false);
  const [active, setActive] = useState<CallLog | null>(null);

  return (
    <AppShell role="biz" userName="周珩" nav={BIZ_NAV} breadcrumb={["SENTINEL", "企业用户", "通话记录"]}>
      <PageHeader
        eyebrow="CALL HISTORY"
        title="通话记录"
        desc="查看历史拦截详情，调整高危拦截策略与关怀模式。"
      />

      <div className="grid grid-cols-12 gap-5 mb-6">
        <div className="col-span-12 lg:col-span-8">
          <div className="panel p-6">
            <DataTable<CallLog>
              rows={list.items}
              searchKeys={["phone", "region", "reason"]}
              columns={[
                { key: "phone", label: "号码", render: (r) => <span className="font-mono font-bold">{r.phone}</span> },
                { key: "region", label: "归属" },
                { key: "duration", label: "时长", align: "right", render: (r) => <span className="font-mono">{r.duration}</span> },
                { key: "verdict", label: "判决", render: (r) => <VerdictPill v={r.verdict} /> },
                { key: "createdAt", label: "时间", render: (r) => <span className="font-mono text-[11px] text-ink-soft font-bold">{r.createdAt}</span> },
              ]}
              actions={(r) => (
                <button onClick={() => setActive(r)} className="font-mono text-[11px] font-bold text-indigo-deep hover:underline px-2">详情</button>
              )}
            />
          </div>
        </div>
        <aside className="col-span-12 lg:col-span-4 space-y-4">
          <div className="panel p-6">
            <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-soft font-bold mb-2">STRATEGY</div>
            <div className="font-display text-[16px] font-extrabold mb-2">通话策略</div>
            <FormRow label="拦截高危来电" desc="风险分 ≥ 85 自动挂断">
              <Toggle checked={autoBlockHigh} onChange={setAutoBlockHigh} />
            </FormRow>
            <FormRow label="关怀模式" desc="将告警同步推送至客户经理">
              <Toggle checked={careMode} onChange={setCareMode} />
            </FormRow>
          </div>
          <div className="panel p-6" style={{ background: "var(--indigo-soft)" }}>
            <div className="flex items-center gap-2 mb-2">
              <Heart size={14} style={{ color: "var(--indigo-deep)" }} />
              <span className="font-display text-[14px] font-extrabold" style={{ color: "var(--indigo-deep)" }}>关怀模式说明</span>
            </div>
            <div className="text-[12px] font-medium leading-[1.7]" style={{ color: "var(--indigo-deep)" }}>
              针对老年客户或脆弱群体，强制拦截 + 同步家属并启用大字模式语音播报。
            </div>
          </div>
        </aside>
      </div>

      <Modal open={!!active} onClose={() => setActive(null)} title={active ? `通话详情 · ${active.phone}` : ""} size="lg">
        {active && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <Mini label="号码"><span className="font-mono font-bold">{active.phone}</span></Mini>
              <Mini label="归属">{active.region}</Mini>
              <Mini label="时长"><span className="font-mono">{active.duration}</span></Mini>
              <Mini label="时间"><span className="font-mono text-[11px]">{active.createdAt}</span></Mini>
            </div>
            <div className="panel p-5">
              <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-soft font-bold mb-2">VERDICT</div>
              <div className="flex items-center gap-3">
                <VerdictPill v={active.verdict} />
                <span className="text-[14px] font-medium text-ink-2">{active.reason}</span>
              </div>
            </div>
            <div className="panel p-5">
              <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-soft font-bold mb-3">ENGINE BREAKDOWN</div>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { k: "L1 溯源", v: active.verdict === "拦截" ? "异常 86" : "正常 12" },
                  { k: "L2 声纹", v: active.verdict === "拦截" ? "SYNTH 92" : "HUMAN 18" },
                  { k: "L3 话术", v: active.verdict === "拦截" ? "命中 96" : "未命中 8" },
                ].map((e) => (
                  <div key={e.k} className="p-3 rounded-2xl bg-canvas-2">
                    <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-soft font-bold">{e.k}</div>
                    <div className="mt-1 numplate text-[18px]">{e.v}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </Modal>
    </AppShell>
  );
}

function VerdictPill({ v }: { v: CallLog["verdict"] }) {
  const map = {
    "拦截": { soft: "var(--coral-soft)", fg: "var(--coral-deep)" },
    "预警": { soft: "var(--amber-soft)", fg: "var(--amber-deep)" },
    "通过": { soft: "var(--mint-soft)", fg: "var(--mint-deep)" },
  };
  const m = map[v];
  return (
    <span className="font-mono text-[10px] uppercase tracking-[0.14em] px-2 py-1 rounded-full font-bold" style={{ background: m.soft, color: m.fg }}>
      {v}
    </span>
  );
}

function Mini({ label, children }: any) {
  return (
    <div className="p-3 rounded-2xl bg-canvas-2">
      <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-soft font-bold">{label}</div>
      <div className="mt-1 text-[13px]">{children}</div>
    </div>
  );
}
