import { User, Users, Building2 } from "lucide-react";

const PEOPLE = [
  {
    icon: User, age: "65+", name: "黄石老人", tag: "受害群体 · 老年",
    quote: "电话里那个声音明明是我孙子，怎么会是骗子……",
    bullets: [
      "不熟悉信令术语，对显示号码完全信任",
      "情感诉求强烈，紧迫话术下迅速失去判断",
      "需要：屏幕大字警示 + 自动通知子女",
    ],
    tint: "var(--coral)", soft: "var(--coral-soft)", deep: "var(--coral-deep)",
  },
  {
    icon: Users, age: "32", name: "都市白领", tag: "易受 · 中青年",
    quote: "工作日 17 个未接来电，我没空一个个甄别。",
    bullets: [
      "高频陌生来电，易被冒充快递 / 客服 / HR",
      "希望免打扰但不能漏掉真正紧急的电话",
      "需要：静默判决 + 风险摘要弹幕",
    ],
    tint: "var(--indigo)", soft: "var(--indigo-soft)", deep: "var(--indigo-deep)",
  },
  {
    icon: Building2, age: "B 端", name: "金融机柜", tag: "企业级 · 风控",
    quote: "客户被骗后追款，证据链常常残缺。",
    bullets: [
      "客服热线伪冒事件频发，需对话级取证",
      "需要可审计的判决日志与证据加密留存",
      "需要：API 接入 + 实时风控信号",
    ],
    tint: "var(--mint-deep)", soft: "var(--mint-soft)", deep: "var(--mint-deep)",
  },
];

export default function Personas() {
  return (
    <section className="relative py-24 md:py-32 bg-canvas-2">
      <div className="max-w-[1400px] mx-auto px-10 md:px-8">
        <div className="mb-14 grid grid-cols-12 gap-6 items-end">
          <div className="col-span-12 md:col-span-7">
            <div className="section-idx mb-4"><b>07</b>三类用户画像</div>
            <h2 className="mega text-[clamp(2.4rem,5.5vw,5rem)]">
              不同的人，
              <br />
              <span className="mega-italic">同样的</span>{" "}
              <span className="underline-soft">需要</span>。
            </h2>
          </div>
          <div className="col-span-12 md:col-span-5 text-[15px] leading-[1.75] text-ink-2 font-medium">
            老年人、忙碌的白领、金融机构——三种使用场景对警示力度、推送时机、证据留存方式有截然不同的要求。
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {PEOPLE.map((p, i) => (
            <article key={p.name} className="relative panel panel-lift p-6 md:p-7 overflow-hidden">
              <div
                className="absolute -top-16 -right-16 w-44 h-44 rounded-full opacity-40"
                style={{ background: p.soft }}
              />
              <div className="relative flex items-start justify-between mb-6">
                <div
                  className="w-14 h-14 rounded-2xl flex items-center justify-center shadow-md text-white"
                  style={{ background: p.tint }}
                >
                  <p.icon size={22} strokeWidth={2} />
                </div>
                <div className="text-right">
                  <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-soft font-bold">
                    Persona / 0{i + 1}
                  </div>
                  <div className="numplate text-[20px] mt-1" style={{ color: p.deep }}>{p.age}</div>
                </div>
              </div>

              <div
                className="relative inline-block font-mono text-[13px] font-bold px-2.5 py-1 rounded-full mb-3"
                style={{ background: p.soft, color: p.deep }}
              >
                {p.tag}
              </div>
              <div className="relative font-display text-[26px] font-extrabold tracking-tight">
                {p.name}
              </div>

              <blockquote
                className="relative mt-4 pl-4 border-l-[3px] text-[14px] italic text-ink-2 leading-[1.7] font-medium"
                style={{ borderColor: p.tint }}
              >
                &ldquo;{p.quote}&rdquo;
              </blockquote>

              <ul className="relative mt-5 space-y-2.5">
                {p.bullets.map((b) => (
                  <li key={b} className="flex items-start gap-2.5 text-[13px] text-ink-2 font-medium">
                    <span className="mt-[6px] w-1.5 h-1.5 rounded-full shrink-0" style={{ background: p.tint }} />
                    <span>{b}</span>
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
