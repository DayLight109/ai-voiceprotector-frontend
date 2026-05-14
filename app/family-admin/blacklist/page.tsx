"use client";
import { useState } from "react";
import AppShell from "@/components/AppShell";
import PageHeader from "@/components/shared/PageHeader";
import DataTable from "@/components/shared/DataTable";
import UploadZone from "@/components/shared/UploadZone";
import Modal from "@/components/shared/Modal";
import { useToast } from "@/components/shared/Toast";
import { FAMILY_ADMIN_NAV, ADMIN_NAV } from "@/lib/nav";
import { SEED, type BlackEntry } from "@/lib/mock";
import { useLocalStorage, uid, downloadBlob } from "@/lib/storage";
import { Plus, Trash2, Edit3, Database, FileSpreadsheet, Download } from "lucide-react";

export default function FamilyBlacklistPage() {
  return <BlacklistAdminPage role="family-admin" />;
}

export function BlacklistAdminPage({ role }: { role: "family-admin" | "admin" }) {
  const isFam = role === "family-admin";
  const toast = useToast();
  const [list, setList] = useLocalStorage<BlackEntry[]>(isFam ? "family.blacklist" : "admin.blacklist", SEED.blacklist);
  const [editing, setEditing] = useState<BlackEntry | null>(null);
  const [open, setOpen] = useState(false);
  const [uploads, setUploads] = useState<{ name: string; size: number; lines: number }[]>([]);

  const onSubmit = (form: any) => {
    if (editing) {
      setList((p) => p.map((x) => (x.id === editing.id ? { ...editing, ...form, risk: Number(form.risk) } : x)));
      toast("success", "已更新");
    } else {
      const entry: BlackEntry = { id: uid("b"), number: form.number, reason: form.reason, category: form.category, risk: Number(form.risk), source: "手动", createdAt: new Date().toLocaleString("zh-CN") };
      setList((p) => [entry, ...p]);
      toast("success", "已新增", form.number);
    }
    setOpen(false);
    setEditing(null);
  };

  const onUpload = (files: { name: string; size: number; lines: number }[]) => {
    setUploads((p) => [...p, ...files]);
    const extra: BlackEntry[] = files.flatMap((f) =>
      Array.from({ length: Math.min(4, Math.max(2, Math.floor(f.lines / 10))) }).map((_, i) => ({
        id: uid("b"),
        number: `+86 ${String(Math.floor(Math.random() * 900) + 100)} ${String(Math.floor(Math.random() * 9000) + 1000)} ${String(Math.floor(Math.random() * 9000) + 1000)}`,
        reason: `从 ${f.name} 导入`,
        category: "其他" as const,
        risk: 70 + Math.floor(Math.random() * 25),
        source: "手动" as const,
        createdAt: new Date().toLocaleString("zh-CN"),
      }))
    );
    setList((p) => [...extra, ...p]);
    toast("success", `已导入 ${files.length} 个文件`, `合计 ${extra.length} 条`);
  };

  const exportCsv = () => {
    const head = "号码,类别,原因,风险分,来源,时间\n";
    const body = list.map((r) => `${r.number},${r.category},${r.reason},${r.risk},${r.source},${r.createdAt}`).join("\n");
    downloadBlob(`blacklist-${Date.now()}.csv`, "﻿" + head + body, "text/csv;charset=utf-8");
    toast("success", "已导出 CSV");
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
        <div className="col-span-12 lg:col-span-8 panel p-6">
          <DataTable<BlackEntry>
            rows={list}
            searchKeys={["number", "reason", "category"]}
            columns={[
              { key: "number", label: "号码", render: (r) => <span className="font-mono font-bold">{r.number}</span> },
              { key: "category", label: "类别", render: (r) => <span className="tag-chip" data-tone="coral">{r.category}</span> },
              { key: "reason", label: "原因" },
              { key: "risk", label: "风险分", align: "right", render: (r) => <span className="font-mono font-extrabold" style={{ color: r.risk >= 90 ? "var(--coral-deep)" : "var(--ink)" }}>{r.risk}</span> },
              { key: "source", label: "来源", render: (r) => <span className="font-mono text-[11px] text-ink-soft font-bold">{r.source}</span> },
            ]}
            actions={(r) => (
              <div className="flex items-center gap-1 justify-end">
                <button onClick={() => { setEditing(r); setOpen(true); }} className="w-8 h-8 rounded-lg hover:bg-canvas-2 flex items-center justify-center"><Edit3 size={13} /></button>
                <button onClick={() => { setList((p) => p.filter((x) => x.id !== r.id)); toast("success", "已删除"); }} className="w-8 h-8 rounded-lg hover:bg-coral-soft text-coral-deep flex items-center justify-center"><Trash2 size={13} /></button>
              </div>
            )}
          />
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
