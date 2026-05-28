"use client";
import { useMemo, useState } from "react";
import AppShell from "@/components/AppShell";
import PageHeader from "@/components/shared/PageHeader";
import DataTable from "@/components/shared/DataTable";
import Modal from "@/components/shared/Modal";
import { useToast } from "@/components/shared/Toast";
import { SYSADMIN_NAV } from "@/lib/nav";
import { SEED, type Device, type AuditLog } from "@/lib/mock";
import { useLocalStorage, uid } from "@/lib/storage";
import { Plus, Trash2, Edit3, Activity, FileLock2, Server, HardDrive, Building2 } from "lucide-react";

export type DeviceType = "企业端" | "家庭端";

export default function DeviceManager({ deviceType }: { deviceType: DeviceType }) {
  const toast = useToast();
  const isEnt = deviceType === "企业端";
  const [all, setAll] = useLocalStorage<Device[]>("sys.devices", SEED.devices);
  const [audit] = useLocalStorage<AuditLog[]>("sys.audit", SEED.audit);
  const [editing, setEditing] = useState<Device | null>(null);
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<"list" | "audit">("list");

  const view = useMemo(() => all.filter((d) => d.type === deviceType), [all, deviceType]);

  const onSubmit = (f: any) => {
    if (editing) {
      setAll((p) => p.map((d) => (d.id === editing.id ? { ...editing, ...f } : d)));
      toast("success", "已更新");
    } else {
      const entry: Device = {
        id: uid("d"),
        name: f.name,
        tenant: f.tenant,
        type: deviceType,
        status: "online",
        version: "v2.6.1",
        lastSeen: "刚刚",
        contact: f.contact,
      };
      setAll((p) => [entry, ...p]);
      toast("success", `已新增${isEnt ? "企业" : "家庭"}`, f.name);
    }
    setOpen(false);
    setEditing(null);
  };

  const breadcrumb = ["SENTINEL", "系统管理员", "设备管理", isEnt ? "企业端" : "家庭端"];

  return (
    <AppShell role="sysadmin" userName="陈安怡" nav={SYSADMIN_NAV} breadcrumb={breadcrumb}>
      <PageHeader
        eyebrow={isEnt ? "ENTERPRISE DEVICES" : "FAMILY DEVICES"}
        title={isEnt ? "企业端设备管理" : "家庭端设备管理"}
        desc={isEnt ? "管理接入企业（运营商 / 银行 / 反诈中心）及其检测探针。" : "管理接入家庭端及其智能盒子 / 手机端探针。"}
        actions={
          <button onClick={() => { setEditing(null); setOpen(true); }} className="btn-indigo py-2.5 px-4 text-[13px]">
            <Plus size={14} /> 新增{isEnt ? "企业" : "家庭"}
          </button>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <KPI label="总数" v={view.length} c="var(--indigo)" Icon={isEnt ? Server : HardDrive} />
        <KPI label="在线" v={view.filter((d) => d.status === "online").length} c="var(--mint-deep)" Icon={Activity} />
        <KPI label="告警" v={view.filter((d) => d.status === "warn").length} c="var(--amber-deep)" Icon={Building2} />
        <KPI label="离线" v={view.filter((d) => d.status === "offline").length} c="var(--coral-deep)" Icon={Server} />
      </div>

      <div className="flex items-center gap-1 p-1 rounded-full bg-canvas-2 border border-border mb-5 inline-flex">
        {[
          { k: "list", label: "设备列表", icon: Server },
          { k: "audit", label: "行为日志审计", icon: FileLock2 },
        ].map((t) => {
          const active = t.k === tab;
          return (
            <button key={t.k} onClick={() => setTab(t.k as any)} className="flex items-center gap-2 px-4 py-2 rounded-full text-[12px] font-bold transition-colors" style={{ background: active ? "var(--surface)" : "transparent", color: active ? "var(--ink)" : "var(--ink-soft)", boxShadow: active ? "var(--shadow-sm)" : "none" }}>
              <t.icon size={12} />
              {t.label}
            </button>
          );
        })}
      </div>

      {tab === "list" ? (
        <div className="panel p-6">
          <DataTable<Device>
            rows={view}
            searchKeys={["name", "tenant", "contact"]}
            columns={[
              { key: "name", label: isEnt ? "企业 / 设备" : "家庭 / 设备", render: (r) => <span className="font-display font-extrabold">{r.name}</span> },
              { key: "tenant", label: isEnt ? "租户" : "户主" },
              {
                key: "status", label: "运行状态", render: (r) => {
                  const m: any = { online: { bg: "var(--mint-soft)", fg: "var(--mint-deep)", l: "在线" }, offline: { bg: "var(--canvas-2)", fg: "var(--ink-soft)", l: "离线" }, warn: { bg: "var(--amber-soft)", fg: "var(--amber-deep)", l: "告警" } };
                  return (
                    <span className="font-mono text-[10px] uppercase tracking-[0.14em] px-2 py-1 rounded-full font-bold inline-flex items-center gap-1.5" style={{ background: m[r.status].bg, color: m[r.status].fg }}>
                      <span className="w-1.5 h-1.5 rounded-full" style={{ background: m[r.status].fg }} />
                      {m[r.status].l}
                    </span>
                  );
                }
              },
              { key: "version", label: "版本", render: (r) => <span className="font-mono text-[11px] font-bold">{r.version}</span> },
              { key: "contact", label: "联系人" },
              { key: "lastSeen", label: "最近心跳", render: (r) => <span className="font-mono text-[11px] text-ink-soft font-bold">{r.lastSeen}</span> },
            ]}
            actions={(r) => (
              <div className="flex items-center gap-1 justify-end">
                <button onClick={() => { setEditing(r); setOpen(true); }} className="w-8 h-8 rounded-lg hover:bg-canvas-2 flex items-center justify-center"><Edit3 size={13} /></button>
                <button onClick={() => { setAll((p) => p.filter((x) => x.id !== r.id)); toast("success", "已删除"); }} className="w-8 h-8 rounded-lg hover:bg-coral-soft text-coral-deep flex items-center justify-center"><Trash2 size={13} /></button>
              </div>
            )}
          />
        </div>
      ) : (
        <div className="panel p-6">
          <DataTable<AuditLog>
            rows={audit}
            searchKeys={["actor", "action", "target"]}
            columns={[
              { key: "ts", label: "时间", render: (r) => <span className="font-mono text-[11px] font-bold">{r.ts}</span> },
              { key: "actor", label: "操作人" },
              { key: "action", label: "动作", render: (r) => <span className="tag-chip" data-tone="indigo">{r.action}</span> },
              { key: "target", label: "目标", render: (r) => <span className="font-mono text-[12px] text-ink-soft font-bold">{r.target}</span> },
              {
                key: "result", label: "结果", render: (r) => (
                  <span className="font-mono text-[10px] uppercase tracking-[0.14em] px-2 py-1 rounded-full font-bold" style={{ background: r.result === "成功" ? "var(--mint-soft)" : "var(--coral-soft)", color: r.result === "成功" ? "var(--mint-deep)" : "var(--coral-deep)" }}>
                    {r.result}
                  </span>
                )
              },
            ]}
          />
        </div>
      )}

      <Modal
        open={open}
        onClose={() => { setOpen(false); setEditing(null); }}
        title={editing ? `编辑${isEnt ? "企业" : "家庭"}` : `新增${isEnt ? "企业" : "家庭"}`}
        footer={
          <>
            <button onClick={() => { setOpen(false); setEditing(null); }} className="btn-ghost py-2 px-4 text-[13px]">取消</button>
            <button onClick={() => (document.getElementById("dev-form") as HTMLFormElement)?.requestSubmit()} className="btn-indigo py-2 px-4 text-[13px]">保存</button>
          </>
        }
      >
        <DevForm editing={editing} onSubmit={onSubmit} isEnt={isEnt} />
      </Modal>
    </AppShell>
  );
}

function KPI({ label, v, c, Icon }: any) {
  return (
    <div className="panel p-5">
      <div className="flex items-center justify-between mb-3">
        <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-soft font-bold">{label}</div>
        <Icon size={14} style={{ color: c }} />
      </div>
      <div className="numplate text-[32px]" style={{ color: c }}>{v}</div>
    </div>
  );
}

function DevForm({ editing, onSubmit, isEnt }: { editing: Device | null; onSubmit: (f: any) => void; isEnt: boolean }) {
  const [f, setF] = useState<any>(editing ?? { name: "", tenant: "", contact: "" });
  return (
    <form id="dev-form" onSubmit={(e) => { e.preventDefault(); onSubmit(f); }} className="space-y-4">
      <Field label={isEnt ? "设备名称" : "户主姓名 + 设备"}>
        <input required value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} className="ipt" placeholder={isEnt ? "如：建设银行 95533 · 集群" : "如：王磊家 · 智能盒子"} />
      </Field>
      <Field label={isEnt ? "企业名称" : "家庭名称"}>
        <input required value={f.tenant} onChange={(e) => setF({ ...f, tenant: e.target.value })} className="ipt" />
      </Field>
      <Field label="联系人">
        <input value={f.contact} onChange={(e) => setF({ ...f, contact: e.target.value })} className="ipt" />
      </Field>
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
