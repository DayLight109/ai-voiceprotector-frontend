"use client";
import { useState } from "react";
import { useToast } from "@/components/shared/Toast";
import Toggle from "@/components/shared/Toggle";
import { api, APIError } from "@/lib/api";
import { useResource, useSingle } from "@/lib/use-resource";
import { Plus, Trash2, Sliders } from "lucide-react";

export type RiskRule = { id: string; level: 1 | 2 | 3 | 4 | 5; keyword: string; weight: number; enabled: boolean };

const LEVELS = [
  { k: 1, label: "L1 · 仅记录", desc: "记录通话特征但不打断", color: "var(--mint-deep)", soft: "var(--mint-soft)" },
  { k: 2, label: "L2 · 提示", desc: "命中后屏幕轻量提示", color: "var(--mint)", soft: "var(--mint-soft)" },
  { k: 3, label: "L3 · 弹窗预警", desc: "强制弹窗 + 家属同步", color: "var(--amber)", soft: "var(--amber-soft)" },
  { k: 4, label: "L4 · 中断 + 取证", desc: "中断通话并加密留存", color: "var(--coral)", soft: "var(--coral-soft)" },
  { k: 5, label: "L5 · 全域阻断", desc: "拉黑号段并联动运营商", color: "var(--coral-deep)", soft: "var(--coral-soft)" },
] as const;

export default function RiskLevelEditor({ storageKey }: { storageKey?: string }) {
  const toast = useToast();
  const rules = useResource<RiskRule>(() => api.riskLevel.listRules({ pageSize: 100 }));
  const state = useSingle(() => api.riskLevel.getState());
  const active = (state.data?.activeLevel ?? 3) as 1 | 2 | 3 | 4 | 5;
  const view = rules.items.filter((r) => r.level === active);

  const setActive = async (lvl: 1 | 2 | 3 | 4 | 5) => {
    try {
      await api.riskLevel.setState(lvl);
      state.refresh();
    } catch (e) {
      toast("error", e instanceof APIError ? e.message : "切换失败");
    }
  };

  const addRule = async () => {
    try {
      await api.riskLevel.createRule({ level: active, keyword: "新规则", weight: 60, enabled: true });
      toast("success", "已新增规则", `L${active}`);
      rules.refresh();
    } catch (e) {
      toast("error", e instanceof APIError ? e.message : "新增失败");
    }
  };

  const update = async (id: string, patch: Partial<RiskRule>) => {
    try {
      await api.riskLevel.updateRule(id, patch);
      rules.refresh();
    } catch (e) {
      toast("error", e instanceof APIError ? e.message : "保存失败");
    }
  };
  const remove = async (id: string) => {
    try {
      await api.riskLevel.removeRule(id);
      toast("success", "已删除");
      rules.refresh();
    } catch (e) {
      toast("error", e instanceof APIError ? e.message : "删除失败");
    }
  };

  return (
    <div className="space-y-5">
      {/* 等级条 */}
      <div className="grid grid-cols-5 gap-2">
        {LEVELS.map((l) => {
          const cur = l.k === active;
          return (
            <button
              key={l.k}
              onClick={() => setActive(l.k as any)}
              className="p-4 rounded-2xl border-2 text-left transition-all"
              style={{
                borderColor: cur ? l.color : "var(--border)",
                background: cur ? l.soft : "var(--surface)",
              }}
            >
              <div className="font-mono text-[10px] uppercase tracking-[0.14em] font-bold" style={{ color: cur ? l.color : "var(--ink-soft)" }}>
                {l.label}
              </div>
              <div className="mt-1 text-[12px] font-medium" style={{ color: cur ? "var(--ink)" : "var(--ink-soft)" }}>{l.desc}</div>
              <div className="mt-3 numplate text-[20px]" style={{ color: l.color }}>
                {rules.items.filter((r) => r.level === l.k).length}
              </div>
            </button>
          );
        })}
      </div>

      <div className="panel p-6">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
          <div>
            <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-soft font-bold">CUSTOM RULES</div>
            <h3 className="font-display text-[18px] font-extrabold mt-0.5">L{active} · 自定义规则 · {view.length} 条</h3>
          </div>
          <button onClick={addRule} className="btn-indigo py-2 px-3 text-[12px]">
            <Plus size={12} /> 新增规则
          </button>
        </div>

        {view.length === 0 ? (
          <div className="py-12 text-center text-ink-soft">
            <Sliders size={28} className="mx-auto text-ink-ghost mb-2" />
            <div className="font-display text-[14px] font-extrabold">本级别尚未配置规则</div>
            <div className="mt-1 text-[12px]">点击右上角新增</div>
          </div>
        ) : (
          <div className="space-y-2">
            {view.map((r) => (
              <RuleRow key={r.id} rule={r} onUpdate={update} onRemove={remove} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function RuleRow({
  rule,
  onUpdate,
  onRemove,
}: {
  rule: RiskRule;
  onUpdate: (id: string, patch: Partial<RiskRule>) => void;
  onRemove: (id: string) => void;
}) {
  const [keyword, setKeyword] = useState(rule.keyword);
  const [weight, setWeight] = useState(rule.weight);
  return (
    <div className="grid grid-cols-12 gap-3 p-3 rounded-2xl hover:bg-canvas-2/60 border border-border">
      <div className="col-span-12 md:col-span-6">
        <input
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          onBlur={() => { if (keyword !== rule.keyword) onUpdate(rule.id, { keyword }); }}
          className="w-full px-3 py-2 rounded-xl bg-surface border border-border text-[13px] font-medium focus:outline-none focus:border-indigo"
        />
      </div>
      <div className="col-span-6 md:col-span-3 flex items-center gap-2">
        <input
          type="number"
          min={0}
          max={100}
          value={weight}
          onChange={(e) => setWeight(Number(e.target.value))}
          onBlur={() => { if (weight !== rule.weight) onUpdate(rule.id, { weight }); }}
          className="w-20 px-3 py-2 rounded-xl bg-surface border border-border text-[13px] font-mono font-bold focus:outline-none focus:border-indigo"
        />
        <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-soft font-bold">权重</span>
      </div>
      <div className="col-span-3 md:col-span-2 flex items-center gap-2">
        <Toggle checked={rule.enabled} onChange={(v) => onUpdate(rule.id, { enabled: v })} />
        <span className="font-mono text-[10px] uppercase tracking-[0.14em] font-bold" style={{ color: rule.enabled ? "var(--mint-deep)" : "var(--ink-soft)" }}>
          {rule.enabled ? "启用" : "停用"}
        </span>
      </div>
      <div className="col-span-3 md:col-span-1 flex items-center justify-end">
        <button onClick={() => onRemove(rule.id)} className="w-8 h-8 rounded-lg hover:bg-coral-soft text-coral-deep flex items-center justify-center">
          <Trash2 size={13} />
        </button>
      </div>
    </div>
  );
}
