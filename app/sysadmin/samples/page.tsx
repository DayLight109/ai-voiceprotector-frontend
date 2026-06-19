"use client";
import { useState } from "react";
import AppShell from "@/components/AppShell";
import PageHeader from "@/components/shared/PageHeader";
import Modal from "@/components/shared/Modal";
import { useToast } from "@/components/shared/Toast";
import { useConfirm } from "@/components/shared/Confirm";
import { SYSADMIN_NAV } from "@/lib/nav";
import { type ScamSample } from "@/lib/domain-types";
import { downloadBlob } from "@/lib/storage";
import { api, APIError } from "@/lib/api";
import { useResource } from "@/lib/use-resource";
import { CardGridSkeleton } from "@/components/shared/Skeleton";
import { FlaskConical, FileDown, Sparkles, CheckCircle2, XCircle, Eye, Inbox } from "lucide-react";

export default function SamplesPage() {
  const toast = useToast();
  const confirm = useConfirm();
  const list = useResource<ScamSample>(() => api.samples.list({ pageSize: 100 }));
  const [active, setActive] = useState<ScamSample | null>(null);

  const exportWord = async (s: ScamSample) => {
    try {
      const blob = await api.samples.exportDoc(s.id);
      const ab = await blob.arrayBuffer();
      downloadBlob(`${s.callId}.doc`, ab, "application/msword");
      toast("success", "已导出 Word", s.callId);
    } catch (e) {
      toast("error", e instanceof APIError ? e.message : "导出失败");
    }
  };

  const analyze = async (s: ScamSample) => {
    try {
      const result = await api.samples.analyze(s.id);
      toast("success", "样本已分析", result?.classification || "");
      list.refresh();
    } catch (e) {
      toast("error", e instanceof APIError ? e.message : "分析失败");
    }
  };

  const reject = async (s: ScamSample) => {
    const ok = await confirm({
      title: "驳回该样本？",
      desc: `将驳回 ${s.callId}，该样本不会进入规则库与知识库。`,
      tone: "danger",
      confirmText: "驳回",
    });
    if (!ok) return;
    try {
      await api.samples.reject(s.id);
      toast("info", "已驳回");
      list.refresh();
    } catch (e) {
      toast("error", e instanceof APIError ? e.message : "驳回失败");
    }
  };

  return (
    <AppShell role="sysadmin" nav={SYSADMIN_NAV} breadcrumb={["SENTINEL", "系统管理员", "样本审核"]}>
      <PageHeader
        eyebrow="SAMPLE REVIEW"
        title="审核诈骗样本"
        desc="查看用户上报的诈骗通话样本，确认后自动更新判别规则库与反诈知识库。"
      />

      {list.loading && list.items.length === 0 ? (
        <CardGridSkeleton count={4} cols="grid-cols-1 md:grid-cols-2" lines={3} />
      ) : list.items.length === 0 ? (
        <div className="panel p-12 flex flex-col items-center justify-center text-center">
          <Inbox size={32} className="text-ink-ghost mb-3" />
          <div className="font-display text-[calc(15px*var(--fz))] font-extrabold">暂无待审核样本</div>
          <div className="mt-1 font-mono text-[calc(11px*var(--fz))] uppercase tracking-[0.14em] text-ink-soft font-bold">NO SAMPLES</div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {list.items.map((s) => (
          <div key={s.id} className="panel panel-lift p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="font-mono text-[calc(10px*var(--fz))] uppercase tracking-[0.14em] font-bold" style={{ color: "var(--ink-soft)" }}>
                {s.callId}
              </span>
              <StatusPill status={s.status} />
            </div>
            <div className="flex items-center gap-2 mb-2">
              <span className="tag-chip" data-tone="coral">{s.classification}</span>
              <span className="font-mono text-[calc(10px*var(--fz))] uppercase tracking-[0.14em] text-ink-soft font-bold">{s.origin}</span>
            </div>
            <p className="font-mono text-[calc(12px*var(--fz))] leading-[1.7] text-ink-2 font-medium line-clamp-3 mb-4 p-3 rounded-xl bg-canvas-2">
              {s.transcript}
            </p>
            <div className="flex items-center justify-between font-mono text-[calc(10px*var(--fz))] text-ink-soft font-bold">
              <span>{s.duration} · {s.receivedAt}</span>
              <div className="flex items-center gap-2">
                <button onClick={() => setActive(s)} className="px-3 py-1.5 rounded-full bg-canvas-2 hover:bg-canvas-3 text-[calc(11px*var(--fz))]">
                  <Eye size={11} className="inline mr-1" /> 查看
                </button>
                <button onClick={() => exportWord(s)} className="px-3 py-1.5 rounded-full bg-indigo-soft text-indigo-deep hover:opacity-90 text-[calc(11px*var(--fz))]">
                  <FileDown size={11} className="inline mr-1" /> Word
                </button>
              </div>
            </div>
            <div className="mt-3 flex items-center gap-2">
              <button onClick={() => analyze(s)} disabled={s.status === "已审核"} className="flex-1 btn-indigo justify-center py-2 text-[calc(12px*var(--fz))] disabled:opacity-50">
                <Sparkles size={12} /> 分析并更新规则库
              </button>
              <button onClick={() => reject(s)} disabled={s.status === "已驳回"} className="btn-ghost py-2 px-3 text-[calc(12px*var(--fz))] disabled:opacity-50">
                驳回
              </button>
            </div>
          </div>
          ))}
        </div>
      )}

      <Modal open={!!active} onClose={() => setActive(null)} title={active ? `${active.callId} · 完整转写` : ""} size="lg">
        {active && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <Mini label="时长">{active.duration}</Mini>
              <Mini label="来源">{active.origin}</Mini>
              <Mini label="分类">{active.classification}</Mini>
              <Mini label="状态"><StatusPill status={active.status} /></Mini>
            </div>
            <div className="panel p-5">
              <div className="font-mono text-[calc(10px*var(--fz))] uppercase tracking-[0.14em] text-ink-soft font-bold mb-2">TRANSCRIPT</div>
              <p className="font-mono text-[calc(13px*var(--fz))] leading-[1.85] text-ink-2 font-medium whitespace-pre-line">{active.transcript}</p>
            </div>
            <div className="flex justify-end gap-2">
              <button onClick={() => exportWord(active)} className="btn-ghost py-2 px-4 text-[calc(13px*var(--fz))]"><FileDown size={13} /> 导出 Word</button>
              <button onClick={() => { analyze(active); setActive(null); }} className="btn-indigo py-2 px-4 text-[calc(13px*var(--fz))]"><Sparkles size={13} /> 自动学习</button>
            </div>
          </div>
        )}
      </Modal>
    </AppShell>
  );
}

function StatusPill({ status }: { status: ScamSample["status"] }) {
  const m: any = {
    "待审核": { bg: "var(--amber-soft)", fg: "var(--amber-deep)", Icon: FlaskConical },
    "已审核": { bg: "var(--mint-soft)", fg: "var(--mint-deep)", Icon: CheckCircle2 },
    "已驳回": { bg: "var(--coral-soft)", fg: "var(--coral-deep)", Icon: XCircle },
  };
  const x = m[status];
  return (
    <span className="font-mono text-[calc(10px*var(--fz))] uppercase tracking-[0.14em] px-2 py-1 rounded-full font-bold inline-flex items-center gap-1" style={{ background: x.bg, color: x.fg }}>
      <x.Icon size={10} />
      {status}
    </span>
  );
}

function Mini({ label, children }: any) {
  return (
    <div className="p-3 rounded-2xl bg-canvas-2">
      <div className="font-mono text-[calc(10px*var(--fz))] uppercase tracking-[0.14em] text-ink-soft font-bold">{label}</div>
      <div className="mt-1 text-[calc(13px*var(--fz))]">{children}</div>
    </div>
  );
}


