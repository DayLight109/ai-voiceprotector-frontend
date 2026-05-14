"use client";
import { useState } from "react";
import AppShell from "@/components/AppShell";
import PageHeader from "@/components/shared/PageHeader";
import DataTable from "@/components/shared/DataTable";
import { useToast } from "@/components/shared/Toast";
import { BIZ_NAV } from "@/lib/nav";
import { SEED, type Appeal } from "@/lib/mock";
import { useLocalStorage, uid } from "@/lib/storage";
import { MessageSquareWarning, Flag, Clock, CheckCircle2, XCircle, Send } from "lucide-react";

type FormType = "误判申诉" | "号码举报";

export default function BizAppealPage() {
  const toast = useToast();
  const [list, setList] = useLocalStorage<Appeal[]>("biz.appeals", SEED.appeals);
  const [type, setType] = useState<FormType>("误判申诉");
  const [number, setNumber] = useState("");
  const [reason, setReason] = useState("");

  const submit = (ev: React.FormEvent) => {
    ev.preventDefault();
    if (!number.trim() || !reason.trim()) {
      toast("error", "信息不完整", "请填写号码与详情");
      return;
    }
    const entry: Appeal = {
      id: uid("ap"),
      type,
      number: number.trim(),
      reason: reason.trim(),
      status: "处理中",
      createdAt: new Date().toLocaleString("zh-CN"),
    };
    setList((p) => [entry, ...p]);
    toast("success", "已提交", `${type} #${entry.id.slice(-4)}`);
    setNumber("");
    setReason("");
  };

  const stats = {
    total: list.length,
    pending: list.filter((a) => a.status === "处理中").length,
    approved: list.filter((a) => a.status === "已通过").length,
    rejected: list.filter((a) => a.status === "已驳回").length,
  };

  return (
    <AppShell role="biz" userName="周珩" nav={BIZ_NAV} breadcrumb={["SENTINEL", "企业用户", "申诉与举报"]}>
      <PageHeader
        eyebrow="APPEAL & REPORT"
        title="诈骗反馈与申诉"
        desc="提交误判申诉将白名单加回正常号段；提交号码举报推动可疑号码进入云端黑名单库。"
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { k: "全部", v: stats.total, soft: "var(--indigo-soft)", fg: "var(--indigo-deep)" },
          { k: "处理中", v: stats.pending, soft: "var(--amber-soft)", fg: "var(--amber-deep)" },
          { k: "已通过", v: stats.approved, soft: "var(--mint-soft)", fg: "var(--mint-deep)" },
          { k: "已驳回", v: stats.rejected, soft: "var(--coral-soft)", fg: "var(--coral-deep)" },
        ].map((s) => (
          <div key={s.k} className="panel p-5">
            <div className="font-mono text-[10px] uppercase tracking-[0.14em] font-bold mb-2" style={{ color: s.fg }}>{s.k}</div>
            <div className="numplate text-[32px]" style={{ color: s.fg }}>{s.v}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-12 gap-5">
        <section className="col-span-12 lg:col-span-5 panel p-6">
          <div className="flex items-center gap-1 p-1 rounded-full bg-canvas-2 border border-border mb-5">
            {(["误判申诉", "号码举报"] as FormType[]).map((t) => {
              const active = type === t;
              return (
                <button key={t} onClick={() => setType(t)} className="flex-1 flex items-center justify-center gap-2 py-2 rounded-full text-[12px] font-bold transition-colors" style={{ background: active ? "var(--surface)" : "transparent", color: active ? "var(--ink)" : "var(--ink-soft)", boxShadow: active ? "var(--shadow-sm)" : "none" }}>
                  {t === "误判申诉" ? <MessageSquareWarning size={12} /> : <Flag size={12} />}
                  {t}
                </button>
              );
            })}
          </div>

          <form onSubmit={submit} className="space-y-4">
            <Field label="号码">
              <input value={number} onChange={(e) => setNumber(e.target.value)} className="ipt" placeholder={type === "误判申诉" ? "被误判的号码" : "可疑号码"} />
            </Field>
            <Field label="详情说明">
              <textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={6} className="ipt" placeholder={type === "误判申诉" ? "请说明该号码的实际用途、被误判原因…" : "请描述发生的诈骗手法、对方话术、是否有录音证据…"} />
            </Field>
            {type === "号码举报" && (
              <div className="p-3 rounded-2xl text-[12px]" style={{ background: "var(--amber-soft)", color: "var(--amber-deep)" }}>
                若已造成损失，请同时拨打反诈专线 96110。
              </div>
            )}
            <button type="submit" className="btn-indigo w-full justify-center py-3 text-[14px]" style={{ width: "100%" }}>
              <Send size={14} /> 提交{type}
            </button>
          </form>

          <style>{`
            .ipt { width: 100%; padding: 12px 14px; border-radius: 14px; border: 1px solid var(--border); background: var(--surface); font-size: 13px; font-weight: 500; }
            .ipt:focus { outline: none; border-color: var(--indigo); box-shadow: 0 0 0 3px color-mix(in srgb, var(--indigo) 18%, transparent); }
          `}</style>
        </section>

        <section className="col-span-12 lg:col-span-7 panel p-6">
          <div className="mb-4">
            <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-soft font-bold">HISTORY</div>
            <h2 className="font-display text-[20px] font-extrabold mt-1">历史申诉与举报</h2>
          </div>
          <DataTable<Appeal>
            rows={list}
            searchKeys={["number", "reason", "type"]}
            columns={[
              { key: "type", label: "类型", render: (r) => <span className="tag-chip" data-tone={r.type === "误判申诉" ? "indigo" : "coral"}>{r.type}</span> },
              { key: "number", label: "号码", render: (r) => <span className="font-mono font-bold">{r.number}</span> },
              { key: "reason", label: "说明", render: (r) => <span className="text-ink-2 line-clamp-1">{r.reason}</span> },
              { key: "status", label: "状态", render: (r) => <StatusPill status={r.status} /> },
              { key: "createdAt", label: "时间", render: (r) => <span className="font-mono text-[11px] text-ink-soft font-bold">{r.createdAt}</span> },
            ]}
          />
        </section>
      </div>
    </AppShell>
  );
}

function StatusPill({ status }: { status: Appeal["status"] }) {
  const map = {
    "处理中": { Icon: Clock, soft: "var(--amber-soft)", fg: "var(--amber-deep)" },
    "已通过": { Icon: CheckCircle2, soft: "var(--mint-soft)", fg: "var(--mint-deep)" },
    "已驳回": { Icon: XCircle, soft: "var(--coral-soft)", fg: "var(--coral-deep)" },
  } as const;
  const m = map[status];
  return (
    <span className="font-mono text-[10px] uppercase tracking-[0.14em] px-2 py-1 rounded-full font-bold inline-flex items-center gap-1" style={{ background: m.soft, color: m.fg }}>
      <m.Icon size={10} />
      {status}
    </span>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-soft font-bold block mb-1.5">{label}</label>
      {children}
    </div>
  );
}
