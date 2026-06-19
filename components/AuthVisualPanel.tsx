// 登录 / 注册共用的右侧安全视觉面板。
// 配色与排版与登录页一致（Deep Indigo + 玻璃拟态），由 content 驱动文案与卡片。
import type { StaticImageData } from "next/image";
import { Activity } from "lucide-react";

export type AuthPanelContent = {
  sideTitle: string;
  body: string;
  image?: StaticImageData;
  cards: { icon: typeof Activity; title: string; body: string }[];
};

export function AuthVisualPanel({ content }: { content: AuthPanelContent }) {
  const hasPhoto = Boolean(content.image);

  return (
    <aside className="relative hidden min-h-screen overflow-hidden bg-[#071426] text-white lg:block">
      {content.image ? (
        <>
          <div
            className="absolute inset-0 bg-cover bg-center"
            style={{ backgroundImage: `url(${content.image.src})` }}
          />
          <div className="absolute inset-0 bg-[#071426]/60" />
          <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(7,20,38,0.82),rgba(7,20,38,0.36)_55%,rgba(7,20,38,0.66)),linear-gradient(180deg,rgba(7,20,38,0.16),rgba(7,20,38,0.76))]" />
        </>
      ) : (
        <>
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_38%,rgba(203,219,245,0.22),transparent_30%),linear-gradient(90deg,rgba(255,255,255,0.02),rgba(255,255,255,0.1)_57%,rgba(255,255,255,0.02))]" />
          <div className="security-grid absolute inset-0 opacity-90" />
          <div className="absolute inset-y-0 left-[136px] w-[152px] bg-[linear-gradient(90deg,transparent,rgba(255,255,255,0.05),transparent)] blur-sm" />
          <div className="absolute inset-y-0 right-[68px] w-[172px] bg-[linear-gradient(90deg,transparent,rgba(255,255,255,0.06),transparent)] blur-sm" />
          <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(7,20,38,0.18),rgba(7,20,38,0.5))]" />
        </>
      )}

      {/* 顶部细微高光，作为去掉徽章后的视觉锚点 */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-[linear-gradient(90deg,transparent,rgba(255,255,255,0.18),transparent)]" />

      <div className="relative w-full pl-[clamp(56px,7.5vw,120px)] pr-[clamp(40px,5vw,80px)] pt-[clamp(128px,19vh,238px)]">
        <h2 className="whitespace-pre-line text-[clamp(28px,2.5vw,40px)] font-bold leading-[1.16] tracking-[-0.01em] text-white drop-shadow-[0_2px_24px_rgba(0,0,0,0.3)]">
          {content.sideTitle}
        </h2>
        <p className="mt-[24px] max-w-[600px] text-[clamp(15px,1.05vw,18px)] font-normal leading-[1.62] tracking-[0] text-[#cdd8ee]">
          {content.body}
        </p>

        <div className="mt-[clamp(54px,7vh,92px)] hidden max-w-[780px] grid-cols-3 items-start gap-[clamp(22px,2.4vw,32px)] lg:grid">
          <FeatureCard
            photoMode={hasPhoto}
            className="h-[316px]"
            icon={content.cards[0].icon}
            title={content.cards[0].title}
          >
            {content.cards[0].body}
          </FeatureCard>
          <FeatureCard
            photoMode={hasPhoto}
            className="mt-[40px] h-[346px]"
            icon={content.cards[1].icon}
            title={content.cards[1].title}
          >
            {content.cards[1].body}
          </FeatureCard>
          <FeatureCard
            photoMode={hasPhoto}
            className="mt-[80px] h-[346px]"
            icon={content.cards[2].icon}
            title={content.cards[2].title}
          >
            {content.cards[2].body}
          </FeatureCard>
        </div>
      </div>

      <style jsx>{`
        .security-grid {
          background-image:
            url("data:image/svg+xml,%3Csvg width='760' height='760' viewBox='0 0 760 760' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M170 34c58 34 108 28 160 0v116c0 88-62 145-160 184C72 295 10 238 10 150V34c52 28 102 34 160 0Z' stroke='%2355f0e6' stroke-opacity='.11' stroke-width='3'/%3E%3Cpath d='M170 78c38 22 72 20 108 0v76c0 58-40 95-108 123-68-28-108-65-108-123V78c36 20 70 22 108 0Z' stroke='%23ff4d8d' stroke-opacity='.08' stroke-width='2'/%3E%3Cpath d='M430 42c58 34 108 28 160 0v116c0 88-62 145-160 184-98-39-160-96-160-184V42c52 28 102 34 160 0Z' stroke='%2355f0e6' stroke-opacity='.1' stroke-width='3'/%3E%3Cpath d='M430 86c38 22 72 20 108 0v76c0 58-40 95-108 123-68-28-108-65-108-123V86c36 20 70 22 108 0Z' stroke='%23ff4d8d' stroke-opacity='.08' stroke-width='2'/%3E%3Cpath d='M80 155h118l12-28 20 56 18-92 20 126 18-62h138l16-34 18 68 18-34h168' stroke='%2352e5ff' stroke-opacity='.15' stroke-width='3'/%3E%3Cpath d='M105 540c42-22 92-18 130 20s90 36 128-6 94-48 136-10 88 46 130 12' stroke='%2352e5ff' stroke-opacity='.11' stroke-width='3'/%3E%3Cpath d='M250 400c20 50-56 74-34 126 18 42 80 46 78 104-2 38-44 58-22 104' stroke='%23ff4d8d' stroke-opacity='.08' stroke-width='2'/%3E%3Cpath d='M420 398c-18 54 54 74 34 128-16 44-78 48-76 106 2 38 42 58 22 102' stroke='%2352e5ff' stroke-opacity='.09' stroke-width='2'/%3E%3C/g%3E%3C/svg%3E");
          background-position: 70px -12px;
          background-size: 760px 760px;
          filter: saturate(1.05);
        }
      `}</style>
    </aside>
  );
}

function FeatureCard({
  className,
  icon: Icon,
  photoMode = false,
  title,
  children,
}: {
  className: string;
  icon: typeof Activity;
  photoMode?: boolean;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={`${className} group min-w-0 rounded-[20px] border border-white/10 px-[clamp(20px,2.3vw,34px)] pt-[36px] text-[#eaf1ff] shadow-[0_22px_70px_rgba(0,0,0,0.28)] backdrop-blur-md transition duration-300 ease-out hover:-translate-y-1.5 hover:border-white/25 hover:shadow-[0_30px_80px_rgba(0,0,0,0.36)] ${photoMode ? "bg-[#071426]/[0.72]" : "bg-[#101c2e]/[0.92]"}`}
    >
      <div className="flex h-[54px] w-[54px] items-center justify-center rounded-[16px] border border-white/[0.16] bg-white/[0.07] shadow-[inset_0_1px_0_rgba(255,255,255,0.1)] transition duration-300 group-hover:border-[#37d99c]/45 group-hover:bg-[#37d99c]/10 group-hover:shadow-[0_0_22px_rgba(55,217,156,0.22)]">
        <Icon size={27} strokeWidth={1.8} className="transition-colors duration-300 group-hover:text-[#7defc0]" />
      </div>
      <h3 className="mt-[32px] text-[clamp(17px,1.25vw,20px)] font-bold leading-[1.4] tracking-[0] text-white">
        {title}
      </h3>
      <p className="mt-[16px] text-[clamp(14px,1vw,16px)] font-normal leading-[1.66] tracking-[0] text-[#c3d0e6]">
        {children}
      </p>
    </div>
  );
}
