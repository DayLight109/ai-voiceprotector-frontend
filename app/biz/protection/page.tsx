"use client";
import { useMemo, useState } from "react";
import AppShell from "@/components/AppShell";
import PageHeader from "@/components/shared/PageHeader";
import DataTable from "@/components/shared/DataTable";
import Modal from "@/components/shared/Modal";
import { useToast } from "@/components/shared/Toast";
import { BIZ_NAV } from "@/lib/nav";
import { SEED, type BlackEntry, type WhiteEntry } from "@/lib/mock";
import { useLocalStorage, uid } from "@/lib/storage";
import { Plus, Trash2, Edit3, ShieldOff, ShieldCheck, ArrowDownAZ, Cloud, HardDrive, ScanLine, Building2 } from "lucide-react";

export default function BizProtectionPage() {
  const toast = useToast();
  const [tab, setTab] = useState<"blacklist" | "whitelist">("blacklist");
  const [blist, setBlist] = useLocalStorage<BlackEntry[]>("biz.blacklist", SEED.blacklist);
  const [wlist, setWlist] = useLocalStorage<WhiteEntry[]>("biz.whitelist", SEED.whitelist);
  const [sortByRisk, setSortByRisk] = useState(true);
  const [scanMode, setScanMode] = useState<"local" | "cloud">("cloud");

  const view = useMemo(() => sortByRisk ? [...blist].sort((a, b) => b.risk - a.risk) : blist, [blist, sortByRisk]);

  const remove = (id: string) => {
    if (tab === "blacklist") {
      setBlist((p) => p.filter((x) => x.id !== id));
      toast("success", "已从黑名单移除");
    } else {
      setWlist((p) => p.filter((x) => x.id !== id));
      toast("success", "已从白名单移除");
    }
  };

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
            <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-soft font-bold">扫描匹配源</div>
            <ScanLine size={14} className="text-ink-soft" />
          </div>
          <div className="flex items-center gap-2 p-1 rounded-full bg-canvas-2 border border-border">
            {[
              { k: "local", label: "本地缓存", icon: HardDrive },
              { k: "cloud", label: "云端同步", icon: Cloud },
            ].map((o) => {
              const active = scanMode === o.k;
              return (
                <button key={o.k} onClick={() => setScanMode(o.k as any)} className="flex-1 flex items-center justify-center gap-2 py-2 rounded-full text-[12px] font-bold transition-colors" style={{ background: active ? "var(--surface)" : "transparent", color: active ? "var(--ink)" : "var(--ink-soft)", boxShadow: active ? "var(--shadow-sm)" : "none" }}>
                  <o.icon size={12} />
                  {o.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="panel p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-soft font-bold">辅助助手</div>
            <ArrowDownAZ size={14} className="text-ink-soft" />
          </div>
          <button onClick={() => setSortByRisk((v) => !v)} className="w-full py-2.5 rounded-xl text-[13px] font-bold transition-colors" style={{ background: sortByRisk ? "var(--indigo)" : "var(--canvas-2)", color: sortByRisk ? "#fff" : "var(--ink)" }}>
            {sortByRisk ? "✓ 按风险分排序" : "按时间排序"}
          </button>
        </div>

        <div className="panel p-5" style={{ background: "linear-gradient(135deg, var(--indigo-soft), var(--mint-soft))" }}>
          <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-soft font-bold mb-2">企业 API 接入</div>
          <div className="font-display text-[18px] font-extrabold mb-1">/v1/analyze</div>
          <div className="text-[12px] text-ink-2 font-medium leading-[1.6]">
            POST 来电号码、信令源、通话片段，毫秒级返回 SAFE/WATCH/ALERT/BLOCK 判决。
          </div>
        </div>
      </div>

      <div className="panel p-5 md:p-6">
        <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
          <div className="flex items-center gap-1 p-1 rounded-full bg-canvas-2 border border-border">
            {[
              { k: "blacklist", label: `黑名单 · ${blist.length}`, icon: ShieldOff, tone: "coral" },
              { k: "whitelist", label: `白名单 · ${wlist.length}`, icon: ShieldCheck, tone: "mint" },
            ].map((t) => {
              const active = t.k === tab;
              return (
                <button key={t.k} onClick={() => setTab(t.k as any)} className="flex items-center gap-2 px-4 py-2 rounded-full text-[13px] font-bold transition-colors" style={{ background: active ? "var(--surface)" : "transparent", color: active ? (t.tone === "coral" ? "var(--coral-deep)" : "var(--mint-deep)") : "var(--ink-soft)", boxShadow: active ? "var(--shadow-sm)" : "none" }}>
                  <t.icon size={14} />{t.label}
                </button>
              );
            })}
          </div>
          <button
            onClick={() => {
              if (tab === "blacklist") {
                setBlist((p) => [{ id: uid("b"), number: "+86 000 0000 0000", reason: "新增条目", category: "其他", risk: 60, source: "手动", createdAt: new Date().toLocaleString("zh-CN") }, ...p]);
                toast("success", "新增条目，请补全详情");
              } else {
                setWlist((p) => [{ id: uid("w"), number: "+86 000 0000 0000", name: "新增联系人", relation: "其他", createdAt: new Date().toLocaleString("zh-CN") }, ...p]);
                toast("success", "新增条目，请补全详情");
              }
            }}
            className="btn-indigo py-2 px-3 text-[12px]"
          >
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
              <button onClick={() => remove(r.id)} className="w-8 h-8 rounded-lg hover:bg-coral-soft text-coral-deep flex items-center justify-center"><Trash2 size={13} /></button>
            )}
          />
        ) : (
          <DataTable<WhiteEntry>
            rows={wlist}
            searchKeys={["number", "name", "relation"]}
            columns={[
              { key: "number", label: "号码", render: (r) => <span className="font-mono font-bold">{r.number}</span> },
              { key: "name", label: "联系人" },
              { key: "relation", label: "关系" },
              { key: "createdAt", label: "时间" },
            ]}
            actions={(r) => (
              <button onClick={() => remove(r.id)} className="w-8 h-8 rounded-lg hover:bg-coral-soft text-coral-deep flex items-center justify-center"><Trash2 size={13} /></button>
            )}
          />
        )}
      </div>
    </AppShell>
  );
}
