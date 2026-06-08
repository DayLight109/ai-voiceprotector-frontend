import { Scale, FileText, Building2, Gavel } from "lucide-react";

const CLAUSES = [
  {
    icon: Scale, code: "25", act: "反电信网络诈骗法",
    title: "运营商实时监测义务",
    body: "电信业务经营者应对异常通话 / 短信进行实时监测与处置，并向用户提示风险。",
  },
  {
    icon: FileText, code: "23", act: "反电信网络诈骗法",
    title: "数据协同与信息共享",
    body: "公安、工信、金融、网信主管部门应依法共享涉诈线索，构建联合治理机制。",
  },
  {
    icon: Building2, code: "38", act: "个人信息保护法",
    title: "最小必要原则",
    body: "自动化决策处理个人信息应采取必要措施保障安全、不得进行不合理的差别对待。",
  },
  {
    icon: Gavel, code: "287", act: "刑法 · 修正案（十一）",
    title: "帮信罪 / 电信诈骗罪",
    body: "利用信息网络实施诈骗、为犯罪活动提供帮助的，依法追究刑事责任。",
  },
];

export default function Policy() {
  return (
    <section id="policy" className="relative py-24 md:py-32 bg-canvas overflow-hidden">
      <div className="absolute inset-x-0 top-0 h-32 pointer-events-none" style={{ background: "linear-gradient(to bottom, var(--canvas-2), transparent)" }} />
      <div className="absolute top-20 right-10 w-[30vw] h-[30vw] rounded-full blob-indigo opacity-30" />

      <div className="relative max-w-[1400px] mx-auto px-5 md:px-8">
        <div className="grid grid-cols-12 gap-6 mb-16 items-end">
          <div className="col-span-12 md:col-span-8">
            <div className="section-idx mb-4"><b>08</b>政策与合规依据</div>
            <h2 className="mega text-[clamp(2.4rem,5.5vw,5rem)]">
              不是锦上添花，
              <br />
              <span className="mega-italic" style={{ color: "var(--indigo)" }}>是法定动作</span>。
            </h2>
          </div>
          <div className="col-span-12 md:col-span-4 text-[calc(14px*var(--fz))] leading-[1.75] text-ink-2 font-medium">
            2022 年 12 月 1 日起施行的《反电信网络诈骗法》对运营商、平台、金融机构提出了实时监测、协同共享的强制要求。
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {CLAUSES.map((c, i) => (
            <div key={c.code} className="panel panel-lift p-7 md:p-9 relative overflow-hidden">
              <div className="absolute -top-12 -right-12 w-36 h-36 rounded-full opacity-40 blob-indigo" />

              <div className="relative flex items-start justify-between mb-8">
                <div className="flex items-center gap-3">
                  <div
                    className="w-12 h-12 rounded-2xl flex items-center justify-center shadow-md text-white"
                    style={{ background: "linear-gradient(135deg, var(--indigo), var(--indigo-deep))" }}
                  >
                    <c.icon size={20} strokeWidth={2} />
                  </div>
                  <div>
                    <div className="font-mono text-[calc(10px*var(--fz))] uppercase tracking-[0.14em] text-ink-soft font-bold">
                      {c.act}
                    </div>
                    <div className="font-display text-[calc(20px*var(--fz))] font-extrabold mt-0.5">
                      第 {c.code} 条
                    </div>
                  </div>
                </div>
                <div className="font-mono text-[calc(11px*var(--fz))] font-bold text-ink-soft">0{i + 1}</div>
              </div>
              <h3 className="relative font-display text-[calc(22px*var(--fz))] md:text-[calc(26px*var(--fz))] font-extrabold tracking-tight leading-[1.25]">
                {c.title}
              </h3>
              <p className="relative mt-4 text-[calc(14px*var(--fz))] leading-[1.75] text-ink-2 font-medium">
                {c.body}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
