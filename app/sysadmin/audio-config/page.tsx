"use client";
import { useState } from "react";
import AppShell from "@/components/AppShell";
import PageHeader from "@/components/shared/PageHeader";
import UploadZone from "@/components/shared/UploadZone";
import { useToast } from "@/components/shared/Toast";
import { SYSADMIN_NAV } from "@/lib/nav";
import { SEED, type VoiceModel } from "@/lib/mock";
import { useLocalStorage, uid } from "@/lib/storage";
import { AudioLines, CheckCircle2, Trash2, Mic2, Plus, FileSpreadsheet } from "lucide-react";

export default function AudioConfigPage() {
  const toast = useToast();
  const [models, setModels] = useLocalStorage<VoiceModel[]>("sys.voiceModels", SEED.voiceModels);
  const [samples, setSamples] = useLocalStorage<{ id: string; name: string; size: number; tag: string }[]>("sys.voiceSamples", [
    { id: "vs1", name: "synth_sample_001.wav", size: 384_000, tag: "AI 合成" },
    { id: "vs2", name: "human_sample_001.wav", size: 412_000, tag: "真人" },
    { id: "vs3", name: "synth_sample_002.wav", size: 322_000, tag: "AI 合成" },
    { id: "vs4", name: "human_sample_002.wav", size: 458_000, tag: "真人" },
  ]);

  const onModelUpload = (files: { name: string; size: number; lines: number }[]) => {
    const m: VoiceModel[] = files.map((f) => ({
      id: uid("vm"),
      version: f.name.replace(/\.[^.]+$/, ""),
      accuracy: 99 + Math.random() * 0.5,
      size: `${(f.size / 1024 / 1024).toFixed(1)} MB`,
      uploadedAt: new Date().toISOString().slice(0, 10),
      active: false,
    }));
    setModels((p) => [...m, ...p]);
    toast("success", `已上传 ${files.length} 个模型版本`);
  };

  const activate = (id: string) => {
    setModels((p) => p.map((m) => ({ ...m, active: m.id === id })));
    toast("success", "已切换激活模型");
  };

  const overall = (models.find((m) => m.active)?.accuracy ?? 99.0).toFixed(2);

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
              <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-soft font-bold">MODEL VERSIONS</div>
              <h2 className="font-display text-[20px] font-extrabold mt-1">声纹检测模型版本</h2>
            </div>
          </div>
          <div className="space-y-2">
            {models.map((m) => (
              <div key={m.id} className="flex items-center gap-4 p-4 rounded-2xl border border-border hover:bg-canvas-2/60">
                <div className="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0" style={{ background: m.active ? "var(--mint-soft)" : "var(--canvas-2)", color: m.active ? "var(--mint-deep)" : "var(--ink-soft)" }}>
                  <AudioLines size={18} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-display text-[14px] font-extrabold truncate">{m.version}</div>
                  <div className="mt-0.5 font-mono text-[10px] uppercase tracking-[0.14em] text-ink-soft font-bold">
                    {m.size} · {m.uploadedAt}
                  </div>
                </div>
                <div className="text-right">
                  <div className="numplate text-[20px]" style={{ color: m.active ? "var(--mint-deep)" : "var(--ink)" }}>{m.accuracy.toFixed(2)}%</div>
                  <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-soft font-bold">准确率</div>
                </div>
                {m.active ? (
                  <span className="font-mono text-[10px] uppercase tracking-[0.14em] px-3 py-1.5 rounded-full font-bold" style={{ background: "var(--mint-soft)", color: "var(--mint-deep)" }}>
                    <CheckCircle2 size={10} className="inline mr-1" /> 已激活
                  </span>
                ) : (
                  <button onClick={() => activate(m.id)} className="btn-ghost py-1.5 px-3 text-[11px]">切换激活</button>
                )}
                {!m.active && models.length > 1 && (
                  <button onClick={() => { setModels((p) => p.filter((x) => x.id !== m.id)); toast("success", "已删除模型"); }} className="w-8 h-8 rounded-lg hover:bg-coral-soft text-coral-deep flex items-center justify-center">
                    <Trash2 size={13} />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        <aside className="col-span-12 lg:col-span-4 space-y-4">
          <div className="panel p-6 text-center" style={{ background: "linear-gradient(160deg, var(--mint-soft), var(--indigo-soft))" }}>
            <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-soft font-bold">CURRENT ACCURACY</div>
            <div className="mt-3 numplate text-[64px] leading-none" style={{ color: "var(--mint-deep)" }}>{overall}%</div>
            <div className="mt-3 text-[12px] text-ink-2 font-medium">基于近 10 万次离线评估</div>
          </div>
          <div className="panel p-6">
            <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-soft font-bold mb-3">UPLOAD NEW MODEL</div>
            <UploadZone accept=".onnx,.pt,.bin" hint="ONNX / PyTorch 文件 · ≤ 500 MB" onFiles={onModelUpload} />
          </div>
        </aside>
      </div>

      <div className="panel p-6">
        <div className="flex items-center justify-between mb-5">
          <div>
            <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-soft font-bold">VOICE SAMPLES</div>
            <h2 className="font-display text-[20px] font-extrabold mt-1">声纹样本库</h2>
          </div>
          <button
            onClick={() => {
              setSamples((p) => [...p, { id: uid("vs"), name: `sample_${p.length + 1}.wav`, size: 360_000, tag: "AI 合成" }]);
              toast("success", "已新增样本");
            }}
            className="btn-ghost py-2 px-3 text-[12px]"
          >
            <Plus size={12} /> 上传样本
          </button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          {samples.map((s) => (
            <div key={s.id} className="p-4 rounded-2xl border border-border">
              <div className="flex items-center gap-2 mb-3">
                <Mic2 size={14} style={{ color: s.tag === "AI 合成" ? "var(--coral)" : "var(--mint-deep)" }} />
                <span className="font-mono text-[10px] uppercase tracking-[0.14em] font-bold" style={{ color: s.tag === "AI 合成" ? "var(--coral-deep)" : "var(--mint-deep)" }}>{s.tag}</span>
                <button onClick={() => { setSamples((p) => p.filter((x) => x.id !== s.id)); toast("success", "已删除"); }} className="ml-auto text-ink-soft hover:text-coral-deep">
                  <Trash2 size={12} />
                </button>
              </div>
              <div className="font-mono text-[12px] font-bold truncate">{s.name}</div>
              <div className="mt-1 font-mono text-[10px] uppercase tracking-[0.12em] text-ink-soft font-bold">
                {(s.size / 1024).toFixed(0)} KB
              </div>
            </div>
          ))}
        </div>
      </div>
    </AppShell>
  );
}
