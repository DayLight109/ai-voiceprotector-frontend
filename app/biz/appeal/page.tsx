"use client";
import { useLayoutEffect, useRef, useState } from "react";
import AppShell from "@/components/AppShell";
import PageHeader from "@/components/shared/PageHeader";
import DataTable from "@/components/shared/DataTable";
import { useToast } from "@/components/shared/Toast";
import { BIZ_NAV } from "@/lib/nav";
import { type Appeal } from "@/lib/domain-types";
import { api, APIError } from "@/lib/api";
import { useResource } from "@/lib/use-resource";
import { MessageSquareWarning, Flag, Clock, CheckCircle2, XCircle, Send, Cloud, HardDrive, Mic2, Paperclip, X, Inbox } from "lucide-react";
import { ListRowSkeleton, SkeletonBar } from "@/components/shared/Skeleton";

type FormType = "误判申诉" | "号码举报";
type Scope = "local" | "cloud";

export default function BizAppealPage() {
  const toast = useToast();
  const list = useResource<Appeal>(() => api.appeals.list({ pageSize: 100 }));
  const [type, setType] = useState<FormType>("误判申诉");
  const [number, setNumber] = useState("");
  const [reason, setReason] = useState("");
  const [scope, setScope] = useState<Scope>("local");
  const [file, setFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // 滑动指示条：申诉/举报切换时背景胶囊平滑滑过去
  const tabBarRef = useRef<HTMLDivElement>(null);
  const tabRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const [pill, setPill] = useState<{ left: number; width: number; ready: boolean }>({
    left: 0,
    width: 0,
    ready: false,
  });

  useLayoutEffect(() => {
    const measure = () => {
      const bar = tabBarRef.current;
      const btn = tabRefs.current[type];
      if (!bar || !btn) return;
      const barBox = bar.getBoundingClientRect();
      const btnBox = btn.getBoundingClientRect();
      setPill({
        left: btnBox.left - barBox.left + bar.scrollLeft,
        width: btnBox.width,
        ready: true,
      });
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [type]);

  // 云端号码举报必须带录音附件；本地选填。
  const recordingRequired = type === "号码举报" && scope === "cloud";

  const submit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    if (!number.trim() || !reason.trim()) {
      toast("error", "信息不完整", "请填写号码与详情");
      return;
    }
    if (recordingRequired && !file) {
      toast("error", "缺少录音", "提交到云端的号码举报必须附带通话录音");
      return;
    }
    setSubmitting(true);
    try {
      // 先上传录音（若有）拿到 recordingId，再创建举报。
      let recordingId: string | undefined;
      if (type === "号码举报" && file) {
        try {
          const fd = new FormData();
          fd.append("file", file, file.name);
          fd.append("phone", number.trim());
          fd.append("verdict", "拦截");
          const rec = await api.recordings.upload(fd);
          recordingId = rec.id;
        } catch (e) {
          // 存储未就绪（MinIO 未起）等：云端必传时直接中止；本地可选时降级为不带录音。
          const msg = e instanceof APIError ? e.message : "录音上传失败";
          if (recordingRequired) {
            toast("error", "录音上传失败", msg + "，云端举报暂无法提交");
            setSubmitting(false);
            return;
          }
          toast("error", "录音未上传", msg + "，将仅提交文字举报");
        }
      }
      const created = await api.appeals.create({
        type,
        number: number.trim(),
        reason: reason.trim(),
        status: "处理中",
        ...(type === "号码举报" ? { scope } : {}),
        ...(recordingId ? { recordingId } : {}),
      });
      const dest = type === "号码举报" ? (scope === "cloud" ? "云端·系统管理员" : "本地·企业管理员") : "";
      toast("success", "已提交", `${type}${dest ? " → " + dest : ""} #${(created?.id ?? "").slice(-4)}`);
      setNumber("");
      setReason("");
      setFile(null);
      if (fileRef.current) fileRef.current.value = "";
      list.refresh();
    } catch (e) {
      toast("error", e instanceof APIError ? e.message : "提交失败");
    } finally {
      setSubmitting(false);
    }
  };

  const stats = {
    total: list.items.length,
    pending: list.items.filter((a) => a.status === "处理中").length,
    approved: list.items.filter((a) => a.status === "已通过").length,
    rejected: list.items.filter((a) => a.status === "已驳回").length,
  };

  return (
    <AppShell role="biz" nav={BIZ_NAV} breadcrumb={["SENTINEL", "企业用户", "申诉与举报"]}>
      <PageHeader
        eyebrow="APPEAL & REPORT"
        title="诈骗反馈与申诉"
        desc="提交误判申诉将白名单加回正常号段；提交号码举报推动可疑号码进入云端黑名单库。"
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { k: "全部", v: stats.total, soft: "var(--indigo-soft)", fg: "var(--indigo-deep)" },
          { k: "处理中", v: stats.pending, soft: "var(--amber-soft)", fg: "var(--amber-deep)" },
          { k: "已通过", v: stats.approved, soft: "var(--mint-soft)", fg: "var(--mint-deep)" },
          { k: "已驳回", v: stats.rejected, soft: "var(--coral-soft)", fg: "var(--coral-deep)" },
        ].map((s) => (
          <div key={s.k} className="panel p-5">
            <div className="font-mono text-[calc(10px*var(--fz))] uppercase tracking-[0.14em] font-bold mb-2" style={{ color: s.fg }}>{s.k}</div>
            {list.loading && list.items.length === 0 ? (
              <SkeletonBar className="h-9 w-16" />
            ) : (
              <div className="numplate text-[calc(32px*var(--fz))]" style={{ color: s.fg }}>{s.v}</div>
            )}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-12 gap-5">
        <section className="col-span-12 lg:col-span-5 panel p-6">
          <div
            ref={tabBarRef}
            className="relative flex items-center gap-1 p-1 rounded-full bg-canvas-2 border border-border mb-5"
          >
            {/* 滑动胶囊：随选中项平滑滑动 */}
            <span
              aria-hidden
              className="absolute top-1 bottom-1 rounded-full pointer-events-none"
              style={{
                left: pill.left,
                width: pill.width,
                background: "var(--surface)",
                boxShadow: "var(--shadow-sm)",
                opacity: pill.ready ? 1 : 0,
                transition: pill.ready
                  ? "left 0.42s cubic-bezier(0.22, 1, 0.36, 1), width 0.42s cubic-bezier(0.22, 1, 0.36, 1), opacity 0.2s ease"
                  : "none",
              }}
            />
            {(["误判申诉", "号码举报"] as FormType[]).map((t) => {
              const active = type === t;
              return (
                <button
                  key={t}
                  ref={(el) => { tabRefs.current[t] = el; }}
                  onClick={() => setType(t)}
                  className="relative z-[1] flex-1 flex items-center justify-center gap-2 py-2 rounded-full text-[calc(12px*var(--fz))] font-bold"
                  style={{ color: active ? "var(--ink)" : "var(--ink-soft)", transition: "color 0.32s ease" }}
                >
                  {t === "误判申诉" ? <MessageSquareWarning size={12} /> : <Flag size={12} />}
                  {t}
                </button>
              );
            })}
          </div>

          <form onSubmit={submit} className="space-y-4">
            <Field label="号码">
              <input value={number} onChange={(e) => setNumber(e.target.value)} className="ipt" placeholder={type === "误判申诉" ? "被误判的号码" : "可疑号码"} />
            </Field>
            <Field label="详情说明">
              <textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={6} className="ipt" placeholder={type === "误判申诉" ? "请说明该号码的实际用途、被误判原因…" : "请描述发生的诈骗手法、对方话术、是否有录音证据…"} />
            </Field>

            {type === "号码举报" && (
              <>
                <Field label="提交去向">
                  <div className="grid grid-cols-2 gap-2">
                    {([
                      { v: "local" as Scope, Icon: HardDrive, title: "本地", desc: "企业管理员处理" },
                      { v: "cloud" as Scope, Icon: Cloud, title: "云端", desc: "系统管理员处理" },
                    ]).map((o) => {
                      const active = scope === o.v;
                      return (
                        <button
                          key={o.v}
                          type="button"
                          onClick={() => setScope(o.v)}
                          className="flex items-start gap-2 p-3 rounded-2xl border text-left transition-colors"
                          style={{
                            borderColor: active ? "var(--indigo)" : "var(--border)",
                            background: active ? "var(--indigo-soft)" : "var(--surface)",
                            color: active ? "var(--indigo-deep)" : "var(--ink-soft)",
                            boxShadow: active ? "0 0 0 3px color-mix(in srgb, var(--indigo) 18%, transparent)" : "none",
                          }}
                        >
                          <o.Icon size={16} className="mt-0.5 shrink-0" />
                          <span>
                            <span className="block text-[calc(13px*var(--fz))] font-bold" style={{ color: active ? "var(--indigo-deep)" : "var(--ink)" }}>{o.title}</span>
                            <span className="block text-[calc(11px*var(--fz))] font-medium mt-0.5">{o.desc}</span>
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </Field>

                <Field label={`通话录音${recordingRequired ? "（云端举报必传）" : "（选填）"}`}>
                  <input
                    ref={fileRef}
                    type="file"
                    accept="audio/*"
                    className="hidden"
                    onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                  />
                  {file ? (
                    <div className="flex items-center justify-between gap-2 p-3 rounded-2xl bg-canvas-2 border border-border text-[calc(12px*var(--fz))]">
                      <span className="flex items-center gap-2 min-w-0">
                        <Mic2 size={14} className="text-indigo-deep shrink-0" />
                        <span className="truncate font-mono font-bold">{file.name}</span>
                        <span className="text-ink-soft font-mono shrink-0">{(file.size / 1024).toFixed(0)} KB</span>
                      </span>
                      <button type="button" onClick={() => { setFile(null); if (fileRef.current) fileRef.current.value = ""; }} className="w-7 h-7 rounded-lg hover:bg-coral-soft text-coral-deep flex items-center justify-center shrink-0"><X size={13} /></button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => fileRef.current?.click()}
                      className="w-full flex items-center justify-center gap-2 p-3 rounded-2xl border border-dashed text-[calc(12px*var(--fz))] font-bold text-ink-soft hover:border-indigo"
                      style={{ borderColor: recordingRequired ? "var(--amber)" : "var(--border)" }}
                    >
                      <Paperclip size={14} /> 选择录音文件
                    </button>
                  )}
                  {recordingRequired && (
                    <p className="mt-1.5 font-mono text-[calc(10px*var(--fz))] text-amber-deep font-bold">
                      若对象存储未就绪，云端举报将暂时无法提交，可改为本地提交。
                    </p>
                  )}
                </Field>
              </>
            )}

            {type === "号码举报" && (
              <div className="p-3 rounded-2xl text-[calc(12px*var(--fz))]" style={{ background: "var(--amber-soft)", color: "var(--amber-deep)" }}>
                若已造成损失，请同时拨打反诈专线 96110。
              </div>
            )}
            <button type="submit" disabled={submitting} className="btn-indigo w-full justify-center py-3 text-[calc(14px*var(--fz))]" style={{ width: "100%", opacity: submitting ? 0.6 : 1 }}>
              <Send size={14} /> {submitting ? "提交中…" : `提交${type}`}
            </button>
          </form>

          <style>{`
            .ipt { width: 100%; padding: 12px 14px; border-radius: 14px; border: 1px solid var(--border); background: var(--surface); font-size: 13px; font-weight: 500; }
            .ipt:focus { outline: none; border-color: var(--indigo); box-shadow: 0 0 0 3px color-mix(in srgb, var(--indigo) 18%, transparent); }
          `}</style>
        </section>

        <section className="col-span-12 lg:col-span-7 panel p-6">
          <div className="mb-4">
            <div className="font-mono text-[calc(10px*var(--fz))] uppercase tracking-[0.14em] text-ink-soft font-bold">HISTORY</div>
            <h2 className="font-display text-[calc(20px*var(--fz))] font-extrabold mt-1">历史申诉与举报</h2>
          </div>
          {list.loading && list.items.length === 0 ? (
            <ListRowSkeleton count={5} />
          ) : list.items.length === 0 ? (
            <div className="panel p-12 flex flex-col items-center justify-center text-center">
              <Inbox size={32} className="text-ink-ghost mb-3" />
              <div className="font-display text-[calc(15px*var(--fz))] font-extrabold">暂无申诉或举报记录</div>
              <div className="mt-1 font-mono text-[calc(11px*var(--fz))] uppercase tracking-[0.14em] text-ink-soft font-bold">NO APPEALS OR REPORTS YET</div>
            </div>
          ) : (
            <DataTable<Appeal>
              rows={list.items}
              searchKeys={["number", "reason", "type"]}
              columns={[
                { key: "type", label: "类型", render: (r) => <span className="tag-chip" data-tone={r.type === "误判申诉" ? "indigo" : "coral"}>{r.type}</span> },
                { key: "number", label: "号码", render: (r) => <span className="font-mono font-bold">{r.number}</span> },
                {
                  key: "scope", label: "去向",
                  render: (r) => r.type === "号码举报"
                    ? <span className="font-mono text-[calc(10px*var(--fz))] uppercase tracking-[0.1em] font-bold inline-flex items-center gap-1" style={{ color: r.scope === "cloud" ? "var(--indigo-deep)" : "var(--ink-soft)" }}>
                        {r.scope === "cloud" ? <Cloud size={10} /> : <HardDrive size={10} />}
                        {r.scope === "cloud" ? "云端" : "本地"}
                      </span>
                    : <span className="text-ink-ghost">—</span>,
                },
                { key: "reason", label: "说明", render: (r) => <span className="text-ink-2 line-clamp-1">{r.reason}</span> },
                { key: "status", label: "状态", render: (r) => <StatusPill status={r.status} /> },
                { key: "createdAt", label: "时间", render: (r) => <span className="font-mono text-[calc(11px*var(--fz))] text-ink-soft font-bold">{r.createdAt}</span> },
              ]}
            />
          )}
        </section>
      </div>
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
    <span className="font-mono text-[calc(10px*var(--fz))] uppercase tracking-[0.14em] px-2 py-1 rounded-full font-bold inline-flex items-center gap-1" style={{ background: m.soft, color: m.fg }}>
      <m.Icon size={10} />
      {status}
    </span>
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


