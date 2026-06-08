"use client";
import { useState } from "react";
import AppShell from "@/components/AppShell";
import PageHeader from "@/components/shared/PageHeader";
import DataTable from "@/components/shared/DataTable";
import Modal from "@/components/shared/Modal";
import { useToast } from "@/components/shared/Toast";
import { useConfirm } from "@/components/shared/Confirm";
import { SYSADMIN_NAV } from "@/lib/nav";
import { type BlackEntry } from "@/lib/mock";
import { downloadBlob } from "@/lib/storage";
import { api, APIError } from "@/lib/api";
import { useResource } from "@/lib/use-resource";
import { ListRowSkeleton } from "@/components/shared/Skeleton";
import { Plus, Trash2, Edit3, Download, Send, FileX } from "lucide-react";

export default function SysBlacklistPage() {
  const toast = useToast();
  const confirm = useConfirm();
  const list = useResource<BlackEntry>(() => api.blacklist.list({ pageSize: 100, scope: "global" } as any));
  const [editing, setEditing] = useState<BlackEntry | null>(null);
  const [open, setOpen] = useState(false);

  const onSubmit = async (f: any) => {
    try {
      if (editing) {
        await api.blacklist.update(editing.id, {
          number: f.number, reason: f.reason, category: f.category, risk: Number(f.risk),
        });
        toast("success", "已更新");
      } else {
        await api.blacklist.create({
          number: f.number, reason: f.reason, category: f.category,
          risk: Number(f.risk), source: "云端",
          isGlobal: true,
        } as any);
        toast("success", "已下发全网", f.number);
      }
      setOpen(false);
      setEditing(null);
      list.refresh();
    } catch (e) {
      toast("error", e instanceof APIError ? e.message : "保存失败");
    }
  };

  const onDelete = async (id: string, number: string) => {
    const ok = await confirm({
      title: "从全网移除该号码？",
      desc: `「${number}」将从全网黑名单删除，所有租户、家庭端和企业端探针将不再拦截该号码。`,
      tone: "danger",
      confirmText: "移除",
    });
    if (!ok) return;
    try {
      await api.blacklist.remove(id);
      toast("success", "已移除", number);
      list.refresh();
    } catch (e) {
      toast("error", e instanceof APIError ? e.message : "删除失败");
    }
  };

  const onDispatch = async (id: string, number: string) => {
    const ok = await confirm({
      title: "全网下发该号码？",
      desc: `「${number}」将毫秒级下发到所有节点并全网生效。`,
      confirmText: "下发全网",
    });
    if (!ok) return;
    try {
      await api.blacklist.dispatch(id);
      toast("success", "已下发全网", number);
      list.refresh();
    } catch (e) {
      toast("error", e instanceof APIError ? e.message : "下发失败");
    }
  };

  const exportAll = async () => {
    try {
      const blob = await api.blacklist.exportCSV();
      const ab = await blob.arrayBuffer();
      downloadBlob(`global-blacklist-${Date.now()}.csv`, ab, "text/csv;charset=utf-8");
      toast("success", "已导出全网黑名单");
    } catch (e) {
      toast("error", e instanceof APIError ? e.message : "导出失败");
    }
  };

  return (
    <AppShell role="sysadmin" userName="陈安怡" nav={SYSADMIN_NAV} breadcrumb={["SENTINEL", "系统管理员", "黑名单总库"]}>
      <PageHeader
        eyebrow="GLOBAL BLACKLIST"
        title="构建黑名单信息库"
        desc="全网共享黑名单，添加后毫秒级下发到所有租户、家庭端和企业端探针。"
        actions={
          <>
            <button onClick={exportAll} className="btn-ghost py-2.5 px-4 text-[calc(13px*var(--fz))]"><Download size={14} /> 导出 CSV</button>
            <button onClick={() => { setEditing(null); setOpen(true); }} className="btn-indigo py-2.5 px-4 text-[calc(13px*var(--fz))]"><Plus size={14} /> 添加号段</button>
          </>
        }
      />

      <div className="panel p-6">
        {list.error && (
          <div className="mb-4 px-4 py-3 rounded-2xl text-[calc(13px*var(--fz))] font-medium"
               style={{ background: "var(--coral-soft)", color: "var(--coral-deep)", border: "1px solid var(--coral)" }}>
            {list.error}
          </div>
        )}
        {list.loading && list.items.length === 0 ? (
          <ListRowSkeleton count={6} />
        ) : list.items.length === 0 ? (
          <div className="panel p-12 flex flex-col items-center justify-center text-center">
            <FileX size={32} className="text-ink-ghost mb-3" />
            <div className="font-display text-[calc(15px*var(--fz))] font-extrabold">全网黑名单暂无号码</div>
            <div className="mt-1 font-mono text-[calc(11px*var(--fz))] uppercase tracking-[0.14em] text-ink-soft font-bold">NO BLACKLIST ENTRIES YET</div>
          </div>
        ) : (
        <DataTable<BlackEntry>
          rows={list.items}
          searchKeys={["number", "reason", "category"]}
          columns={[
            { key: "number", label: "号码", render: (r) => <span className="font-mono font-bold">{r.number}</span> },
            { key: "category", label: "类别", render: (r) => <span className="tag-chip" data-tone="coral">{r.category}</span> },
            { key: "reason", label: "原因" },
            { key: "risk", label: "风险分", align: "right", render: (r) => <span className="font-mono font-extrabold" style={{ color: r.risk >= 90 ? "var(--coral-deep)" : "var(--ink)" }}>{r.risk}</span> },
            {
              key: "source", label: "来源",
              render: (r) => (
                <span className="inline-flex items-center gap-1.5">
                  <span className="font-mono text-[calc(11px*var(--fz))] text-ink-soft font-bold">{r.source}</span>
                  {r.dispatched === false && (
                    <span className="font-mono text-[calc(9px*var(--fz))] uppercase tracking-[0.1em] px-1.5 py-0.5 rounded font-bold" style={{ background: "var(--amber-soft)", color: "var(--amber-deep)" }}>待下发</span>
                  )}
                </span>
              ),
            },
            { key: "createdAt", label: "下发时间", render: (r) => <span className="font-mono text-[calc(11px*var(--fz))] text-ink-soft font-bold">{r.createdAt}</span> },
          ]}
          actions={(r) => (
            <div className="flex items-center gap-1 justify-end">
              {r.dispatched === false && (
                <button onClick={() => onDispatch(r.id, r.number)} className="px-2.5 h-8 rounded-lg font-mono text-[calc(10px*var(--fz))] uppercase tracking-[0.1em] font-bold inline-flex items-center gap-1" style={{ background: "var(--mint-soft)", color: "var(--mint-deep)" }}><Send size={11} /> 下发</button>
              )}
              <button onClick={() => { setEditing(r); setOpen(true); }} className="w-8 h-8 rounded-lg hover:bg-canvas-2 flex items-center justify-center"><Edit3 size={13} /></button>
              <button onClick={() => onDelete(r.id, r.number)} className="w-8 h-8 rounded-lg hover:bg-coral-soft text-coral-deep flex items-center justify-center"><Trash2 size={13} /></button>
            </div>
          )}
        />
        )}
      </div>

      <Modal
        open={open}
        onClose={() => { setOpen(false); setEditing(null); }}
        title={editing ? "编辑号段" : "添加全网黑名单"}
        desc="保存后立即下发到所有节点"
        footer={
          <>
            <button onClick={() => { setOpen(false); setEditing(null); }} className="btn-ghost py-2 px-4 text-[calc(13px*var(--fz))]">取消</button>
            <button onClick={() => (document.getElementById("gb-form") as HTMLFormElement)?.requestSubmit()} className="btn-indigo py-2 px-4 text-[calc(13px*var(--fz))]">保存并下发</button>
          </>
        }
      >
        <GBForm editing={editing} onSubmit={onSubmit} />
      </Modal>
    </AppShell>
  );
}

function GBForm({ editing, onSubmit }: { editing: BlackEntry | null; onSubmit: (f: any) => void }) {
  const [f, setF] = useState<any>(editing ?? { number: "", reason: "", category: "AI合成", risk: 85 });
  return (
    <form id="gb-form" onSubmit={(e) => { e.preventDefault(); onSubmit(f); }} className="space-y-4">
      <Field label="号码"><input required value={f.number} onChange={(e) => setF({ ...f, number: e.target.value })} className="ipt" /></Field>
      <Field label="类别">
        <select value={f.category} onChange={(e) => setF({ ...f, category: e.target.value })} className="ipt">
          {["AI合成", "话术诈骗", "号码伪冒", "其他"].map((c) => <option key={c}>{c}</option>)}
        </select>
      </Field>
      <Field label="原因"><input value={f.reason} onChange={(e) => setF({ ...f, reason: e.target.value })} className="ipt" /></Field>
      <Field label="风险分"><input type="number" min={0} max={100} value={f.risk} onChange={(e) => setF({ ...f, risk: e.target.value })} className="ipt" /></Field>
      <style>{`.ipt{width:100%;padding:12px 14px;border-radius:14px;border:1px solid var(--border);background:var(--surface);font-size:13px;font-weight:500}.ipt:focus{outline:none;border-color:var(--indigo);box-shadow:0 0 0 3px color-mix(in srgb, var(--indigo) 18%, transparent)}`}</style>
    </form>
  );
}

function Field({ label, children }: any) {
  return (
    <div>
      <label className="font-mono text-[calc(10px*var(--fz))] uppercase tracking-[0.14em] text-ink-soft font-bold block mb-1.5">{label}</label>
      {children}
    </div>
  );
}
