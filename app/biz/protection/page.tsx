"use client";
import { useEffect, useMemo, useState } from "react";
import AppShell from "@/components/AppShell";
import PageHeader from "@/components/shared/PageHeader";
import DataTable from "@/components/shared/DataTable";
import Modal from "@/components/shared/Modal";
import { useToast } from "@/components/shared/Toast";
import { BIZ_NAV } from "@/lib/nav";
import { type BlackEntry, type WhiteEntry } from "@/lib/mock";
import { api, APIError } from "@/lib/api";
import { useResource } from "@/lib/use-resource";
import { useHybridBlacklist } from "@/lib/blacklist-store";
import { Plus, Trash2, Edit3, ShieldOff, ShieldCheck, ArrowDownAZ, Cloud, HardDrive, ScanLine, Inbox } from "lucide-react";
import { ListRowSkeleton } from "@/components/shared/Skeleton";

type BlackForm = { number: string; reason: string; category: BlackEntry["category"]; risk: number };
type WhiteForm = { number: string; name: string; relation: string };
const emptyBlack: BlackForm = { number: "", reason: "", category: "其他", risk: 70 };
const emptyWhite: WhiteForm = { number: "", name: "", relation: "" };

export default function BizProtectionPage() {
  const toast = useToast();
  const [tab, setTab] = useState<"blacklist" | "whitelist">("blacklist");
  const blist = useHybridBlacklist();
  const wlist = useResource<WhiteEntry>(() => api.whitelist.list({ pageSize: 100 }));
  const [sortByRisk, setSortByRisk] = useState(true);
  const [scanMode, setScanMode] = useState<"local" | "cloud">("local");

  const [open, setOpen] = useState(false);
  const [editingBlack, setEditingBlack] = useState<BlackEntry | null>(null);
  const [editingWhite, setEditingWhite] = useState<WhiteEntry | null>(null);
  const [bForm, setBForm] = useState<BlackForm>(emptyBlack);
  const [wForm, setWForm] = useState<WhiteForm>(emptyWhite);
  const [saving, setSaving] = useState(false);

  const blackRows = useMemo(
    () => (scanMode === "cloud" ? blist.global : blist.tenant),
    [scanMode, blist.global, blist.tenant],
  );
  useEffect(() => {
    if (scanMode === "cloud" && tab === "whitelist") setTab("blacklist");
  }, [scanMode, tab]);
  const view = useMemo(
    () => sortByRisk ? [...blackRows].sort((a, b) => b.risk - a.risk) : blackRows,
    [blackRows, sortByRisk],
  );

  const openCreate = () => {
    setEditingBlack(null);
    setEditingWhite(null);
    setBForm(emptyBlack);
    setWForm(emptyWhite);
    setOpen(true);
  };
  const openEditBlack = (r: BlackEntry) => {
    setEditingBlack(r);
    setEditingWhite(null);
    setBForm({ number: r.number, reason: r.reason, category: r.category, risk: r.risk });
    setOpen(true);
  };
  const openEditWhite = (r: WhiteEntry) => {
    setEditingWhite(r);
    setEditingBlack(null);
    setWForm({ number: r.number, name: r.name, relation: r.relation });
    setOpen(true);
  };

  const submit = async () => {
    if (saving) return;
    setSaving(true);
    try {
      if (tab === "blacklist") {
        const f = { ...bForm, number: bForm.number.trim(), reason: bForm.reason.trim() };
        if (!f.number) { toast("error", "请填写号码"); setSaving(false); return; }
        if (editingBlack) {
          await blist.update(editingBlack.id, {
            number: f.number, reason: f.reason, category: f.category, risk: Number(f.risk),
          });
          toast("success", "已更新黑名单");
        } else {
          await blist.create({
            number: f.number, reason: f.reason, category: f.category,
            risk: Number(f.risk),
          });
          toast("success", "已加入本地黑名单", f.number);
        }
      } else {
        const f = { ...wForm, number: wForm.number.trim(), name: wForm.name.trim(), relation: wForm.relation.trim() };
        if (!f.number) { toast("error", "请填写号码"); setSaving(false); return; }
        if (editingWhite) {
          await api.whitelist.update(editingWhite.id, f);
          toast("success", "已更新白名单");
        } else {
          await api.whitelist.create(f as any);
          toast("success", "已加入白名单", f.number);
        }
        wlist.refresh();
      }
      setOpen(false);
    } catch (e) {
      toast("error", e instanceof APIError ? e.message : "保存失败");
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id: string) => {
    try {
      if (tab === "blacklist") {
        await blist.remove(id);
        toast("success", "已从黑名单移除");
      } else {
        await api.whitelist.remove(id);
        toast("success", "已从白名单移除");
        wlist.refresh();
      }
    } catch (e) {
      toast("error", e instanceof APIError ? e.message : "操作失败");
    }
  };

  const isEditing = !!(editingBlack || editingWhite);

  return (
    <AppShell role="biz" userName="周珩" nav={BIZ_NAV} breadcrumb={["SENTINEL", "企业用户", "实时安全防护"]}>
      <PageHeader
        eyebrow="ENTERPRISE PROTECTION"
        title="实时安全防护"
        desc="企业级黑/白名单 + 通话内容实时语义匹配，对客服热线、机柜号段做集中防护。"
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="panel p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="font-mono text-[calc(10px*var(--fz))] uppercase tracking-[0.14em] text-ink-soft font-bold">扫描匹配源</div>
            <ScanLine size={14} className="text-ink-soft" />
          </div>
          <div className="flex items-center gap-2 p-1 rounded-full bg-canvas-2 border border-border">
            {[
              { k: "local", label: "本地缓存", icon: HardDrive },
              { k: "cloud", label: "云端同步", icon: Cloud },
            ].map((o) => {
              const active = scanMode === o.k;
              return (
                <button key={o.k} onClick={() => setScanMode(o.k as any)} className="flex-1 flex items-center justify-center gap-2 py-2 rounded-full text-[calc(12px*var(--fz))] font-bold transition-colors" style={{ background: active ? "var(--surface)" : "transparent", color: active ? "var(--ink)" : "var(--ink-soft)", boxShadow: active ? "var(--shadow-sm)" : "none" }}>
                  <o.icon size={12} />
                  {o.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="panel p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="font-mono text-[calc(10px*var(--fz))] uppercase tracking-[0.14em] text-ink-soft font-bold">辅助助手</div>
            <ArrowDownAZ size={14} className="text-ink-soft" />
          </div>
          <button onClick={() => setSortByRisk((v) => !v)} className="w-full py-2.5 rounded-xl text-[calc(13px*var(--fz))] font-bold transition-colors" style={{ background: sortByRisk ? "var(--indigo)" : "var(--canvas-2)", color: sortByRisk ? "#fff" : "var(--ink)" }}>
            {sortByRisk ? "✓ 按风险分排序" : "按时间排序"}
          </button>
        </div>

        <div className="panel p-5" style={{ background: "linear-gradient(135deg, var(--indigo-soft), var(--mint-soft))" }}>
          <div className="font-mono text-[calc(10px*var(--fz))] uppercase tracking-[0.14em] text-ink-soft font-bold mb-2">企业 API 接入</div>
          <div className="font-display text-[calc(18px*var(--fz))] font-extrabold mb-1">/v1/analyze</div>
          <div className="text-[calc(12px*var(--fz))] text-ink-2 font-medium leading-[1.6]">
            POST 来电号码、信令源、通话片段，毫秒级返回 SAFE/WATCH/ALERT/BLOCK 判决。
          </div>
        </div>
      </div>

      <div className="panel p-5 md:p-6">
        <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
          <div className="flex items-center gap-1 p-1 rounded-full bg-canvas-2 border border-border">
            {[
              { k: "blacklist", label: `黑名单 · ${scanMode === "cloud" ? blist.global.length : blist.tenant.length}`, icon: ShieldOff, tone: "coral" },
              ...(scanMode === "cloud" ? [] : [{ k: "whitelist", label: `白名单 · ${wlist.items.length}`, icon: ShieldCheck, tone: "mint" }]),
            ].map((t) => {
              const active = t.k === tab;
              return (
                <button key={t.k} onClick={() => setTab(t.k as any)} className="flex items-center gap-2 px-4 py-2 rounded-full text-[calc(13px*var(--fz))] font-bold transition-colors" style={{ background: active ? "var(--surface)" : "transparent", color: active ? (t.tone === "coral" ? "var(--coral-deep)" : "var(--mint-deep)") : "var(--ink-soft)", boxShadow: active ? "var(--shadow-sm)" : "none" }}>
                  <t.icon size={14} />{t.label}
                </button>
              );
            })}
          </div>
          <button onClick={openCreate} disabled={tab === "blacklist" && scanMode === "cloud"} className="btn-indigo py-2 px-3 text-[calc(12px*var(--fz))] disabled:opacity-40 disabled:cursor-not-allowed" title={tab === "blacklist" && scanMode === "cloud" ? "云端同步条目由系统管理员维护，不可编辑" : undefined}>
            <Plus size={12} /> 新增{tab === "blacklist" ? "黑" : "白"}名单
          </button>
        </div>

        {tab === "blacklist" ? (
          <DataTable<BlackEntry>
            rows={view}
            searchKeys={["number", "reason", "category"]}
            columns={[
              { key: "number", label: "号码", render: (r) => <span className="font-mono font-bold">{r.number}</span> },
              { key: "category", label: "类别", render: (r) => <span className="tag-chip" data-tone="coral">{r.category}</span> },
              { key: "reason", label: "原因" },
              { key: "risk", label: "风险分", align: "right", render: (r) => <span className="font-mono font-extrabold" style={{ color: r.risk >= 90 ? "var(--coral-deep)" : "var(--ink)" }}>{r.risk}</span> },
              { key: "source", label: "来源" },
            ]}
            actions={(r) => (
              scanMode === "cloud" ? (
                <span className="font-mono text-[calc(10px*var(--fz))] uppercase tracking-[0.14em] font-bold text-ink-soft">READ ONLY</span>
              ) : (
                <div className="flex items-center gap-1 justify-end">
                  <button onClick={() => openEditBlack(r)} className="w-8 h-8 rounded-lg hover:bg-canvas-2 flex items-center justify-center"><Edit3 size={13} /></button>
                  <button onClick={() => remove(r.id)} className="w-8 h-8 rounded-lg hover:bg-coral-soft text-coral-deep flex items-center justify-center"><Trash2 size={13} /></button>
                </div>
              )
            )}
          />
        ) : wlist.loading && wlist.items.length === 0 ? (
          <ListRowSkeleton count={5} />
        ) : wlist.items.length === 0 ? (
          <div className="panel p-12 flex flex-col items-center justify-center text-center">
            <Inbox size={32} className="text-ink-ghost mb-3" />
            <div className="font-display text-[calc(15px*var(--fz))] font-extrabold">白名单还没有号码</div>
            <div className="mt-1 font-mono text-[calc(11px*var(--fz))] uppercase tracking-[0.14em] text-ink-soft font-bold">NO TRUSTED NUMBERS YET</div>
          </div>
        ) : (
          <DataTable<WhiteEntry>
            rows={wlist.items}
            searchKeys={["number", "name", "relation"]}
            columns={[
              { key: "number", label: "号码", render: (r) => <span className="font-mono font-bold">{r.number}</span> },
              { key: "name", label: "联系人" },
              { key: "relation", label: "关系" },
              { key: "createdAt", label: "时间" },
            ]}
            actions={(r) => (
              <div className="flex items-center gap-1 justify-end">
                <button onClick={() => openEditWhite(r)} className="w-8 h-8 rounded-lg hover:bg-canvas-2 flex items-center justify-center"><Edit3 size={13} /></button>
                <button onClick={() => remove(r.id)} className="w-8 h-8 rounded-lg hover:bg-coral-soft text-coral-deep flex items-center justify-center"><Trash2 size={13} /></button>
              </div>
            )}
          />
        )}
      </div>

      <Modal
        open={open}
        onClose={() => { if (!saving) setOpen(false); }}
        title={`${isEditing ? "编辑" : "新增"}${tab === "blacklist" ? "黑名单" : "白名单"}`}
        footer={
          <>
            <button disabled={saving} onClick={() => setOpen(false)} className="btn-ghost py-2 px-4 text-[calc(13px*var(--fz))]">取消</button>
            <button disabled={saving} onClick={submit} className="btn-indigo py-2 px-4 text-[calc(13px*var(--fz))]">
              {saving ? "保存中…" : "保存"}
            </button>
          </>
        }
      >
        {tab === "blacklist" ? (
          <form id="biz-bl-form" onSubmit={(e) => { e.preventDefault(); submit(); }} className="space-y-4">
            <Field label="号码">
              <input required value={bForm.number} onChange={(e) => setBForm({ ...bForm, number: e.target.value })} placeholder="+86 138 0000 0000" className="ipt" />
            </Field>
            <Field label="类别">
              <select value={bForm.category} onChange={(e) => setBForm({ ...bForm, category: e.target.value as BlackEntry["category"] })} className="ipt">
                {(["AI合成", "话术诈骗", "号码伪冒", "其他"] as const).map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </Field>
            <Field label="原因">
              <input value={bForm.reason} onChange={(e) => setBForm({ ...bForm, reason: e.target.value })} placeholder="例如：仿冒客服热线骚扰" className="ipt" />
            </Field>
            <Field label="风险分（0-100）">
              <input type="number" min={0} max={100} value={bForm.risk}
                onChange={(e) => setBForm({ ...bForm, risk: Math.max(0, Math.min(100, Number(e.target.value) || 0)) })}
                className="ipt" />
            </Field>
          </form>
        ) : (
          <form id="biz-wl-form" onSubmit={(e) => { e.preventDefault(); submit(); }} className="space-y-4">
            <Field label="号码">
              <input required value={wForm.number} onChange={(e) => setWForm({ ...wForm, number: e.target.value })} placeholder="+86 138 0000 0000" className="ipt" />
            </Field>
            <Field label="联系人">
              <input value={wForm.name} onChange={(e) => setWForm({ ...wForm, name: e.target.value })} placeholder="例如：客户成功部" className="ipt" />
            </Field>
            <Field label="关系">
              <input value={wForm.relation} onChange={(e) => setWForm({ ...wForm, relation: e.target.value })} placeholder="例如：合作方 / 内部分机" className="ipt" />
            </Field>
          </form>
        )}
        <style>{`.ipt{width:100%;padding:12px 14px;border-radius:14px;border:1px solid var(--border);background:var(--surface);font-size:13px;font-weight:500}.ipt:focus{outline:none;border-color:var(--indigo);box-shadow:0 0 0 3px color-mix(in srgb, var(--indigo) 18%, transparent)}`}</style>
      </Modal>
    </AppShell>
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
