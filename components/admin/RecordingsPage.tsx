"use client";
import { useEffect, useState } from "react";
import AppShell from "@/components/AppShell";
import PageHeader from "@/components/shared/PageHeader";
import DataTable from "@/components/shared/DataTable";
import FormRow from "@/components/shared/FormRow";
import Toggle from "@/components/shared/Toggle";
import { useToast } from "@/components/shared/Toast";
import { useConfirm } from "@/components/shared/Confirm";
import { FAMILY_ADMIN_NAV, ADMIN_NAV } from "@/lib/nav";
import { type Recording } from "@/lib/mock";
import { api, APIError } from "@/lib/api";
import { useResource } from "@/lib/use-resource";
import { Mic2, Trash2, Play, Pause, Download, Inbox } from "lucide-react";
import { ListRowSkeleton } from "@/components/shared/Skeleton";

export default function RecordingsPage({ role }: { role: "family-admin" | "admin" }) {
  const isFam = role === "family-admin";
  const toast = useToast();
  const confirm = useConfirm();
  const list = useResource<Recording>(() => api.recordings.list({ pageSize: 100 }));
  const [uploadOn, setUploadOn] = useState<boolean>(true);
  const [playing, setPlaying] = useState<string | null>(null);

  useEffect(() => {
    let stop = false;
    api.recordings.getPolicy()
      .then((p) => { if (!stop) setUploadOn(!!p.uploadEnabled); })
      .catch(() => {});
    return () => { stop = true; };
  }, []);

  const onToggleUpload = async (next: boolean) => {
    const prev = uploadOn;
    setUploadOn(next);
    try {
      await api.recordings.setPolicy(next);
      toast("success", next ? "已开启录音上传" : "已关闭录音上传");
    } catch (e) {
      setUploadOn(prev);
      toast("error", e instanceof APIError ? e.message : "策略保存失败");
    }
  };

  const onDownload = async (r: Recording) => {
    try {
      const { url } = await api.recordings.download(r.id);
      window.open(url, "_blank");
      toast("info", "已开始下载", r.phone);
    } catch (e) {
      toast("error", e instanceof APIError ? e.message : "下载失败");
    }
  };

  const onDelete = async (r: Recording) => {
    const ok = await confirm({
      title: "删除录音？",
      desc: `将永久删除 ${r.phone} 的通话录音留样。录音原文删除即彻底擦除，无法恢复。`,
      tone: "danger",
      confirmText: "删除",
    });
    if (!ok) return;
    try {
      await api.recordings.remove(r.id);
      toast("success", "已删除录音");
      list.refresh();
    } catch (e) {
      toast("error", e instanceof APIError ? e.message : "删除失败");
    }
  };

  return (
    <AppShell
      role={role}
      userName="李梦楠"
      nav={isFam ? FAMILY_ADMIN_NAV : ADMIN_NAV}
      breadcrumb={["SENTINEL", isFam ? "家庭管理员" : "企业管理员", "录音管理"]}
    >
      <PageHeader
        eyebrow="RECORDINGS"
        title="录音管理"
        desc={isFam ? "查看 / 删除所辖家庭成员的通话录音留样。" : "查看 / 删除企业线路通话录音留样。"}
      />

      <div className="grid grid-cols-12 gap-5">
        <div className="col-span-12 lg:col-span-8 panel p-6">
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
              <Inbox size={32} className="text-ink-ghost mb-3" />
              <div className="font-display text-[calc(15px*var(--fz))] font-extrabold">暂无通话录音留样</div>
              <div className="mt-1 font-mono text-[calc(11px*var(--fz))] uppercase tracking-[0.14em] text-ink-soft font-bold">NO RECORDINGS YET</div>
            </div>
          ) : (
            <DataTable<Recording>
              rows={list.items}
              searchKeys={["owner", "phone"]}
              columns={[
                { key: "owner", label: isFam ? "成员" : "线路" },
                { key: "phone", label: "号码", render: (r) => <span className="font-mono font-bold">{r.phone}</span> },
                { key: "duration", label: "时长", align: "right", render: (r) => <span className="font-mono">{r.duration}</span> },
                { key: "size", label: "大小", align: "right", render: (r) => <span className="font-mono text-[calc(11px*var(--fz))] text-ink-soft font-bold">{r.size}</span> },
                {
                  key: "verdict", label: "判决", render: (r) => {
                    const m: any = { 拦截: { bg: "var(--coral-soft)", fg: "var(--coral-deep)" }, 预警: { bg: "var(--amber-soft)", fg: "var(--amber-deep)" }, 通过: { bg: "var(--mint-soft)", fg: "var(--mint-deep)" } };
                    return <span className="font-mono text-[calc(10px*var(--fz))] uppercase tracking-[0.14em] px-2 py-1 rounded-full font-bold" style={{ background: m[r.verdict].bg, color: m[r.verdict].fg }}>{r.verdict}</span>;
                  }
                },
                { key: "createdAt", label: "时间", render: (r) => <span className="font-mono text-[calc(11px*var(--fz))] text-ink-soft font-bold">{r.createdAt}</span> },
              ]}
              actions={(r) => (
                <div className="flex items-center gap-1 justify-end">
                  <button onClick={() => { setPlaying(playing === r.id ? null : r.id); toast("info", playing === r.id ? "已暂停" : "正在播放", r.phone); }} className="w-8 h-8 rounded-lg hover:bg-canvas-2 flex items-center justify-center">
                    {playing === r.id ? <Pause size={13} /> : <Play size={13} />}
                  </button>
                  <button onClick={() => onDownload(r)} className="w-8 h-8 rounded-lg hover:bg-canvas-2 flex items-center justify-center"><Download size={13} /></button>
                  <button onClick={() => onDelete(r)} className="w-8 h-8 rounded-lg hover:bg-coral-soft text-coral-deep flex items-center justify-center"><Trash2 size={13} /></button>
                </div>
              )}
            />
          )}
        </div>

        <aside className="col-span-12 lg:col-span-4 space-y-4">
          <div className="panel p-6">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: "var(--indigo-soft)", color: "var(--indigo-deep)" }}>
                <Mic2 size={14} />
              </div>
              <div className="font-display text-[calc(15px*var(--fz))] font-extrabold">录音策略</div>
            </div>
            <FormRow label="是否上传录音" desc="开启后通话原文将加密回传至云端，便于跨设备审计；关闭则仅保留波形特征。">
              <Toggle checked={uploadOn} onChange={onToggleUpload} />
            </FormRow>
          </div>

          <div className="panel p-6" style={{ background: "var(--mint-soft)" }}>
            <div className="font-mono text-[calc(10px*var(--fz))] uppercase tracking-[0.14em] font-bold text-mint-deep mb-1">PRIVACY</div>
            <div className="text-[calc(12px*var(--fz))] font-semibold text-mint-deep leading-[1.7]">
              录音原文受 AES-256 加密保护，密钥由客户私有 KMS 管理。删除即彻底擦除。
            </div>
          </div>
        </aside>
      </div>
    </AppShell>
  );
}
