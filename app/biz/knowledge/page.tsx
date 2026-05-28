"use client";
import { useMemo, useState } from "react";
import AppShell from "@/components/AppShell";
import PageHeader from "@/components/shared/PageHeader";
import { BIZ_NAV } from "@/lib/nav";
import { type KnowledgeArticle } from "@/lib/mock";
import { api } from "@/lib/api";
import { useResource } from "@/lib/use-resource";
import { Search, BookOpen, Clock, Eye, ArrowRight } from "lucide-react";

const CATS = ["全部", "AI合成", "公检法冒充", "刷单返利", "投资理财", "情感诈骗", "贷款代办"] as const;

export default function BizKnowledgePage() {
  const articles = useResource<KnowledgeArticle>(() => api.knowledge.list({ pageSize: 100 }));
  const [cat, setCat] = useState<(typeof CATS)[number]>("全部");
  const [q, setQ] = useState("");
  const [active, setActive] = useState<KnowledgeArticle | null>(null);

  const list = useMemo(() => articles.items.filter((a) => {
    const passCat = cat === "全部" || a.category === cat;
    const passQ = !q.trim() || (a.title + a.summary).toLowerCase().includes(q.toLowerCase());
    return passCat && passQ;
  }), [articles.items, cat, q]);

  return (
    <AppShell role="biz" userName="周珩" nav={BIZ_NAV} breadcrumb={["SENTINEL", "企业用户", "反诈知识库"]}>
      <PageHeader
        eyebrow="ENTERPRISE KNOWLEDGE"
        title="反诈知识库"
        desc="面向客服 / 风控团队的最新诈骗案例与拦截策略参考资料。"
      />

      {articles.error && (
        <div className="mb-4 px-4 py-3 rounded-2xl text-[13px] font-medium"
             style={{ background: "var(--coral-soft)", color: "var(--coral-deep)", border: "1px solid var(--coral)" }}>
          {articles.error}
        </div>
      )}

      <div className="mb-6 flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 px-3 py-2 rounded-full bg-canvas-2 border border-border w-72">
          <Search size={14} className="text-ink-soft" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="搜索关键字、骗局类型…" className="flex-1 bg-transparent text-[13px] font-medium placeholder:text-ink-ghost focus:outline-none" />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {CATS.map((c) => {
            const active = c === cat;
            return (
              <button key={c} onClick={() => setCat(c)} className="px-3 py-1.5 rounded-full text-[12px] font-bold transition-colors" style={{ background: active ? "var(--indigo)" : "var(--surface)", color: active ? "#fff" : "var(--ink-2)", border: active ? "none" : "1px solid var(--border)" }}>
                {c}
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-12 gap-5">
        <div className="col-span-12 lg:col-span-7 space-y-3">
          {list.length === 0 && <div className="panel p-10 text-center text-ink-soft">没有匹配的文章</div>}
          {list.map((a) => (
            <button key={a.id} onClick={() => setActive(a)} className="panel panel-lift p-5 w-full text-left flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0" style={{ background: "var(--indigo-soft)", color: "var(--indigo-deep)" }}>
                <BookOpen size={20} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="tag-chip" data-tone="indigo">{a.category}</span>
                  <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-soft font-bold"><Clock size={10} className="inline mr-1" />{a.updatedAt}</span>
                </div>
                <div className="font-display text-[16px] font-extrabold truncate">{a.title}</div>
                <div className="mt-1 text-[13px] text-ink-soft font-medium line-clamp-2">{a.summary}</div>
                <div className="mt-2 font-mono text-[10px] uppercase tracking-[0.14em] text-ink-soft font-bold flex items-center gap-1">
                  <Eye size={10} /> {a.views.toLocaleString()} 阅读
                </div>
              </div>
              <ArrowRight size={16} className="text-ink-soft mt-2 shrink-0" />
            </button>
          ))}
        </div>

        <div className="col-span-12 lg:col-span-5">
          <div className="panel p-6 sticky top-24">
            {active ? (
              <>
                <span className="tag-chip" data-tone="coral">{active.category}</span>
                <h2 className="mt-3 font-display text-[22px] font-extrabold tracking-tight leading-[1.25]">{active.title}</h2>
                <div className="mt-2 font-mono text-[10px] uppercase tracking-[0.14em] text-ink-soft font-bold flex items-center gap-3">
                  <span>{active.updatedAt}</span><span>·</span><span>{active.views.toLocaleString()} 阅读</span>
                </div>
                <div className="my-5 h-px bg-border" />
                <p className="text-[14px] leading-[1.85] text-ink-2 font-medium whitespace-pre-line">{active.body}</p>
              </>
            ) : (
              <div className="text-center py-16">
                <BookOpen size={36} className="mx-auto text-ink-ghost mb-3" />
                <div className="font-display text-[15px] font-extrabold">从左侧选一篇文章</div>
              </div>
            )}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
