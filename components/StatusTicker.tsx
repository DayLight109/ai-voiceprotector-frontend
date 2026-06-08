const ITEMS = [
  "公安部 · 2025 全国侦破电信网络诈骗 25.8 万起",
  "全年拦截诈骗电话 36 亿次 · 短信 33 亿条",
  "AI 仅需 3 秒音频即可克隆声音 · 相似度 85%",
  "70% 的人无法区分 AI 合成与真人语音",
  "2024 H1 AI 诈骗涉案金额同比 +1928.8%",
  "《反电信网络诈骗法》§25 · 强制实时监测",
  "公安部紧急止付冻结资金 2,170.7 万元",
];

export default function StatusTicker() {
  const items = [...ITEMS, ...ITEMS, ...ITEMS];
  return (
    <div className="relative bg-deep text-canvas overflow-hidden">
      <div className="flex items-center">
        <div
          className="hidden md:flex shrink-0 items-center gap-2 px-7 py-3 text-white"
          style={{ background: "var(--indigo)" }}
        >
          <span className="signal-dot text-coral" />
          <span className="font-mono text-[calc(15px*var(--fz))] font-bold uppercase tracking-[0.18em]">
            Live · 实时态势
          </span>
        </div>
        <div className="relative flex-1 overflow-hidden">
          <div className="marquee-track whitespace-nowrap py-3">
            {items.map((t, i) => (
              <span
                key={i}
                className="inline-flex items-center gap-3 font-body text-[calc(15px*var(--fz))] font-medium"
                style={{ color: "rgba(242, 243, 247, 0.85)" }}
              >
                <span style={{ color: "var(--mint)" }}>▸</span>
                {t}
              </span>
            ))}
          </div>
          <div className="absolute inset-y-0 left-0 w-12 bg-gradient-to-r from-deep to-transparent pointer-events-none" />
          <div className="absolute inset-y-0 right-0 w-12 bg-gradient-to-l from-deep to-transparent pointer-events-none" />
        </div>
      </div>
    </div>
  );
}
