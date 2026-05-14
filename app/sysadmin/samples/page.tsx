"use client";
import { useState } from "react";
import AppShell from "@/components/AppShell";
import PageHeader from "@/components/shared/PageHeader";
import Modal from "@/components/shared/Modal";
import { useToast } from "@/components/shared/Toast";
import { SYSADMIN_NAV } from "@/lib/nav";
import { SEED, type ScamSample } from "@/lib/mock";
import { useLocalStorage, downloadBlob } from "@/lib/storage";
import { FlaskConical, FileDown, Sparkles, CheckCircle2, XCircle, Eye } from "lucide-react";

export default function SamplesPage() {
  const toast = useToast();
  const [list, setList] = useLocalStorage<ScamSample[]>("sys.samples", SEED.samples);
  const [active, setActive] = useState<ScamSample | null>(null);

  const exportWord = (s: ScamSample) => {
    const html = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">
      <head><meta charset="utf-8"><title>诈骗样本 · ${s.callId}</title></head>
      <body style="font-family:'Microsoft YaHei',sans-serif;">
        <h2>诈骗样本 · ${s.callId}</h2>
        <table border="1" cellpadding="8" cellspacing="0" style="border-collapse:collapse;width:100%">
          <tr><td><b>来源地区</b></td><td>${s.origin}</td></tr>
          <tr><td><b>时长</b></td><td>${s.duration}</td></tr>
          <tr><td><b>类型分类</b></td><td>${s.classification}</td></tr>
          <tr><td><b>审核状态</b></td><td>${s.status}</td></tr>
          <tr><td><b>接收时间</b></td><td>${s.receivedAt}</td></tr>
        </table>
        <h3>通话文字转写</h3>
        <p>${s.transcript}</p>
      </body></html>`;
    downloadBlob(`${s.callId}.doc`, html, "application/msword");
    toast("success", "已导出 Word", s.callId);
  };

  const analyze = (s: ScamSample) => {
    toast("success", "样本已分析", "话术规则库 + 反诈知识库已自动追加 2 条");
    setList((p) => p.map((x) => (x.id === s.id ? { ...x, status: "已审核" } : x)));
  };

  const reject = (s: ScamSample) => {
    setList((p) => p.map((x) => (x.id === s.id ? { ...x, status: "已驳回" } : x)));
    toast("info", "已驳回");
  };

  return (
    <AppShell role="sysadmin" userName="陈安怡" nav={SYSADMIN_NAV} breadcrumb={["SENTINEL", "系统管理员", "样本审核"]}>
      <PageHeader
        eyebrow="SAMPLE REVIEW"
        title="审核诈骗样本"
        desc="查看用户上报的诈骗通话样本，确认后自动更新判别规则库与反诈知识库。"
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {list.map((s) => (
          <div key={s.id} className="panel panel-lift p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="font-mono text-[10px] uppercase tracking-[0.14em] font-bold" style={{ color: "var(--ink-soft)" }}>
                {s.callId}
              </span>
              <StatusPill status={s.status} />
            </div>
            <div className="flex items-center gap-2 mb-2">
              <span className="tag-chip" data-tone="coral">{s.classification}</span>
              <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-soft font-bold">{s.origin}</span>
            </div>
            <p className="font-mono text-[12px] leading-[1.7] text-ink-2 font-medium line-clamp-3 mb-4 p-3 rounded-xl bg-canvas-2">
              {s.transcript}
            </p>
            <div className="flex items-center justify-between font-mono text-[10px] text-ink-soft font-bold">
              <span>{s.duration} · {s.receivedAt}</span>
              <div className="flex items-center gap-2">
                <button onClick={() => setActive(s)} className="px-3 py-1.5 rounded-full bg-canvas-2 hover:bg-canvas-3 text-[11px]">
                  <Eye size={11} className="inline mr-1" /> 查看
                </button>
                <button onClick={() => exportWord(s)} className="px-3 py-1.5 rounded-full bg-indigo-soft text-indigo-deep hover:opacity-90 text-[11px]">
                  <FileDown size={11} className="inline mr-1" /> Word
                </button>
              </div>
            </div>
            <div className="mt-3 flex items-center gap-2">
              <button onClick={() => analyze(s)} disabled={s.status === "已审核"} className="flex-1 btn-indigo justify-center py-2 text-[12px] disabled:opacity-50">
                <Sparkles size={12} /> 分析并更新规则库
              </button>
              <button onClick={() => reject(s)} disabled={s.status === "已驳回"} className="btn-ghost py-2 px-3 text-[12px] disabled:opacity-50">
                驳回
              </button>
            </div>
          </div>
        ))}
      </div>

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
              <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-soft font-bold mb-2">TRANSCRIPT</div>
              <p className="font-mono text-[13px] leading-[1.85] text-ink-2 font-medium whitespace-pre-line">{active.transcript}</p>
            </div>
            <div className="flex justify-end gap-2">
              <button onClick={() => exportWord(active)} className="btn-ghost py-2 px-4 text-[13px]"><FileDown size={13} /> 导出 Word</button>
              <button onClick={() => { analyze(active); setActive(null); }} className="btn-indigo py-2 px-4 text-[13px]"><Sparkles size={13} /> 自动学习</button>
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
    <span className="font-mono text-[10px] uppercase tracking-[0.14em] px-2 py-1 rounded-full font-bold inline-flex items-center gap-1" style={{ background: x.bg, color: x.fg }}>
      <x.Icon size={10} />
      {status}
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
