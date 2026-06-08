import { ArrowRight, Heart, HandHeart, Sparkles } from "lucide-react";
import Link from "next/link";

const VALUES = [
  {
    icon: Heart, num: "01",
    title: "让长辈不再独自面对陌生来电",
    body: "屏幕大字、亲属同步、自动拦截——把不对等的认知鸿沟抹平在算法一侧。",
    tint: "var(--coral)", soft: "var(--coral-soft)", deep: "var(--coral-deep)",
  },
  {
    icon: HandHeart, num: "02",
    title: "让一线反诈民警腾出时间",
    body: "把可自动判决的通话交给机器，把复杂案件的精力留给人类专家。",
    tint: "var(--indigo)", soft: "var(--indigo-soft)", deep: "var(--indigo-deep)",
  },
  {
    icon: Sparkles, num: "03",
    title: "让 AI 从风险变成屏障",
    body: "合成技术既是威胁也是武器。我们把武器交给公众，而不是留给黑产。",
    tint: "var(--mint-deep)", soft: "var(--mint-soft)", deep: "var(--mint-deep)",
  },
];

export default function SocialValue() {
  return (
    <section className="relative py-24 md:py-32 bg-canvas-2 overflow-hidden">
      <div className="absolute -right-24 top-24 w-[40vw] h-[40vw] rounded-full blob-indigo opacity-40" />
      <div className="relative max-w-[1400px] mx-auto px-5 md:px-8">
        <div className="mb-14 grid grid-cols-12 gap-6 items-end">
          <div className="col-span-12 md:col-span-8">
            <div className="section-idx mb-4"><b>10</b>社会价值</div>
            <h2 className="mega text-[clamp(2.4rem,5.5vw,5rem)]">
              技术的温度，
              <br />
              藏在<span className="underline-soft">每一次挂断</span>里。
            </h2>
          </div>
        </div>

        <div className="grid grid-cols-12 gap-5">
          {VALUES.map((v) => (
            <article
              key={v.num}
              className="col-span-12 md:col-span-4 panel panel-lift p-7 md:p-8 relative overflow-hidden"
            >
              <div className="absolute -top-16 -right-16 w-48 h-48 rounded-full opacity-40" style={{ background: v.soft }} />
              <div className="relative flex items-start justify-between mb-10">
                <div
                  className="w-14 h-14 rounded-2xl flex items-center justify-center text-white shadow-md"
                  style={{ background: v.tint }}
                >
                  <v.icon size={22} strokeWidth={2} />
                </div>
                <span className="numplate text-[calc(22px*var(--fz))]" style={{ color: v.deep }}>{v.num}</span>
              </div>
              <h3 className="relative font-display text-[calc(22px*var(--fz))] md:text-[calc(24px*var(--fz))] font-extrabold tracking-tight leading-[1.25]">
                {v.title}
              </h3>
              <p className="relative mt-4 text-[calc(14px*var(--fz))] leading-[1.75] text-ink-2 font-medium">
                {v.body}
              </p>
            </article>
          ))}
        </div>

        <div className="mt-20 panel-deep p-8 md:p-12 relative overflow-hidden">
          <div className="absolute -top-20 -right-20 w-[30rem] h-[30rem] rounded-full opacity-30 blob-indigo" />
          <div className="absolute -bottom-12 -left-12 w-64 h-64 rounded-full opacity-20 blob-coral" />
          <div className="relative grid grid-cols-12 gap-6 items-center">
            <div className="col-span-12 md:col-span-8">
              <span className="pill pill-mint mb-4">Call to action · 接入 SENTINEL</span>
              <h3 className="font-display text-[clamp(1.75rem,4vw,3rem)] font-extrabold tracking-tight leading-[1.1] text-white">
                当 AI 被用来作恶，
                <br />
                我们用更快的 AI <span className="italic" style={{ color: "var(--mint)" }}>挡在前面</span>。
              </h3>
              <p className="mt-5 text-[calc(15px*var(--fz))] leading-[1.75] text-white/75 max-w-[58ch] font-medium">
                欢迎运营商、终端厂商、金融机构、公安反诈中心接入 SENTINEL，
                共建一条从信令层到语义层的全栈防线。
              </p>
            </div>
            <div className="col-span-12 md:col-span-4 flex md:justify-end gap-3">
              <Link
                href="/warroom"
                className="btn-primary"
                style={{ background: "var(--mint)", color: "var(--deep)" }}
              >
                进入指挥中心
                <ArrowRight size={16} />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
