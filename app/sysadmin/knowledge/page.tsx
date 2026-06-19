"use client";
import { useState } from "react";
import AppShell from "@/components/AppShell";
import PageHeader from "@/components/shared/PageHeader";
import DataTable from "@/components/shared/DataTable";
import Modal from "@/components/shared/Modal";
import { useToast } from "@/components/shared/Toast";
import { useConfirm } from "@/components/shared/Confirm";
import { SYSADMIN_NAV } from "@/lib/nav";
import { type KnowledgeArticle } from "@/lib/domain-types";
import { api, APIError } from "@/lib/api";
import { useResource } from "@/lib/use-resource";
import { ListRowSkeleton } from "@/components/shared/Skeleton";
import { Plus, Trash2, Edit3, BookMarked } from "lucide-react";

export default function SysKnowledgePage() {
  const toast = useToast();
  const confirm = useConfirm();
  const list = useResource<KnowledgeArticle>(() => api.knowledge.list({ pageSize: 100 }));
  const [editing, setEditing] = useState<KnowledgeArticle | null>(null);
  const [open, setOpen] = useState(false);

  const onSubmit = async (f: any) => {
    try {
      if (editing) {
        await api.knowledge.update(editing.id, {
          title: f.title, category: f.category, summary: f.summary, body: f.body,
        });
        toast("success", "已更新");
      } else {
        await api.knowledge.create({
          title: f.title, category: f.category, summary: f.summary, body: f.body,
        });
        toast("success", "已发布");
      }
      setOpen(false);
      setEditing(null);
      list.refresh();
    } catch (e) {
      toast("error", e instanceof APIError ? e.message : "保存失败");
    }
  };

  const onDelete = async (r: KnowledgeArticle) => {
    const ok = await confirm({
      title: "删除文章？",
      desc: `将下架「${r.title}」，所有用户的知识库页面将不再显示该文章。`,
      tone: "danger",
      confirmText: "删除",
    });
    if (!ok) return;
    try {
      await api.knowledge.remove(r.id);
      toast("success", "已删除");
      list.refresh();
    } catch (e) {
      toast("error", e instanceof APIError ? e.message : "删除失败");
    }
  };

  return (
    <AppShell role="sysadmin" nav={SYSADMIN_NAV} breadcrumb={["SENTINEL", "系统管理员", "反诈知识库"]}>
      <PageHeader
        eyebrow="KNOWLEDGE BASE"
        title="构建反诈知识库"
        desc="对外发布的反诈科普内容，发布即同步给所有家庭 / 企业用户的知识库页面。"
        actions={
          <button onClick={() => { setEditing(null); setOpen(true); }} className="btn-indigo py-2.5 px-4 text-[calc(13px*var(--fz))]">
            <Plus size={14} /> 新增文章
          </button>
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
            <BookMarked size={32} className="text-ink-ghost mb-3" />
            <div className="font-display text-[calc(15px*var(--fz))] font-extrabold">知识库还没有文章</div>
            <div className="mt-1 font-mono text-[calc(11px*var(--fz))] uppercase tracking-[0.14em] text-ink-soft font-bold">NO KNOWLEDGE ARTICLES YET</div>
          </div>
        ) : (
          <DataTable<KnowledgeArticle>
            rows={list.items}
            searchKeys={["title", "summary", "category"]}
            columns={[
              { key: "title", label: "标题", render: (r) => <span className="font-display font-extrabold">{r.title}</span> },
              { key: "category", label: "分类", render: (r) => <span className="tag-chip" data-tone="indigo">{r.category}</span> },
              { key: "views", label: "阅读量", align: "right", render: (r) => <span className="font-mono font-bold">{r.views.toLocaleString()}</span> },
              { key: "updatedAt", label: "更新时间", render: (r) => <span className="font-mono text-[calc(11px*var(--fz))] text-ink-soft font-bold">{r.updatedAt}</span> },
            ]}
            actions={(r) => (
              <div className="flex items-center gap-1 justify-end">
                <button onClick={() => { setEditing(r); setOpen(true); }} className="w-8 h-8 rounded-lg hover:bg-canvas-2 flex items-center justify-center"><Edit3 size={13} /></button>
                <button onClick={() => onDelete(r)} className="w-8 h-8 rounded-lg hover:bg-coral-soft text-coral-deep flex items-center justify-center"><Trash2 size={13} /></button>
              </div>
            )}
          />
        )}
      </div>

      <Modal
        open={open}
        onClose={() => { setOpen(false); setEditing(null); }}
        title={editing ? "编辑文章" : "发布新文章"}
        size="lg"
        footer={
          <>
            <button onClick={() => { setOpen(false); setEditing(null); }} className="btn-ghost py-2 px-4 text-[calc(13px*var(--fz))]">取消</button>
            <button onClick={() => (document.getElementById("k-form") as HTMLFormElement)?.requestSubmit()} className="btn-indigo py-2 px-4 text-[calc(13px*var(--fz))]">保存</button>
          </>
        }
      >
        <KForm editing={editing} onSubmit={onSubmit} />
      </Modal>
    </AppShell>
  );
}

function KForm({ editing, onSubmit }: { editing: KnowledgeArticle | null; onSubmit: (f: any) => void }) {
  const [f, setF] = useState<any>(editing ?? { title: "", category: "AI合成", summary: "", body: "" });
  return (
    <form id="k-form" onSubmit={(e) => { e.preventDefault(); onSubmit(f); }} className="space-y-4">
      <Field label="标题"><input required value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} className="ipt" /></Field>
      <Field label="分类">
        <select value={f.category} onChange={(e) => setF({ ...f, category: e.target.value })} className="ipt">
          {["AI合成", "公检法冒充", "刷单返利", "投资理财", "情感诈骗", "贷款代办"].map((c) => <option key={c}>{c}</option>)}
        </select>
      </Field>
      <Field label="摘要"><input value={f.summary} onChange={(e) => setF({ ...f, summary: e.target.value })} className="ipt" /></Field>
      <Field label="正文"><textarea value={f.body} onChange={(e) => setF({ ...f, body: e.target.value })} rows={8} className="ipt" /></Field>
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


