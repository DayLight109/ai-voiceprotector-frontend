"use client";
import { useState } from "react";
import AppShell from "@/components/AppShell";
import PageHeader from "@/components/shared/PageHeader";
import DataTable from "@/components/shared/DataTable";
import UploadZone from "@/components/shared/UploadZone";
import Modal from "@/components/shared/Modal";
import { useToast } from "@/components/shared/Toast";
import { FAMILY_ADMIN_NAV, ADMIN_NAV } from "@/lib/nav";
import { type BlackEntry } from "@/lib/mock";
import { downloadBlob } from "@/lib/storage";
import { APIError } from "@/lib/api";
import { useHybridBlacklist } from "@/lib/blacklist-store";
import { Plus, Trash2, Edit3, Database, FileSpreadsheet, Download, Cloud, Send } from "lucide-react";

export default function BlacklistAdminPage({ role }: { role: "family-admin" | "admin" }) {
  const isFam = role === "family-admin";
  const toast = useToast();
  const list = useHybridBlacklist();
  const [editing, setEditing] = useState<BlackEntry | null>(null);
  const [open, setOpen] = useState(false);
  const [uploads, setUploads] = useState<{ name: string; size: number; lines: number }[]>([]);

  const onSubmit = async (form: any) => {
    try {
      if (editing) {
        await list.update(editing.id, {
          number: form.number, reason: form.reason, category: form.category, risk: Number(form.risk),
        });
        toast("success", "已更新");
      } else {
        await list.create({
          number: form.number, reason: form.reason, category: form.category,
          risk: Number(form.risk),
        });
        toast("success", "已新增", form.number);
      }
      setOpen(false);
      setEditing(null);
    } catch (e) {
      toast("error", e instanceof APIError ? e.message : "保存失败");
    }
  };

  const onUpload = async (files: { name: string; size: number; lines: number }[]) => {
    setUploads((p) => [...p, ...files]);
    const extra: Partial<BlackEntry>[] = files.flatMap((f) =>
      Array.from({ length: Math.min(4, Math.max(2, Math.floor(f.lines / 10))) }).map(() => ({
        number: `+86 ${String(Math.floor(Math.random() * 900) + 100)} ${String(Math.floor(Math.random() * 9000) + 1000)} ${String(Math.floor(Math.random() * 9000) + 1000)}`,
        reason: `从 ${f.name} 导入`,
        category: "其他" as const,
        risk: 70 + Math.floor(Math.random() * 25),
        source: "手动" as const,
      }))
    );
    try {
      const res = await list.importMany(extra);
      toast("success", `已导入 ${files.length} 个文件`, `合计 ${res.imported} 条`);
    } catch (e) {
      toast("error", e instanceof APIError ? e.message : "导入失败");
    }
  };

  const exportCsv = async () => {    try {
      const header = "号码,类别,原因,风险分,来源,创建时间\n";
      const rows = [...list.tenant, ...list.global]
        .map((r) => [r.number, r.category, r.reason, r.risk, r.source, r.createdAt]
          .map((v) => `"${String(v).replace(/"/g, '""')}"`).join(","))
        .join("\n");
      downloadBlob(`blacklist-${Date.now()}.csv`, "﻿" + header + rows, "text/csv;charset=utf-8");
      toast("success", "已导出 CSV");
    } catch (e) {
      toast("error", e instanceof APIError ? e.message : "导出失败");
    }
  };

  const onDispatch = async (r: BlackEntry) => {
    try {
      await list.dispatch(r.id);
      toast("success", "已下发", `${r.number} 已在本组织生效`);
    } catch (e) {
      toast("error", e instanceof APIError ? e.message : "下发失败");
    }
  };

  return (
    <AppShell
      role={role}
      userName="李梦楠"
      nav={isFam ? FAMILY_ADMIN_NAV : ADMIN_NAV}
      breadcrumb={["SENTINEL", isFam ? "家庭管理员" : "企业管理员", "私有黑名单库"]}
    >
      <PageHeader
        eyebrow="PRIVATE BLACKLIST"
        title="私有黑名单库"
        desc="支持手动 CRUD 与 XLS / XLSX / CSV 批量导入，所有数据落入本组织专属命名空间。"
        actions={
          <>
            <button onClick={exportCsv} className="btn-ghost py-2.5 px-4 text-[13px]"><Download size={14} /> 导出 CSV</button>
            <button onClick={() => { setEditing(null); setOpen(true); }} className="btn-indigo py-2.5 px-4 text-[13px]"><Plus size={14} /> 新增条目</button>
          </>
        }
      />

      <div className="grid grid-cols-12 gap-5">
        <div className="col-span-12 lg:col-span-8 space-y-5">
          <div className="panel p-6">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: "var(--canvas-2)", color: "var(--ink)" }}>
                <Database size={14} />
              </div>
              <div className="font-display text-[15px] font-extrabold">本地缓存（本组织私有，{list.tenant.length} 条）</div>
            </div>
            <DataTable<BlackEntry>
              rows={list.tenant}
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
                      <span className="font-mono text-[11px] text-ink-soft font-bold">{r.source}</span>
                      {r.dispatched === false && (
                        <span className="font-mono text-[9px] uppercase tracking-[0.1em] px-1.5 py-0.5 rounded font-bold" style={{ background: "var(--amber-soft)", color: "var(--amber-deep)" }}>待下发</span>
                      )}
                    </span>
                  ),
                },
              ]}
              actions={(r) => (
                <div className="flex items-center gap-1 justify-end">
                  {r.dispatched === false && (
                    <button onClick={() => onDispatch(r)} className="px-2.5 h-8 rounded-lg font-mono text-[10px] uppercase tracking-[0.1em] font-bold inline-flex items-center gap-1" style={{ background: "var(--mint-soft)", color: "var(--mint-deep)" }}><Send size={11} /> 下发</button>
                  )}
                  <button onClick={() => { setEditing(r); setOpen(true); }} className="w-8 h-8 rounded-lg hover:bg-canvas-2 flex items-center justify-center"><Edit3 size={13} /></button>
                  <button onClick={async () => { try { await list.remove(r.id); toast("success", "已删除"); } catch (e) { toast("error", e instanceof APIError ? e.message : "删除失败"); } }} className="w-8 h-8 rounded-lg hover:bg-coral-soft text-coral-deep flex items-center justify-center"><Trash2 size={13} /></button>
                </div>
              )}
            />
          </div>

          {list.global.length > 0 && (
            <div className="panel p-6" style={{ borderColor: "var(--indigo-soft)" }}>
              <div className="flex items-center gap-2 mb-1">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: "var(--indigo-soft)", color: "var(--indigo-deep)" }}>
                  <Cloud size={14} />
                </div>
                <div className="font-display text-[15px] font-extrabold">云端同步（系统管理员下发，{list.global.length} 条）</div>
              </div>
              <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-soft font-bold mb-3 ml-11">READ ONLY · 由平台统一维护，不可编辑</div>
              <DataTable<BlackEntry>
                rows={list.global}
                searchKeys={["number", "reason", "category"]}
                columns={[
                  { key: "number", label: "号码", render: (r) => <span className="font-mono font-bold">{r.number}</span> },
                  { key: "category", label: "类别", render: (r) => <span className="tag-chip" data-tone="indigo">{r.category}</span> },
                  { key: "reason", label: "原因" },
                  { key: "risk", label: "风险分", align: "right", render: (r) => <span className="font-mono font-extrabold" style={{ color: r.risk >= 90 ? "var(--coral-deep)" : "var(--ink)" }}>{r.risk}</span> },
                ]}
              />
            </div>
          )}
        </div>

        <aside className="col-span-12 lg:col-span-4 space-y-4">
          <div className="panel p-6">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: "var(--indigo-soft)", color: "var(--indigo-deep)" }}>
                <FileSpreadsheet size={14} />
              </div>
              <div className="font-display text-[15px] font-extrabold">上传附件</div>
            </div>
            <UploadZone onFiles={onUpload} />
            {uploads.length > 0 && (
              <div className="mt-4 space-y-2">
                {uploads.map((f, i) => (
                  <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-canvas-2 text-[12px]">
                    <div className="flex items-center gap-2 min-w-0">
                      <FileSpreadsheet size={14} className="text-ink-soft shrink-0" />
                      <span className="truncate font-mono font-bold">{f.name}</span>
                    </div>
                    <span className="font-mono text-[11px] font-bold text-mint-deep">解析 {f.lines} 行</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="panel p-6" style={{ background: "var(--amber-soft)" }}>
            <div className="font-mono text-[10px] uppercase tracking-[0.14em] font-bold text-amber-deep mb-1">FORMAT</div>
            <div className="text-[12px] font-semibold text-amber-deep leading-[1.7]">
              文件头要求：<code className="font-mono">号码 | 类别 | 原因 | 风险分</code>，单文件 ≤ 5MB。
            </div>
          </div>
        </aside>
      </div>

      <Modal
        open={open}
        onClose={() => { setOpen(false); setEditing(null); }}
        title={editing ? "编辑黑名单" : "新增黑名单"}
        footer={
          <>
            <button onClick={() => { setOpen(false); setEditing(null); }} className="btn-ghost py-2 px-4 text-[13px]">取消</button>
            <button onClick={() => (document.getElementById("bl-form") as HTMLFormElement)?.requestSubmit()} className="btn-indigo py-2 px-4 text-[13px]">保存</button>
          </>
        }
      >
        <BLForm editing={editing} onSubmit={onSubmit} />
      </Modal>
    </AppShell>
  );
}

function BLForm({ editing, onSubmit }: { editing: BlackEntry | null; onSubmit: (f: any) => void }) {
  const [f, setF] = useState<any>(editing ?? { number: "", reason: "", category: "AI合成", risk: 80 });
  return (
    <form id="bl-form" onSubmit={(e) => { e.preventDefault(); onSubmit(f); }} className="space-y-4">
      <Field label="号码"><input required value={f.number} onChange={(e) => setF({ ...f, number: e.target.value })} className="ipt" /></Field>
      <Field label="类别">
        <select value={f.category} onChange={(e) => setF({ ...f, category: e.target.value })} className="ipt">
          {["AI合成", "话术诈骗", "号码伪冒", "其他"].map((c) => <option key={c}>{c}</option>)}
        </select>
      </Field>
      <Field label="原因"><input value={f.reason} onChange={(e) => setF({ ...f, reason: e.target.value })} className="ipt" /></Field>
      <Field label="风险分（0-100）"><input type="number" min={0} max={100} value={f.risk} onChange={(e) => setF({ ...f, risk: e.target.value })} className="ipt" /></Field>
      <style>{`.ipt{width:100%;padding:12px 14px;border-radius:14px;border:1px solid var(--border);background:var(--surface);font-size:13px;font-weight:500}.ipt:focus{outline:none;border-color:var(--indigo);box-shadow:0 0 0 3px color-mix(in srgb, var(--indigo) 18%, transparent)}`}</style>
    </form>
  );
}

function Field({ label, children }: any) {
  return (
    <div>
      <label className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-soft font-bold block mb-1.5">{label}</label>
      {children}
    </div>
  );
}
