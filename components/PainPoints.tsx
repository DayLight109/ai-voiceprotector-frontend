import { Fingerprint, MessageSquareWarning, PhoneOff, Boxes } from "lucide-react";

const PAINS = [
  {
    id: "01", icon: PhoneOff, title: "显示号码可伪造",
    desc: "信令层穿透后，+86 的家乡号可能来自金边机房。归属地识别只是纸糊的围墙。",
    tag: "Origin", tint: "var(--coral)", soft: "var(--coral-soft)", deep: "var(--coral-deep)",
  },
  {
    id: "02", icon: Fingerprint, title: "AI 声音可克隆",
    desc: "3 秒抖音片段足以训练出 85% 相似度的声纹。熟人来电不再意味着熟人本人。",
    tag: "Voiceprint", tint: "var(--indigo)", soft: "var(--indigo-soft)", deep: "var(--indigo-deep)",
  },
  {
    id: "03", icon: MessageSquareWarning, title: "话术无法实时识别",
    desc: "\"公安传票\"、\"安全账户\"、\"验证码\"——关键词早被熟知，但没有工具能在通话中打断。",
    tag: "Script", tint: "var(--amber)", soft: "var(--amber-soft)", deep: "var(--amber-deep)",
  },
  {
    id: "04", icon: Boxes, title: "现有工具各管一段",
    desc: "运营商拦号段、反诈中心靠举报、手机系统看黑名单。没人把三件事合在同一毫秒做。",
    tag: "Fragmented", tint: "var(--mint)", soft: "var(--mint-soft)", deep: "var(--mint-deep)",
  },
];

export default function PainPoints() {
  return (
    <section className="relative py-24 md:py-32 bg-canvas-2 overflow-hidden">
      <div className="absolute inset-0 dot-grid-fine opacity-40" />
      <div className="relative max-w-[1400px] mx-auto px-5 md:px-8">
        <div className="mb-16 max-w-3xl">
          <div className="section-idx mb-4"><b>03</b>老旧防线的四个破口</div>
          <h2 className="mega text-[clamp(2.4rem,5.5vw,5rem)]">
            老办法
            <br />
            <span className="mega-italic" style={{ color: "var(--coral)" }}>挡不住</span> 新骗局。
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {PAINS.map((p) => (
            <div
              key={p.id}
              className="group relative panel panel-lift p-7 md:p-9 overflow-hidden"
            >
              <div
                className="absolute -top-16 -right-16 w-44 h-44 rounded-full opacity-50 transition-transform duration-500 group-hover:scale-125"
                style={{ background: p.soft }}
              />
              <div className="relative flex items-start justify-between mb-8">
                <div
                  className="w-14 h-14 rounded-2xl flex items-center justify-center shadow-md"
                  style={{ background: p.tint, color: "#FFFFFF" }}
                >
                  <p.icon size={24} strokeWidth={2} />
                </div>
                <div className="flex flex-col items-end gap-2">
                  <span className="font-mono text-[calc(11px*var(--fz))] font-bold text-ink-soft">破口 / {p.id}</span>
                  <span
                    className="font-mono text-[calc(10px*var(--fz))] font-bold px-2.5 py-1 rounded-full"
                    style={{ background: p.soft, color: p.deep }}
                  >
                    {p.tag}
                  </span>
                </div>
              </div>
              <h3 className="relative font-display text-[calc(26px*var(--fz))] md:text-[calc(30px*var(--fz))] font-extrabold tracking-tight leading-[1.15]">
                {p.title}
              </h3>
              <p className="relative mt-4 text-[calc(14px*var(--fz))] leading-[1.75] text-ink-2 font-medium max-w-[46ch]">
                {p.desc}
              </p>
              <div
                className="absolute bottom-0 right-5 numplate text-[calc(140px*var(--fz))] md:text-[calc(180px*var(--fz))] leading-none select-none pointer-events-none"
                style={{ color: p.soft, opacity: 0.6 }}
              >
                {p.id}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
