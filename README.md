# 声纹捕手 / AI 诈声卫士

> 实时语音诈骗话术智能识别与阻断系统 — 概念展示页

基于 **Next.js 15 (App Router) + React 19 + TypeScript + Tailwind CSS v4** 构建的产品介绍页面。
设计语言：「卷宗 / DOSSIER」—— 调查报道式排版 × 指挥中心遥测。

## 启动

```bash
# 1) 安装依赖
npm install
# 或 pnpm install / yarn

# 2) 本地开发
npm run dev
# → http://localhost:3000

# 3) 生产构建
npm run build && npm run start
```

> 首次运行 `next/font/google` 会从 Google Fonts 拉取以下字族：
> Noto Serif SC、Noto Sans SC、JetBrains Mono、Instrument Serif。
> 国内网络如不便，可改为 next/font/local 接入本地字体。

## 文件地图

```
app/
  layout.tsx         · 字体注入、全局元数据
  page.tsx           · 主页组合
  globals.css        · 设计系统（Tailwind v4 inline theme + 自定义动画）
components/
  Header.tsx         · 案件编号顶栏
  StatusTicker.tsx   · 滚动数据条
  Hero.tsx           · 黄石案 · 实时分析仪
  CrisisStats.tsx    · 36 亿次 · 数据可视化
  PainPoints.tsx     · 四大痛点
  DefenseStack.tsx   · 三层防护机制
  CallSimulator.tsx  · 12 秒交互式实时演示 ★
  ComparisonTable.tsx· 与现有产品对比
  Personas.tsx       · 老人 / 学生 / 机构
  Policy.tsx         · 反诈法 + 十五五规划
  GlobalView.tsx     · 全球反诈协作
  SocialValue.tsx    · 社会价值
  Sources.tsx        · 数据来源
  Footer.tsx         · 大字 wordmark
```

## 设计要点

- **调色**：`ink` / `graphite` 深色基调；`blood` / `ember` / `amber` 警示色阶；
  `signal` / `mint` 表&laquo;安全&raquo;与技术。
- **字体**：Noto Serif SC（标题）× Noto Sans SC（正文）× JetBrains Mono（数据轨）×
  Instrument Serif Italic（编辑式强调）。
- **互动核心**：`CallSimulator` 中 `requestAnimationFrame` 驱动 12.5 s 时间线，
  并发演示「来电溯源 / 声纹检测 / 话术识别 / 风险等级 / 证据留存 / 自动阻断」。

## 数据来源

页面所有数据均引自官方公开来源（公安部、最高检、最高法、国家发改委、
央视《今日说法》、人民日报、新华社、澎湃新闻、新京报等），
具体见页内 `Sources` 板块。
