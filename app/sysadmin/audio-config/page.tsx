"use client";
import AppShell from "@/components/AppShell";
import PageHeader from "@/components/shared/PageHeader";
import UploadZone from "@/components/shared/UploadZone";
import { useToast } from "@/components/shared/Toast";
import { useConfirm } from "@/components/shared/Confirm";
import { SYSADMIN_NAV } from "@/lib/nav";
import { type VoiceModel } from "@/lib/mock";
import { api, APIError } from "@/lib/api";
import { useResource } from "@/lib/use-resource";
import { AudioLines, CheckCircle2, Trash2, Mic2, Plus, FileSpreadsheet, Inbox } from "lucide-react";
import { ListRowSkeleton, MiniCardGridSkeleton } from "@/components/shared/Skeleton";

export default function AudioConfigPage() {
  const toast = useToast();
  const confirm = useConfirm();
  const models = useResource<VoiceModel>(() => api.voiceModels.list({ pageSize: 100 }));
  const samples = useResource<{ id: string; name: string; size: number; tag: "synth" | "human"; createdAt: string }>(
    () => api.voiceSamples.list({ pageSize: 100 }),
  );

  const onModelUpload = async (files: { name: string; size: number; lines: number }[]) => {
    let ok = 0;
    for (const f of files) {
      try {
        const fd = new FormData();
        const blob = new Blob([new Uint8Array(0)], { type: "application/octet-stream" });
        fd.append("file", blob, f.name);
        fd.append("version", f.name.replace(/\.[^.]+$/, ""));
        await api.voiceModels.upload(fd);
        ok++;
      } catch (e) {
        toast("error", e instanceof APIError ? e.message : "上传失败");
      }
    }
    if (ok > 0) {
      toast("success", `已上传 ${ok} 个模型版本`);
      models.refresh();
    }
  };

  const activate = async (id: string) => {
    try {
      await api.voiceModels.activate(id);
      toast("success", "已切换激活模型");
      models.refresh();
    } catch (e) {
      toast("error", e instanceof APIError ? e.message : "切换失败");
    }
  };

  const removeModel = async (m: VoiceModel) => {
    const ok = await confirm({
      title: "删除模型版本？",
      desc: `将删除「${m.version}」。已激活的模型无法删除。`,
      tone: "danger",
      confirmText: "删除",
    });
    if (!ok) return;
    try {
      await api.voiceModels.remove(m.id);
      toast("success", "已删除模型");
      models.refresh();
    } catch (e) {
      toast("error", e instanceof APIError ? e.message : "删除失败");
    }
  };

  const addSample = async () => {
    try {
      const fd = new FormData();
      const blob = new Blob([new Uint8Array(0)], { type: "audio/wav" });
      const filename = `sample_${samples.items.length + 1}.wav`;
      fd.append("file", blob, filename);
      fd.append("tag", "synth");
      await api.voiceSamples.upload(fd);
      toast("success", "已新增样本");
      samples.refresh();
    } catch (e) {
      toast("error", e instanceof APIError ? e.message : "上传失败");
    }
  };

  const removeSample = async (s: { id: string; name: string }) => {
    const ok = await confirm({
      title: "删除样本？",
      desc: `将从声纹样本库删除「${s.name}」。`,
      tone: "danger",
      confirmText: "删除",
    });
    if (!ok) return;
    try {
      await api.voiceSamples.remove(s.id);
      toast("success", "已删除");
      samples.refresh();
    } catch (e) {
      toast("error", e instanceof APIError ? e.message : "删除失败");
    }
  };

  const overall = (models.items.find((m) => m.active)?.accuracy ?? 99.0).toFixed(2);

  return (
    <AppShell role="sysadmin" userName="陈安怡" nav={SYSADMIN_NAV} breadcrumb={["SENTINEL", "系统管理员", "音频智能分析配置"]}>
      <PageHeader
        eyebrow="VOICE ANALYSIS"
        title="音频智能分析配置"
        desc="管理声纹样本库、查看检测准确率、上传并切换声纹检测模型版本。"
      />

      <div className="grid grid-cols-12 gap-5 mb-6">
        <div className="col-span-12 lg:col-span-8 panel p-6">
          <div className="flex items-center justify-between mb-5">
            <div>
              <div className="font-mono text-[calc(10px*var(--fz))] uppercase tracking-[0.14em] text-ink-soft font-bold">MODEL VERSIONS</div>
              <h2 className="font-display text-[calc(20px*var(--fz))] font-extrabold mt-1">声纹检测模型版本</h2>
            </div>
          </div>
          {models.loading && models.items.length === 0 ? (
            <ListRowSkeleton count={4} />
          ) : models.items.length === 0 ? (
            <div className="panel p-12 flex flex-col items-center justify-center text-center">
              <Inbox size={32} className="text-ink-ghost mb-3" />
              <div className="font-display text-[calc(15px*var(--fz))] font-extrabold">暂无模型版本</div>
              <div className="mt-1 font-mono text-[calc(11px*var(--fz))] uppercase tracking-[0.14em] text-ink-soft font-bold">NO MODEL VERSIONS YET</div>
            </div>
          ) : (
          <div className="space-y-2">
            {models.items.map((m) => (
              <div key={m.id} className="flex items-center gap-4 p-4 rounded-2xl border border-border hover:bg-canvas-2/60">
                <div className="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0" style={{ background: m.active ? "var(--mint-soft)" : "var(--canvas-2)", color: m.active ? "var(--mint-deep)" : "var(--ink-soft)" }}>
                  <AudioLines size={18} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-display text-[calc(14px*var(--fz))] font-extrabold truncate">{m.version}</div>
                  <div className="mt-0.5 font-mono text-[calc(10px*var(--fz))] uppercase tracking-[0.14em] text-ink-soft font-bold">
                    {m.size} · {m.uploadedAt}
                  </div>
                </div>
                <div className="text-right">
                  <div className="numplate text-[calc(20px*var(--fz))]" style={{ color: m.active ? "var(--mint-deep)" : "var(--ink)" }}>{m.accuracy.toFixed(2)}%</div>
                  <div className="font-mono text-[calc(10px*var(--fz))] uppercase tracking-[0.14em] text-ink-soft font-bold">准确率</div>
                </div>
                {m.active ? (
                  <span className="font-mono text-[calc(10px*var(--fz))] uppercase tracking-[0.14em] px-3 py-1.5 rounded-full font-bold" style={{ background: "var(--mint-soft)", color: "var(--mint-deep)" }}>
                    <CheckCircle2 size={10} className="inline mr-1" /> 已激活
                  </span>
                ) : (
                  <button onClick={() => activate(m.id)} className="btn-ghost py-1.5 px-3 text-[calc(11px*var(--fz))]">切换激活</button>
                )}
                {!m.active && models.items.length > 1 && (
                  <button onClick={() => removeModel(m)} className="w-8 h-8 rounded-lg hover:bg-coral-soft text-coral-deep flex items-center justify-center">
                    <Trash2 size={13} />
                  </button>
                )}
              </div>
            ))}
          </div>
          )}
        </div>

        <aside className="col-span-12 lg:col-span-4 space-y-4">
          <div className="panel p-6 text-center" style={{ background: "linear-gradient(160deg, var(--mint-soft), var(--indigo-soft))" }}>
            <div className="font-mono text-[calc(10px*var(--fz))] uppercase tracking-[0.14em] text-ink-soft font-bold">CURRENT ACCURACY</div>
            <div className="mt-3 numplate text-[calc(64px*var(--fz))] leading-none" style={{ color: "var(--mint-deep)" }}>{overall}%</div>
            <div className="mt-3 text-[calc(12px*var(--fz))] text-ink-2 font-medium">基于近 10 万次离线评估</div>
          </div>
          <div className="panel p-6">
            <div className="font-mono text-[calc(10px*var(--fz))] uppercase tracking-[0.14em] text-ink-soft font-bold mb-3">UPLOAD NEW MODEL</div>
            <UploadZone accept=".onnx,.pt,.bin" hint="ONNX / PyTorch 文件 · ≤ 500 MB" onFiles={onModelUpload} />
          </div>
        </aside>
      </div>

      <div className="panel p-6">
        <div className="flex items-center justify-between mb-5">
          <div>
            <div className="font-mono text-[calc(10px*var(--fz))] uppercase tracking-[0.14em] text-ink-soft font-bold">VOICE SAMPLES</div>
            <h2 className="font-display text-[calc(20px*var(--fz))] font-extrabold mt-1">声纹样本库</h2>
          </div>
          <button
            onClick={addSample}
            className="btn-ghost py-2 px-3 text-[calc(12px*var(--fz))]"
          >
            <Plus size={12} /> 上传样本
          </button>
        </div>
        {samples.loading && samples.items.length === 0 ? (
          <MiniCardGridSkeleton count={8} cols="grid-cols-1 md:grid-cols-2 lg:grid-cols-4" />
        ) : samples.items.length === 0 ? (
          <div className="panel p-12 flex flex-col items-center justify-center text-center">
            <Inbox size={32} className="text-ink-ghost mb-3" />
            <div className="font-display text-[calc(15px*var(--fz))] font-extrabold">声纹样本库为空</div>
            <div className="mt-1 font-mono text-[calc(11px*var(--fz))] uppercase tracking-[0.14em] text-ink-soft font-bold">NO VOICE SAMPLES YET</div>
          </div>
        ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          {samples.items.map((s) => {
            const label = s.tag === "synth" ? "AI 合成" : "真人";
            const isSynth = s.tag === "synth";
            return (
            <div key={s.id} className="p-4 rounded-2xl border border-border">
              <div className="flex items-center gap-2 mb-3">
                <Mic2 size={14} style={{ color: isSynth ? "var(--coral)" : "var(--mint-deep)" }} />
                <span className="font-mono text-[calc(10px*var(--fz))] uppercase tracking-[0.14em] font-bold" style={{ color: isSynth ? "var(--coral-deep)" : "var(--mint-deep)" }}>{label}</span>
                <button onClick={() => removeSample(s)} className="ml-auto text-ink-soft hover:text-coral-deep">
                  <Trash2 size={12} />
                </button>
              </div>
              <div className="font-mono text-[calc(12px*var(--fz))] font-bold truncate">{s.name}</div>
              <div className="mt-1 font-mono text-[calc(10px*var(--fz))] uppercase tracking-[0.12em] text-ink-soft font-bold">
                {(s.size / 1024).toFixed(0)} KB
              </div>
            </div>
            );
          })}
        </div>
        )}
      </div>
    </AppShell>
  );
}
