"use client";
import { useState } from "react";
import AppShell from "@/components/AppShell";
import PageHeader from "@/components/shared/PageHeader";
import DataTable from "@/components/shared/DataTable";
import UploadZone, { type UploadedFile } from "@/components/shared/UploadZone";
import Modal from "@/components/shared/Modal";
import { useToast } from "@/components/shared/Toast";
import { useConfirm } from "@/components/shared/Confirm";
import { FAMILY_ADMIN_NAV, ADMIN_NAV } from "@/lib/nav";
import { type BlackEntry } from "@/lib/domain-types";
import { downloadBlob } from "@/lib/storage";
import { APIError } from "@/lib/api";
import { useHybridBlacklist } from "@/lib/blacklist-store";
import { Plus, Trash2, Edit3, Database, FileSpreadsheet, Download, Cloud, Send } from "lucide-react";

type UploadRecord = { name: string; size: number; rows: number };

export default function BlacklistAdminPage({ role }: { role: "family-admin" | "admin" }) {
  const isFam = role === "family-admin";
  const toast = useToast();
  const confirm = useConfirm();
  const list = useHybridBlacklist();
  const [editing, setEditing] = useState<BlackEntry | null>(null);
  const [open, setOpen] = useState(false);
  const [uploads, setUploads] = useState<UploadRecord[]>([]);

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

  const onUpload = async (files: UploadedFile[]) => {
    const parsed: UploadRecord[] = [];
    const extra: Partial<BlackEntry>[] = [];

    for (const f of files) {
      if (!/\.(csv|txt)$/i.test(f.name)) {
        toast("error", "仅支持 CSV/TXT 导入", f.name);
        continue;
      }
      try {
        const rows = parseBlacklistCSV(await f.file.text());
        parsed.push({ name: f.name, size: f.size, rows: rows.length });
        extra.push(...rows);
      } catch (e) {
        toast("error", "导入文件解析失败", e instanceof Error ? e.message : f.name);
      }
    }

    if (parsed.length > 0) setUploads((p) => [...p, ...parsed]);
    if (extra.length === 0) {
      toast("error", "没有可导入的有效黑名单条目");
      return;
    }

    try {
      const res = await list.importMany(extra);
      toast("success", `已导入 ${parsed.length} 个文件`, `合计 ${res.imported} 条，跳过 ${res.skipped} 条`);
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
    const ok = await confirm({
      title: "下发该条目？",
      desc: `「${r.number}」将在本组织正式生效，所辖设备的来电拦截将据此执行。`,
      confirmText: "下发",
    });
    if (!ok) return;
    try {
      await list.dispatch(r.id);
      toast("success", "已下发", `${r.number} 已在本组织生效`);
    } catch (e) {
      toast("error", e instanceof APIError ? e.message : "下发失败");
    }
  };

  const onRemove = async (r: BlackEntry) => {
    const ok = await confirm({
      title: "删除黑名单条目？",
      desc: `将从本组织黑名单库移除「${r.number}」。`,
      tone: "danger",
      confirmText: "删除",
    });
    if (!ok) return;
    try {
      await list.remove(r.id);
      toast("success", "已删除");
    } catch (e) {
      toast("error", e instanceof APIError ? e.message : "删除失败");
    }
  };

  return (
    <AppShell
      role={role}
      nav={isFam ? FAMILY_ADMIN_NAV : ADMIN_NAV}
      breadcrumb={["SENTINEL", isFam ? "家庭管理员" : "企业管理员", "私有黑名单库"]}
    >
      <PageHeader
        eyebrow="PRIVATE BLACKLIST"
        title="私有黑名单库"
        desc="支持手动 CRUD 与 CSV 批量导入，所有数据落入本组织专属命名空间。"
        actions={
          <>
            <button onClick={exportCsv} className="btn-ghost py-2.5 px-4 text-[calc(13px*var(--fz))]"><Download size={14} /> 导出 CSV</button>
            <button onClick={() => { setEditing(null); setOpen(true); }} className="btn-indigo py-2.5 px-4 text-[calc(13px*var(--fz))]"><Plus size={14} /> 新增条目</button>
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
              <div className="font-display text-[calc(15px*var(--fz))] font-extrabold">本地缓存（本组织私有，{list.tenant.length} 条）</div>
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
                      <span className="font-mono text-[calc(11px*var(--fz))] text-ink-soft font-bold">{r.source}</span>
                      {r.dispatched === false && (
                        <span className="font-mono text-[calc(9px*var(--fz))] uppercase tracking-[0.1em] px-1.5 py-0.5 rounded font-bold" style={{ background: "var(--amber-soft)", color: "var(--amber-deep)" }}>待下发</span>
                      )}
                    </span>
                  ),
                },
              ]}
              actions={(r) => (
                <div className="flex items-center gap-1 justify-end">
                  {r.dispatched === false && (
                    <button onClick={() => onDispatch(r)} className="px-2.5 h-8 rounded-lg font-mono text-[calc(10px*var(--fz))] uppercase tracking-[0.1em] font-bold inline-flex items-center gap-1" style={{ background: "var(--mint-soft)", color: "var(--mint-deep)" }}><Send size={11} /> 下发</button>
                  )}
                  <button onClick={() => { setEditing(r); setOpen(true); }} className="w-8 h-8 rounded-lg hover:bg-canvas-2 flex items-center justify-center"><Edit3 size={13} /></button>
                  <button onClick={() => onRemove(r)} className="w-8 h-8 rounded-lg hover:bg-coral-soft text-coral-deep flex items-center justify-center"><Trash2 size={13} /></button>
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
                <div className="font-display text-[calc(15px*var(--fz))] font-extrabold">云端同步（系统管理员下发，{list.global.length} 条）</div>
              </div>
              <div className="font-mono text-[calc(10px*var(--fz))] uppercase tracking-[0.14em] text-ink-soft font-bold mb-3 ml-11">READ ONLY · 由平台统一维护，不可编辑</div>
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
              <div className="font-display text-[calc(15px*var(--fz))] font-extrabold">上传附件</div>
            </div>
            <UploadZone
              accept=".csv,.txt,text/csv,text/plain"
              hint="支持 CSV / TXT，表头包含：号码、类别、原因、风险分、来源"
              onFiles={onUpload}
            />
            {uploads.length > 0 && (
              <div className="mt-4 space-y-2">
                {uploads.map((f, i) => (
                  <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-canvas-2 text-[calc(12px*var(--fz))]">
                    <div className="flex items-center gap-2 min-w-0">
                      <FileSpreadsheet size={14} className="text-ink-soft shrink-0" />
                      <span className="truncate font-mono font-bold">{f.name}</span>
                    </div>
                    <span className="font-mono text-[calc(11px*var(--fz))] font-bold text-mint-deep">解析 {f.rows} 行</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="panel p-6" style={{ background: "var(--amber-soft)" }}>
            <div className="font-mono text-[calc(10px*var(--fz))] uppercase tracking-[0.14em] font-bold text-amber-deep mb-1">FORMAT</div>
            <div className="text-[calc(12px*var(--fz))] font-semibold text-amber-deep leading-[1.7]">
              文件头要求：<code className="font-mono">号码 | 类别 | 原因 | 风险分 | 来源</code>，单文件 ≤ 5MB。
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
            <button onClick={() => { setOpen(false); setEditing(null); }} className="btn-ghost py-2 px-4 text-[calc(13px*var(--fz))]">取消</button>
            <button onClick={() => (document.getElementById("bl-form") as HTMLFormElement)?.requestSubmit()} className="btn-indigo py-2 px-4 text-[calc(13px*var(--fz))]">保存</button>
          </>
        }
      >
        <BLForm editing={editing} onSubmit={onSubmit} />
      </Modal>
    </AppShell>
  );
}

const CATEGORY_SET: BlackEntry["category"][] = ["AI合成", "话术诈骗", "号码伪冒", "其他"];
const SOURCE_SET: BlackEntry["source"][] = ["本地", "云端", "手动", "举报"];

const HEADER_ALIASES: Record<string, string> = {
  number: "number",
  phone: "number",
  tel: "number",
  mobile: "number",
  "号码": "number",
  "手机号": "number",
  "电话": "number",
  category: "category",
  type: "category",
  "类别": "category",
  "类型": "category",
  reason: "reason",
  "原因": "reason",
  "说明": "reason",
  risk: "risk",
  score: "risk",
  "风险分": "risk",
  "风险分数": "risk",
  source: "source",
  "来源": "source",
};

function parseBlacklistCSV(text: string): Partial<BlackEntry>[] {
  const table = parseCSV(text.replace(/^\uFEFF/, ""));
  if (table.length < 2) return [];

  const headers = table[0].map((h) => HEADER_ALIASES[h.trim().toLowerCase()] ?? HEADER_ALIASES[h.trim()] ?? h.trim());
  const numberIdx = headers.indexOf("number");
  if (numberIdx < 0) throw new Error("缺少「号码」表头");
  if (headers.indexOf("risk") < 0) throw new Error("缺少「风险分」表头");

  const rows: Partial<BlackEntry>[] = [];
  for (const cols of table.slice(1)) {
    if (cols.every((v) => !v.trim())) continue;
    const get = (key: string) => {
      const idx = headers.indexOf(key);
      return idx >= 0 ? (cols[idx] ?? "").trim() : "";
    };

    const number = get("number").replace(/\s+/g, " ");
    if (!number) continue;

    const category = normalizeCategory(get("category"));
    const risk = normalizeRisk(get("risk"));
    if (risk === null) continue;
    const source = normalizeSource(get("source"));
    rows.push({
      number,
      category,
      reason: get("reason") || "CSV导入",
      risk,
      source,
    });
  }
  return rows;
}

function parseCSV(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    const next = text[i + 1];
    if (quoted) {
      if (ch === '"' && next === '"') {
        cell += '"';
        i++;
      } else if (ch === '"') {
        quoted = false;
      } else {
        cell += ch;
      }
      continue;
    }
    if (ch === '"') quoted = true;
    else if (ch === ",") {
      row.push(cell);
      cell = "";
    } else if (ch === "\n") {
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
    } else if (ch !== "\r") {
      cell += ch;
    }
  }

  row.push(cell);
  if (row.some((v) => v.trim())) rows.push(row);
  return rows;
}

function normalizeCategory(value: string): BlackEntry["category"] {
  return CATEGORY_SET.includes(value as BlackEntry["category"]) ? (value as BlackEntry["category"]) : "其他";
}

function normalizeSource(value: string): BlackEntry["source"] {
  return SOURCE_SET.includes(value as BlackEntry["source"]) ? (value as BlackEntry["source"]) : "手动";
}

function normalizeRisk(value: string): number | null {
  const n = Number(value);
  if (!Number.isFinite(n)) return null;
  return Math.max(0, Math.min(100, Math.round(n)));
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
      <label className="font-mono text-[calc(10px*var(--fz))] uppercase tracking-[0.14em] text-ink-soft font-bold block mb-1.5">{label}</label>
      {children}
    </div>
  );
}
