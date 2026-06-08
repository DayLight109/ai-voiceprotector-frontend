import { Radio, Waves, ScanLine, CheckCircle2, AlertTriangle, Ban } from "lucide-react";

const LAYERS = [
  {
    id: "L1", icon: Radio, title: "来电溯源", en: "Origin Trace",
    tint: "var(--indigo)", soft: "var(--indigo-soft)", deep: "var(--indigo-deep)",
    checks: ["SS7 / SIP 信令层回溯", "号段归属实时校验", "境外跳转链路标记"],
    latency: "22ms",
    sample: { shown: "+86 138 0013 xxxx", actual: "+855 23 Phnom Penh", hops: "5 跳" },
  },
  {
    id: "L2", icon: Waves, title: "声纹取证", en: "Voiceprint Forensics",
    tint: "var(--mint-deep)", soft: "var(--mint-soft)", deep: "var(--mint-deep)",
    checks: ["合成特征 (F0 抖动 / 呼吸)", "端到端 ONNX 推理", "SYNTH / HUMAN 二元判决"],
    latency: "61ms",
    sample: { synth: "0.94", f0: "不稳定", breath: "缺失" },
  },
  {
    id: "L3", icon: ScanLine, title: "话术语义", en: "Script NLU",
    tint: "var(--coral)", soft: "var(--coral-soft)", deep: "var(--coral-deep)",
    checks: ["5 类欺诈词典匹配", "转账 · 权威 · 紧迫语义模型", "实时打断 + 亲属同步"],
    latency: "37ms",
    sample: { cat: "转账指令", phrase: "\"打到安全账户\"", weight: "0.92" },
  },
];

const STATUS = [
  { icon: CheckCircle2, label: "SAFE", cls: "pill-mint", desc: "三路一致可信" },
  { icon: AlertTriangle, label: "WATCH", cls: "pill-amber", desc: "任一路预警" },
  { icon: Ban, label: "BLOCK", cls: "pill-coral", desc: "三路加权拦截" },
];

export default function DefenseStack() {
  return (
    <section id="defense" className="relative py-24 md:py-32 bg-canvas">
      <div className="max-w-[1400px] mx-auto px-5 md:px-8">
        <div className="mb-16 grid grid-cols-12 gap-6 items-end">
          <div className="col-span-12 md:col-span-8">
            <div className="section-idx mb-4"><b>04</b>三层判决机制</div>
            <h2 className="mega text-[clamp(2.4rem,5.5vw,5rem)]">
              三把锁，
              <br />
              <span className="mega-italic" style={{ color: "var(--coral)" }}>同时</span> 落下。
            </h2>
          </div>
          <div className="col-span-12 md:col-span-4 text-[calc(15px*var(--fz))] leading-[1.75] text-ink-2 font-medium">
            单层引擎必然存在漏判。SENTINEL 把溯源、声纹、话术并联执行——
            取三路中最差两路加权融合，单路误报不会升级为拦截。
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {LAYERS.map((l, i) => (
            <div
              key={l.id}
              className="relative panel panel-lift p-6 md:p-7 overflow-hidden"
            >
              <div
                className="absolute -top-16 -right-16 w-40 h-40 rounded-full opacity-50"
                style={{ background: l.soft }}
              />

              <div className="relative flex items-start justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div
                    className="w-12 h-12 rounded-2xl flex items-center justify-center shadow-md"
                    style={{ background: l.tint, color: "#FFFFFF" }}
                  >
                    <l.icon size={20} />
                  </div>
                  <div>
                    <div className="font-mono text-[calc(10px*var(--fz))] uppercase tracking-[0.14em] text-ink-soft font-bold">
                      Layer · {l.id}
                    </div>
                    <div className="font-display text-[calc(22px*var(--fz))] font-extrabold tracking-tight">{l.title}</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-mono text-[calc(10px*var(--fz))] uppercase tracking-[0.14em] text-ink-soft font-bold">延迟</div>
                  <div className="numplate text-[calc(20px*var(--fz))]" style={{ color: l.deep }}>{l.latency}</div>
                </div>
              </div>

              <div
                className="relative inline-block font-mono text-[calc(11px*var(--fz))] font-bold px-2.5 py-1 rounded-full mb-4"
                style={{ background: l.soft, color: l.deep }}
              >
                {l.en}
              </div>

              <ul className="relative space-y-2.5 mb-6">
                {l.checks.map((c) => (
                  <li key={c} className="flex items-start gap-2.5 text-[calc(13px*var(--fz))] font-medium text-ink-2">
                    <span
                      className="mt-[6px] w-1.5 h-1.5 rounded-full shrink-0"
                      style={{ background: l.tint }}
                    />
                    <span>{c}</span>
                  </li>
                ))}
              </ul>

              <div className="relative p-3.5 rounded-2xl bg-canvas-2 space-y-1.5">
                {Object.entries(l.sample).map(([k, v]) => (
                  <div key={k} className="flex items-center justify-between gap-3 font-mono text-[calc(12px*var(--fz))]">
                    <span className="text-ink-soft uppercase text-[calc(10px*var(--fz))] font-bold">{k}</span>
                    <span className="text-ink font-semibold truncate">{v}</span>
                  </div>
                ))}
              </div>

              <div className="absolute top-3 right-3 numplate text-[calc(13px*var(--fz))] text-ink-soft">
                0{i + 1}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-8 panel-deep p-6 md:p-8 relative overflow-hidden">
          <div className="absolute -bottom-16 -left-16 w-64 h-64 rounded-full opacity-20 blob-indigo" />
          <div className="relative flex flex-wrap items-center justify-between gap-6">
            <div>
              <span className="pill pill-mint mb-3">Fusion · 风险融合判决</span>
              <div className="font-display text-[calc(26px*var(--fz))] md:text-[calc(32px*var(--fz))] font-extrabold tracking-tight leading-[1.15] text-white">
                三路并联 → 最差两路 7:3 加权 → SAFE / WATCH / BLOCK
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              {STATUS.map((s) => (
                <div key={s.label} className="flex items-center gap-3 pl-4 border-l border-white/15">
                  <span className={`pill ${s.cls}`}>
                    <s.icon size={12} />
                    {s.label}
                  </span>
                  <span className="text-[calc(12px*var(--fz))] text-white/75 font-medium">{s.desc}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
