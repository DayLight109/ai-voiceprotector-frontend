"use client";
import AppShell from "@/components/AppShell";
import PageHeader from "@/components/shared/PageHeader";
import DataTable from "@/components/shared/DataTable";
import { useToast } from "@/components/shared/Toast";
import { ADMIN_NAV } from "@/lib/nav";
import { type Appeal } from "@/lib/mock";
import { api, APIError } from "@/lib/api";
import { useResource } from "@/lib/use-resource";
import { Inbox, Clock, CheckCircle2, XCircle, MessageSquareWarning, Flag, HardDrive, Mic2 } from "lucide-react";

export default function AdminAppealsPage() {
  const toast = useToast();
  // 后端按角色分流：admin → 本租户的本地(local)举报。
  const list = useResource<Appeal>(() => api.appeals.listAll({ pageSize: 200 }));

  const stats = {
    total: list.items.length,
    pending: list.items.filter((a) => a.status === "处理中").length,
    approved: list.items.filter((a) => a.status === "已通过").length,
    rejected: list.items.filter((a) => a.status === "已驳回").length,
  };

  const decide = async (r: Appeal, status: "已通过" | "已驳回") => {
    try {
      await api.appeals.setStatus(r.id, status);
      if (status === "已通过" && r.type === "号码举报") {
        toast("success", "已通过", `已生成待下发黑名单，请到「企业黑名单」下发 #${r.id.slice(-4)}`);
      } else {
        toast("success", status, `#${r.id.slice(-4)}`);
      }
      list.refresh();
    } catch (e) {
      toast("error", e instanceof APIError ? e.message : "处理失败");
    }
  };

  const playRecording = async (id: string) => {
    try {
      const { url } = await api.recordings.download(id);
      window.open(url, "_blank", "noopener");
    } catch (e) {
      toast("error", e instanceof APIError ? e.message : "录音不可用");
    }
  };

  return (
    <AppShell role="admin" userName="李梦楠" nav={ADMIN_NAV} breadcrumb={["SENTINEL", "企业管理员", "举报审批"]}>
      <PageHeader
        eyebrow="LOCAL APPEAL QUEUE"
        title="本地举报审批"
        desc="本企业用户提交到本地的号码举报与误判申诉集中在此审批。通过号码举报后会生成一条待下发的企业黑名单，需在「企业黑名单」手动下发后在本组织生效。"
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { k: "全部", v: stats.total, fg: "var(--indigo-deep)" },
          { k: "处理中", v: stats.pending, fg: "var(--amber-deep)" },
          { k: "已通过", v: stats.approved, fg: "var(--mint-deep)" },
          { k: "已驳回", v: stats.rejected, fg: "var(--coral-deep)" },
        ].map((s) => (
          <div key={s.k} className="panel p-5">
            <div className="font-mono text-[10px] uppercase tracking-[0.14em] font-bold mb-2" style={{ color: s.fg }}>{s.k}</div>
            <div className="numplate text-[32px]" style={{ color: s.fg }}>{s.v}</div>
          </div>
        ))}
      </div>

      <section className="panel p-6">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: "var(--indigo-soft)", color: "var(--indigo-deep)" }}>
            <Inbox size={14} />
          </div>
          <div className="font-display text-[15px] font-extrabold">本地工单（{list.items.length} 条）</div>
          <span className="font-mono text-[10px] uppercase tracking-[0.1em] font-bold inline-flex items-center gap-1 ml-1 px-2 py-1 rounded-full" style={{ background: "var(--canvas-2)", color: "var(--ink-soft)" }}>
            <HardDrive size={10} /> LOCAL
          </span>
        </div>
        {list.error && (
          <div className="mb-4 px-4 py-3 rounded-2xl text-[13px] font-medium"
               style={{ background: "var(--coral-soft)", color: "var(--coral-deep)", border: "1px solid var(--coral)" }}>
            {list.error}
          </div>
        )}
        <DataTable<Appeal>
          rows={list.items}
          searchKeys={["number", "reason", "type", "userAccount"]}
          columns={[
            {
              key: "type", label: "类型",
              render: (r) => (
                <span className="tag-chip inline-flex items-center gap-1" data-tone={r.type === "误判申诉" ? "indigo" : "coral"}>
                  {r.type === "误判申诉" ? <MessageSquareWarning size={10} /> : <Flag size={10} />}
                  {r.type}
                </span>
              ),
            },
            { key: "number", label: "号码", render: (r) => <span className="font-mono font-bold">{r.number}</span> },
            {
              key: "userAccount", label: "提交人",
              render: (r) => (
                <div className="flex flex-col gap-0.5">
                  <span className="font-mono text-[12px] font-bold">{r.userAccount || r.userId || "—"}</span>
                  {r.userRole && <span className="font-mono text-[10px] uppercase tracking-[0.1em] text-ink-soft">{roleLabel(r.userRole)}</span>}
                </div>
              ),
            },
            { key: "reason", label: "说明", render: (r) => <span className="text-ink-2 line-clamp-2 max-w-[320px]">{r.reason}</span> },
            {
              key: "recordingId", label: "录音",
              render: (r) => r.recordingId
                ? <button onClick={() => playRecording(r.recordingId!)} className="font-mono text-[10px] uppercase tracking-[0.1em] font-bold inline-flex items-center gap-1 px-2 py-1 rounded-lg" style={{ background: "var(--indigo-soft)", color: "var(--indigo-deep)" }}><Mic2 size={10} /> 收听</button>
                : <span className="text-ink-ghost">—</span>,
            },
            { key: "status", label: "状态", render: (r) => <StatusPill status={r.status} /> },
            { key: "createdAt", label: "时间", render: (r) => <span className="font-mono text-[11px] text-ink-soft font-bold">{formatTime(r.createdAt)}</span> },
          ]}
          actions={(r) => (
            <div className="flex items-center gap-1 justify-end">
              {r.status === "处理中" ? (
                <>
                  <button
                    onClick={() => decide(r, "已通过")}
                    className="px-3 h-8 rounded-lg font-mono text-[10px] uppercase tracking-[0.1em] font-bold flex items-center gap-1"
                    style={{ background: "var(--mint-soft)", color: "var(--mint-deep)" }}
                  >
                    <CheckCircle2 size={11} /> 通过
                  </button>
                  <button
                    onClick={() => decide(r, "已驳回")}
                    className="px-3 h-8 rounded-lg font-mono text-[10px] uppercase tracking-[0.1em] font-bold flex items-center gap-1"
                    style={{ background: "var(--coral-soft)", color: "var(--coral-deep)" }}
                  >
                    <XCircle size={11} /> 驳回
                  </button>
                </>
              ) : (
                <span className="font-mono text-[10px] uppercase tracking-[0.1em] text-ink-ghost font-bold">已处理</span>
              )}
            </div>
          )}
        />
      </section>
    </AppShell>
  );
}

function StatusPill({ status }: { status: Appeal["status"] }) {
  const map = {
    "处理中": { Icon: Clock, soft: "var(--amber-soft)", fg: "var(--amber-deep)" },
    "已通过": { Icon: CheckCircle2, soft: "var(--mint-soft)", fg: "var(--mint-deep)" },
    "已驳回": { Icon: XCircle, soft: "var(--coral-soft)", fg: "var(--coral-deep)" },
  } as const;
  const m = map[status];
  return (
    <span className="font-mono text-[10px] uppercase tracking-[0.14em] px-2 py-1 rounded-full font-bold inline-flex items-center gap-1" style={{ background: m.soft, color: m.fg }}>
      <m.Icon size={10} />
      {status}
    </span>
  );
}

function roleLabel(role: string): string {
  switch (role) {
    case "family": return "家庭用户";
    case "family_admin": return "家庭管理员";
    case "biz": return "企业用户";
    case "admin": return "企业管理员";
    case "sysadmin": return "系统管理员";
    default: return role;
  }
}

function formatTime(s: string): string {
  if (!s) return "";
  if (s.includes("T")) return s.replace("T", " ").slice(0, 16);
  return s.slice(0, 16);
}
