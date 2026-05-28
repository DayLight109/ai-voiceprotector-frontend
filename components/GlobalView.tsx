import { Globe2 } from "lucide-react";
import { readFileSync } from "node:fs";
import path from "node:path";

/* ==========================================================
   GlobalView · 真实世界地图
   - 基于 Natural Earth 110m 数据（public/world-map.svg）
   - viewBox 1000×500 · 等经纬（Equirectangular）投影
   - 国家 Pin 使用真实经纬度精确定位
   ========================================================== */

// 读取预烘焙的世界地图 SVG，抽取 <path d="..."> 内联到组件
const worldSvg = readFileSync(path.join(process.cwd(), "public", "world-map.svg"), "utf8");
const worldPath = worldSvg.match(/d="([^"]+)"/)?.[1] ?? "";

// 等经纬投影参数（与 scripts/build-world-svg.mjs 一致）
// x = (lng + 180) * 1000 / 360
// y = (90  - lat) * 500  / 180
const projectPct = (lat: number, lng: number) => ({
  left: `${((lng + 180) / 360) * 100}%`,
  top:  `${((90 - lat) / 180) * 100}%`,
});

const PINS = [
  { id: "US", city: "Washington, DC", lat: 38.9,   lng: -77.04,  loss: "$12.5B" },
  { id: "UK", city: "London",          lat: 51.51,  lng: -0.13,   loss: "£571M" },
  { id: "SG", city: "Singapore",       lat: 1.35,   lng: 103.82,  loss: "S$660M" },
  { id: "JP", city: "Tokyo",           lat: 35.68,  lng: 139.69,  loss: "¥441 亿" },
  { id: "KR", city: "Seoul",           lat: 37.57,  lng: 126.98,  loss: "₩1.5T" },
  { id: "CN", city: "Beijing",         lat: 39.90,  lng: 116.40,  loss: "25.8 万起", home: true },
];

const REGIONS = [
  { region: "North America", country: "美国 FTC",        loss: "$12.5B",   flag: "US", note: "2024 全年消费者诈骗损失" },
  { region: "Europe",        country: "英国 UK Finance", loss: "£571M",    flag: "UK", note: "APP 诈骗损失" },
  { region: "Asia Pacific",  country: "新加坡 SPF",      loss: "S$660M",   flag: "SG", note: "跨境诈骗涉案" },
  { region: "Asia Pacific",  country: "日本 警察庁",      loss: "¥441 亿",  flag: "JP", note: "特殊诈欺被害額" },
  { region: "Asia Pacific",  country: "韩国 KNPA",       loss: "₩1.5 万亿", flag: "KR", note: "电话金融诈骗" },
  { region: "China",         country: "中国 公安部",      loss: "25.8 万起", flag: "CN", note: "全年侦破案件", home: true },
];

export default function GlobalView() {
  const cnX = ((116.40 + 180) / 360) * 1000;
  const cnY = ((90 - 39.90) / 180) * 500;

  return (
    <section className="relative py-24 md:py-32 bg-canvas">
      <div className="max-w-[1400px] mx-auto px-5 md:px-8">
        <div className="mb-14 grid grid-cols-12 gap-6 items-end">
          <div className="col-span-12 md:col-span-7">
            <div className="section-idx mb-4"><b>09</b>全球视野</div>
            <h2 className="mega text-[clamp(2.4rem,5.5vw,5rem)]">
              诈骗没有国界，
              <br />
              防御也<span className="mega-italic">不能</span>。
            </h2>
          </div>
          <div className="col-span-12 md:col-span-5 text-[15px] leading-[1.75] text-ink-2 font-medium">
            跨境电信诈骗正成为全球共性问题。各国主管部门披露的损失数字，构成 SENTINEL 能力设计的基线——
            我们从第一行代码开始，就把跨境链路溯源当做必选项。
          </div>
        </div>

        <div className="grid grid-cols-12 gap-5">
          <div className="col-span-12 lg:col-span-8 panel p-6 relative overflow-hidden">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: "var(--indigo-soft)", color: "var(--indigo-deep)" }}>
                  <Globe2 size={16} />
                </div>
                <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-ink font-bold">
                  Global Threat Map · 2024-25
                </span>
              </div>
              <div className="flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.14em] text-ink-soft font-bold">
                <span>Natural Earth 110m</span>
                <span className="hidden md:inline">·</span>
                <span className="hidden md:inline">Equirectangular WGS84</span>
              </div>
            </div>

            <div
              className="relative w-full rounded-2xl overflow-hidden"
              style={{
                aspectRatio: "2 / 1",
                background:
                  "radial-gradient(120% 80% at 50% 0%, color-mix(in srgb, var(--indigo-soft) 70%, transparent) 0%, transparent 60%), linear-gradient(180deg, var(--surface-2), var(--canvas-2))",
              }}
            >
              {/* 精细点阵底 */}
              <div className="absolute inset-0 dot-grid-fine opacity-40" />

              {/* 真实世界地图 */}
              <svg
                viewBox="0 0 1000 500"
                preserveAspectRatio="none"
                className="absolute inset-0 w-full h-full"
                aria-hidden
              >
                <defs>
                  <linearGradient id="landGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--indigo)" stopOpacity="0.22" />
                    <stop offset="100%" stopColor="var(--indigo-deep)" stopOpacity="0.32" />
                  </linearGradient>
                  <filter id="landShadow" x="-2%" y="-2%" width="104%" height="104%">
                    <feGaussianBlur stdDeviation="0.6" />
                  </filter>
                </defs>

                {/* 经纬度网格 */}
                <g stroke="var(--indigo)" strokeOpacity="0.08" strokeWidth="0.5" fill="none">
                  {[0, 83.3, 166.7, 250, 333.3, 416.7, 500].map((y) => (
                    <line key={`h${y}`} x1="0" y1={y} x2="1000" y2={y} />
                  ))}
                  {Array.from({ length: 11 }, (_, i) => (i + 1) * (1000 / 12)).map((x) => (
                    <line key={`v${x}`} x1={x} y1="0" x2={x} y2="500" />
                  ))}
                </g>
                {/* 赤道 */}
                <line x1="0" y1="250" x2="1000" y2="250" stroke="var(--indigo)" strokeOpacity="0.22" strokeDasharray="4 5" strokeWidth="0.6" />
                {/* 本初子午线 */}
                <line x1="500" y1="0" x2="500" y2="500" stroke="var(--indigo)" strokeOpacity="0.15" strokeDasharray="4 5" strokeWidth="0.5" />

                {/* 大陆阴影底（柔光效果） */}
                <path
                  d={worldPath}
                  fill="var(--indigo-deep)"
                  fillRule="evenodd"
                  opacity="0.18"
                  transform="translate(0.8, 1.4)"
                  filter="url(#landShadow)"
                />
                {/* 大陆主体填充 */}
                <path
                  d={worldPath}
                  fill="url(#landGrad)"
                  fillRule="evenodd"
                  stroke="var(--indigo-deep)"
                  strokeOpacity="0.55"
                  strokeWidth="0.35"
                  strokeLinejoin="round"
                />

                {/* 跨境威胁连线（非中国节点 → 北京） */}
                <g>
                  {PINS.filter((p) => !p.home).map((p, i) => {
                    const x1 = ((p.lng + 180) / 360) * 1000;
                    const y1 = ((90 - p.lat) / 180) * 500;
                    const mx = (x1 + cnX) / 2;
                    const my = Math.min(y1, cnY) - 35;
                    return (
                      <g key={p.id}>
                        <path
                          d={`M ${x1} ${y1} Q ${mx} ${my} ${cnX} ${cnY}`}
                          fill="none"
                          stroke="var(--coral)"
                          strokeOpacity="0.45"
                          strokeWidth="0.9"
                          strokeDasharray="3 4"
                        >
                          <animate
                            attributeName="stroke-dashoffset"
                            from="0"
                            to="-70"
                            dur={`${3.5 + i * 0.3}s`}
                            repeatCount="indefinite"
                          />
                        </path>
                      </g>
                    );
                  })}
                </g>
              </svg>

              {/* Pin 覆盖层（真实经纬度百分比定位） */}
              {PINS.map((p, i) => {
                const { left, top } = projectPct(p.lat, p.lng);
                const home = p.home;
                const color = home ? "var(--mint)" : "var(--coral)";
                const deep  = home ? "var(--mint-deep)" : "var(--coral-deep)";
                const soft  = home ? "var(--mint-soft)" : "var(--coral-soft)";
                return (
                  <div
                    key={p.id}
                    className="absolute -translate-x-1/2 -translate-y-1/2"
                    style={{ left, top }}
                  >
                    <div className="relative flex items-center">
                      {/* 外圈扩散 */}
                      <span
                        className="absolute -left-1 -top-1 w-5 h-5 rounded-full animate-ping"
                        style={{ background: color, opacity: 0.35, animationDelay: `${i * 0.22}s` }}
                      />
                      {/* Pin 点 */}
                      <span
                        className="relative block rounded-full border-[2.5px] border-white shadow-lg"
                        style={{
                          width: home ? 14 : 11,
                          height: home ? 14 : 11,
                          background: color,
                          boxShadow: `0 0 0 3px ${soft}, 0 6px 14px -4px ${color}`,
                        }}
                      />
                      {/* 标签 */}
                      <span
                        className="ml-3 font-mono text-[10px] font-extrabold uppercase tracking-[0.12em] px-2 py-1 rounded-lg shadow-sm whitespace-nowrap"
                        style={{
                          background: "var(--surface)",
                          color: deep,
                          border: `1px solid ${soft}`,
                        }}
                      >
                        {p.id} · {p.city.split(",")[0]}
                      </span>
                    </div>
                  </div>
                );
              })}

              {/* 地图图例 */}
              <div className="absolute bottom-3 left-3 flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.12em] font-extrabold bg-surface/85 backdrop-blur-sm px-3 py-1.5 rounded-full border border-border shadow-sm">
                <span className="w-2 h-2 rounded-full" style={{ background: "var(--mint)" }} />
                <span style={{ color: "var(--mint-deep)" }}>HOME</span>
                <span className="w-px h-3 bg-border mx-1" />
                <span className="w-2 h-2 rounded-full" style={{ background: "var(--coral)" }} />
                <span style={{ color: "var(--coral-deep)" }}>HOSTILE</span>
              </div>
              <div className="absolute bottom-3 right-3 font-mono text-[10px] uppercase tracking-[0.12em] text-ink-soft font-extrabold bg-surface/85 backdrop-blur-sm px-3 py-1.5 rounded-full border border-border shadow-sm">
                {PINS.length} REGIONS · LIVE
              </div>
            </div>
          </div>

          <div className="col-span-12 lg:col-span-4">
            <div className="panel-deep overflow-hidden h-full">
              {REGIONS.map((r, i) => {
                const isHome = r.flag === "CN";
                return (
                  <div
                    key={r.country}
                    className={`flex items-center justify-between p-5 ${
                      i < REGIONS.length - 1 ? "border-b border-white/10" : ""
                    } hover:bg-white/5 transition-colors`}
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span
                          className="font-mono text-[10px] uppercase tracking-[0.14em] px-2 py-0.5 rounded-md font-extrabold"
                          style={{
                            background: isHome ? "var(--mint-soft)" : "rgba(242, 243, 247, 0.12)",
                            color: isHome ? "var(--mint-deep)" : "rgba(242, 243, 247, 0.85)",
                          }}
                        >
                          {r.flag}
                        </span>
                        <span className="font-display text-[15px] font-extrabold text-white">
                          {r.country}
                        </span>
                      </div>
                      <div className="mt-1 font-mono text-[11px] text-white/55 font-medium">
                        {r.region} · {r.note}
                      </div>
                    </div>
                    <div className="numplate text-[20px] text-white shrink-0">{r.loss}</div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
