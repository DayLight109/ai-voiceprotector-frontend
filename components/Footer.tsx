import { ArrowUpRight } from "lucide-react";
import Link from "next/link";

export default function Footer() {
  return (
    <footer className="bg-deep text-white relative overflow-hidden">
      <div className="absolute -top-20 -right-20 w-[36rem] h-[36rem] rounded-full opacity-20 blob-indigo" />
      <div className="absolute -bottom-32 -left-32 w-[28rem] h-[28rem] rounded-full opacity-10 blob-coral" />

      <div className="relative max-w-[1400px] mx-auto px-5 md:px-8 py-16 md:py-20">
        <div className="grid grid-cols-12 gap-8">
          <div className="col-span-12 md:col-span-5">
            <div className="flex items-center gap-3 mb-6">
              <div
                className="w-12 h-12 rounded-2xl flex items-center justify-center font-display font-extrabold text-white shadow-md"
                style={{ background: "linear-gradient(135deg, var(--indigo), var(--indigo-deep))" }}
              >
                S
              </div>
              <div>
                <div className="font-display text-[calc(22px*var(--fz))] font-extrabold">SENTINEL</div>
                <div className="font-mono text-[calc(11px*var(--fz))] uppercase tracking-[0.16em] font-bold" style={{ color: "rgba(242, 243, 247, 0.55)" }}>
                  声纹捕手 · VOICE GUARDIAN
                </div>
              </div>
            </div>
            <p className="max-w-[44ch] text-[calc(14px*var(--fz))] leading-[1.75] font-medium" style={{ color: "rgba(242, 243, 247, 0.65)" }}>
              面向 AI 语音诈骗新威胁的毫秒级反诈平台。
              来电溯源 × Whisper 转写 × 话术语义三重引擎并联，
              在通话接通的第一秒完成判决。
            </p>
          </div>

          <div className="col-span-6 md:col-span-2">
            <div className="font-mono text-[calc(10px*var(--fz))] uppercase tracking-[0.14em] font-bold" style={{ color: "rgba(242, 243, 247, 0.55)" }}>
              产品
            </div>
            <ul className="mt-4 space-y-2.5 text-[calc(13px*var(--fz))] font-medium">
              {["功能概览", "三层防御", "API 文档", "指挥中心"].map((x) => (
                <li key={x}>
                  <a href="#" className="hover:opacity-100 transition-opacity" style={{ color: "rgba(242, 243, 247, 0.85)" }}>
                    {x}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div className="col-span-6 md:col-span-2">
            <div className="font-mono text-[calc(10px*var(--fz))] uppercase tracking-[0.14em] font-bold" style={{ color: "rgba(242, 243, 247, 0.55)" }}>
              生态
            </div>
            <ul className="mt-4 space-y-2.5 text-[calc(13px*var(--fz))] font-medium">
              {["运营商接入", "终端厂商", "金融风控", "公安协同"].map((x) => (
                <li key={x}>
                  <a href="#" className="hover:opacity-100 transition-opacity" style={{ color: "rgba(242, 243, 247, 0.85)" }}>
                    {x}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div className="col-span-12 md:col-span-3">
            <div className="font-mono text-[calc(10px*var(--fz))] uppercase tracking-[0.14em] font-bold" style={{ color: "rgba(242, 243, 247, 0.55)" }}>
              联系
            </div>
            <Link
              href="/warroom"
              className="mt-4 inline-flex items-center gap-2 text-[calc(18px*var(--fz))] font-display font-extrabold transition-colors"
              style={{ color: "var(--mint)" }}
            >
              进入指挥中心
              <ArrowUpRight size={18} />
            </Link>
            <div className="mt-6 p-5 rounded-2xl border border-white/15">
              <div className="font-mono text-[calc(10px*var(--fz))] uppercase tracking-[0.14em] font-bold" style={{ color: "rgba(242, 243, 247, 0.55)" }}>
                紧急举报
              </div>
              <div className="mt-1 numplate text-[calc(28px*var(--fz))] text-white">96110</div>
              <div className="mt-1 font-mono text-[calc(11px*var(--fz))] font-medium" style={{ color: "rgba(242, 243, 247, 0.55)" }}>
                全国反诈专线 · 24h
              </div>
            </div>
          </div>
        </div>

        <div className="mt-14 pt-6 border-t border-white/10 flex flex-wrap items-center justify-between gap-4">
          <div className="font-mono text-[calc(11px*var(--fz))] font-medium" style={{ color: "rgba(242, 243, 247, 0.55)" }}>
            © 2026 SENTINEL · 本页面为公益科普与作品展示，不对外提供商业服务
          </div>
          <div className="flex items-center gap-4 font-mono text-[calc(11px*var(--fz))] font-bold" style={{ color: "rgba(242, 243, 247, 0.55)" }}>
            <span className="flex items-center gap-2">
              <span className="signal-dot" style={{ color: "var(--mint)" }} /> BEIJING · OPERATIONAL
            </span>
            <span>v1.0.0 / build 0513</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
