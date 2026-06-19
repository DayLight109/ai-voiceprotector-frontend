"use client";
import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import AppShell from "@/components/AppShell";
import PageHeader from "@/components/shared/PageHeader";
import DataTable from "@/components/shared/DataTable";
import Modal from "@/components/shared/Modal";
import { useToast } from "@/components/shared/Toast";
import { FAMILY_NAV } from "@/lib/nav";
import { type BlackEntry, type WhiteEntry } from "@/lib/domain-types";
import { api, APIError } from "@/lib/api";
import { useResource } from "@/lib/use-resource";
import { useHybridBlacklist } from "@/lib/blacklist-store";
import { ListRowSkeleton } from "@/components/shared/Skeleton";
import { Plus, Trash2, Edit3, ShieldOff, ShieldCheck, ArrowDownAZ, Cloud, HardDrive, ScanLine, Inbox } from "lucide-react";

type Tab = "blacklist" | "whitelist";

export default function ProtectionPage() {
  return (
    <Suspense fallback={null}>
      <ProtectionInner />
    </Suspense>
  );
}

function ProtectionInner() {
  const toast = useToast();
  const params = useSearchParams();
  const [tab, setTab] = useState<Tab>("blacklist");
  const blist = useHybridBlacklist();
  const wlist = useResource<WhiteEntry>(() => api.whitelist.list({ pageSize: 100 }));
  const [sortByRisk, setSortByRisk] = useState(true);
  const [scanMode, setScanMode] = useState<"local" | "cloud">("local");
  const [editing, setEditing] = useState<BlackEntry | WhiteEntry | null>(null);
  const [showAdd, setShowAdd] = useState(false);

  useEffect(() => {
    const t = params.get("tab");
    if (t === "whitelist" || t === "blacklist") setTab(t);
    if (params.get("add") === "1") {
      setEditing(null);
      setShowAdd(true);
    }
  }, [params]);

  // 云端模式不允许停在白名单 tab（白名单只属于家庭本地）
  useEffect(() => {
    if (scanMode === "cloud" && tab === "whitelist") setTab("blacklist");
  }, [scanMode, tab]);

  const blackRows = useMemo(
    () => (scanMode === "cloud" ? blist.global : blist.tenant),
    [scanMode, blist.global, blist.tenant],
  );
  const blistView = useMemo(() => {
    const s = [...blackRows];
    if (sortByRisk) s.sort((a, b) => b.risk - a.risk);
    return s;
  }, [blackRows, sortByRisk]);

  const onSave = async (form: any) => {
    try {
      if (tab === "blacklist") {
        if (editing && "risk" in editing) {
          await blist.update(editing.id, {
            number: form.number, reason: form.reason, category: form.category, risk: Number(form.risk),
          });
          toast("success", "已更新", `黑名单条目 ${form.number}`);
        } else {
          await blist.create({
            number: form.number, reason: form.reason, category: form.category,
            risk: Number(form.risk),
          });
          toast("success", "已添加到黑名单", form.number);
        }
      } else {
        if (editing && "relation" in editing) {
          await api.whitelist.update(editing.id, {
            number: form.number, name: form.name, relation: form.relation,
          });
          toast("success", "已更新", `白名单条目 ${form.number}`);
        } else {
          await api.whitelist.create({
            number: form.number, name: form.name, relation: form.relation,
          } as any);
          toast("success", "已添加到白名单", form.number);
        }
        wlist.refresh();
      }
      setShowAdd(false);
      setEditing(null);
    } catch (e) {
      if (e instanceof APIError && e.code === "WHITELIST_DUPLICATE") {
        toast("error", "号码重复", e.message || "该号码已在白名单");
      } else if (e instanceof APIError && e.code === "AUTH_REQUIRED") {
        toast("error", "请先登录后再添加");
      } else {
        toast("error", e instanceof APIError ? e.message : "操作失败");
      }
    }
  };

  const onDelete = async (id: string) => {
    try {
      if (tab === "blacklist") {
        await blist.remove(id);
        toast("success", "已删除黑名单条目");
      } else {
        await api.whitelist.remove(id);
        toast("success", "已删除白名单条目");
        wlist.refresh();
      }
    } catch (e) {
      toast("error", e instanceof APIError ? e.message : "操作失败");
    }
  };

  return (
    <AppShell role="family" nav={FAMILY_NAV} breadcrumb={["SENTINEL", "家庭用户", "实时安全防护"]}>
      <PageHeader
        eyebrow="REAL-TIME PROTECTION"
        title="实时安全防护"
        desc="本地 + 云端黑名单实时匹配来电号码，命中即触发自动拦截 / 警示 / 通话内容分析。"
      />

      {/* 设置区 */}
      <div className="stagger grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="panel p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="font-mono text-[calc(10px*var(--fz))] uppercase tracking-[0.14em] text-ink-soft font-bold">扫描匹配源</div>
            <ScanLine size={14} className="text-ink-soft" />
          </div>
          <div className="relative flex items-center gap-2 p-1 rounded-full bg-canvas-2 border border-border">
            <span
              aria-hidden
              className="pointer-events-none absolute rounded-full"
              style={{
                top: 4,
                bottom: 4,
                left: 4,
                width: "calc(50% - 8px)",
                background: "var(--surface)",
                boxShadow: "var(--shadow-sm)",
                transform: scanMode === "cloud" ? "translateX(calc(100% + 8px))" : "translateX(0)",
                transition: "transform 380ms cubic-bezier(0.22, 1, 0.36, 1)",
              }}
            />
            {[
              { k: "local", label: "本地", icon: HardDrive },
              { k: "cloud", label: "云端", icon: Cloud },
            ].map((o) => {
              const active = scanMode === o.k;
              return (
                <button
                  key={o.k}
                  type="button"
                  onClick={() => setScanMode(o.k as any)}
                  className="relative z-10 flex-1 flex items-center justify-center gap-2 py-2 rounded-full text-[calc(12px*var(--fz))] font-bold"
                  style={{
                    color: active ? "var(--ink)" : "var(--ink-soft)",
                    transition: "color 320ms cubic-bezier(0.22, 1, 0.36, 1)",
                  }}
                >
                  <o.icon
                    size={12}
                    style={{
                      transform: active ? "scale(1.08)" : "scale(1)",
                      transition: "transform 320ms cubic-bezier(0.34, 1.56, 0.64, 1)",
                    }}
                  />
                  {o.label}
                </button>
              );
            })}
          </div>
          <div className="mt-3 font-mono text-[calc(10px*var(--fz))] uppercase tracking-[0.12em] text-ink-soft font-bold">
            当前：{scanMode === "cloud" ? "云端实时同步 · 36 亿条" : "本地缓存 · 8.4 万条"}
          </div>
        </div>

        <div className="panel p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="font-mono text-[calc(10px*var(--fz))] uppercase tracking-[0.14em] text-ink-soft font-bold">辅助助手</div>
            <ArrowDownAZ size={14} className="text-ink-soft" />
          </div>
          <button
            onClick={() => setSortByRisk((v) => !v)}
            className="w-full py-2.5 rounded-xl text-[calc(13px*var(--fz))] font-bold transition-colors"
            style={{
              background: sortByRisk ? "var(--indigo)" : "var(--canvas-2)",
              color: sortByRisk ? "#fff" : "var(--ink)",
            }}
          >
            {sortByRisk ? "✓ 按风险分排序" : "按时间排序"}
          </button>
          <div className="mt-3 font-mono text-[calc(10px*var(--fz))] uppercase tracking-[0.12em] text-ink-soft font-bold">
            打开后黑名单按风险分降序展示
          </div>
        </div>

        <div className="panel p-5" style={{ background: "linear-gradient(135deg, var(--mint-soft), var(--indigo-soft))" }}>
          <div className="font-mono text-[calc(10px*var(--fz))] uppercase tracking-[0.14em] text-ink-soft font-bold mb-2">通话内容匹配</div>
          <div className="font-display text-[calc(18px*var(--fz))] font-extrabold mb-1">实时语义分析</div>
          <div className="text-[calc(12px*var(--fz))] text-ink-2 font-medium leading-[1.6]">
            通话过程中按 5 类话术模型实时比对，命中转账 / 公检法 / 验证码等关键词自动弹屏警示。
          </div>
        </div>
      </div>

      {/* Tab 切换 */}
      <div className="panel p-5 md:p-6 rise-soft" style={{ animationDelay: "300ms" }}>
        <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
          <div className="flex items-center gap-1 p-1 rounded-full bg-canvas-2 border border-border">
            {[
              { k: "blacklist", label: `黑名单 · ${scanMode === "cloud" ? blist.global.length : blist.tenant.length}`, icon: ShieldOff, tone: "coral" },
              ...(scanMode === "cloud" ? [] : [{ k: "whitelist", label: `白名单 · ${wlist.items.length}`, icon: ShieldCheck, tone: "mint" }]),
            ].map((t) => {
              const active = t.k === tab;
              return (
                <button
                  key={t.k}
                  onClick={() => setTab(t.k as Tab)}
                  className="flex items-center gap-2 px-4 py-2 rounded-full text-[calc(13px*var(--fz))] font-bold transition-colors"
                  style={{
                    background: active ? "var(--surface)" : "transparent",
                    color: active ? (t.tone === "coral" ? "var(--coral-deep)" : "var(--mint-deep)") : "var(--ink-soft)",
                    boxShadow: active ? "var(--shadow-sm)" : "none",
                  }}
                >
                  <t.icon size={14} />
                  {t.label}
                </button>
              );
            })}
          </div>
          <button
            onClick={() => { setEditing(null); setShowAdd(true); }}
            disabled={tab === "blacklist" && scanMode === "cloud"}
            className="btn-indigo py-2 px-3 text-[calc(12px*var(--fz))] disabled:opacity-40 disabled:cursor-not-allowed"
            title={tab === "blacklist" && scanMode === "cloud" ? "云端同步条目由系统管理员维护，不可编辑" : undefined}
          >
            <Plus size={12} /> {tab === "blacklist" ? "手动添加黑名单" : "手动添加白名单"}
          </button>
        </div>

        {tab === "blacklist" ? (
          <div key="bl" className="fade-in">
          <DataTable<BlackEntry>
            rows={blistView}
            searchKeys={["number", "reason", "category"]}
            columns={[
              { key: "number", label: "号码", render: (r) => <span className="font-mono font-bold">{r.number}</span> },
              { key: "category", label: "类别", render: (r) => <span className="tag-chip" data-tone="coral">{r.category}</span> },
              { key: "reason", label: "原因", render: (r) => <span className="text-ink-2">{r.reason}</span> },
              {
                key: "risk", label: "风险分", align: "right", render: (r) => (
                  <span className="font-mono font-extrabold" style={{ color: r.risk >= 90 ? "var(--coral-deep)" : r.risk >= 75 ? "var(--amber-deep)" : "var(--ink)" }}>
                    {r.risk}
                  </span>
                )
              },
              { key: "source", label: "来源", render: (r) => <span className="font-mono text-[calc(11px*var(--fz))] text-ink-soft font-bold">{r.source}</span> },
              { key: "createdAt", label: "时间", render: (r) => <span className="font-mono text-[calc(11px*var(--fz))] text-ink-soft font-bold">{r.createdAt}</span> },
            ]}
            actions={(r) => (
              scanMode === "cloud" ? (
                <span className="font-mono text-[calc(10px*var(--fz))] uppercase tracking-[0.14em] font-bold text-ink-soft">READ ONLY</span>
              ) : (
                <div className="flex items-center gap-1 justify-end">
                  <button onClick={() => { setEditing(r); setShowAdd(true); }} className="w-8 h-8 rounded-lg hover:bg-canvas-2 flex items-center justify-center"><Edit3 size={13} /></button>
                  <button onClick={() => onDelete(r.id)} className="w-8 h-8 rounded-lg hover:bg-coral-soft text-coral-deep flex items-center justify-center"><Trash2 size={13} /></button>
                </div>
              )
            )}
          />
          </div>
        ) : (
          <div key="wl" className="fade-in">
          {wlist.loading && wlist.items.length === 0 ? (
            <ListRowSkeleton count={5} />
          ) : wlist.items.length === 0 ? (
            <div className="panel p-12 flex flex-col items-center justify-center text-center">
              <Inbox size={32} className="text-ink-ghost mb-3" />
              <div className="font-display text-[calc(15px*var(--fz))] font-extrabold">白名单暂无放行号码</div>
              <div className="mt-1 font-mono text-[calc(11px*var(--fz))] uppercase tracking-[0.14em] text-ink-soft font-bold">NO TRUSTED NUMBERS YET</div>
            </div>
          ) : (
          <DataTable<WhiteEntry>
            rows={wlist.items}
            searchKeys={["number", "name", "relation"]}
            columns={[
              { key: "number", label: "号码", render: (r) => <span className="font-mono font-bold">{r.number}</span> },
              { key: "name", label: "联系人" },
              { key: "relation", label: "关系", render: (r) => <span className="tag-chip" data-tone="mint">{r.relation}</span> },
              { key: "createdAt", label: "时间", render: (r) => <span className="font-mono text-[calc(11px*var(--fz))] text-ink-soft font-bold">{r.createdAt}</span> },
            ]}
            actions={(r) => (
              <div className="flex items-center gap-1 justify-end">
                <button onClick={() => { setEditing(r); setShowAdd(true); }} className="w-8 h-8 rounded-lg hover:bg-canvas-2 flex items-center justify-center"><Edit3 size={13} /></button>
                <button onClick={() => onDelete(r.id)} className="w-8 h-8 rounded-lg hover:bg-coral-soft text-coral-deep flex items-center justify-center"><Trash2 size={13} /></button>
              </div>
            )}
          />
          )}
          </div>
        )}
      </div>

      <Modal
        open={showAdd}
        onClose={() => { setShowAdd(false); setEditing(null); }}
        title={tab === "blacklist" ? (editing ? "编辑黑名单" : "添加到黑名单") : (editing ? "编辑白名单" : "添加到白名单")}
        desc={tab === "blacklist" ? "命中此号段后系统将自动拦截或预警" : "命中此号段后系统将直接放行"}
        footer={
          <>
            <button onClick={() => { setShowAdd(false); setEditing(null); }} className="btn-ghost py-2 px-4 text-[calc(13px*var(--fz))]">取消</button>
            <button
              onClick={() => {
                const f = document.getElementById("entry-form") as HTMLFormElement;
                if (f) f.requestSubmit();
              }}
              className="btn-indigo py-2 px-4 text-[calc(13px*var(--fz))]"
            >
              保存
            </button>
          </>
        }
      >
        <EntryForm tab={tab} editing={editing} onSubmit={onSave} />
      </Modal>
    </AppShell>
  );
}

function EntryForm({
  tab,
  editing,
  onSubmit,
}: {
  tab: Tab;
  editing: BlackEntry | WhiteEntry | null;
  onSubmit: (form: any) => void;
}) {
  const e = editing as any;
  const [form, setForm] = useState<any>(
    tab === "blacklist"
      ? { number: e?.number ?? "", reason: e?.reason ?? "", category: e?.category ?? "AI合成", risk: e?.risk ?? 80 }
      : { number: e?.number ?? "", name: e?.name ?? "", relation: e?.relation ?? "亲属" }
  );

  return (
    <form
      id="entry-form"
      onSubmit={(ev) => { ev.preventDefault(); onSubmit(form); }}
      className="space-y-4"
    >
      <Field label="号码">
        <input value={form.number} onChange={(e) => setForm({ ...form, number: e.target.value })} required className="ipt" placeholder="请输入号码" />
      </Field>

      {tab === "blacklist" ? (
        <>
          <Field label="原因">
            <input value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} required className="ipt" placeholder="如：AI 克隆冒充亲属" />
          </Field>
          <Field label="类别">
            <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="ipt">
              {["AI合成", "话术诈骗", "号码伪冒", "其他"].map((c) => (<option key={c}>{c}</option>))}
            </select>
          </Field>
          <Field label="风险分（0–100）">
            <input type="number" min={0} max={100} value={form.risk} onChange={(e) => setForm({ ...form, risk: e.target.value })} className="ipt" />
          </Field>
        </>
      ) : (
        <>
          <Field label="联系人">
            <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required className="ipt" placeholder="请输入联系人备注" />
          </Field>
          <Field label="关系">
            <select value={form.relation} onChange={(e) => setForm({ ...form, relation: e.target.value })} className="ipt">
              {["亲属", "好友", "同事", "银行", "公检法", "其他"].map((c) => (<option key={c}>{c}</option>))}
            </select>
          </Field>
        </>
      )}

      <style>{`
        .ipt { width: 100%; padding: 12px 14px; border-radius: 14px; border: 1px solid var(--border); background: var(--surface); font-size: 13px; font-weight: 500; }
        .ipt:focus { outline: none; border-color: var(--indigo); box-shadow: 0 0 0 3px color-mix(in srgb, var(--indigo) 18%, transparent); }
      `}</style>
    </form>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="font-mono text-[calc(10px*var(--fz))] uppercase tracking-[0.14em] text-ink-soft font-bold block mb-1.5">{label}</label>
      {children}
    </div>
  );
}


