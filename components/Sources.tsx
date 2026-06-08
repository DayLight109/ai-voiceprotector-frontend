const SOURCES = [
  {
    cat: "公安部 · 官方数据", tint: "var(--indigo)", soft: "var(--indigo-soft)",
    items: [
      "公安部刑侦局 2025 年度反电信网络诈骗工作公报",
      "国家反诈大数据平台 · 月度态势简报",
      "全国反诈中心 · 紧急止付与资金返还年度通报",
    ],
  },
  {
    cat: "最高检 · 司法数据", tint: "var(--coral)", soft: "var(--coral-soft)",
    items: [
      "最高人民检察院电信网络诈骗犯罪案件白皮书",
      "帮助信息网络犯罪活动罪起诉情况年度报告",
    ],
  },
  {
    cat: "法律法规", tint: "var(--amber)", soft: "var(--amber-soft)",
    items: [
      "《中华人民共和国反电信网络诈骗法》2022-12-01 施行",
      "《个人信息保护法》§ 38 自动化决策条款",
      "《刑法》修正案（十一） § 287 帮信罪 / 电信诈骗罪",
    ],
  },
  {
    cat: "行业与国际", tint: "var(--mint-deep)", soft: "var(--mint-soft)",
    items: [
      "FTC Consumer Sentinel Network Data Book 2024",
      "UK Finance Annual Fraud Report 2024",
      "Singapore Police Force Annual Scam Statistics",
      "Japan NPA 特殊詐欺認知件数・被害額",
    ],
  },
];

export default function Sources() {
  return (
    <section className="relative py-24 md:py-28 bg-canvas">
      <div className="max-w-[1400px] mx-auto px-5 md:px-8">
        <div className="mb-12 grid grid-cols-12 gap-6 items-end">
          <div className="col-span-12 md:col-span-8">
            <div className="section-idx mb-4"><b>11</b>数据来源</div>
            <h2 className="font-display text-[clamp(1.75rem,3.5vw,2.75rem)] font-extrabold tracking-tight leading-[1.15]">
              所有数据均来自
              <br />
              <span className="underline-soft">公开、可复核</span>的渠道。
            </h2>
          </div>
          <div className="col-span-12 md:col-span-4 text-[calc(14px*var(--fz))] text-ink-2 leading-[1.75] font-medium">
            我们不编造数据。展示中的每一个数字都对应真实的政府公告、法规条文或国际权威机构披露。
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {SOURCES.map((s) => (
            <div key={s.cat} className="panel panel-lift p-6">
              <div
                className="font-mono text-[calc(20px*var(--fz))] uppercase tracking-[0.14em] font-bold mb-5 pb-3 border-b border-border inline-flex items-center gap-2"
              >
                <span className="w-2 h-2 rounded-full" style={{ background: s.tint }} />
                <span style={{ color: "var(--ink-soft)" }}>{s.cat}</span>
              </div>
              <ul className="space-y-3">
                {s.items.map((it) => (
                  <li key={it} className="flex items-start gap-2.5 text-[calc(15px*var(--fz))] leading-[1.7] font-medium">
                    <span className="mt-[8px] w-1.5 h-1.5 rounded-full shrink-0" style={{ background: s.tint }} />
                    <span className="text-ink-2">{it}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
