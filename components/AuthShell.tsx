import Link from "next/link";
import { ShieldCheck, CheckCircle2 } from "lucide-react";

export default function AuthShell({
  children,
  eyebrow,
  title,
  subtitle,
  sideTitle,
  bullets,
}: {
  children: React.ReactNode;
  eyebrow: string;
  title: string;
  subtitle: string;
  sideTitle: string;
  bullets: string[];
}) {
  return (
    <main className="min-h-screen bg-canvas text-ink flex">
      {/* 左侧表单区 */}
      <div className="flex-1 flex flex-col min-h-screen">
        <div className="px-6 md:px-10 py-6 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3 group">
            <div
              className="w-10 h-10 rounded-2xl flex items-center justify-center font-display text-white font-extrabold shadow-md"
              style={{ background: "linear-gradient(135deg, var(--indigo), var(--indigo-deep))" }}
            >
              S
            </div>
            <div>
              <div className="font-display text-[18px] font-extrabold">SENTINEL</div>
              <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-ink-soft font-bold">声纹捕手</div>
            </div>
          </Link>
          <Link href="/" className="text-[13px] font-semibold text-ink-soft hover:text-ink transition-colors">
            ← 返回主页
          </Link>
        </div>

        <div className="flex-1 flex items-center justify-center px-6 md:px-10 pb-10">
          <div className="w-full max-w-[440px]">
            <div className="tag-chip mb-5" data-tone="indigo">{eyebrow}</div>
            <h1 className="font-display text-[40px] md:text-[44px] font-extrabold tracking-tight leading-[1.05]">
              {title}
            </h1>
            <p className="mt-3 text-[14px] leading-[1.65] text-ink-soft font-medium">
              {subtitle}
            </p>

            <div className="mt-9">{children}</div>
          </div>
        </div>
      </div>

      {/* 右侧视觉区 */}
      <aside className="hidden lg:flex flex-col w-[520px] xl:w-[580px] p-6">
        <div
          className="relative flex-1 rounded-[28px] overflow-hidden p-10 flex flex-col justify-between"
          style={{
            background: "linear-gradient(160deg, var(--deep) 0%, var(--deep-2) 55%, var(--indigo-deep) 120%)",
            color: "#F2F3F7",
          }}
        >
          <div className="absolute -top-20 -right-20 w-[28rem] h-[28rem] rounded-full opacity-40 blob-indigo" />
          <div className="absolute -bottom-24 -left-24 w-[24rem] h-[24rem] rounded-full opacity-30 blob-coral" />

          <div className="relative flex items-center justify-between">
            <span className="tag-chip" data-live="true" style={{ background: "rgba(255,255,255,0.08)", color: "var(--mint)", borderColor: "rgba(255,255,255,0.15)" }}>
              SECURE GATEWAY · TLS 1.3
            </span>
            <span className="font-mono text-[10px] uppercase tracking-[0.2em]" style={{ color: "rgba(242, 243, 247, 0.55)" }}>
              v1.0.0
            </span>
          </div>

          <div className="relative">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center">
                <ShieldCheck size={22} style={{ color: "var(--mint)" }} />
              </div>
              <div className="font-mono text-[11px] uppercase tracking-[0.18em] font-bold" style={{ color: "rgba(242, 243, 247, 0.55)" }}>
                TRUST PILLARS
              </div>
            </div>
            <h2 className="font-display text-[36px] font-extrabold tracking-tight leading-[1.1] text-white">
              {sideTitle}
            </h2>
            <ul className="mt-8 space-y-4">
              {bullets.map((b) => (
                <li key={b} className="flex items-start gap-3 text-[14px] font-medium" style={{ color: "rgba(242, 243, 247, 0.88)" }}>
                  <CheckCircle2 size={18} style={{ color: "var(--mint)" }} className="shrink-0 mt-0.5" />
                  <span>{b}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="relative grid grid-cols-3 gap-4 pt-8 border-t border-white/10">
            <div>
              <div className="numplate text-[22px]" style={{ color: "#fff" }}>36 亿</div>
              <div className="font-mono text-[10px] uppercase tracking-[0.16em] font-bold mt-1" style={{ color: "rgba(242, 243, 247, 0.55)" }}>日均拦截</div>
            </div>
            <div>
              <div className="numplate text-[22px]" style={{ color: "#fff" }}>99.2%</div>
              <div className="font-mono text-[10px] uppercase tracking-[0.16em] font-bold mt-1" style={{ color: "rgba(242, 243, 247, 0.55)" }}>召回率</div>
            </div>
            <div>
              <div className="numplate text-[22px]" style={{ color: "#fff" }}>&lt;120ms</div>
              <div className="font-mono text-[10px] uppercase tracking-[0.16em] font-bold mt-1" style={{ color: "rgba(242, 243, 247, 0.55)" }}>判决延迟</div>
            </div>
          </div>
        </div>
      </aside>
    </main>
  );
}
