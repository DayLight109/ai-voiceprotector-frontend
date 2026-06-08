"use client";
import { useEffect, useState } from "react";
import AppShell from "@/components/AppShell";
import PageHeader from "@/components/shared/PageHeader";
import FormRow from "@/components/shared/FormRow";
import Toggle from "@/components/shared/Toggle";
import { useToast } from "@/components/shared/Toast";
import { SYSADMIN_NAV } from "@/lib/nav";
import { api, APIError } from "@/lib/api";
import { Bot, Save, Sparkles, MessageSquare, Cpu, Plus, Trash2 } from "lucide-react";

type WhisperCfg = { model: "tiny" | "base" | "small" | "medium" | "large-v3"; language: string; vadFilter: boolean; beamSize: number; temperature: number };
type QwenCfg = { model: string; endpoint: string; apiKey: string; temperature: number; topP: number; maxTokens: number; systemPrompt: string };

const DEFAULT_DW: string[] = ["AI 合成可疑", "境外信令", "公检法冒充", "客服伪冒", "刷单返利"];
const DEFAULT_W: WhisperCfg = { model: "large-v3", language: "zh", vadFilter: true, beamSize: 5, temperature: 0.0 };
const DEFAULT_Q: QwenCfg = {
  model: "qwen-max",
  endpoint: "https://dashscope.aliyuncs.com/api/v1/services/aigc/text-generation/generation",
  apiKey: "sk-***********************",
  temperature: 0.2,
  topP: 0.9,
  maxTokens: 1024,
  systemPrompt: "你是一名反诈通话分析专家。请判定通话内容是否构成电信诈骗，并按 5 类标签 + 置信度输出 JSON。",
};

export default function AgentsPage() {
  const toast = useToast();
  const [tab, setTab] = useState<"display" | "whisper" | "qwen">("display");
  const [displayWords, setDisplayWords] = useState<string[]>(DEFAULT_DW);
  const [w, setW] = useState<WhisperCfg>(DEFAULT_W);
  const [q, setQ] = useState<QwenCfg>(DEFAULT_Q);

  useEffect(() => {
    api.agents.getDisplayWords()
      .then((v) => {
        if (Array.isArray(v)) setDisplayWords(v);
        else if (v && Array.isArray((v as any).value)) setDisplayWords((v as any).value);
      })
      .catch(() => {});
    api.agents.getWhisper()
      .then((v) => { if (v && typeof v === "object") setW({ ...DEFAULT_W, ...v }); })
      .catch(() => {});
    api.agents.getQwen()
      .then((v) => { if (v && typeof v === "object") setQ({ ...DEFAULT_Q, ...v }); })
      .catch(() => {});
  }, []);

  const saveDisplay = async () => {
    try {
      await api.agents.setDisplayWords(displayWords);
      toast("success", "已保存显示词");
    } catch (e) {
      toast("error", e instanceof APIError ? e.message : "保存失败");
    }
  };
  const saveWhisper = async () => {
    try {
      await api.agents.setWhisper(w);
      toast("success", "已保存 Whisper 配置");
    } catch (e) {
      toast("error", e instanceof APIError ? e.message : "保存失败");
    }
  };
  const saveQwen = async () => {
    try {
      await api.agents.setQwen(q);
      toast("success", "已保存千问配置");
    } catch (e) {
      toast("error", e instanceof APIError ? e.message : "保存失败");
    }
  };

  return (
    <AppShell role="sysadmin" userName="陈安怡" nav={SYSADMIN_NAV} breadcrumb={["SENTINEL", "系统管理员", "智能体管理"]}>
      <PageHeader
        eyebrow="AGENT CONFIG"
        title="智能体管理"
        desc="配置端侧显示词、Whisper 语音转写参数与千问 LLM 判定参数。"
      />

      <div className="flex items-center gap-1 p-1 rounded-full bg-canvas-2 border border-border mb-6 inline-flex">
        {[
          { k: "display", label: "显示词配置", icon: Sparkles },
          { k: "whisper", label: "Whisper 参数", icon: MessageSquare },
          { k: "qwen", label: "千问参数", icon: Cpu },
        ].map((t) => {
          const active = t.k === tab;
          return (
            <button key={t.k} onClick={() => setTab(t.k as any)} className="flex items-center gap-2 px-4 py-2 rounded-full text-[calc(12px*var(--fz))] font-bold transition-colors" style={{ background: active ? "var(--surface)" : "transparent", color: active ? "var(--ink)" : "var(--ink-soft)", boxShadow: active ? "var(--shadow-sm)" : "none" }}>
              <t.icon size={12} />
              {t.label}
            </button>
          );
        })}
      </div>

      {tab === "display" && (
        <div className="panel p-6 max-w-3xl">
          <div className="flex items-center gap-2 mb-4">
            <Bot size={16} style={{ color: "var(--indigo)" }} />
            <h3 className="font-display text-[calc(16px*var(--fz))] font-extrabold">屏幕显示词</h3>
          </div>
          <p className="text-[calc(13px*var(--fz))] text-ink-soft font-medium mb-4">
            命中判定后，端侧 App 将以下列文案展示给用户。最多可配置 12 条。
          </p>
          <div className="space-y-2 mb-4">
            {displayWords.map((w, i) => (
              <div key={i} className="flex items-center gap-2">
                <input
                  value={w}
                  onChange={(e) => setDisplayWords(displayWords.map((x, j) => (j === i ? e.target.value : x)))}
                  className="flex-1 px-3 py-2.5 rounded-xl bg-surface border border-border text-[calc(13px*var(--fz))] font-medium focus:outline-none focus:border-indigo"
                />
                <button onClick={() => setDisplayWords(displayWords.filter((_, j) => j !== i))} className="w-9 h-9 rounded-lg hover:bg-coral-soft text-coral-deep flex items-center justify-center">
                  <Trash2 size={13} />
                </button>
              </div>
            ))}
          </div>
          <button onClick={() => setDisplayWords([...displayWords, "新提示词"])} disabled={displayWords.length >= 12} className="btn-ghost py-2 px-3 text-[calc(12px*var(--fz))] disabled:opacity-50">
            <Plus size={12} /> 添加词条 · {displayWords.length} / 12
          </button>
          <div className="mt-5 text-right">
            <button onClick={saveDisplay} className="btn-indigo py-2.5 px-5 text-[calc(13px*var(--fz))]"><Save size={14} /> 保存</button>
          </div>
        </div>
      )}

      {tab === "whisper" && (
        <div className="panel p-6 max-w-3xl">
          <div className="flex items-center gap-2 mb-4">
            <MessageSquare size={16} style={{ color: "var(--indigo)" }} />
            <h3 className="font-display text-[calc(16px*var(--fz))] font-extrabold">Whisper 语音转写</h3>
          </div>
          <Field label="模型版本">
            <select value={w.model} onChange={(e) => setW({ ...w, model: e.target.value as any })} className="ipt">
              {["tiny", "base", "small", "medium", "large-v3"].map((m) => <option key={m}>{m}</option>)}
            </select>
          </Field>
          <Field label="主要语言">
            <select value={w.language} onChange={(e) => setW({ ...w, language: e.target.value })} className="ipt">
              <option value="zh">中文 (zh)</option>
              <option value="en">英文 (en)</option>
              <option value="auto">自动检测</option>
            </select>
          </Field>
          <Field label={`Beam Size · ${w.beamSize}`}>
            <input type="range" min={1} max={10} value={w.beamSize} onChange={(e) => setW({ ...w, beamSize: Number(e.target.value) })} className="w-full" />
          </Field>
          <Field label={`Temperature · ${w.temperature.toFixed(2)}`}>
            <input type="range" min={0} max={1} step={0.05} value={w.temperature} onChange={(e) => setW({ ...w, temperature: Number(e.target.value) })} className="w-full" />
          </Field>
          <FormRow label="VAD 过滤" desc="启用静音段检测以加速推理">
            <Toggle checked={w.vadFilter} onChange={(v) => setW({ ...w, vadFilter: v })} />
          </FormRow>
          <div className="mt-5 text-right">
            <button onClick={saveWhisper} className="btn-indigo py-2.5 px-5 text-[calc(13px*var(--fz))]"><Save size={14} /> 保存</button>
          </div>
          <Style />
        </div>
      )}

      {tab === "qwen" && (
        <div className="panel p-6 max-w-3xl">
          <div className="flex items-center gap-2 mb-4">
            <Cpu size={16} style={{ color: "var(--indigo)" }} />
            <h3 className="font-display text-[calc(16px*var(--fz))] font-extrabold">千问 LLM 参数</h3>
          </div>
          <Field label="模型">
            <select value={q.model} onChange={(e) => setQ({ ...q, model: e.target.value })} className="ipt">
              {["qwen-max", "qwen-plus", "qwen-turbo", "qwen2.5-72b-instruct"].map((m) => <option key={m}>{m}</option>)}
            </select>
          </Field>
          <Field label="Endpoint">
            <input value={q.endpoint} onChange={(e) => setQ({ ...q, endpoint: e.target.value })} className="ipt font-mono text-[calc(12px*var(--fz))]" />
          </Field>
          <Field label="API Key">
            <input value={q.apiKey} onChange={(e) => setQ({ ...q, apiKey: e.target.value })} className="ipt font-mono text-[calc(12px*var(--fz))]" />
          </Field>
          <Field label={`Temperature · ${q.temperature.toFixed(2)}`}>
            <input type="range" min={0} max={1} step={0.05} value={q.temperature} onChange={(e) => setQ({ ...q, temperature: Number(e.target.value) })} className="w-full" />
          </Field>
          <Field label={`Top-P · ${q.topP.toFixed(2)}`}>
            <input type="range" min={0} max={1} step={0.05} value={q.topP} onChange={(e) => setQ({ ...q, topP: Number(e.target.value) })} className="w-full" />
          </Field>
          <Field label="Max Tokens">
            <input type="number" value={q.maxTokens} onChange={(e) => setQ({ ...q, maxTokens: Number(e.target.value) })} className="ipt" />
          </Field>
          <Field label="System Prompt">
            <textarea value={q.systemPrompt} onChange={(e) => setQ({ ...q, systemPrompt: e.target.value })} rows={4} className="ipt" />
          </Field>
          <div className="mt-5 text-right">
            <button onClick={saveQwen} className="btn-indigo py-2.5 px-5 text-[calc(13px*var(--fz))]"><Save size={14} /> 保存</button>
          </div>
          <Style />
        </div>
      )}
    </AppShell>
  );
}

function Field({ label, children }: any) {
  return (
    <div className="mb-4">
      <label className="font-mono text-[calc(10px*var(--fz))] uppercase tracking-[0.14em] text-ink-soft font-bold block mb-1.5">{label}</label>
      {children}
    </div>
  );
}

function Style() {
  return <style>{`.ipt{width:100%;padding:12px 14px;border-radius:14px;border:1px solid var(--border);background:var(--surface);font-size:13px;font-weight:500}.ipt:focus{outline:none;border-color:var(--indigo);box-shadow:0 0 0 3px color-mix(in srgb, var(--indigo) 18%, transparent)}`}</style>;
}
