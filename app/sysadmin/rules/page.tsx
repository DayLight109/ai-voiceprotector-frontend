"use client";
import { useMemo, useState } from "react";
import AppShell from "@/components/AppShell";
import PageHeader from "@/components/shared/PageHeader";
import DataTable from "@/components/shared/DataTable";
import Modal from "@/components/shared/Modal";
import Toggle from "@/components/shared/Toggle";
import { useToast } from "@/components/shared/Toast";
import { SYSADMIN_NAV } from "@/lib/nav";
import { SEED, type ScamRule } from "@/lib/mock";
import { useLocalStorage, uid } from "@/lib/storage";
import { Plus, Trash2, Edit3, ScrollText } from "lucide-react";

const CATS = ["全部", "切断外部联系", "制造紧迫感", "引导转账", "假冒权威", "索要敏感信息"] as const;

export default function RulesPage() {
  const toast = useToast();
  const [rules, setRules] = useLocalStorage<ScamRule[]>("sys.rules", SEED.rules);
  const [cat, setCat] = useState<(typeof CATS)[number]>("全部");
  const [editing, setEditing] = useState<ScamRule | null>(null);
  const [open, setOpen] = useState(false);

  const view = useMemo(() => cat === "全部" ? rules : rules.filter((r) => r.category === cat), [rules, cat]);

  const onSubmit = (form: any) => {
    if (editing) {
      setRules((p) => p.map((r) => (r.id === editing.id ? { ...editing, ...form, weight: Number(form.weight) } : r)));
      toast("success", "已更新规则");
    } else {
      const entry: ScamRule = { id: uid("r"), category: form.category, keyword: form.keyword, weight: Number(form.weight), enabled: true };
      setRules((p) => [entry, ...p]);
      toast("success", "已新增规则", form.keyword);
    }
    setOpen(false);
    setEditing(null);
  };

  return (
    <AppShell role="sysadmin" userName="陈安怡" nav={SYSADMIN_NAV} breadcrumb={["SENTINEL", "系统管理员", "诈骗规则库"]}>
      <PageHeader
        eyebrow="SCAM RULES"
        title="构建判定诈骗规则库"
        desc="维护 5 大类话术关键词与权重。规则下发至所有租户、家庭端实时生效。"
        actions={
          <button onClick={() => { setEditing(null); setOpen(true); }} className="btn-indigo py-2.5 px-4 text-[13px]">
            <Plus size={14} /> 新增关键词
          </button>
        }
      />

      <div className="mb-6 flex flex-wrap items-center gap-2">
        {CATS.map((c) => {
          const active = c === cat;
          return (
            <button key={c} onClick={() => setCat(c)} className="px-3 py-1.5 rounded-full text-[12px] font-bold transition-colors" style={{ background: active ? "var(--indigo)" : "var(--surface)", color: active ? "#fff" : "var(--ink-2)", border: active ? "none" : "1px solid var(--border)" }}>
              {c}
              <span className="ml-1.5 opacity-70">{c === "全部" ? rules.length : rules.filter((r) => r.category === c).length}</span>
            </button>
          );
        })}
      </div>

      <div className="panel p-6">
        <DataTable<ScamRule>
          rows={view}
          searchKeys={["keyword", "category"]}
          columns={[
            { key: "keyword", label: "关键词", render: (r) => <span className="font-mono font-bold">{r.keyword}</span> },
            { key: "category", label: "类别", render: (r) => <span className="tag-chip" data-tone="indigo">{r.category}</span> },
            { key: "weight", label: "权重", align: "right", render: (r) => <span className="font-mono font-extrabold" style={{ color: r.weight >= 85 ? "var(--coral-deep)" : "var(--ink)" }}>{r.weight}</span> },
            {
              key: "enabled", label: "状态", render: (r) => (
                <Toggle checked={r.enabled} onChange={(v) => setRules((p) => p.map((x) => (x.id === r.id ? { ...x, enabled: v } : x)))} />
              )
            },
          ]}
          actions={(r) => (
            <div className="flex items-center gap-1 justify-end">
              <button onClick={() => { setEditing(r); setOpen(true); }} className="w-8 h-8 rounded-lg hover:bg-canvas-2 flex items-center justify-center"><Edit3 size={13} /></button>
              <button onClick={() => { setRules((p) => p.filter((x) => x.id !== r.id)); toast("success", "已删除"); }} className="w-8 h-8 rounded-lg hover:bg-coral-soft text-coral-deep flex items-center justify-center"><Trash2 size={13} /></button>
            </div>
          )}
        />
      </div>

      <Modal
        open={open}
        onClose={() => { setOpen(false); setEditing(null); }}
        title={editing ? "编辑规则" : "新增规则"}
        footer={
          <>
            <button onClick={() => { setOpen(false); setEditing(null); }} className="btn-ghost py-2 px-4 text-[13px]">取消</button>
            <button onClick={() => (document.getElementById("rule-form") as HTMLFormElement)?.requestSubmit()} className="btn-indigo py-2 px-4 text-[13px]">保存</button>
          </>
        }
      >
        <RuleForm editing={editing} onSubmit={onSubmit} />
      </Modal>
    </AppShell>
  );
}

function RuleForm({ editing, onSubmit }: { editing: ScamRule | null; onSubmit: (f: any) => void }) {
  const [f, setF] = useState<any>(editing ?? { category: "引导转账", keyword: "", weight: 80 });
  return (
    <form id="rule-form" onSubmit={(e) => { e.preventDefault(); onSubmit(f); }} className="space-y-4">
      <Field label="类别">
        <select value={f.category} onChange={(e) => setF({ ...f, category: e.target.value })} className="ipt">
          {CATS.filter((c) => c !== "全部").map((c) => <option key={c}>{c}</option>)}
        </select>
      </Field>
      <Field label="关键词"><input required value={f.keyword} onChange={(e) => setF({ ...f, keyword: e.target.value })} className="ipt" placeholder="如：安全账户" /></Field>
      <Field label="权重（0-100）"><input type="number" min={0} max={100} value={f.weight} onChange={(e) => setF({ ...f, weight: e.target.value })} className="ipt" /></Field>
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
